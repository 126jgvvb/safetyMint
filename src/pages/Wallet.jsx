import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faArrowUp, faArrowDown, faPaperPlane, faPhone, faCheckCircle, faTimesCircle, faInfoCircle, faSearch, faFilter, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

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
  const { wallet, platformWallet, depositToWallet, withdrawToPhone, walletTransactions, useApi, setWalletTransactions, setPlatformWallet } = useApp();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [walletType, setWalletType] = useState('main');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('MTN');
  const [errors, setErrors] = useState({ amount: '', phone: '', wallet: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawalResult, setWithdrawalResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  const feePercent = platformWallet?.feePercentage || 5;
  const calculatedFee = amount ? Math.floor(parseFloat(amount) * (feePercent / 100)) : 0;
  const netAmount = amount ? parseFloat(amount) - calculatedFee : 0;

  const handleSearch = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FontAwesomeIcon icon={faSort} />;
    return sortOrder === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />;
  };

  const filteredTransactions = useMemo(() => {
    let result = [...walletTransactions];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.description || '').toLowerCase().includes(searchLower) ||
        (t.walletType || '').toLowerCase().includes(searchLower) ||
        (t.type || '').toLowerCase().includes(searchLower) ||
        (t.phoneNumber || '').includes(searchLower)
      );
    }
    
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }
    
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [walletTransactions, searchTerm, filterType, sortField, sortOrder]);

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

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amountError = validateAmount(amount);
    const phoneError = validatePhone(phoneNumber);
    const walletBalance = walletType === 'main' ? wallet.main : wallet.interest;
    const walletError = parseFloat(amount) > walletBalance ? 'Insufficient funds in selected wallet' : null;
    
    if (amountError || phoneError || walletError) {
      setErrors({ amount: amountError || '', phone: phoneError || '', wallet: walletError || '' });
      return;
    }
    
    if (amount && parseFloat(amount) > 0) {
      setIsProcessing(true);
      setWithdrawalResult(null);
      
      try {
        if (useApi) {
          const result = await api.withdrawToPhone(
            parseFloat(amount),
            description || 'Withdrawal',
            phoneNumber,
            provider,
            walletType
          );
          
          if (result?.success || result?.main !== undefined) {
            const txns = await api.getWalletTransactions();
            setWalletTransactions(txns);
            const platformData = await api.getPlatformWallet();
            setPlatformWallet(platformData);
            setWithdrawalResult({
              success: true,
              message: 'Withdrawal completed successfully!',
              reference: result?.reference,
              provider,
              phoneNumber,
              amount: parseFloat(amount),
              netAmount: netAmount,
              fee: calculatedFee,
            });
          } else {
            setWithdrawalResult({
              success: false,
              message: result?.message || 'Withdrawal failed',
            });
          }
        } else {
          const success = withdrawToPhone && withdrawToPhone(parseFloat(amount), description || 'Withdrawal', walletType, phoneNumber, provider);
          if (success) {
            const fee = calculatedFee;
            const net = netAmount;
            setWalletTransactions([...walletTransactions, {
              id: Date.now(),
              type: 'withdraw',
              amount: net,
              fee,
              netAmount: net,
              date: new Date().toISOString().split('T')[0],
              description: description || 'Withdrawal',
              walletType,
              phoneNumber,
              provider
            }]);
            setWithdrawalResult({
              success: true,
              message: 'Withdrawal completed successfully!',
              provider,
              phoneNumber,
              amount: parseFloat(amount),
              fee,
              netAmount: net,
            });
          } else {
            setWithdrawalResult({
              success: false,
              message: 'Insufficient funds in selected wallet',
            });
          }
        }
      } catch (error) {
        setWithdrawalResult({
          success: false,
          message: error.message || 'An error occurred',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
    setWithdrawalResult(null);
    setAmount('');
    setDescription('');
    setPhoneNumber('');
    setWalletType('main');
    setErrors({ amount: '', phone: '', wallet: '' });
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
        {platformWallet && (
          <div className="wallet-card" style={{ background: 'rgba(241, 196, 15, 0.1)', borderColor: '#f1c40f' }}>
            <h3><FontAwesomeIcon icon={faWallet} /> Platform Wallet</h3>
            <div className="amount" style={{ color: '#f1c40f' }}>{formatUGX(platformWallet.balance || 0)}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px' }}>
              Total Fees ({platformWallet.feePercentage || 5}%): {formatUGX(platformWallet.totalFees || 0)}
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2>Wallet Transactions</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="search-bar" style={{ marginBottom: 0 }}>
              <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FontAwesomeIcon icon={faFilter} style={{ color: 'var(--text-muted)' }} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '8px', borderRadius: '6px' }}>
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdraw">Withdrawals</option>
              </select>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSearch('id')} style={{ cursor: 'pointer' }}>ID {getSortIcon('id')}</th>
                <th onClick={() => handleSearch('type')} style={{ cursor: 'pointer' }}>Type {getSortIcon('type')}</th>
                <th onClick={() => handleSearch('walletType')} style={{ cursor: 'pointer' }}>Wallet {getSortIcon('walletType')}</th>
                <th onClick={() => handleSearch('amount')} style={{ cursor: 'pointer' }}>Amount {getSortIcon('amount')}</th>
                <th>Fee</th>
                <th onClick={() => handleSearch('description')} style={{ cursor: 'pointer' }}>Description {getSortIcon('description')}</th>
                <th onClick={() => handleSearch('date')} style={{ cursor: 'pointer' }}>Date {getSortIcon('date')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: '600' }}>#{tx.id}</td>
                    <td>
                      <span className={`status-badge ${tx.type === 'deposit' ? 'status-active' : 'status-frozen'}`}>
                        <FontAwesomeIcon icon={tx.type === 'deposit' ? faArrowDown : faArrowUp} />
                        {' '}{tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{tx.walletType || 'main'}</td>
                    <td style={{ color: tx.type === 'deposit' ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                      {tx.type === 'deposit' ? '+' : '-'}{formatUGX(tx.amount)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {tx.fee ? formatUGX(tx.fee) : '-'}
                    </td>
                    <td>
                      {tx.description}
                      {tx.phoneNumber && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          To: {tx.phoneNumber} ({tx.provider})
                        </div>
                      )}
                    </td>
                    <td>{tx.date}</td>
                  </tr>
                ))
              )}
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
        <div className="modal-overlay" onClick={closeWithdrawModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Withdraw Cash</h2>
            
            {withdrawalResult && (
              <div style={{ 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                background: withdrawalResult.success ? 'rgba(0, 212, 170, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                border: `1px solid ${withdrawalResult.success ? '#00d4aa' : '#e74c3c'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <FontAwesomeIcon 
                    icon={withdrawalResult.success ? faCheckCircle : faTimesCircle} 
                    style={{ color: withdrawalResult.success ? '#00d4aa' : '#e74c3c' }} 
                  />
                  <strong style={{ color: withdrawalResult.success ? '#00d4aa' : '#e74c3c' }}>
                    {withdrawalResult.success ? 'Success!' : 'Failed'}
                  </strong>
                </div>
                <p style={{ margin: '0', fontSize: '14px' }}>{withdrawalResult.message}</p>
                {withdrawalResult.success && withdrawalResult.reference && (
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Reference: {withdrawalResult.reference}
                  </p>
                )}
                {withdrawalResult.success && withdrawalResult.amount && (
                  <div style={{ marginTop: '10px', fontSize: '14px' }}>
                    <div>Amount: {formatUGX(withdrawalResult.amount)}</div>
                    <div>Fee: {formatUGX(withdrawalResult.fee)}</div>
                    <div style={{ fontWeight: 'bold', color: '#00d4aa' }}>Net: {formatUGX(withdrawalResult.netAmount)}</div>
                  </div>
                )}
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: '15px' }}
                  onClick={closeWithdrawModal}
                >
                  Close
                </button>
              </div>
            )}

            {!withdrawalResult && (
              <form onSubmit={handleWithdraw}>
                <div className="form-group">
                  <label>Select Wallet to Deduct</label>
                  <select value={walletType} onChange={e => { setWalletType(e.target.value); clearErrors(); }}>
                    <option value="main">Main Wallet ({formatUGX(wallet.main)})</option>
                    <option value="interest">Interest Wallet ({formatUGX(wallet.interest)})</option>
                  </select>
                  {errors.wallet && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.wallet}</span>}
                </div>

                <div className="form-group">
                  <label>Mobile Money Provider</label>
                  <select value={provider} onChange={e => setProvider(e.target.value)}>
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="AIRTEL">Airtel Money</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Recipient Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faPhone} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="tel" value={phoneNumber} onChange={(e) => { setPhoneNumber(e.target.value); clearErrors(); }} placeholder="e.g., 0771234567" style={{ paddingLeft: '40px' }} required />
                  </div>
                  {errors.phone && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>Amount (min: UGX 1,000)</label>
                  <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); clearErrors(); }} placeholder="Enter amount" required />
                  {errors.amount && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.amount}</span>}
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <div style={{ 
                    padding: '15px', 
                    background: 'var(--secondary)', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    fontSize: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <FontAwesomeIcon icon={faInfoCircle} style={{ color: '#f1c40f' }} />
                      <strong style={{ color: '#f1c40f' }}>Withdrawal Summary</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Wallet:</span>
                        <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{walletType}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Provider:</span>
                        <div style={{ fontWeight: '600' }}>{provider}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                        <div style={{ fontWeight: '600' }}>{formatUGX(parseFloat(amount))}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Fee ({feePercent}%):</span>
                        <div style={{ fontWeight: '600', color: '#e74c3c' }}>- {formatUGX(calculatedFee)}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Net Amount to Send:</span>
                        <div style={{ fontWeight: '700', fontSize: '18px', color: '#00d4aa' }}>{formatUGX(netAmount)}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <FontAwesomeIcon icon={faPaperPlane} /> Funds will be sent to {provider} at {phoneNumber || 'specified number'}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a note" />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeWithdrawModal}>Cancel</button>
                  <button type="submit" className="btn btn-danger" disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Withdraw to Mobile Money'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}