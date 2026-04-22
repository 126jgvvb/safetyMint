import { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faDollarSign, faCheck, faClock, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { api } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const initialInterestRecords = [
  {
    id: 1,
    transactionId: 1,
    memberName: 'John Smith',
    groupName: 'Group Alpha',
    packageName: 'Starter Loan',
    principalAmount: 5000,
    interestRate: 5,
    totalAmount: 5250,
    amountReturned: 5250,
    interestReturned: 250,
    principalReturned: 5000,
    remainingAmount: 0,
    remainingInterest: 0,
    remainingPrincipal: 0,
    status: 'completed',
    disbursedAt: '2026-03-01T10:00:00Z',
    completedAt: '2026-04-01T15:30:00Z',
    paymentSchedule: [
      { date: '2026-03-15', expectedAmount: 2625, paidAmount: 0, interest: 125, principal: 2500, status: 'paid' },
      { date: '2026-04-01', expectedAmount: 2625, paidAmount: 2625, interest: 125, principal: 2500, status: 'paid' },
    ],
    interestGrowth: [
      { date: '2026-03-01', interest: 0, total: 5250 },
      { date: '2026-03-15', interest: 125, total: 2625 },
      { date: '2026-04-01', interest: 250, total: 5250 },
    ],
  },
  {
    id: 2,
    transactionId: 2,
    memberName: 'Sarah Johnson',
    groupName: 'Group Beta',
    packageName: 'Business Loan',
    principalAmount: 10000,
    interestRate: 8,
    totalAmount: 10800,
    amountReturned: 5400,
    interestReturned: 400,
    principalReturned: 5000,
    remainingAmount: 5400,
    remainingInterest: 400,
    remainingPrincipal: 5000,
    status: 'partial',
    disbursedAt: '2026-03-15T14:00:00Z',
    completedAt: null,
    paymentSchedule: [
      { date: '2026-03-30', expectedAmount: 5400, paidAmount: 5400, interest: 400, principal: 5000, status: 'paid' },
      { date: '2026-04-15', expectedAmount: 5400, paidAmount: 0, interest: 400, principal: 5000, status: 'pending' },
    ],
    interestGrowth: [
      { date: '2026-03-15', interest: 0, total: 10800 },
      { date: '2026-03-30', interest: 400, total: 5400 },
      { date: '2026-04-15', interest: 800, total: 10800 },
    ],
  },
  {
    id: 3,
    transactionId: 3,
    memberName: 'Mike Brown',
    groupName: 'Group Alpha',
    packageName: 'Starter Loan',
    principalAmount: 7500,
    interestRate: 5,
    totalAmount: 7875,
    amountReturned: 0,
    interestReturned: 0,
    principalReturned: 0,
    remainingAmount: 7875,
    remainingInterest: 375,
    remainingPrincipal: 7500,
    status: 'overdue',
    disbursedAt: '2026-02-20T09:00:00Z',
    completedAt: null,
    dueDate: '2026-03-20',
    paymentSchedule: [
      { date: '2026-03-05', expectedAmount: 3937.5, paidAmount: 0, interest: 187.5, principal: 3750, status: 'overdue' },
      { date: '2026-03-20', expectedAmount: 3937.5, paidAmount: 0, interest: 187.5, principal: 3750, status: 'overdue' },
    ],
    interestGrowth: [
      { date: '2026-02-20', interest: 0, total: 7875 },
      { date: '2026-03-05', interest: 187.5, total: 7875 },
      { date: '2026-03-20', interest: 375, total: 7875 },
    ],
  },
];

export default function InterestGrowth() {
  const { transactions, packages, useApi } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [interestRecords, setInterestRecords] = useState(initialInterestRecords);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (useApi) {
      loadInterestRecords();
    }
  }, [useApi]);

  const loadInterestRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getInterestRecords();
      if (data && Array.isArray(data)) {
        setInterestRecords(data);
      }
    } catch (error) {
      console.error('Failed to load interest records:', error);
    }
    setLoading(false);
  };

  const filteredRecords = useMemo(() => {
    let result = [...interestRecords];

    if (filter === 'completed') {
      result = result.filter(r => r.status === 'completed');
    } else if (filter === 'partial') {
      result = result.filter(r => r.status === 'partial');
    } else if (filter === 'overdue') {
      result = result.filter(r => r.status === 'overdue');
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(r =>
        r.memberName.toLowerCase().includes(searchLower) ||
        r.groupName.toLowerCase().includes(searchLower) ||
        r.packageName.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [interestRecords, filter, search]);

  const stats = useMemo(() => {
    if (interestRecords && interestRecords.length > 0 && useApi) {
      const totalPrincipal = interestRecords.reduce((sum, r) => sum + r.principalAmount, 0);
      const totalInterest = interestRecords.reduce((sum, r) => sum + (r.totalAmount - r.principalAmount), 0);
      const totalReturned = interestRecords.reduce((sum, r) => sum + r.amountReturned, 0);
      const totalRemaining = interestRecords.reduce((sum, r) => sum + r.remainingAmount, 0);
      const interestReturned = interestRecords.reduce((sum, r) => sum + r.interestReturned, 0);
      const interestRemaining = interestRecords.reduce((sum, r) => sum + r.remainingInterest, 0);
      return { totalPrincipal, totalInterest, totalReturned, totalRemaining, interestReturned, interestRemaining };
    }
    const totalPrincipal = packages.reduce((sum, pkg) => sum + (pkg.amountDeducted || 0), 0);
    const interestReturned = packages.reduce((sum, pkg) => sum + (pkg.interestObtained || 0), 0);
    const interestRemaining = packages.reduce((sum, pkg) => sum + (pkg.interestsRemaining || 0), 0);
    const totalInterest = interestReturned + interestRemaining;
    const totalReturned = packages.reduce((sum, pkg) => sum + (pkg.amountReturnedSuccessfully || 0) + (pkg.amountReturnedForcefully || 0), 0);
    const totalRemaining = packages.reduce((sum, pkg) => sum + (pkg.amountDeducted || 0) - (pkg.amountReturnedSuccessfully || 0) - (pkg.amountReturnedForcefully || 0), 0);

    return { totalPrincipal, totalInterest, totalReturned, totalRemaining, interestReturned, interestRemaining };
  }, [packages, interestRecords, useApi]);

  const chartData = useMemo(() => {
    const labels = [];
    const principalData = [];
    const interestData = [];
    
    initialInterestRecords.forEach(record => {
      record.interestGrowth.forEach(point => {
        if (!labels.includes(point.date)) {
          labels.push(point.date);
        }
      });
    });

    labels.sort();
    
    labels.forEach(date => {
      let principal = 0;
      let interest = 0;
      
      initialInterestRecords.forEach(record => {
        const point = record.interestGrowth.find(p => p.date === date);
        if (point) {
          principal += record.principalReturned > 0 ? record.principalAmount - record.remainingPrincipal : 0;
          interest += point.interest;
        }
      });
      
      principalData.push(principal);
      interestData.push(interest);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Interest Grown',
          data: interestData,
          borderColor: '#f1c40f',
          backgroundColor: 'rgba(241, 196, 15, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Principal Returned',
          data: principalData,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0, 212, 170, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, []);

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

  const getStatusConfig = (status) => {
    const configs = {
      completed: { icon: faCheck, color: '#00d4aa', label: 'Completed', bgColor: 'rgba(0, 212, 170, 0.15)' },
      partial: { icon: faClock, color: '#f1c40f', label: 'Partial', bgColor: 'rgba(241, 196, 15, 0.15)' },
      overdue: { icon: faClock, color: '#e74c3c', label: 'Overdue', bgColor: 'rgba(231, 76, 60, 0.15)' },
    };
    return configs[status] || configs.partial;
  };

  return (
    <div>
      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '10px' }} />
          Interest & Returns Tracking
        </h1>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faDollarSign} /> Total Principal</h3>
          <div className="value">{formatUGX(stats.totalPrincipal)}</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faChartLine} /> Total Interest</h3>
          <div className="value" style={{ color: '#f1c40f' }}>{formatUGX(stats.totalInterest)}</div>
          <div className="sub-value">Generated</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faCheck} /> Interest Returned</h3>
          <div className="value" style={{ color: '#00d4aa' }}>{formatUGX(stats.interestReturned)}</div>
          <div className="sub-value">Collected</div>
        </div>
        <div className="stat-card" style={{ borderColor: '#f1c40f' }}>
          <h3><FontAwesomeIcon icon={faClock} /> Interest Remaining</h3>
          <div className="value" style={{ color: '#f1c40f' }}>{formatUGX(stats.interestRemaining)}</div>
          <div className="sub-value">Pending</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3>Interest Growth Over Time</h3>
        </div>
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Return Records</h3>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ minWidth: '200px', width: '250px' }}>
            <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-btns" style={{ marginBottom: '0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
            <button className={`filter-btn ${filter === 'partial' ? 'active' : ''}`} onClick={() => setFilter('partial')}>Partial</button>
            <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Overdue</button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Package</th>
                <th>Principal</th>
                <th>Interest Rate</th>
                <th>Total Amount</th>
                <th>Returned</th>
                <th>Remaining</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map(record => {
                  const statusConfig = getStatusConfig(record.status);
                  const progressPercent = (record.amountReturned / record.totalAmount) * 100;
                  
                  return (
                    <tr key={record.id} onClick={() => setSelectedRecord(record)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{record.memberName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{record.groupName}</div>
                      </td>
                      <td>{record.packageName}</td>
                      <td style={{ fontWeight: '600' }}>{formatUGX(record.principalAmount)}</td>
                      <td style={{ color: '#f1c40f' }}>{record.interestRate}%</td>
                      <td style={{ fontWeight: '600' }}>{formatUGX(record.totalAmount)}</td>
                      <td style={{ color: '#00d4aa' }}>
                        <div>{formatUGX(record.amountReturned)}</div>
                        <div style={{ fontSize: '11px', color: '#00d4aa' }}>
                          Interest: {formatUGX(record.interestReturned)}
                        </div>
                      </td>
                      <td style={{ color: '#e74c3c' }}>
                        <div>{formatUGX(record.remainingAmount)}</div>
                        <div style={{ fontSize: '11px', color: '#e74c3c' }}>
                          Interest: {formatUGX(record.remainingInterest)}
                        </div>
                      </td>
                      <td style={{ minWidth: '100px' }}>
                        <div className="progress-bar" style={{ height: '8px' }}>
                          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {progressPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ background: statusConfig.bgColor, color: statusConfig.color }}
                        >
                          <FontAwesomeIcon icon={statusConfig.icon} />
                          {' '}{statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Return Details - {selectedRecord.memberName}</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ padding: '15px', background: 'var(--secondary)', borderRadius: '8px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '5px' }}>Principal Amount</div>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{formatUGX(selectedRecord.principalAmount)}</div>
                </div>
                <div style={{ padding: '15px', background: 'rgba(241, 196, 15, 0.15)', borderRadius: '8px' }}>
                  <div style={{ color: '#f1c40f', fontSize: '12px', marginBottom: '5px' }}>Total Interest</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#f1c40f' }}>{formatUGX(selectedRecord.totalAmount - selectedRecord.principalAmount)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@ {selectedRecord.interestRate}%</div>
                </div>
              </div>

              <div style={{ padding: '15px', background: 'var(--secondary)', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total Due</div>
                    <div style={{ fontWeight: '600' }}>{formatUGX(selectedRecord.totalAmount)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#00d4aa', fontSize: '12px' }}>Returned</div>
                    <div style={{ fontWeight: '600', color: '#00d4aa' }}>{formatUGX(selectedRecord.amountReturned)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#e74c3c', fontSize: '12px' }}>Remaining</div>
                    <div style={{ fontWeight: '600', color: '#e74c3c' }}>{formatUGX(selectedRecord.remainingAmount)}</div>
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: '10px' }}>Payment Schedule</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecord.paymentSchedule.map((payment, idx) => (
                      <tr key={idx}>
                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                        <td>{formatUGX(payment.principal)}</td>
                        <td style={{ color: '#f1c40f' }}>{formatUGX(payment.interest)}</td>
                        <td>{formatUGX(payment.expectedAmount)}</td>
                        <td style={{ color: '#00d4aa' }}>{formatUGX(payment.paidAmount)}</td>
                        <td>
                          <span className={`status-badge ${payment.status === 'paid' ? 'status-active' : 'status-frozen'}`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}