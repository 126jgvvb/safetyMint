import { useState, useMemo, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToggleOn, faToggleOff, faCheck, faTimes, faClock, faCheckCircle, faTimesCircle, faSearch, faSync } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

const REFRESH_INTERVAL = 15000; // 15 seconds for requests

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const initialRequests = [
  {
    id: 1,
    requestId: 'REQ-001',
    packageName: 'Starter Loan',
    packageOwnerName: 'QuickFinance Ltd',
    packageOwnerPhone: '+1234567890',
    amount: 5000,
    memberName: 'John Smith',
    memberPhone: '+1234567890',
    groupName: 'Group Alpha',
    groupAdminName: 'Alice Johnson',
    groupAdminPhone: '+1234567899',
    interestRate: 5,
    amountToReturn: 5250,
    dueDate: '2026-05-01',
    status: 'disbursed',
    createdAt: '2026-04-01T10:00:00Z',
    disbursedAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 2,
    requestId: 'REQ-002',
    packageName: 'Business Loan',
    packageOwnerName: 'Enterprise Solutions',
    packageOwnerPhone: '+1234567891',
    amount: 15000,
    memberName: 'Sarah Johnson',
    memberPhone: '+1234567891',
    groupName: 'Group Beta',
    groupAdminName: 'Bob Williams',
    groupAdminPhone: '+1234567898',
    interestRate: 8,
    amountToReturn: 16200,
    dueDate: '2026-05-15',
    status: 'pending',
    createdAt: '2026-04-21T09:00:00Z',
  },
  {
    id: 3,
    requestId: 'REQ-003',
    packageName: 'Premium Loan',
    packageOwnerName: 'Capital Partners',
    packageOwnerPhone: '+1234567892',
    amount: 100000,
    memberName: 'Mike Brown',
    memberPhone: '+1234567892',
    groupName: 'Group Gamma',
    groupAdminName: 'Carol Davis',
    groupAdminPhone: '+1234567897',
    interestRate: 12,
    amountToReturn: 112000,
    dueDate: '2026-06-01',
    status: 'declined',
    createdAt: '2026-04-20T14:00:00Z',
    rejectionReason: 'Insufficient package funds',
  },
];

const initialAutoConfig = {
  enabled: false,
  maxSingleAmount: 50000,
  maxDailyAmount: 500000,
  dailyDisbursed: 25000,
  lastResetDate: '2026-04-21',
};

