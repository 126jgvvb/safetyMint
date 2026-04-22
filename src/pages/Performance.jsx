import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

export default function Performance() {
  const { packages, transactions, useApi } = useApp();
  const [analyticsData, setAnalyticsData] = useState(null);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  useEffect(() => {
    if (useApi) {
      api.getAnalytics().then(data => {
        if (data) {
          setAnalyticsData(data);
        }
      });
    }
  }, [useApi]);

  const generateMonthlyData = () => {
    const colors = ['#00d4aa', '#3498db', '#9b59b6', '#e74c3c', '#f39c12'];
    return {
      labels: months,
      datasets: packages.map((pkg, index) => ({
        label: pkg.name,
        data: pkg.monthlyPayout.length > 0 
          ? pkg.monthlyPayout 
          : Array(6).fill(0),
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}33`,
        tension: 0.4,
        fill: true,
      })),
    };
  };

  const overallPerformanceData = analyticsData?.monthlyPerformance
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
            label: 'Total Returns',
            data: analyticsData.monthlyPerformance.returns,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Interest Earned',
            data: analyticsData.monthlyPerformance.interestEarned,
            borderColor: '#9b59b6',
            backgroundColor: 'rgba(155, 89, 182, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      }
    : {
        labels: months,
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
            label: 'Total Returns',
            data: transactions.filter(t => t.status === 'paid').reduce((sum, t) => [...sum, t.amountToReturn], [10000, 15000, 21000, 18000, 24000, 30000].slice(transactions.length)),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Interest Earned',
            data: transactions.filter(t => t.status === 'paid').reduce((sum, t) => [...sum, t.amountToReturn - t.amountPaid], [2000, 4000, 4000, 4000, 4000, 5000].slice(transactions.length)),
            borderColor: '#9b59b6',
            backgroundColor: 'rgba(155, 89, 182, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      };

  const monthlyDistributionData = {
    labels: packages.map(p => p.name),
    datasets: [
      {
        label: 'Current Amount',
        data: packages.map(p => p.currentAmount),
        backgroundColor: '#00d4aa',
      },
      {
        label: 'Available',
        data: packages.map(p => p.maxAmount - p.currentAmount),
        backgroundColor: '#3498db',
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

  const barOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        stacked: true,
      },
      y: {
        ...chartOptions.scales.y,
        stacked: true,
      },
    },
  };

  const totalPayouts = packages.reduce((sum, p) => sum + p.currentAmount, 0);
  const totalAvailable = packages.reduce((sum, p) => sum + (p.maxAmount - p.currentAmount), 0);
  const avgInterestRate = packages.length > 0 
    ? packages.reduce((sum, p) => sum + p.interestRate, 0) / packages.length 
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Performance Analytics</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faChartLine} /> Total Payouts</h3>
          <div className="value">{formatUGX(totalPayouts)}</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faChartBar} /> Available</h3>
          <div className="value">{formatUGX(totalAvailable)}</div>
        </div>
        <div className="stat-card">
          <h3>Avg Interest Rate</h3>
          <div className="value">{avgInterestRate.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <div className="value">{transactions.length}</div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3><FontAwesomeIcon icon={faChartLine} /> Overall Performance Over Time</h3>
        </div>
        <div style={{ height: '350px' }}>
          <Line data={overallPerformanceData} options={chartOptions} />
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3><FontAwesomeIcon icon={faChartBar} /> Package-Wise Monthly Payouts</h3>
        </div>
        <div style={{ height: '350px' }}>
          <Line data={generateMonthlyData()} options={chartOptions} />
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3><FontAwesomeIcon icon={faChartBar} /> Package Amount Distribution</h3>
        </div>
        <div style={{ height: '300px' }}>
          <Bar data={monthlyDistributionData} options={barOptions} />
        </div>
      </div>
    </div>
  );
}