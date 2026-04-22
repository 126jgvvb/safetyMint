import { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faArrowUp, faArrowDown, faPaperPlane, faPhone, faCheckCircle, faTimesCircle, faInfoCircle, faSearch, faFilter, faSort, faSortUp, faSortDown, faBox, faMoneyBillWave, faCoins, faClock, faPercentage, faSync, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
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
  
  // State
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
  
  // Package investments state
  const [investments, setInvestments] = useState([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  const [investmentsError, setInvestmentsError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Package withdraw modal state
  const [showPackageWithdrawModal, setShowPackageWithdrawModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageWithdrawAmount, setPackageWithdrawAmount] = useState('');
  const [packageWithdrawPhone, setPackageWithdrawPhone] = useState('');
  const [packageWithdrawProvider, setPackageWithdrawProvider] = useState('MTN');
  const [packageWithdrawResult, setPackageWithdrawResult] = useState(null);

  // Fetch investments from backend
  const fetchInvestments = useCallback(async () => {
    setInvestmentsLoading(true);
    setInvestmentsError(null);
    try {
      if (useApi) {
        const data = await api.getInvestments();
        setInvestments(data);
      } else {
        // Fallback hardcoded data
        setInvestments([
          {
            packageId: 1,
            packageName: 'Starter Loan',
            principalAmount: 5000,
            principalReturned: 5250,
            interestReturned: 250,
            remainingPrincipal: 0,
            remainingInterest: 0,
            status: 'completed',
          },
          {
            packageId: 2,
            packageName: 'Business Loan',
            principalAmount: 10000,
            principalReturned: 5400,
            interestReturned: 400,
            remainingPrincipal: 4600,
            remainingInterest: 400,
            status: 'partial',
          },
          {
            packageId: 3,
            packageName: 'Premium Loan',
            principalAmount: 75000,
            principalReturned: 7500,
            interestReturned: 0,
            remainingPrincipal: 67500,
            remainingInterest: 9000,
            status: 'partial',
          },
        ]);
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch investments:', error);
      setInvestmentsError('Failed to load investments');
    } finally {
      setInvestmentsLoading(false);
    }
  }, [useApi]);

  // Initial fetch and interval refresh
  useEffect(() => {
    fetchInvestments();
    const interval = setInterval(fetchInvestments, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchInvestments]);

  // Handle per-package withdrawal
  const handlePackageWithdraw = async (pkg) => {
    const maxWithdraw = pkg.remainingPrincipal;
    if (maxWithdraw <= 0) {
      return;
    }
    setSelectedPackage(pkg);
    setPackageWithdrawAmount('');
    setPackageWithdrawResult(null);
    setShowPackageWithdrawModal(true);
  };

  const handlePackageWithdrawSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPackage || !packageWithdrawAmount) return;

    const parsedAmount = parseFloat(packageWithdrawAmount);
    const maxWithdraw = selectedPackage.remainingPrincipal;
    const calculatedFee = Math.floor(parsedAmount * (feePercent / 100));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    if (parsedAmount > maxWithdraw) {
      return;
    }

    if (parsedAmount < 1000) {
      return;
    }

    setIsProcessing(true);
    try {
      if (useApi) {
        const result = await api.withdrawFromPackage(
          selectedPackage.packageId, 
          parsedAmount,
          packageWithdrawPhone,
          packageWithdrawProvider,
          `Withdrawal from ${selectedPackage.packageName}`
        );
        if (result?.success) {
          setPackageWithdrawResult({
            success: true,
            message: result.message || 'Withdrawal completed successfully!',
            withdrawn: result.withdrawn,
            fee: result.fee,
            netAmount: result.netAmount,
            phoneNumber: result.phoneNumber,
            provider: result.provider,
            reference: result.reference,
          });
          fetchInvestments();
        } else {
          setPackageWithdrawResult({
            success: false,
            message: result?.message || 'Withdrawal failed',
          });
        }
      } else {
        setPackageWithdrawResult({
          success: true,
          message: `Withdrawal of ${formatUGX(parsedAmount - calculatedFee)} sent to ${packageWithdrawPhone || 'your main wallet'}`,
          withdrawn: parsedAmount,
          fee: calculatedFee,
          netAmount: parsedAmount - calculatedFee,
          phoneNumber: packageWithdrawPhone,
          provider: packageWithdrawProvider,
        });
        fetchInvestments();
      }
    } catch (error) {
      setPackageWithdrawResult({
        success: false,
        message: error.message || 'An error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const closePackageWithdrawModal = () => {
    setShowPackageWithdrawModal(false);
    setSelectedPackage(null);
    setPackageWithdrawAmount('');
    setPackageWithdrawPhone('');
    setPackageWithdrawProvider('MTN');
    setPackageWithdrawResult(null);
  };

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

      {/* Main & Interest Wallets */}
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

      {/* Package Investments Cards */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2>Package Investments</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
              Principal funds and interest earned per package
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faClock} />
            <span>Auto-refreshes every 30s</span>
            <button 
              onClick={fetchInvestments} 
              disabled={investmentsLoading}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
            >
              <FontAwesomeIcon icon={faSync} spin={investmentsLoading} />
            </button>
          </div>
        </div>

        {investmentsError && (
          <div style={{ padding: '15px', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#e74c3c' }} />
            <span style={{ color: '#e74c3c' }}>{investmentsError} - showing cached data</span>
          </div>
        )}

        <div className="wallet-section" style={{ flexWrap: 'wrap', gap: '20px' }}>
          {investments.map((inv) => {
            const totalPrincipal = (inv.principalReturned || 0) + (inv.remainingPrincipal || 0);
            const availableToWithdraw = inv.remainingPrincipal || 0;
            const isProcessingWithdraw = false; // Could track per-card loading state

            return (
              <div 
                key={inv.packageId || inv.packageName} 
                className="wallet-card" 
                style={{ 
                  minWidth: '260px', 
                  flex: '1 1 calc(33.333% - 20px)',
                  position: 'relative',
                  borderLeft: inv.status === 'completed' ? '4px solid #00d4aa' : '4px solid #f1c40f',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>
                    <FontAwesomeIcon icon={faBox} /> {inv.packageName}
                  </h3>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: '10px',
                    background: inv.status === 'completed' ? 'rgba(0, 212, 170, 0.2)' : 'rgba(241, 196, 15, 0.2)',
                    color: inv.status === 'completed' ? '#00d4aa' : '#f1c40f',
                  }}>
                    {inv.status}
                  </span>
                </div>

                <div className="amount">{formatUGX(totalPrincipal)}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '5px' }}>
                  Total Principal Invested
                </p>

                <div style={{ marginTop: '15px', padding: '12px', background: 'var(--secondary)', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Interest Earned:</span>
                    <span style={{ fontWeight: '600', color: '#9b59b6' }}>{formatUGX(inv.interestReturned || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Principal Returned:</span>
                    <span style={{ fontWeight: '600', color: 'var(--success)' }}>{formatUGX(inv.principalReturned || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Remaining Principal:</span>
                    <span style={{ fontWeight: '600', color: availableToWithdraw > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {formatUGX(inv.remainingPrincipal || 0)}
                    </span>
                  </div>
                </div>

                {availableToWithdraw > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      onClick={() => handlePackageWithdraw(inv)}
                      disabled={isProcessing}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'linear-gradient(135deg, #00d4aa 0%, #00a080 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                      onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                      <FontAwesomeIcon icon={faMoneyBillWave} />
                      Withdraw from Package
                    </button>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                      Fee: UGX 1,000 (deducted from withdrawal amount)
                    </p>
                  </div>
                )}

                {availableToWithdraw <= 0 && inv.status === 'completed' && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '10px', 
                    background: 'rgba(0, 212, 170, 0.1)', 
                    borderRadius: '6px', 
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--success)',
                    fontWeight: '600'
                  }}>
                    Fully Withdrawn
                  </div>
                )}

                {lastRefresh && (
                  <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Updated: {lastRefresh.toLocaleTimeString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Wallet Transactions */}
      <div className="card" style={{ marginTop: '20px' }}>
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

      {/* Deposit Modal */}
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

{/* Withdraw Modal */}
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
                    <input type="tel" value={phoneNumber} onChange={e => { setPhoneNumber(e.target.value); clearErrors(); }} placeholder="e.g., 0771234567" style={{ paddingLeft: '40px' }} required />
                  </div>
                  {errors.phone && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>Amount (min: UGX 1,000)</label>
                  <input type="number" value={amount} onChange={e => { setAmount(e.target.value); clearErrors(); }} placeholder="Enter amount" required />
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
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a note" />
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

      {/* Package Withdraw Modal */}
      {showPackageWithdrawModal && selectedPackage && (
        <div className="modal-overlay" onClick={closePackageWithdrawModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>
              <FontAwesomeIcon icon={faMoneyBillWave} style={{ marginRight: '10px', color: '#00d4aa' }} />
              Withdraw from {selectedPackage.packageName}
            </h2>
            
            {packageWithdrawResult && (
              <div style={{ 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                background: packageWithdrawResult.success ? 'rgba(0, 212, 170, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                border: `1px solid ${packageWithdrawResult.success ? '#00d4aa' : '#e74c3c'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <FontAwesomeIcon 
                    icon={packageWithdrawResult.success ? faCheckCircle : faTimesCircle} 
                    style={{ color: packageWithdrawResult.success ? '#00d4aa' : '#e74c3c' }} 
                  />
                  <strong style={{ color: packageWithdrawResult.success ? '#00d4aa' : '#e74c3c' }}>
                    {packageWithdrawResult.success ? 'Success!' : 'Failed'}
                  </strong>
                </div>
                <p style={{ margin: '0', fontSize: '14px' }}>{packageWithdrawResult.message}</p>
                {packageWithdrawResult.success && packageWithdrawResult.withdrawn && (
                  <div style={{ marginTop: '10px', fontSize: '14px' }}>
                    <div>Withdrawn: {formatUGX(packageWithdrawResult.withdrawn)}</div>
                    <div>Fee ({feePercent}%): {formatUGX(packageWithdrawResult.fee)}</div>
                    <div style={{ fontWeight: 'bold', color: '#00d4aa' }}>
                      {packageWithdrawResult.phoneNumber ? 'Net Sent to Phone' : 'Net Credited'}: {formatUGX(packageWithdrawResult.netAmount)}
                    </div>
                    {packageWithdrawResult.phoneNumber && (
                      <div style={{ marginTop: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Sent to {packageWithdrawResult.provider}: {packageWithdrawResult.phoneNumber}
                      </div>
                    )}
                    {packageWithdrawResult.reference && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Reference: {packageWithdrawResult.reference}
                      </div>
                    )}
                  </div>
                )}
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: '15px' }}
                  onClick={closePackageWithdrawModal}
                >
                  Close
                </button>
              </div>
            )}

            {!packageWithdrawResult && (
              <form onSubmit={handlePackageWithdrawSubmit}>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--secondary)', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Available to Withdraw:</span>
                    <span style={{ fontWeight: '600', color: '#00d4aa' }}>
                      {formatUGX(selectedPackage.remainingPrincipal)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Interest Earned:</span>
                    <span style={{ fontWeight: '600', color: '#9b59b6' }}>
                      {formatUGX(selectedPackage.interestReturned)}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Mobile Money Provider</label>
                  <select 
                    value={packageWithdrawProvider} 
                    onChange={(e) => setPackageWithdrawProvider(e.target.value)}
                  >
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="AIRTEL">Airtel Money</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Phone Number (for withdrawal to mobile money)</label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faPhone} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="tel" 
                      value={packageWithdrawPhone} 
                      onChange={(e) => setPackageWithdrawPhone(e.target.value)} 
                      placeholder="e.g., 0771234567"
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    Leave empty to credit to Main Wallet instead
                  </small>
                </div>

                <div className="form-group">
                  <label>Amount to Withdraw (min: UGX 1,000)</label>
                  <input 
                    type="number" 
                    value={packageWithdrawAmount} 
                    onChange={(e) => setPackageWithdrawAmount(e.target.value)} 
                    placeholder={`Max: ${selectedPackage.remainingPrincipal}`}
                    required
                  />
                  {packageWithdrawAmount && parseFloat(packageWithdrawAmount) > 0 && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '12px', 
                      background: 'rgba(241, 196, 15, 0.1)', 
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Withdrawal Amount:</span>
                        <span style={{ fontWeight: '600' }}>{formatUGX(parseFloat(packageWithdrawAmount))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Platform Fee ({feePercent}%):</span>
                        <span style={{ fontWeight: '600', color: '#e74c3c' }}>
                          -{formatUGX(Math.floor(parseFloat(packageWithdrawAmount) * (feePercent / 100)))}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Net to Receive:</span>
                        <span style={{ fontWeight: '700', color: '#00d4aa', fontSize: '16px' }}>
                          {formatUGX(parseFloat(packageWithdrawAmount) - Math.floor(parseFloat(packageWithdrawAmount) * (feePercent / 100)))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ 
                  padding: '12px', 
                  background: packageWithdrawPhone ? 'rgba(231, 76, 60, 0.1)' : 'rgba(0, 212, 170, 0.1)', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '15px'
                }}>
                  <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '5px' }} />
                  {packageWithdrawPhone 
                    ? `Funds will be sent to ${packageWithdrawProvider} at ${packageWithdrawPhone}`
                    : 'Funds will be credited to your Main Wallet after fee deduction'
                  }
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closePackageWithdrawModal}>Cancel</button>
                  <button 
                    type="submit" 
                    className="btn btn-danger"
                    disabled={isProcessing || !packageWithdrawAmount || parseFloat(packageWithdrawAmount) < 1000 || parseFloat(packageWithdrawAmount) > selectedPackage.remainingPrincipal}
                  >
                    {isProcessing ? 'Processing...' : (packageWithdrawPhone ? 'Withdraw to Mobile Money' : 'Withdraw to Main Wallet')}
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
