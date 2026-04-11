import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faWallet, faUsers, faChartLine, faSnowflake } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

export default function Dashboard() {
  const { packages, transactions, wallet } = useApp();
  
  const activePackages = packages.filter(p => p.status === 'active').length;
  const frozenPackages = packages.filter(p => p.status === 'frozen').length;
  const totalLoans = transactions.reduce((sum, t) => sum + t.amountPaid, 0);
  const pendingRepayments = transactions.filter(t => t.status === 'pending').length;

  const performanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Total Payouts',
        data: [12000, 19000, 25000, 22000, 28000, 35000],
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Returns',
        data: [10000, 15000, 21000, 18000, 24000, 30000],
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
    return packages.map((pkg, index) => ({
      label: pkg.name,
      data: pkg.monthlyPayout.length > 0 ? pkg.monthlyPayout : [0, 0, 0, 0, 0, 0],
      borderColor: colors[index % colors.length],
      backgroundColor: `${colors[index % colors.length]}33`,
      tension: 0.4,
    }));
  };

  const multiPackageData = {
    labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4'],
    datasets: getMonthlyData(),
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
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
    </div>
  );
}