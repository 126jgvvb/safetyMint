import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faMoneyBillWave, faClock, faUsers, faExclamationTriangle, faFileExport } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCountdownDisplay = (days) => {
  if (days > 0) return { text: `${days} days`, class: 'countdown-safe' };
  if (days === 0) return { text: 'Due Today', class: 'countdown-warning' };
  return { text: `${Math.abs(days)} days overdue`, class: 'countdown-danger' };
};

const getStatusBadge = (status) => {
  const statusMap = {
    active: { class: 'status-active', label: 'Active' },
    paid: { class: 'status-paid', label: 'Paid' },
    overdue: { class: 'status-overdue', label: 'Overdue' },
    defaulted: { class: 'status-defaulted', label: 'Defaulted' },
  };
  return statusMap[status] || { class: '', label: status };
};

const exportToPDF = (payouts) => {
  const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Package Payouts Export</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background-color: #f5f5f5; font-weight: bold; }
    tr:nth-child(even) { background-color: #fafafa; }
    .status-active { color: #00d4aa; }
    .status-paid { color: #3498db; }
    .status-overdue { color: #e74c3c; }
    .status-defaulted { color: #e74c3c; }
    .print-date { color: #666; font-size: 12px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Package Payouts Report</h1>
  <div class="print-date">Exported on: ${new Date().toLocaleString()}</div>
  <p>Total Records: ${payouts.length}</p>
  <table>
    <thead>
      <tr>
        <th>Package</th>
        <th>Transaction Time</th>
        <th>Member Name</th>
        <th>Member Phone</th>
        <th>Group Name</th>
        <th>Group Admin</th>
        <th>Amount Transferred</th>
        <th>Amount to Return</th>
        <th>Return Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${payouts.map(p => `
        <tr>
          <td>${p.packageName || ''}</td>
          <td>${formatDateTime(p.transactionTime)}</td>
          <td>${p.memberName || ''}</td>
          <td>${p.memberPhone || ''}</td>
          <td>${p.groupName || ''}</td>
          <td>${p.groupAdminName || ''}</td>
          <td>${formatUGX(p.amountTransferred)}</td>
          <td>${formatUGX(p.amountToReturn || p.amountTransferred)}</td>
          <td>${p.dateOfReturn ? new Date(p.dateOfReturn).toLocaleDateString() : '-'}</td>
          <td class="status-${p.status}">${p.status}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};

export default function PackagePayouts() {
  const { packages, transactions } = useApp();
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const payouts = useMemo(() => {
    const allPayouts = transactions
      .filter(t => t.packageId && t.packageName)
      .map(t => ({
        id: t.payoutId || t.id,
        transactionId: t.id,
        packageId: t.packageId,
        packageName: t.packageName,
        memberName: t.memberName,
        memberPhone: t.phoneNumber,
        groupId: t.groupId,
        groupName: t.groupName,
        groupAdminName: t.groupAdminName,
        groupAdminPhone: t.groupAdminPhone,
        amountTransferred: t.amountPaid,
        transactionTime: new Date(t.date).toISOString(),
        amountToReturn: t.amountToReturn,
        dateOfReturn: t.dateOfReturn,
        defaultingCountdown: t.defaultingCountdown,
        status: t.status,
      }));
    return allPayouts;
  }, [transactions]);

  const filteredPayouts = useMemo(() => {
    let result = payouts;

    if (selectedPackageId) {
      result = result.filter(p => p.packageId === selectedPackageId);
    }

    if (filter !== 'all') {
      result = result.filter(p => p.status === filter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        p.memberName.toLowerCase().includes(searchLower) ||
        p.groupName.toLowerCase().includes(searchLower) ||
        p.packageName.toLowerCase().includes(searchLower) ||
        p.phoneNumber.includes(search)
      );
    }

    return result;
  }, [payouts, selectedPackageId, filter, search]);

  const stats = useMemo(() => {
    const active = payouts.filter(p => p.status === 'active' || p.status === 'pending').length;
    const paid = payouts.filter(p => p.status === 'paid').length;
    const overdue = payouts.filter(p => p.status === 'overdue').length;
    const totalAmount = payouts.reduce((sum, p) => sum + p.amountTransferred, 0);
    const pendingAmount = payouts
      .filter(p => p.status === 'active' || p.status === 'pending')
      .reduce((sum, p) => sum + (p.amountToReturn - p.amountTransferred), 0);

    return { active, paid, overdue, totalAmount, pendingAmount };
  }, [payouts]);

  return (
    <div>
      <div className="page-header">
        <h1>Package Payouts</h1>
        <button 
          className="btn btn-primary"
          onClick={() => exportToPDF(filteredPayouts)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          <FontAwesomeIcon icon={faFileExport} />
          Export PDF
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faMoneyBillWave} /> Total Disbursed</h3>
          <div className="value">{formatUGX(stats.totalAmount)}</div>
          <div className="sub-value">{payouts.length} transactions</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faClock} /> Pending Returns</h3>
          <div className="value">{stats.active}</div>
          <div className="sub-value">{formatUGX(stats.pendingAmount)} expected</div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faUsers} /> Completed</h3>
          <div className="value">{stats.paid}</div>
          <div className="sub-value">Fully repaid</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--danger)' }}>
          <h3><FontAwesomeIcon icon={faExclamationTriangle} /> Overdue</h3>
          <div className="value" style={{ color: 'var(--danger)' }}>{stats.overdue}</div>
          <div className="sub-value">Requires attention</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ minWidth: '200px', width: '250px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Search by member, group, package..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          value={selectedPackageId || ''} 
          onChange={(e) => setSelectedPackageId(e.target.value ? parseInt(e.target.value) : null)}
          style={{ padding: '10px 15px', borderRadius: '8px', background: 'var(--secondary)', color: 'var(--text-light)', border: '1px solid var(--border)' }}
        >
          <option value="">All Packages</option>
          {packages.map(pkg => (
            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
          ))}
        </select>

        <div className="filter-btns" style={{ marginBottom: '0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
          <button className={`filter-btn ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Paid</button>
          <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Overdue</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Transaction Time</th>
              <th>Member Name</th>
              <th>Member Phone</th>
              <th>Group Name</th>
              <th>Group Admin</th>
              <th>Admin Phone</th>
              <th>Amount Transferred</th>
              <th>Amount to Return</th>
              <th>Return Date</th>
              <th>Countdown</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayouts.length > 0 ? (
              filteredPayouts.map((payout) => {
                const countdown = getCountdownDisplay(payout.defaultingCountdown);
                const statusBadge = getStatusBadge(payout.status);
                return (
                  <tr key={payout.id}>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--accent)' }}>{payout.packageName}</span>
                    </td>
                    <td>{formatDateTime(payout.transactionTime)}</td>
                    <td style={{ fontWeight: '500' }}>{payout.memberName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{payout.memberPhone}</td>
                    <td>{payout.groupName}</td>
                    <td style={{ fontWeight: '500', color: 'var(--accent)' }}>{payout.groupAdminName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{payout.groupAdminPhone}</td>
                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>{formatUGX(payout.amountTransferred)}</td>
                    <td style={{ fontWeight: '600' }}>{formatUGX(payout.amountToReturn || payout.amountTransferred)}</td>
                    <td>{payout.dateOfReturn ? new Date(payout.dateOfReturn).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`countdown-badge ${countdown.class}`}>
                        {countdown.text}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No payouts found. Select a package or adjust your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .countdown-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .countdown-safe {
          background: rgba(0, 212, 170, 0.15);
          color: var(--accent);
        }
        .countdown-warning {
          background: rgba(241, 196, 15, 0.15);
          color: #f1c40f;
        }
        .countdown-danger {
          background: rgba(231, 76, 60, 0.15);
          color: var(--danger);
        }
        .status-paid {
          background: rgba(52, 152, 219, 0.15);
          color: #3498db;
        }
        .status-overdue, .status-defaulted {
          background: rgba(231, 76, 60, 0.15);
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}