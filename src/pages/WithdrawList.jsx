import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp, faList, faSearch, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

export default function WithdrawList() {
  const { walletTransactions } = useApp();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FontAwesomeIcon icon={faSort} />;
    return sortOrder === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />;
  };

  const filteredTransactions = useMemo(() => {
    let result = [...walletTransactions];
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.walletType?.toLowerCase().includes(searchLower) ||
        t.type.toLowerCase().includes(searchLower)
      );
    }
    
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [walletTransactions, search, sortField, sortOrder]);

  return (
    <div>
      <div className="page-header">
        <h1>Withdraw / Deposit List</h1>
      </div>

      <div className="search-bar" style={{ maxWidth: '300px', marginBottom: '20px' }}>
        <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
        <input 
          type="text" 
          placeholder="Search..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faArrowDown} /> Total Deposits</h3>
          <div className="value">
            {formatUGX(walletTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0))}
          </div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faArrowUp} /> Total Withdrawals</h3>
          <div className="value">
            {formatUGX(walletTransactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0))}
          </div>
        </div>
        <div className="stat-card">
          <h3><FontAwesomeIcon icon={faList} /> Total Transactions</h3>
          <div className="value">{walletTransactions.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Wallet Transactions ({filteredTransactions.length})</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID {getSortIcon('id')}</th>
                <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>Type {getSortIcon('type')}</th>
                <th onClick={() => handleSort('walletType')} style={{ cursor: 'pointer' }}>Wallet {getSortIcon('walletType')}</th>
                <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>Amount {getSortIcon('amount')}</th>
                <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>Description {getSortIcon('description')}</th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Date {getSortIcon('date')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontWeight: '600' }}>#{tx.id}</td>
                  <td>
                    <span className={`status-badge ${tx.type === 'deposit' ? 'status-active' : 'status-frozen'}`}>
                      {tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{tx.walletType || 'main'}</td>
                  <td style={{ color: tx.type === 'deposit' ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                    {tx.type === 'deposit' ? '+' : '-'}{formatUGX(tx.amount)}
                  </td>
                  <td>{tx.description}</td>
                  <td>{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}