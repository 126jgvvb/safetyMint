import { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope, faCommentDots, faFilter, faSearch, faCheck, faCheckDouble, faTrash, faExclamationCircle, faMoneyBillWave, faUndo } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const initialNotifications = [
  {
    id: 1,
    type: 'payment',
    title: 'Payment Received',
    message: 'John Smith made a payment of UGX 5,250 for Starter Loan',
    memberName: 'John Smith',
    groupName: 'Group Alpha',
    amount: 5250,
    timestamp: '2026-04-01T10:30:00Z',
    read: false,
    emailSent: true,
    smsSent: true,
  },
  {
    id: 2,
    type: 'withdrawal',
    title: 'Withdrawal Processed',
    message: 'Withdrawal of UGX 3,000 processed - Fee: UGX 150',
    amount: 3000,
    fee: 150,
    timestamp: '2026-04-01T09:15:00Z',
    read: false,
    emailSent: true,
    smsSent: true,
  },
  {
    id: 3,
    type: 'transaction',
    title: 'New Loan Disbursed',
    message: 'Sarah Johnson received UGX 10,000 from Business Loan',
    memberName: 'Sarah Johnson',
    groupName: 'Group Beta',
    amount: 10000,
    timestamp: '2026-03-31T14:45:00Z',
    read: true,
    emailSent: true,
    smsSent: true,
  },
  {
    id: 4,
    type: 'overdue',
    title: 'Overdue Payment',
    message: 'Mike Brown payment overdue by 31 days',
    memberName: 'Mike Brown',
    groupName: 'Group Alpha',
    amount: 7875,
    timestamp: '2026-03-20T09:00:00Z',
    read: true,
    emailSent: true,
    smsSent: true,
  },
  {
    id: 5,
    type: 'reserve',
    title: 'Reserve Deduction',
    message: 'Reserve fund used for Mike Brown - UGX 7,875',
    memberName: 'Mike Brown',
    groupName: 'Group Alpha',
    amount: 7875,
    timestamp: '2026-03-25T11:00:00Z',
    read: false,
    emailSent: true,
    smsSent: true,
  },
  {
    id: 6,
    type: 'deposit',
    title: 'Wallet Deposit',
    message: 'Main wallet deposit of UGX 20,000',
    amount: 20000,
    timestamp: '2026-03-15T08:30:00Z',
    read: true,
    emailSent: false,
    smsSent: false,
  },
];

export default function NotificationCenter() {
  const { useApi } = useApp();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (useApi) {
      loadNotifications();
    }
  }, [useApi]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      if (data && Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
    setLoading(false);
  };

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (showUnreadOnly) {
      result = result.filter(n => !n.read);
    }

    if (filter !== 'all') {
      result = result.filter(n => n.type === filter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower) ||
        n.memberName?.toLowerCase().includes(searchLower) ||
        n.groupName?.toLowerCase().includes(searchLower)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [notifications, filter, search, showUnreadOnly]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAsRead = async (id) => {
    if (useApi) {
      try {
        await api.markNotificationRead(id);
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    if (useApi) {
      try {
        await api.markAllNotificationsRead();
      } catch (error) {
        console.error('Failed to mark all as read:', error);
      }
    }
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = async (id) => {
    if (useApi) {
      try {
        await api.deleteNotification(id);
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    }
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    if (useApi) {
      try {
        await api.clearAllNotifications();
      } catch (error) {
        console.error('Failed to clear notifications:', error);
      }
    }
    setNotifications([]);
  };

  const getTypeIcon = (type) => {
    const icons = {
      payment: { icon: faMoneyBillWave, color: '#00d4aa' },
      withdrawal: { icon: faUndo, color: '#9b59b6' },
      transaction: { icon: faMoneyBillWave, color: '#3498db' },
      overdue: { icon: faExclamationCircle, color: '#e74c3c' },
      reserve: { icon: faUndo, color: '#e67e22' },
      deposit: { icon: faMoneyBillWave, color: '#2ecc71' },
    };
    return icons[type] || { icon: faBell, color: '#8898aa' };
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: unreadCount,
    emailSent: notifications.filter(n => n.emailSent).length,
    smsSent: notifications.filter(n => n.smsSent).length,
  }), [notifications, unreadCount]);

  return (
    <div>
      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faBell} style={{ marginRight: '10px' }} />
          Notification Center
          {unreadCount > 0 && (
            <span style={{ 
              background: 'var(--danger)', 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '10px', 
              fontSize: '14px',
              marginLeft: '10px'
            }}>
              {unreadCount}
            </span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <FontAwesomeIcon icon={faCheckDouble} /> Mark All Read
          </button>
          <button className="btn btn-secondary" onClick={clearAll} disabled={notifications.length === 0}>
            <FontAwesomeIcon icon={faTrash} /> Clear All
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faBell} /> Total</h3>
          <div className="value">{stats.total}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--accent)' }}>
          <h3><FontAwesomeIcon icon={faCheck} /> Unread</h3>
          <div className="value" style={{ color: 'var(--accent)' }}>{stats.unread}</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faEnvelope} /> Emails Sent</h3>
          <div className="value">{stats.emailSent}</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faCommentDots} /> SMS Sent</h3>
          <div className="value">{stats.smsSent}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ minWidth: '200px', width: '300px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Search notifications..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-btns" style={{ marginBottom: '0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'payment' ? 'active' : ''}`} onClick={() => setFilter('payment')}>Payments</button>
          <button className={`filter-btn ${filter === 'withdrawal' ? 'active' : ''}`} onClick={() => setFilter('withdrawal')}>Withdrawals</button>
          <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Overdue</button>
          <button className={`filter-btn ${filter === 'reserve' ? 'active' : ''}`} onClick={() => setFilter('reserve')}>Reserve</button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input 
            type="checkbox" 
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          Unread only
        </label>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => {
            const typeInfo = getTypeIcon(notification.type);
            return (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-icon" style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                  <FontAwesomeIcon icon={typeInfo.icon} />
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <span className="notification-title">{notification.title}</span>
                    <span className="notification-time">{formatTimestamp(notification.timestamp)}</span>
                  </div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-meta">
                    {notification.emailSent && (
                      <span className="meta-badge" title="Email sent">
                        <FontAwesomeIcon icon={faEnvelope} /> Email
                      </span>
                    )}
                    {notification.smsSent && (
                      <span className="meta-badge" title="SMS sent">
                        <FontAwesomeIcon icon={faCommentDots} /> SMS
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  className="notification-delete"
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                  title="Delete notification"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faBell} style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }} />
            <p>No notifications found</p>
          </div>
        )}
      </div>

      <style>{`
        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 15px 20px;
          background: var(--secondary);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }
        .notification-item:hover {
          background: var(--secondary-hover);
        }
        .notification-item.unread {
          border-left-color: var(--accent);
          background: rgba(0, 212, 170, 0.05);
        }
        .notification-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .notification-content {
          flex: 1;
          min-width: 0;
        }
        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        .notification-title {
          font-weight: 600;
          color: var(--text-light);
        }
        .notification-time {
          font-size: 12px;
          color: var(--text-muted);
        }
        .notification-message {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .notification-meta {
          display: flex;
          gap: 10px;
        }
        .meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 2px 8px;
          background: var(--primary);
          border-radius: 10px;
          color: var(--text-muted);
        }
        .notification-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 5px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .notification-item:hover .notification-delete {
          opacity: 1;
        }
        .notification-delete:hover {
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}