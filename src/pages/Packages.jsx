import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSnowflake, faArrowUp, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';

const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

const validatePackageForm = (data) => {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Package name is required';
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
  const [formData, setFormData] = useState({
    name: '',
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
      });
    }
    setShowModal(false);
    setEditingPackage(null);
    setFormErrors({});
    setFormData({ name: '', interestRate: '', cycle: 'monthly', minAmount: '', maxAmount: '', subcontractor: '' });
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
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
        p.subcontractor.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [packages, filter, search]);

  return (
    <div>
      <div className="page-header">
        <h1>Loan Packages</h1>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setFormErrors({}); setFormData({ name: '', interestRate: '', cycle: 'monthly', minAmount: '', maxAmount: '', subcontractor: '' }); }}>
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
        return (
          <div key={pkg.id} className="package-card">
            <div className="package-header">
              <div>
                <div className="package-name">{pkg.name}</div>
                <div className="package-subcontractor">{pkg.subcontractor}</div>
              </div>
              <span className={`status-badge ${pkg.status === 'active' ? 'status-active' : 'status-frozen'}`}>
                {pkg.status === 'active' ? 'Active' : 'Frozen'}
              </span>
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
            <div className="package-progress">
              <div className="progress-label">
                <span>Payout Progress</span>
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