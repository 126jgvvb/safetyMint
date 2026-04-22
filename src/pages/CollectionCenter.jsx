import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faBan, faPlay, faCheckCircle, faExclamationTriangle, faTimesCircle, faSpinner, faWallet, faUsers, faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const initialCollections = [
  {
    id: 1,
    transactionId: 2,
    groupId: 2,
    groupName: 'Group Beta',
    groupAdminName: 'Bob Williams',
    groupAdminPhone: '+1234567898',
    memberName: 'Sarah Johnson',
    memberPhone: '+1234567891',
    amountDue: 10800,
    amountPaid: 10000,
    interest: 800,
    dueDate: '2026-04-15',
    status: 'countdown',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    countdownEndsAt: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    countdownHours: 12,
    remainingHours: 10,
    errorMessage: null,
    retryCount: 0,
  },
  {
    id: 2,
    transactionId: 3,
    groupId: 1,
    groupName: 'Group Alpha',
    groupAdminName: 'Alice Johnson',
    groupAdminPhone: '+1234567899',
    memberName: 'Mike Brown',
    memberPhone: '+1234567892',
    amountDue: 7875,
    amountPaid: 7500,
    interest: 375,
    dueDate: '2026-03-20',
    status: 'processing',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    countdownEndsAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    countdownHours: 12,
    remainingHours: 0,
    errorMessage: null,
    retryCount: 0,
  },
];

const getStatusConfig = (status) => {
  const configs = {
    pending: { icon: faClock, color: '#f1c40f', label: 'Pending', bgColor: 'rgba(241, 196, 15, 0.15)' },
    countdown: { icon: faClock, color: '#e67e22', label: 'Countdown', bgColor: 'rgba(230, 126, 34, 0.15)' },
    processing: { icon: faSpinner, color: '#3498db', label: 'Processing', bgColor: 'rgba(52, 152, 219, 0.15)', spin: true },
    completed: { icon: faCheckCircle, color: '#00d4aa', label: 'Completed', bgColor: 'rgba(0, 212, 170, 0.15)' },
    aborted: { icon: faBan, color: '#9b59b6', label: 'Aborted', bgColor: 'rgba(155, 89, 182, 0.15)' },
    failed: { icon: faTimesCircle, color: '#e74c3c', label: 'Failed', bgColor: 'rgba(231, 76, 60, 0.15)' },
  };
  return configs[status] || configs.pending;
};

const formatCountdown = (remainingHours) => {
  if (remainingHours <= 0) return 'Processing...';
  const hours = Math.floor(remainingHours);
  const minutes = Math.floor((remainingHours % 1) * 60);
  return `${hours}h ${minutes}m`;
};

