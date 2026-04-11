import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faArrowUp, faArrowDown, faDollarSign, faPaperPlane, faPhone } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const validateAmount = (value) => {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return 'Amount is required';
  if (num <= 0) return 'Amount must be positive';
  if (num < 1000) return 'Minimum amount is UGX 1,000';
  return null;
};

const validatePhone = (value) => {
  if (!value || value.trim() === '') return 'Phone number is required';
  if (value.length < 10) return 'Enter a valid phone number';
  return null;
};

export default function Wallet() {
  const { wallet, depositToWallet, withdrawFromWallet, walletTransactions } = useApp();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [walletType, setWalletType] = useState('main');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({ amount: '', phone: '' });

  const handleDeposit = (e) => {
    e.preventDefault();
    const amountError = validateAmount(amount);
    const phoneError = validatePhone(phoneNumber);
    
    if (amountError || phoneError) {
      setErrors({ amount: amountError || '', phone: phoneError || '' });
      return;
    }
    
    if (amount && parseFloat(amount) > 0) {
      depositToWallet(parseFloat(amount), description || `Deposit - ${phoneNumber}`, 'main');
      setShowDepositModal(false);
      setAmount('');
      setDescription('');
      setPhoneNumber('');
      setWalletType('main');
      setErrors({ amount: '', phone: '' });
    }
  };

  const handleWithdraw = (e) => {
    e.preventDefault();
    const amountError = validateAmount(amount);
    
    if (amountError) {
      setErrors({ amount: amountError, phone: '' });
      return;
    }
    
    if (amount && parseFloat(amount) > 0) {
      const success = withdrawFromWallet(parseFloat(amount), description || 'Withdrawal', walletType);
      if (success) {
        setShowWithdrawModal(false);
        setAmount('');
        setDescription('');
        setWalletType('main');
        setErrors({ amount: '', phone: '' });
      } else {
        setErrors({ amount: 'Insufficient funds in selected wallet', phone: '' });
      }
    }
  };

  const clearErrors = () => setErrors({ amount: '', phone: '' });

  return (
    <div>
      <div className="page-header">
        <h1>Wallet</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-success" onClick={() => { setShowDepositModal(true); clearErrors(); }}>
            <FontAwesomeIcon icon={faArrowDown} /> Deposit
          </button>
          <button className="btn btn-danger" onClick={() => { setShowWithdrawModal(true); clearErrors(); }}>
            <FontAwesomeIcon icon={faPaperPlane} /> Withdraw
          </button>
        </div>
      </div>

      <div className="wallet-section">
        <div className="wallet-card">
          <h3><FontAwesomeIcon icon={faWallet} /> Main Wallet</h3>
          <div className="amount">{formatUGX(wallet.main)}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px' }}>For funding packages</p>
        </div>
        <div className="wallet-card">
          <h3><FontAwesomeIcon icon={faArrowUp} /> Interest Wallet</h3>
          <div className="amount" style={{ color: '#9b59b6' }}>{formatUGX(wallet.interest)}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px' }}>From repayments with interest</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Wallet Transactions</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Wallet</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {walletTransactions.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <span className={`status-badge ${tx.type === 'deposit' ? 'status-active' : 'status-frozen'}`}>
                      <FontAwesomeIcon icon={tx.type === 'deposit' ? faArrowDown : faArrowUp} />
                      {' '}{tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{tx.walletType || 'main'}</td>
                  <td style={{ color: tx.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                    {tx.type === 'deposit' ? '+' : '-'}{formatUGX(tx.amount)}
                  </td>
                  <td>{tx.description}</td>
                  <td>{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Deposit Cash</h2>
            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <FontAwesomeIcon icon={faPhone} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="tel" value={phoneNumber} onChange={(e) => { setPhoneNumber(e.target.value); clearErrors(); }} placeholder="Enter phone number" style={{ paddingLeft: '40px' }} required />
                </div>
                {errors.phone && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label>Amount (min: UGX 1,000)</label>
                <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); clearErrors(); }} placeholder="Enter amount" required />
                {errors.amount && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.amount}</span>}
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a note" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDepositModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Deposit to Main Wallet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Withdraw Cash</h2>
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label>Wallet Type</label>
                <select value={walletType} onChange={e => setWalletType(e.target.value)}>
                  <option value="main">Main Wallet ({formatUGX(wallet.main)})</option>
                  <option value="interest">Interest Wallet ({formatUGX(wallet.interest)})</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (min: UGX 1,000)</label>
                <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); clearErrors(); }} placeholder="Enter amount" required />
                {errors.amount && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.amount}</span>}
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a note" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWithdrawModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Withdraw</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}