export default function PaymentRequests() {
  const { packages, useApi } = useApp();
  const [requests, setRequests] = useState(initialRequests);
  const [autoConfig, setAutoConfig] = useState(initialAutoConfig);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadData = useCallback(async () => {
    if (!useApi) return;
    setLoading(true);
    try {
      const [requestsData, configData] = await Promise.all([
        api.getPaymentRequests(),
        api.getPaymentConfig(),
      ]);
      if (requestsData && Array.isArray(requestsData)) {
        setRequests(requestsData);
      }
      if (configData) {
        setAutoConfig(configData);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load payment requests:', error);
    }
    setLoading(false);
  }, [useApi]);

  useEffect(() => {
    if (useApi) {
      loadData();
    }
  }, [useApi, loadData]);

  useEffect(() => {
    if (!useApi) return;
    
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [useApi, loadData]);

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (filter === 'pending') {
      result = result.filter(r => r.status === 'pending');
    } else if (filter === 'disbursed') {
      result = result.filter(r => r.status === 'disbursed');
    } else if (filter === 'declined') {
      result = result.filter(r => ['declined', 'rejected'].includes(r.status));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(r =>
        r.memberName.toLowerCase().includes(searchLower) ||
        r.groupName.toLowerCase().includes(searchLower) ||
        r.packageName.toLowerCase().includes(searchLower) ||
        r.requestId.toLowerCase().includes(searchLower)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [requests, filter, search]);

  const stats = useMemo(() => ({
    pending: requests.filter(r => r.status === 'pending').length,
    disbursed: requests.filter(r => r.status === 'disbursed').length,
    declined: requests.filter(r => ['declined', 'rejected'].includes(r.status)).length,
    totalDisbursed: requests
      .filter(r => r.status === 'disbursed')
      .reduce((sum, r) => sum + r.amount, 0),
  }), [requests]);

  const handleToggleAuto = async () => {
    const newEnabled = !autoConfig.enabled;
    if (useApi) {
      try {
        await api.toggleAutoDisbursement(newEnabled);
      } catch (error) {
        console.error('Failed to toggle auto-disbursement:', error);
        return;
      }
    }
    setAutoConfig({ ...autoConfig, enabled: newEnabled });
  };

  const handleApprove = async (request) => {
    const pkg = packages.find(p => p.name === request.packageName);
    if (!pkg) {
      alert('Package not found');
      return;
    }

    if (request.amount > pkg.currentAmount) {
      alert('Insufficient package funds');
      return;
    }

    if (useApi) {
      try {
        const result = await api.approvePaymentRequest(request.id);
        if (result) {
          setRequests(requests.map(r => 
            r.id === request.id 
              ? { ...r, ...result }
              : r
          ));
        }
      } catch (error) {
        console.error('Failed to approve request:', error);
        alert('Failed to approve request');
      }
    } else {
      setRequests(requests.map(r => 
        r.id === request.id 
          ? { ...r, status: 'disbursed', disbursedAt: new Date().toISOString() }
          : r
      ));
    }
  };

  const handleReject = async (request, reason) => {
    if (useApi) {
      try {
        await api.rejectPaymentRequest(request.id, reason);
      } catch (error) {
        console.error('Failed to reject request:', error);
        alert('Failed to reject request');
        return;
      }
    }
    setRequests(requests.map(r => 
      r.id === request.id 
        ? { ...r, status: 'rejected', rejectionReason: reason }
        : r
    ));
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: faClock, color: '#f1c40f', label: 'Pending', bgColor: 'rgba(241, 196, 15, 0.15)' },
      disbursed: { icon: faCheckCircle, color: '#00d4aa', label: 'Disbursed', bgColor: 'rgba(0, 212, 170, 0.15)' },
      declined: { icon: faTimesCircle, color: '#e74c3c', label: 'Declined', bgColor: 'rgba(231, 76, 60, 0.15)' },
      rejected: { icon: faTimesCircle, color: '#e74c3c', label: 'Rejected', bgColor: 'rgba(231, 76, 60, 0.15)' },
    };
    return configs[status] || configs.pending;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Payment Requests</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button 
            onClick={loadData}
            disabled={loading || isRefreshing}
            className="refresh-btn"
            title="Refresh requests"
            style={{ 
              background: 'var(--accent)', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--primary)',
            }}
          >
            <FontAwesomeIcon icon={faSync} spin={loading || isRefreshing} />
          </button>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Auto-Disbursement:
          </span>
          <button
            onClick={handleToggleAuto}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '20px',
              background: autoConfig.enabled ? 'rgba(0, 212, 170, 0.15)' : 'var(--secondary)',
              color: autoConfig.enabled ? '#00d4aa' : 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            <FontAwesomeIcon icon={autoConfig.enabled ? faToggleOn : faToggleOff} size="lg" />
            {autoConfig.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {autoConfig.enabled && (
        <div className="card" style={{ marginBottom: '20px', borderColor: '#00d4aa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#00d4aa' }} />
            <h3 style={{ margin: 0, color: '#00d4aa' }}>Auto-Disbursement Active</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Max Single Amount</span>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatUGX(autoConfig.maxSingleAmount)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Max Daily Amount</span>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatUGX(autoConfig.maxDailyAmount)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Daily Disbursed</span>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#00d4aa' }}>{formatUGX(autoConfig.dailyDisbursed)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Daily Remaining</span>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>
                {formatUGX(autoConfig.maxDailyAmount - autoConfig.dailyDisbursed)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card" style={{ borderColor: '#f1c40f' }}>
          <h3><FontAwesomeIcon icon={faClock} /> Pending</h3>
          <div className="value" style={{ color: '#f1c40f' }}>{stats.pending}</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faCheckCircle} /> Disbursed</h3>
          <div className="value" style={{ color: '#00d4aa' }}>{stats.disbursed}</div>
          <div className="sub-value">{formatUGX(stats.totalDisbursed)}</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faTimesCircle} /> Declined</h3>
          <div className="value" style={{ color: '#e74c3c' }}>{stats.declined}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Incoming Payment Requests</h3>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ minWidth: '200px', width: '250px' }}>
            <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search requests..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-btns" style={{ marginBottom: '0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
            <button className={`filter-btn ${filter === 'disbursed' ? 'active' : ''}`} onClick={() => setFilter('disbursed')}>Disbursed</button>
            <button className={`filter-btn ${filter === 'declined' ? 'active' : ''}`} onClick={() => setFilter('declined')}>Declined</button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Package</th>
                <th>Member</th>
                <th>Group</th>
                <th>Amount</th>
                <th>To Return</th>
                <th>Interest</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map(request => {
                  const statusConfig = getStatusConfig(request.status);
                  const pkg = packages.find(p => p.name === request.packageName);
                  const canApprove = pkg && request.amount <= pkg.currentAmount;
                  
                  return (
                    <tr key={request.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{request.requestId}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{request.packageName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Owner: {request.packageOwnerName}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{request.memberName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{request.memberPhone}</div>
                      </td>
                      <td>
                        <div>{request.groupName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Admin: {request.groupAdminName}
                        </div>
                      </td>
                      <td style={{ fontWeight: '600', color: '#00d4aa' }}>{formatUGX(request.amount)}</td>
                      <td style={{ fontWeight: '600' }}>{formatUGX(request.amountToReturn)}</td>
                      <td style={{ color: '#f1c40f' }}>{request.interestRate}%</td>
                      <td>{new Date(request.dueDate).toLocaleDateString()}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ background: statusConfig.bgColor, color: statusConfig.color }}
                        >
                          <FontAwesomeIcon icon={statusConfig.icon} />
                          {' '}{statusConfig.label}
                        </span>
                        {request.rejectionReason && (
                          <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px' }}>
                            {request.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {request.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '5px 10px', fontSize: '11px' }}
                              onClick={() => handleApprove(request)}
                              disabled={!canApprove}
                              title={!canApprove ? 'Insufficient package funds' : 'Approve'}
                            >
                              <FontAwesomeIcon icon={faCheck} />
                            </button>
                            <button 
                              className="btn"
                              style={{ padding: '5px 10px', fontSize: '11px', background: '#e74c3c', color: 'white' }}
                              onClick={() => handleReject(request, 'Rejected by admin')}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </div>
                        )}
                        {request.status === 'disbursed' && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(request.disbursedAt).toLocaleString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}