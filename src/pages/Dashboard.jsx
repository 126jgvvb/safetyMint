import { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faWallet, faUsers, faChartLine, faSnowflake, faArrowDown, faArrowUp, faCalendar, faMoneyBillWave, faPercent, faClock, faSync } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const REFRESH_INTERVAL = 30000; // 30 seconds
const QUICK_REFRESH_INTERVAL = 10000; // 10 seconds for quick updates

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

export default function Dashboard() {
  const { packages, transactions, wallet, useApi, setPackages, setTransactions, setWallet } = useApp();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
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
        </div>
      </div>

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