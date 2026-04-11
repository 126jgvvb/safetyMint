import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faSearch, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { generatePDF } from '../utils/pdfGenerator';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const generateTXNId = (id) => {
  const str = id.toString() + Math.random().toString(36).substring(2, 5);
  return str.toUpperCase().padStart(7, '0').slice(0, 7);
};

const getStatusText = (status) => {
  switch (status) {
    case 'paid': return 'Paid Back';
    case 'pending': return 'Pending';
    case 'overdue': return 'Overdue';
    case 'reserve_used': return 'Reserve Used';
    default: return status;
  }
};

const getWeeksInMonth = (cycle) => {
  switch (cycle) {
    case 'weekly': return 1;
    case 'biweekly': return 2;
    case 'monthly': return 4;
    case 'quarterly': return 12;
    default: return 4;
  }
};

export default function Transactions() {
  const { transactions } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');

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
    let result = [...transactions];
    
    if (filter !== 'all') {
      result = result.filter(t => t.status === filter);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t => 
        t.memberName.toLowerCase().includes(searchLower) ||
        t.groupName.toLowerCase().includes(searchLower) ||
        t.phoneNumber.toLowerCase().includes(searchLower) ||
        generateTXNId(t.id).toLowerCase().includes(searchLower)
      );
    }
    
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'txnId') {
        aVal = generateTXNId(a.id);
        bVal = generateTXNId(b.id);
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [transactions, filter, search, sortField, sortOrder]);

  const handleExportPDF = () => {
    generatePDF(filteredTransactions);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Transactions / Payout List</h1>
        <button className="btn btn-secondary" onClick={handleExportPDF}>
          <FontAwesomeIcon icon={faFilePdf} /> Export PDF
        </button>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ minWidth: '200px', width: '250px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-btns" style={{ marginBottom: '0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
          <button className={`filter-btn ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Paid Back</button>
          <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Overdue</button>
          <button className={`filter-btn ${filter === 'reserve_used' ? 'active' : ''}`} onClick={() => setFilter('reserve_used')}>Reserve Used</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Payout Records ({filteredTransactions.length})</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>TXN ID {getSortIcon('id')}</th>
                <th onClick={() => handleSort('memberName')} style={{ cursor: 'pointer' }}>Member Name {getSortIcon('memberName')}</th>
                <th onClick={() => handleSort('groupName')} style={{ cursor: 'pointer' }}>Group Name {getSortIcon('groupName')}</th>
                <th onClick={() => handleSort('phoneNumber')} style={{ cursor: 'pointer' }}>Phone Number {getSortIcon('phoneNumber')}</th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Payout Date {getSortIcon('date')}</th>
                <th onClick={() => handleSort('amountPaid')} style={{ cursor: 'pointer' }}>Amount {getSortIcon('amountPaid')}</th>
                <th onClick={() => handleSort('interestRate')} style={{ cursor: 'pointer' }}>Rate {getSortIcon('interestRate')}</th>
                <th>Return Date</th>
                <th>Amount to Return</th>
                <th>Withdraw/Month</th>
                <th>Amount/Withdraw</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {getSortIcon('status')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(txn => {
                const weeks = getWeeksInMonth('monthly');
                const amountPerWithdraw = txn.amountToReturn / weeks;
                return (
                  <tr key={txn.id} style={{ backgroundColor: txn.status === 'paid' ? 'rgba(39, 174, 96, 0.1)' : txn.status === 'overdue' ? 'rgba(231, 76, 60, 0.1)' : 'transparent', whiteSpace: 'nowrap' }}>
                    <td style={{ fontWeight: '600' }}>{generateTXNId(txn.id)}</td>
                    <td>{txn.memberName}</td>
                    <td>{txn.groupName}</td>
                    <td>{txn.phoneNumber}</td>
                    <td>{txn.date}</td>
                    <td>{formatUGX(txn.amountPaid)}</td>
                    <td>{txn.interestRate}%</td>
                    <td>{txn.dateOfReturn}</td>
                    <td style={{ fontWeight: '600' }}>{formatUGX(txn.amountToReturn)}</td>
                    <td style={{ fontWeight: '600' }}>{weeks}</td>
                    <td style={{ fontWeight: '600', color: 'var(--accent)' }}>{formatUGX(amountPerWithdraw)}</td>
                    <td>
                      <span className={`status-badge status-${txn.status}`}>
                        {getStatusText(txn.status)}
                      </span>
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