export default function CollectionCenter() {
  const { transactions, packages, useApi } = useApp();
  const [collections, setCollections] = useState(initialCollections);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [abortReason, setAbortReason] = useState('');
  const [showAbortModal, setShowAbortModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (useApi) {
      loadCollections();
    }
  }, [useApi]);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await api.getCollections();
      if (data && Array.isArray(data)) {
        setCollections(data);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
    setLoading(false);
  };
  const [collectionToAbort, setCollectionToAbort] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCollections(prev => prev.map(c => {
        if (c.status !== 'countdown') return c;
        const now = new Date();
        const end = new Date(c.countdownEndsAt);
        const diffMs = end.getTime() - now.getTime();
        const remainingHours = Math.max(0, diffMs / (1000 * 60 * 60));
        return { ...c, remainingHours };
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const overdueTransactions = useMemo(() => {
    return transactions.filter(t => 
      (t.status === 'pending' || t.status === 'overdue') && 
      t.groupId &&
      t.defaultingCountdown <= 0
    );
  }, [transactions]);

  const filteredCollections = useMemo(() => {
    let result = [...collections];

    if (filter === 'active') {
      result = result.filter(c => ['pending', 'countdown', 'processing'].includes(c.status));
    } else if (filter === 'completed') {
      result = result.filter(c => c.status === 'completed');
    } else if (filter === 'failed') {
      result = result.filter(c => ['failed', 'aborted'].includes(c.status));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(c =>
        c.memberName.toLowerCase().includes(searchLower) ||
        c.groupName.toLowerCase().includes(searchLower) ||
        c.groupAdminName.toLowerCase().includes(searchLower)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [collections, filter, search]);

  const stats = useMemo(() => ({
    active: collections.filter(c => ['pending', 'countdown', 'processing'].includes(c.status)).length,
    completed: collections.filter(c => c.status === 'completed').length,
    failed: collections.filter(c => ['failed', 'aborted'].includes(c.status)).length,
    totalAmount: collections
      .filter(c => ['pending', 'countdown', 'processing'].includes(c.status))
      .reduce((sum, c) => sum + c.amountDue, 0),
  }), [collections]);

  const handleInitiateCollection = (txn) => {
    setSelectedTransaction(txn);
    setShowInitiateModal(true);
  };

  const confirmInitiate = async () => {
    if (!selectedTransaction) return;

    const existingProcess = collections.find(
      c => c.transactionId === selectedTransaction.id &&
      ['pending', 'countdown', 'processing'].includes(c.status)
    );
    if (existingProcess) {
      alert('Collection process already exists for this transaction');
      return;
    }

    if (useApi) {
      try {
        const result = await api.initiateCollection({
          transactionId: selectedTransaction.id,
          groupId: selectedTransaction.groupId,
        });
        if (result) {
          setCollections([...collections, result]);
        }
      } catch (error) {
        console.error('Failed to initiate collection:', error);
        alert('Failed to initiate collection');
        return;
      }
    } else {
      const group = { id: selectedTransaction.groupId, name: selectedTransaction.groupName, adminName: selectedTransaction.groupAdminName, adminPhone: selectedTransaction.groupAdminPhone };
      
      const now = new Date();
      const countdownEnds = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      const newCollection = {
        id: Date.now(),
        transactionId: selectedTransaction.id,
        groupId: selectedTransaction.groupId,
        groupName: group.name,
        groupAdminName: group.adminName,
        groupAdminPhone: group.adminPhone,
        memberName: selectedTransaction.memberName,
        memberPhone: selectedTransaction.phoneNumber,
        amountDue: selectedTransaction.amountToReturn,
        amountPaid: selectedTransaction.amountPaid,
        interest: selectedTransaction.amountToReturn - selectedTransaction.amountPaid,
        dueDate: selectedTransaction.dateOfReturn,
        status: 'countdown',
        createdAt: now.toISOString(),
        countdownEndsAt: countdownEnds.toISOString(),
        countdownHours: 12,
        remainingHours: 12,
        errorMessage: null,
        retryCount: 0,
      };

      setCollections([...collections, newCollection]);
    }
    setShowInitiateModal(false);
    setSelectedTransaction(null);
  };

  const handleAbortClick = (collection) => {
    setCollectionToAbort(collection);
    setAbortReason('');
    setShowAbortModal(true);
  };

  const confirmAbort = async () => {
    if (!collectionToAbort) return;
    
    if (useApi) {
      try {
        await api.abortCollection(collectionToAbort.id, abortReason);
      } catch (error) {
        console.error('Failed to abort collection:', error);
        alert('Failed to abort collection');
        return;
      }
    }
    setCollections(collections.map(c => 
      c.id === collectionToAbort.id ? { ...c, status: 'aborted' } : c
    ));
    setShowAbortModal(false);
    setCollectionToAbort(null);
    setAbortReason('');
  };

  const handleProcessNow = async (collection) => {
    if (useApi) {
      try {
        const result = await api.processCollection(collection.id);
        if (result) {
          setCollections(collections.map(c => c.id === collection.id ? { ...c, ...result } : c));
        }
      } catch (error) {
        console.error('Failed to process collection:', error);
        alert('Failed to process collection');
      }
    } else {
      setCollections(collections.map(c => {
        if (c.id === collection.id) {
          return { ...c, status: 'processing' };
        }
        return c;
      }));

      setTimeout(() => {
        setCollections(collections.map(c => {
          if (c.id === collection.id) {
            return { ...c, status: 'completed' };
          }
          return c;
        }));
      }, 2000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faWallet} style={{ marginRight: '10px' }} />
          Reserve Collection Center
        </h1>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card" style={{ borderColor: '#e67e22' }}>
          <h3><FontAwesomeIcon icon={faClock} /> Active Collections</h3>
          <div className="value" style={{ color: '#e67e22' }}>{stats.active}</div>
          <div className="sub-value">{formatUGX(stats.totalAmount)} pending</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faCheckCircle} /> Completed</h3>
          <div className="value" style={{ color: '#00d4aa' }}>{stats.completed}</div>
          <div className="sub-value">Successful deductions</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faExclamationTriangle} /> Failed/Aborted</h3>
          <div className="value" style={{ color: '#e74c3c' }}>{stats.failed}</div>
          <div className="sub-value">Requires attention</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faUsers} /> Overdue Members</h3>
          <div className="value">{overdueTransactions.length}</div>
          <div className="sub-value">Ready for collection</div>
        </div>
      </div>

      {overdueTransactions.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', borderColor: '#f1c40f' }}>
          <div className="card-header">
            <h3>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#f1c40f', marginRight: '10px' }} />
              Overdue Transactions - Ready for Collection
            </h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Group</th>
                  <th>Amount Due</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueTransactions.map(txn => (
                  <tr key={txn.id}>
                    <td style={{ fontWeight: '500' }}>{txn.memberName}</td>
                    <td>{txn.groupName}</td>
                    <td style={{ color: '#e74c3c', fontWeight: '600' }}>{formatUGX(txn.amountToReturn)}</td>
                    <td>{new Date(txn.dateOfReturn).toLocaleDateString()}</td>
                    <td style={{ color: '#e74c3c' }}>{Math.abs(txn.defaultingCountdown)} days</td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleInitiateCollection(txn)}
                      >
                        Initiate Collection
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Collection Processes</h3>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ minWidth: '200px', width: '250px' }}>
            <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search collections..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-btns" style={{ marginBottom: '0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
            <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
            <button className={`filter-btn ${filter === 'failed' ? 'active' : ''}`} onClick={() => setFilter('failed')}>Failed/Aborted</button>
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Collection ID</th>
                <th>Member</th>
                <th>Group</th>
                <th>Group Admin</th>
                <th>Amount Due</th>
                <th>Countdown</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCollections.length > 0 ? (
                filteredCollections.map(collection => {
                  const statusConfig = getStatusConfig(collection.status);
                  return (
                    <tr key={collection.id}>
                      <td style={{ fontFamily: 'monospace' }}>#{collection.id}</td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{collection.memberName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{collection.memberPhone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{collection.groupName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Group #{collection.groupId}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500', color: 'var(--accent)' }}>{collection.groupAdminName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{collection.groupAdminPhone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#e74c3c' }}>{formatUGX(collection.amountDue)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Interest: {formatUGX(collection.interest)}
                        </div>
                      </td>
                      <td>
                        {['pending', 'countdown'].includes(collection.status) ? (
                          <div>
                            <div className="countdown-display">
                              <FontAwesomeIcon icon={faClock} />
                              <span>{formatCountdown(collection.remainingHours)}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Ends: {new Date(collection.countdownEndsAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ background: statusConfig.bgColor, color: statusConfig.color }}
                        >
                          <FontAwesomeIcon icon={statusConfig.icon} spin={statusConfig.spin} />
                          {' '}{statusConfig.label}
                        </span>
                      </td>
                      <td>
                        {['pending', 'countdown'].includes(collection.status) && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                              onClick={() => handleProcessNow(collection)}
                              title="Process Now"
                            >
                              <FontAwesomeIcon icon={faPlay} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                              onClick={() => handleAbortClick(collection)}
                              title="Abort"
                            >
                              <FontAwesomeIcon icon={faBan} />
                            </button>
                          </div>
                        )}
                        {collection.errorMessage && (
                          <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '5px' }}>
                            Error: {collection.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No collection processes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInitiateModal && selectedTransaction && (
        <div className="modal-overlay" onClick={() => setShowInitiateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Initiate Reserve Collection</h2>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '15px', background: 'var(--secondary)', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Member:</span>
                  <span style={{ fontWeight: '600', marginLeft: '10px' }}>{selectedTransaction.memberName}</span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Group:</span>
                  <span style={{ fontWeight: '600', marginLeft: '10px' }}>{selectedTransaction.groupName}</span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Group Admin:</span>
                  <span style={{ fontWeight: '600', marginLeft: '10px' }}>{selectedTransaction.groupAdminName}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Amount Due:</span>
                  <span style={{ fontWeight: '600', marginLeft: '10px', color: '#e74c3c' }}>
                    {formatUGX(selectedTransaction.amountToReturn)}
                  </span>
                </div>
              </div>
              
              <div style={{ padding: '15px', background: 'rgba(230, 126, 34, 0.1)', borderRadius: '8px', border: '1px solid #e67e22' }}>
                <div style={{ fontWeight: '600', color: '#e67e22', marginBottom: '10px' }}>
                  <FontAwesomeIcon icon={faClock} /> 12-Hour Countdown
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  This will start a 12-hour countdown. After the countdown expires, the system will automatically attempt to deduct the amount due from the group's reserve wallet.
                </p>
                <ul style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '20px' }}>
                  <li>Admin will be notified via email and SMS</li>
                  <li>You can abort the process anytime before deduction</li>
                  <li>If reserve is insufficient, the process will fail</li>
                </ul>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowInitiateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmInitiate}>Start Collection</button>
            </div>
          </div>
        </div>
      )}

      {showAbortModal && collectionToAbort && (
        <div className="modal-overlay" onClick={() => setShowAbortModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>
              <FontAwesomeIcon icon={faBan} style={{ color: '#9b59b6', marginRight: '10px' }} />
              Abort Collection
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
              Are you sure you want to abort the collection process for <strong>{collectionToAbort.memberName}</strong>?
            </p>
            <div className="form-group">
              <label>Reason (optional)</label>
              <textarea
                value={abortReason}
                onChange={(e) => setAbortReason(e.target.value)}
                placeholder="Enter reason for aborting..."
                rows="3"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--secondary)', color: 'var(--text-light)', border: '1px solid var(--border)' }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAbortModal(false)}>Keep Collection</button>
              <button className="btn" style={{ background: '#9b59b6', color: 'white' }} onClick={confirmAbort}>Abort Collection</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .countdown-display {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: rgba(230, 126, 34, 0.15);
          color: #e67e22;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}