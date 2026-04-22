import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSnowflake, faArrowUp, faSearch, faCheckCircle, faTimesCircle, faUndo, faChartPie } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const validatePackageForm = (data) => {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Package name is required';
  if (!data.ownerName?.trim()) errors.ownerName = 'Owner name is required';
  if (!data.ownerPhone?.trim()) errors.ownerPhone = 'Owner phone is required';
  if (!data.interestRate || parseFloat(data.interestRate) < 3) errors.interestRate = 'Interest rate must be at least 3%';
  if (!data.minAmount || parseFloat(data.minAmount) < 10000) errors.minAmount = 'Min amount must be at least UGX 10,000';
  if (!data.maxAmount || parseFloat(data.maxAmount) < 10000) errors.maxAmount = 'Max amount must be at least UGX 10,000';
  if (parseFloat(data.minAmount) > parseFloat(data.maxAmount)) errors.maxAmount = 'Max must be greater than min';
  if (!data.subcontractor?.trim()) errors.subcontractor = 'Sub-contractor is required';
  return errors;
};

const validateAmount = (value) => {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return 'Amount is required';
  if (num <= 0) return 'Amount must be positive';
  if (num < 1000) return 'Minimum amount is UGX 1,000';
  return null;
};

export default function Packages() {
  const { packages, addPackage, updatePackage, deletePackage, toggleFreezePackage, allocateToPackage, wallet } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [allocateError, setAllocateError] = useState('');
  const [expandedPackage, setExpandedPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerPhone: '',
    interestRate: '',
    cycle: 'monthly',
    minAmount: '',
    maxAmount: '',
    subcontractor: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validatePackageForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    if (editingPackage) {
      updatePackage(editingPackage.id, {
        ...formData,
        interestRate: parseFloat(formData.interestRate),
        minAmount: parseFloat(formData.minAmount),
        maxAmount: parseFloat(formData.maxAmount),
      });
    } else {
      addPackage({
        ...formData,
        interestRate: parseFloat(formData.interestRate),
        minAmount: parseFloat(formData.minAmount),
        maxAmount: parseFloat(formData.maxAmount),
        successfulPayouts: 0,
        failedPayouts: 0,
        revokedPayouts: 0,
      });
    }
    setShowModal(false);
    setEditingPackage(null);
    setFormErrors({});
    setFormData({ name: '', ownerName: '', ownerPhone: '', interestRate: '', cycle: 'monthly', minAmount: '', maxAmount: '', subcontractor: '' });
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      ownerName: pkg.ownerName || '',
      ownerPhone: pkg.ownerPhone || '',
      interestRate: pkg.interestRate.toString(),
      cycle: pkg.cycle,
      minAmount: pkg.minAmount.toString(),
      maxAmount: pkg.maxAmount.toString(),
      subcontractor: pkg.subcontractor,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleAllocate = () => {
    const error = validateAmount(allocateAmount);
    if (error) {
      setAllocateError(error);
      return;
    }
    
    if (selectedPackage && allocateAmount) {
      allocateToPackage(selectedPackage.id, parseFloat(allocateAmount), '');
      setShowAllocateModal(false);
      setSelectedPackage(null);
      setAllocateAmount('');
      setAllocateError('');
    }
  };

  const filteredPackages = useMemo(() => {
    let result = [...packages];
    
    if (filter !== 'all') {
      result = result.filter(p => p.status === filter);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.subcontractor.toLowerCase().includes(searchLower) ||
        p.ownerName?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [packages, filter, search]);

  const getPayoutStats = (pkg) => {
    const total = (pkg.successfulPayouts || 0) + (pkg.failedPayouts || 0) + (pkg.revokedPayouts || 0);
    const successRate = total > 0 ? ((pkg.successfulPayouts || 0) / total * 100).toFixed(1) : 0;
    return { total, successRate };
  };

  return (
    <div>
      <div className="page-header">
        <h1>Loan Packages</h1>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setFormErrors({}); setFormData({ name: '', ownerName: '', ownerPhone: '', interestRate: '', cycle: 'monthly', minAmount: '', maxAmount: '', subcontractor: '' }); }}>
          <FontAwesomeIcon icon={faPlus} /> Add Package
        </button>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ minWidth: '200px', width: '250px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Search packages..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-btns" style={{ marginBottom: '0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
          <button className={`filter-btn ${filter === 'frozen' ? 'active' : ''}`} onClick={() => setFilter('frozen')}>Frozen</button>
        </div>
      </div>

      {filteredPackages.map(pkg => {
        const progress = pkg.maxAmount > 0 ? (pkg.currentAmount / pkg.maxAmount) * 100 : 0;
        const stats = getPayoutStats(pkg);
        const isExpanded = expandedPackage === pkg.id;
        
        return (
          <div key={pkg.id} className="package-card">
            <div className="package-header">
              <div>
                <div className="package-name">{pkg.name}</div>
                <div className="package-subcontractor">
                  Owner: {pkg.ownerName || 'N/A'} | {pkg.ownerPhone || 'N/A'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`status-badge ${pkg.status === 'active' ? 'status-active' : 'status-frozen'}`}>
                  {pkg.status === 'active' ? 'Active' : 'Frozen'}
                </span>
                <button 
                  className="action-btn" 
                  onClick={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                  title="View Details"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <FontAwesomeIcon icon={faChartPie} />
                </button>
              </div>
            </div>
            <div className="package-details">
              <div className="detail-item">
                <span className="detail-label">Interest Rate</span>
                <span className="detail-value">{pkg.interestRate}%</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Cycle</span>
                <span className="detail-value">{pkg.cycle}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Amount Range</span>
                <span className="detail-value">{formatUGX(pkg.minAmount)} - {formatUGX(pkg.maxAmount)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Amount</span>
                <span className="detail-value">{formatUGX(pkg.currentAmount)}</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: '15px', padding: '15px', background: 'var(--secondary)', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px', color: 'var(--accent)' }}>Payout Performance</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0, 212, 170, 0.15)', borderRadius: '8px' }}>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#00d4aa', fontSize: '24px' }} />
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4aa' }}>{pkg.successfulPayouts || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Successful</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(231, 76, 60, 0.15)', borderRadius: '8px' }}>
                    <FontAwesomeIcon icon={faTimesCircle} style={{ color: '#e74c3c', fontSize: '24px' }} />
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{pkg.failedPayouts || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Failed</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(241, 196, 15, 0.15)', borderRadius: '8px' }}>
                    <FontAwesomeIcon icon={faUndo} style={{ color: '#f1c40f', fontSize: '24px' }} />
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1c40f' }}>{pkg.revokedPayouts || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Forcefully Revoked</div>
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px' }}>Total Payouts: {stats.total}</span>
                    <span style={{ fontSize: '14px', color: '#00d4aa' }}>{stats.successRate}% Success Rate</span>
                  </div>
                  <div className="progress-bar" style={{ height: '12px' }}>
                    {stats.total > 0 && (
                      <>
                        <div className="progress-fill" style={{ width: `${(pkg.successfulPayouts / stats.total) * 100}%`, background: '#00d4aa' }}></div>
                        <div className="progress-fill" style={{ width: `${(pkg.revokedPayouts / stats.total) * 100}%`, background: '#f1c40f', marginLeft: '-1px' }}></div>
                        <div className="progress-fill" style={{ width: `${(pkg.failedPayouts / stats.total) * 100}%`, background: '#e74c3c', marginLeft: '-1px' }}></div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span><span style={{ color: '#00d4aa' }}>■</span> Successful</span>
                  <span><span style={{ color: '#f1c40f' }}>■</span> Revoked</span>
                  <span><span style={{ color: '#e74c3c' }}>■</span> Failed</span>
                </div>
              </div>
            )}

            <div className="package-progress">
              <div className="progress-label">
                <span>Lending Progress (based on successful requests)</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
              </div>
            </div>
            <div className="action-btns" style={{ marginTop: '15px' }}>
              <button className="action-btn btn-edit" onClick={() => handleEdit(pkg)}>
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button className="action-btn btn-delete" onClick={() => deletePackage(pkg.id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
              <button className="action-btn btn-freeze" onClick={() => toggleFreezePackage(pkg.id)}>
                <FontAwesomeIcon icon={faSnowflake} />
              </button>
              {pkg.status === 'active' && (
                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => { setSelectedPackage(pkg); setShowAllocateModal(true); setAllocateError(''); setAllocateAmount(''); }}>
                  <FontAwesomeIcon icon={faArrowUp} /> Allocate
                </button>
              )}
            </div>
          </div>
        );
      })}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingPackage ? 'Edit Package' : 'Add New Package'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Package Name</label>
                <input type="text" value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setFormErrors({ ...formErrors, name: '' }); }} required />
                {formErrors.name && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formErrors.name}</span>}
              </div>
              <div className="form-group">
                <label>Package Owner Name</label>
                <input type="text" value={formData.ownerName} onChange={e => { setFormData({ ...formData, ownerName: e.target.value }); setFormErrors({ ...formErrors, ownerName: '' }); }} required />
                {formErrors.ownerName && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formErrors.ownerName}</span>}
              </div>
              <div className="form-group">
                <label>Package Owner Phone</label>
                <input type="text" value={formData.ownerPhone} onChange={e => { setFormData({ ...formData, ownerPhone: e.target.value }); setFormErrors({ ...formErrors, ownerPhone: '' }); }} required />
                {formErrors.ownerPhone && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formErrors.ownerPhone}</span>}
              </div>
              <div className="form-group">
                <label>Interest Rate (%) - Min: 3%</label>
                <input type="number" step="0.1" value={formData.interestRate} onChange={e => { setFormData({ ...formData, interestRate: e.target.value }); setFormErrors({ ...formErrors, interestRate: '' }); }} required />
                {formErrors.interestRate && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formErrors.interestRate}</span>}
              </div>
              <div className="form-group">
                <label>Cycle/Interval</label>
                <select value={formData.cycle} onChange={e => setFormData({ ...formData, cycle: e.target.value })}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Min Amount - Min: UGX 10,000</label>
                <input type="number" value={formData.minAmount} onChange={e => { setFormData({ ...formData, minAmount: e.target.value }); setFormErrors({ ...formErrors, minAmount: '' }); }} required />
                {formErrors.minAmount && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formErrors.minAmount}</span>}
              </div>
              <div className="form-group">
                <label>Max Amount - Min: UGX 10,000</label>
                <input type="number" value={formData.maxAmount} onChange={e => { setFormData({ ...formData, maxAmount: e.target.value }); setFormErrors({ ...formErrors, maxAmount: '' }); }} required />
                {formErrors.maxAmount && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formErrors.maxAmount}</span>}
              </div>
              <div className="form-group">
                <label>Sub-contractor Company Name</label>
                <input type="text" value={formData.subcontractor} onChange={e => { setFormData({ ...formData, subcontractor: e.target.value }); setFormErrors({ ...formErrors, subcontractor: '' }); }} required />
                {formErrors.subcontractor && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formErrors.subcontractor}</span>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingPackage ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAllocateModal && selectedPackage && (
        <div className="modal-overlay" onClick={() => setShowAllocateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Allocate to {selectedPackage.name}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Available main wallet: {formatUGX(wallet.main)}</p>
            <div className="form-group">
              <label>Amount to Allocate (min: UGX 1,000)</label>
              <input type="number" value={allocateAmount} onChange={e => { setAllocateAmount(e.target.value); setAllocateError(''); }} placeholder="Enter amount" required />
              {allocateError && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{allocateError}</span>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleAllocate}>Allocate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}