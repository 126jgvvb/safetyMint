import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faUser, faPhone, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useApp } from '../context/AppContext';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signup(formData);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await loginWithGoogle();
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Google signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Safety<span>Mint</span></h1>
          <p>Create Your Account</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: '#e74c3c', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
          <div className="form-group">
            <label>Full Name</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faUser} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa' }} />
              <input
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faEnvelope} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa' }} />
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faPhone} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa' }} />
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faLock} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
              />
              <FontAwesomeIcon
                icon={showPassword ? faEyeSlash : faEye}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa', cursor: 'pointer' }}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <button
            type="button"
            className="btn btn-google btn-block"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faGoogle} style={{ marginRight: '8px' }} />
            Continue with Google
          </button>
        </form>
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}