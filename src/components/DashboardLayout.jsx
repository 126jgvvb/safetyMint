import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faWallet, faBox, faChartLine, faSignOutAlt, faList, faArrowUp, faArrowDown, faMoon, faSun, faEdit, faBell, faMoneyBillWave, faCoins, faFileInvoice, faPercent } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet, user, theme, toggleTheme, updateUser } = useApp();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const formatUGX = (amount) => {
    return `UGX ${amount.toLocaleString()}`;
  };
  
  const navItems = [
    { path: '/dashboard', icon: faHome, label: 'Dashboard' },
    { path: '/dashboard/packages', icon: faBox, label: 'Loan Packages' },
    { path: '/dashboard/package-payouts', icon: faMoneyBillWave, label: 'Payouts' },
    { path: '/dashboard/payment-requests', icon: faFileInvoice, label: 'Requests' },
    { path: '/dashboard/wallet', icon: faWallet, label: 'Wallet' },
    { path: '/dashboard/collections', icon: faCoins, label: 'Collections' },
    { path: '/dashboard/withdraw-list', icon: faList, label: 'Withdraw List' },
    { path: '/dashboard/performance', icon: faChartLine, label: 'Performance' },
    { path: '/dashboard/interest-growth', icon: faPercent, label: 'Interest' },
    { path: '/dashboard/notifications', icon: faBell, label: 'Notifications' },
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const openProfileModal = () => {
    setProfileData({ name: user?.name || '', email: user?.email || '' });
    setShowProfileModal(true);
  };

  const handleProfileUpdate = () => {
    updateUser(profileData);
    setShowProfileModal(false);
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Safety<span>Mint</span></h2>
        </div>
        <nav>
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <FontAwesomeIcon icon={item.icon} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '15px', padding: '15px', background: 'var(--secondary)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FontAwesomeIcon icon={faWallet} style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Main Wallet</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-light)' }}>{formatUGX(wallet.main)}</div>
          </div>
          <div style={{ padding: '15px', background: 'var(--secondary)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FontAwesomeIcon icon={faArrowUp} style={{ color: '#9b59b6' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Interest Wallet</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#9b59b6' }}>{formatUGX(wallet.interest)}</div>
          </div>
        </div>
        <div
          className="nav-item"
          onClick={handleLogout}
          style={{ marginTop: '20px' }}
        >
          <FontAwesomeIcon icon={faSignOutAlt} />
          <span>Logout</span>
        </div>
      </aside>
      <main className="main-content">
        <div className="admin-header">
          <div className="admin-info">
            <div className="admin-avatar">{getInitials(user?.name || 'Admin')}</div>
            <div className="admin-details">
              <h2>{user?.name || 'Admin User'}</h2>
              <p>{user?.email || 'admin@safetymint.com'}</p>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={openProfileModal}>
              <FontAwesomeIcon icon={faEdit} /> Edit Profile
            </button>
            <button className="theme-toggle" onClick={toggleTheme}>
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
              {' '}{theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
        <Outlet />
      </main>

      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Profile</h2>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                value={profileData.name} 
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                value={profileData.email} 
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleProfileUpdate}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}