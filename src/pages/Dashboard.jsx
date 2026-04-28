import { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faWallet, faUsers, faChartLine, faSnowflake, faArrowDown, faArrowUp, faCalendar, faMoneyBillWave, faPercent, faClock, faSync, faCog, faSlidersH, faList, faSync as faSpin, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const REFRESH_INTERVAL = 30000;
const QUICK_REFRESH_INTERVAL = 10000;

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

export default function Dashboard() {
  const { packages, transactions, wallet, useApi, setPackages, setTransactions, setWallet } = useApp();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Configuration Panel State
  const [activeConfigTab, setActiveConfigTab] = useState(null);
  const [queueConfig, setQueueConfig] = useState(null);
  const [pendingDisbursements, setPendingDisbursements] = useState(null);
  const [platformFee, setPlatformFee] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [configSuccess, setConfigSuccess] = useState(null);

  // Form States
  const [newQueueSize, setNewQueueSize] = useState('');
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  const [retryInterval, setRetryInterval] = useState('');
  const [newPlatformFee, setNewPlatformFee] = useState('');

  const fetchFreshData = useCallback(async () => {
    if (!useApi) return;
    
    setIsRefreshing(true);
    try {
      const [pkgData, walletData, txnData] = await Promise.all([
        api.getPackages(),
        api.getWallet(),
        api.getTransactions(),
      ]);
      
      if (pkgData) setPackages(pkgData);
      if (walletData) setWallet(walletData);
      if (txnData) setTransactions(txnData);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [useApi, setPackages, setWallet, setTransactions]);

  const fetchQueueConfig = async () => {
    if (!useApi) return;
    try {
      setIsLoadingConfig(true);
      setConfigError(null);
      const data = await api.getQueueConfig();
      setQueueConfig(data);
      setAutoRetryEnabled(data.autoRetryEnabled || false);
      setNewQueueSize(data.maxQueueSize?.toString() || '');
      setRetryInterval(data.retryIntervalMinutes?.toString() || '');
      setConfigSuccess('Queue configuration loaded successfully');
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to fetch queue config:', error);
      setConfigError('Failed to load queue configuration');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const fetchPendingDisbursements = async () => {
    if (!useApi) return;
    try {
      setIsLoadingConfig(true);
      setConfigError(null);
      const data = await api.getPendingDisbursements();
      setPendingDisbursements(data);
    } catch (error) {
      console.error('Failed to fetch pending disbursements:', error);
      setConfigError('Failed to load pending disbursements');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const fetchPlatformFee = async () => {
    if (!useApi) return;
    try {
      setIsLoadingConfig(true);
      setConfigError(null);
      const data = await api.getPlatformFee();
      setPlatformFee(data);
      setNewPlatformFee(data.feePercentage?.toString() || '');
    } catch (error) {
      console.error('Failed to fetch platform fee:', error);
      setConfigError('Failed to load platform fee');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleUpdateQueueConfig = async (e) => {
    e.preventDefault();
    if (!useApi) return;
    
    try {
      setIsLoadingConfig(true);
      setConfigError(null);
      const config = {};
      if (newQueueSize) config.maxQueueSize = parseInt(newQueueSize);
      if (retryInterval) config.retryIntervalMinutes = parseInt(retryInterval);
      
      const data = await api.updateQueueConfig(config);
      setQueueConfig(data);
      setConfigSuccess('Queue configuration updated successfully');
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update queue config:', error);
      setConfigError('Failed to update queue configuration');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleToggleAutoRetry = async () => {
    if (!useApi) return;
    
    try {
      setIsLoadingConfig(true);
      setConfigError(null);
      const newEnabled = !autoRetryEnabled;
      await api.toggleAutoRetry(newEnabled);
      setAutoRetryEnabled(newEnabled);
      setConfigSuccess(`Auto-retry ${newEnabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setConfigSuccess(null), 3000);
      
      if (queueConfig) {
        setQueueConfig({ ...queueConfig, autoRetryEnabled: newEnabled });
      }
    } catch (error) {
      console.error('Failed to toggle auto retry:', error);
      setConfigError('Failed to update auto-retry setting');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleSetRetryInterval = async (e) => {
    e.preventDefault();
    if (!useApi) return;
    
    try {
      setIsLoadingConfig(true);
      setConfigError(null);
      await api.setRetryInterval(parseInt(retryInterval));
      setConfigSuccess(`Retry interval set to ${retryInterval} minutes`);
      setTimeout(() => setConfigSuccess(null), 3000);
      
      if (queueConfig) {
        setQueueConfig({ ...queueConfig, retryIntervalMinutes: parseInt(retryInterval) });
      }
    } catch (error) {
      console.error('Failed to set retry interval:', error);
      setConfigError('Failed to update retry interval');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleUpdatePlatformFee = async (e) => {
    e.preventDefault();
    if (!useApi) return;
    
    try {
      setIsLoadingConfig(true);
      setConfigError(null);
      const percentage = parseFloat(newPlatformFee);
      await api.setPlatformFee(percentage);
      const updated = await api.getPlatformFee();
      setPlatformFee(updated);
      setConfigSuccess(`Platform fee updated to ${percentage}%`);
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update platform fee:', error);
      setConfigError('Failed to update platform fee');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (useApi) {
      api.getAnalytics().then(data => {
        if (data) {
          setAnalyticsData(data);
        }
      });
    }
  }, [useApi]);

  useEffect(() => {
    if (!useApi) return;
    
    fetchFreshData();
    
    const interval = setInterval(fetchFreshData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [useApi, fetchFreshData]);

  const activePackages = packages.filter(p => p.status === 'active').length;
  const frozenPackages = packages.filter(p => p.status === 'frozen').length;
  const totalLoans = transactions.reduce((sum, t) => sum + t.amountPaid, 0);
  const pendingRepayments = transactions.filter(t => t.status === 'pending').length;

  const packageStats = {
    totalPrincipal: packages.reduce((sum, pkg) => sum + (pkg.amountDeducted || 0), 0),
    totalInterests: packages.reduce((sum, pkg) => sum + (pkg.interestObtained || 0) + (pkg.interestsRemaining || 0), 0),
    interestsObtained: packages.reduce((sum, pkg) => sum + (pkg.interestObtained || 0), 0),
    interestsRemaining: packages.reduce((sum, pkg) => sum + (pkg.interestsRemaining || 0), 0),
    amountReturnedForcefully: packages.reduce((sum, pkg) => sum + (pkg.amountReturnedForcefully || 0), 0),
    amountReturnedSuccessfully: packages.reduce((sum, pkg) => sum + (pkg.amountReturnedSuccessfully || 0), 0),
  };

  const performanceData = analyticsData?.monthlyPerformance
    ? {
        labels: analyticsData.monthlyPerformance.labels,
        datasets: [
          {
            label: 'Total Payouts',
            data: analyticsData.monthlyPerformance.payouts,
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Returns',
            data: analyticsData.monthlyPerformance.returns,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      }
    : {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Total Payouts',
            data: transactions.reduce((sum, t) => [...sum, t.amountPaid], [12000, 19000, 25000, 22000, 28000, 35000].slice(transactions.length)),
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Returns',
            data: transactions.filter(t => t.status === 'paid').reduce((sum, t) => [...sum, t.amountToReturn], [10000, 15000, 21000, 18000, 24000, 30000].slice(transactions.length)),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#8898aa' },
      },
    },
    scales: {
      x: {
        grid: { color: '#2d3555' },
        ticks: { color: '#8898aa' },
      },
      y: {
        grid: { color: '#2d3555' },
        ticks: { color: '#8898aa' },
      },
    },
  };

  const getMonthlyData = () => {
    const colors = ['#00d4aa', '#3498db', '#9b59b6', '#e74c3c'];
    
    if (analyticsData?.packagePerformance) {
      return analyticsData.packagePerformance.datasets;
    }
    
    return packages.map((pkg, index) => ({
      label: pkg.name,
      data: pkg.monthlyPayout.length > 0 ? pkg.monthlyPayout : [0, 0, 0, 0],
      borderColor: colors[index % colors.length],
      backgroundColor: `${colors[index % colors.length]}33`,
      tension: 0.4,
      fill: true,
    }));
  };

  const multiPackageData = analyticsData?.packagePerformance
    ? analyticsData.packagePerformance
    : {
        labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4'],
        datasets: getMonthlyData(),
      };

  // Render Configuration Control Panel
  const renderConfigPanel = () => {
    if (!activeConfigTab) return null;

    return (
      <div className="config-panel card" style={{ marginTop: '20px', border: '2px solid var(--primary-color)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #2d3555', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FontAwesomeIcon icon={faCog} style={{ color: '#00d4aa', fontSize: '20px' }} />
            <h2 style={{ margin: 0 }}>Configuration Center</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={`btn ${activeConfigTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveConfigTab('queue');
                fetchQueueConfig();
              }}
              disabled={isLoadingConfig}
            >
              <FontAwesomeIcon icon={faSlidersH} /> Queue Settings
            </button>
            <button 
              className={`btn ${activeConfigTab === 'disbursements' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveConfigTab('disbursements');
                fetchPendingDisbursements();
              }}
              disabled={isLoadingConfig}
            >
              <FontAwesomeIcon icon={faList} /> Pending Disbursements
            </button>
            <button 
              className={`btn ${activeConfigTab === 'fee' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveConfigTab('fee');
                fetchPlatformFee();
              }}
              disabled={isLoadingConfig}
            >
              <FontAwesomeIcon icon={faPercent} /> Platform Fee
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setActiveConfigTab(null)}
            >
              Close
            </button>
          </div>
        </div>

        <div className="config-content" style={{ padding: '24px' }}>
          {configError && (
            <div className="alert alert-error" style={{ padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '16px' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} /> {configError}
            </div>
          )}
          {configSuccess && (
            <div className="alert alert-success" style={{ padding: '12px 16px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '16px' }}>
              <FontAwesomeIcon icon={faCheckCircle} /> {configSuccess}
            </div>
          )}

          {/* Queue Configuration Tab */}
          {activeConfigTab === 'queue' && (
            <div className="config-section">
              <h3>Queue Configuration</h3>
              {queueConfig && (
                <div className="current-config" style={{ backgroundColor: '#1a1f3a', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Current Settings</h4>
                  <div className="config-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>
                    <div>
                      <label>Max Queue Size</label>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4aa' }}>{queueConfig.maxQueueSize}</div>
                    </div>
                    <div>
                      <label>Auto Retry</label>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: queueConfig.autoRetryEnabled ? '#00d4aa' : '#e74c3c' }}>
                        {queueConfig.autoRetryEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <div>
                      <label>Retry Interval</label>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4aa' }}>
                        {queueConfig.retryIntervalMinutes} min
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="config-forms">
                <form onSubmit={handleUpdateQueueConfig} style={{ backgroundColor: '#1a1f3a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Update Max Queue Size</h4>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label>New Max Queue Size</label>
                      <input
                        type="number"
                        value={newQueueSize}
                        onChange={(e) => setNewQueueSize(e.target.value)}
                        placeholder="Enter new queue size"
                        min="1"
                        max="1000"
                        style={{ width: '100%', padding: '10px', backgroundColor: '#2d3555', border: '1px solid #3d4a7a', borderRadius: '4px', color: '#ffffff' }}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={isLoadingConfig || !newQueueSize}
                    >
                      {isLoadingConfig ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </form>

                <div style={{ backgroundColor: '#1a1f3a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Auto Retry Toggle</h4>
                  <p style={{ color: '#8898aa', marginBottom: '16px' }}>
                    Enable or disable automatic retry for failed transactions
                  </p>
                  <button
                    type="button"
                    className={`btn ${autoRetryEnabled ? 'btn-danger' : 'btn-success'}`}
                    onClick={handleToggleAutoRetry}
                    disabled={isLoadingConfig}
                    style={{ padding: '12px 24px' }}
                  >
                    {isLoadingConfig ? 'Updating...' : autoRetryEnabled ? 'Disable Auto Retry' : 'Enable Auto Retry'}
                  </button>
                </div>

                <form onSubmit={handleSetRetryInterval} style={{ backgroundColor: '#1a1f3a', padding: '20px', borderRadius: '8px' }}>
                  <h4>Set Retry Interval</h4>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label>Retry Interval (minutes)</label>
                      <input
                        type="number"
                        value={retryInterval}
                        onChange={(e) => setRetryInterval(e.target.value)}
                        placeholder="Enter interval in minutes"
                        min="1"
                        max="1440"
                        style={{ width: '100%', padding: '10px', backgroundColor: '#2d3555', border: '1px solid #3d4a7a', borderRadius: '4px', color: '#ffffff' }}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={isLoadingConfig || !retryInterval}
                    >
                      {isLoadingConfig ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Pending Disbursements Tab */}
          {activeConfigTab === 'disbursements' && (
            <div className="config-section">
              <h3>Pending Disbursements</h3>
              <button 
                className="btn btn-primary" 
                onClick={fetchPendingDisbursements}
                disabled={isLoadingConfig}
                style={{ marginBottom: '20px' }}
              >
                <FontAwesomeIcon icon={faSync} spin={isLoadingConfig} /> Refresh Data
              </button>

              {pendingDisbursements && (
                <div>
                  <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div className="stat-card">
                      <h4>Total Queue Amount</h4>
                      <div className="value">{formatUGX(pendingDisbursements.totalQueueAmount || 0)}</div>
                    </div>
                    <div className="stat-card">
                      <h4>Total Pending Amount</h4>
                      <div className="value">{formatUGX(pendingDisbursements.totalPendingAmount || 0)}</div>
                    </div>
                    <div className="stat-card">
                      <h4>Queued Transactions</h4>
                      <div className="value">{pendingDisbursements.queue?.length || 0}</div>
                    </div>
                    <div className="stat-card">
                      <h4>Pending Requests</h4>
                      <div className="value">{pendingDisbursements.pendingRequests?.length || 0}</div>
                    </div>
                  </div>

                  <div className="table-container" style={{ marginBottom: '30px' }}>
                    <h4>Queued Transactions</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Package</th>
                          <th>Member</th>
                          <th>Amount</th>
                          <th>Amount to Return</th>
                          <th>Status</th>
                          <th>Retries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingDisbursements.queue?.length > 0 ? (
                          pendingDisbursements.queue.map((item) => (
                            <tr key={item.id}>
                              <td>{item.id}</td>
                              <td>{item.packageName}</td>
                              <td>{item.memberName}</td>
                              <td>{formatUGX(item.amount)}</td>
                              <td>{formatUGX(item.amountToReturn)}</td>
                              <td>
                                <span className={`status-badge ${item.status === 'queued' ? 'status-active' : 'status-frozen'}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td>{item.retryCount || 0}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No queued transactions</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-container">
                    <h4>Pending Payment Requests</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Package</th>
                          <th>Member</th>
                          <th>Amount</th>
                          <th>Amount to Return</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingDisbursements.pendingRequests?.length > 0 ? (
                          pendingDisbursements.pendingRequests.map((req) => (
                            <tr key={req.id}>
                              <td>{req.id}</td>
                              <td>{req.packageName}</td>
                              <td>{req.memberName}</td>
                              <td>{formatUGX(req.amount)}</td>
                              <td>{formatUGX(req.amountToReturn)}</td>
                              <td>
                                <span className={`status-badge ${req.status === 'pending' ? 'status-active' : 'status-frozen'}`}>
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No pending requests</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Platform Fee Tab */}
          {activeConfigTab === 'fee' && (
            <div className="config-section">
              <h3>Platform Fee Configuration</h3>
              {platformFee && (
                <div className="current-config" style={{ backgroundColor: '#1a1f3a', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Current Fee</h4>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#00d4aa', textAlign: 'center', margin: '16px 0' }}>
                    {platformFee.feePercentage}%
                  </div>
                  <p style={{ color: '#8898aa', textAlign: 'center' }}>Platform fee percentage applied to all withdrawals</p>
                </div>
              )}

              <form onSubmit={handleUpdatePlatformFee} style={{ backgroundColor: '#1a1f3a', padding: '20px', borderRadius: '8px', maxWidth: '500px' }}>
                <h4>Update Platform Fee</h4>
                <p style={{ color: '#8898aa', marginBottom: '16px' }}>
                  Enter new platform fee percentage (e.g., 5.5 for 5.5%)
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label>New Platform Fee (%)</label>
                    <input
                      type="number"
                      value={newPlatformFee}
                      onChange={(e) => setNewPlatformFee(e.target.value)}
                      placeholder="Enter fee percentage"
                      step="0.01"
                      min="0"
                      max="100"
                      style={{ width: '100%', padding: '12px', backgroundColor: '#2d3555', border: '1px solid #3d4a7a', borderRadius: '4px', fontSize: '18px', color: '#ffffff' }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isLoadingConfig || !newPlatformFee}
                    style={{ padding: '12px 24px' }}
                  >
                    {isLoadingConfig ? 'Updating...' : 'Update Fee'}
                  </button>
                </div>
              </form>

              <div className="info-box" style={{ backgroundColor: '#2d3555', padding: '16px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #00d4aa' }}>
                <h4 style={{ marginTop: 0 }}>How It Works</h4>
                <p style={{ color: '#8898aa', marginBottom: '8px' }}>
                  The platform fee is automatically calculated and deducted from all withdrawal transactions:
                </p>
                <ul style={{ color: '#8898aa', paddingLeft: '20px' }}>
                  <li>Fee Amount = Withdrawal Amount × (Platform Fee % / 100)</li>
                  <li>Net Amount = Withdrawal Amount - Fee Amount</li>
                  <li>Example: UGX 100,000 withdrawal with 5% fee = UGX 5,000 fee, UGX 95,000 net</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <span className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button 
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={fetchFreshData}
            disabled={isRefreshing}
            title="Refresh data"
          >
            <FontAwesomeIcon icon={faSync} spin={isRefreshing} />
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setActiveConfigTab(activeConfigTab ? null : 'queue');
              if (!activeConfigTab) fetchQueueConfig();
            }}
            title="Configuration Center"
            style={{ marginLeft: '10px', padding: '8px 16px' }}
          >
            <FontAwesomeIcon icon={faCog} /> Configuration
          </button>
        </div>
      </div>

      {renderConfigPanel()}

      <div className="stats-grid">
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faBox} /> Active Packages</h3>
          <div className="value">{activePackages}</div>
          <div className="sub-value">{frozenPackages} frozen</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faWallet} /> Total Wallet</h3>
          <div className="value">{formatUGX(wallet.main + wallet.interest)}</div>
          <div className="sub-value">Main: {formatUGX(wallet.main)}</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faUsers} /> Total Loans Issued</h3>
          <div className="value">{formatUGX(totalLoans)}</div>
          <div className="sub-value">{transactions.length} transactions</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faChartLine} /> Pending Repayments</h3>
          <div className="value">{pendingRepayments}</div>
          <div className="sub-value">
            {formatUGX(transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amountToReturn, 0))}
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3>Overall Performance</h3>
        </div>
        <div style={{ height: '300px' }}>
          <Line data={performanceData} options={chartOptions} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Package Performance</h2>
        </div>
        <div style={{ height: '300px' }}>
          <Line data={multiPackageData} options={chartOptions} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Quick Overview</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Status</th>
                <th>Current Amount</th>
                <th>Rate</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => {
                const progress = pkg.currentAmount > 0 ? Math.min((pkg.currentAmount / pkg.maxAmount) * 100, 100) : 0;
                return (
                  <tr key={pkg.id}>
                    <td>{pkg.name}</td>
                    <td>
                      <span className={`status-badge ${pkg.status === 'active' ? 'status-active' : 'status-frozen'}`}>
                        {pkg.status === 'active' ? <FontAwesomeIcon icon={faBox} /> : <FontAwesomeIcon icon={faSnowflake} />}
                        {' '}{pkg.status}
                      </span>
                    </td>
                    <td>{formatUGX(pkg.currentAmount)}</td>
                    <td>{pkg.interestRate}%</td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Loan Package Financial Details</h2>
        </div>
        
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '20px' }}>
          <div className="stat-card">
            <h3><FontAwesomeIcon icon={faMoneyBillWave} /> Total Principal</h3>
            <div className="value">{formatUGX(packageStats.totalPrincipal)}</div>
            <div className="sub-value">Sum of all packages</div>
          </div>
          <div className="stat-card">
            <h3><FontAwesomeIcon icon={faPercent} /> Total Interests</h3>
            <div className="value" style={{ color: '#f1c40f' }}>{formatUGX(packageStats.totalInterests)}</div>
            <div className="sub-value">All interests earned</div>
          </div>
          <div className="stat-card">
            <h3><FontAwesomeIcon icon={faArrowUp} /> Interests Obtained</h3>
            <div className="value" style={{ color: '#00d4aa' }}>{formatUGX(packageStats.interestsObtained)}</div>
            <div className="sub-value">Collected</div>
          </div>
          <div className="stat-card" style={{ borderColor: '#f1c40f' }}>
            <h3><FontAwesomeIcon icon={faClock} /> Interests Remaining</h3>
            <div className="value" style={{ color: '#f1c40f' }}>{formatUGX(packageStats.interestsRemaining)}</div>
            <div className="sub-value">Pending collection</div>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Amount Deducted</th>
                <th>Date Deducted</th>
                <th>Returned Successfully</th>
                <th>Returned Forcefully</th>
                <th>Interest Obtained</th>
                <th>Interests Remaining</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr key={pkg.id}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{pkg.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pkg.interestRate}% rate</div>
                  </td>
                  <td>
                    <div style={{ color: '#e74c3c' }}>{formatUGX(pkg.amountDeducted || 0)}</div>
                  </td>
                  <td>
                    {pkg.amountDeductedAt ? new Date(pkg.amountDeductedAt).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    <div style={{ color: '#00d4aa' }}>{formatUGX(pkg.amountReturnedSuccessfully || 0)}</div>
                  </td>
                  <td>
                    <div style={{ color: '#9b59b6' }}>{formatUGX(pkg.amountReturnedForcefully || 0)}</div>
                  </td>
                  <td>
                    <div style={{ color: '#f1c40f' }}>{formatUGX(pkg.interestObtained || 0)}</div>
                  </td>
                  <td>
                    <div style={{ color: '#f1c40f' }}>{formatUGX(pkg.interestsRemaining || 0)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
