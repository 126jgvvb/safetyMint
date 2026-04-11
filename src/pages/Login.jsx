import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useApp } from '../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Safety<span>Mint</span></h1>
          <p>Secure Loan Management</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: '#e74c3c', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
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
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faLock} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
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
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <button
            type="button"
            className="btn btn-google btn-block"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faGoogle} style={{ marginRight: '8px' }} />
            Continue with Google
          </button>
        </form>
        <div className="auth-footer">
          <p><Link to="/forgot-password">Forgot Password?</Link></p>
          <p style={{ marginTop: '10px' }}>Don't have an account? <Link to="/signup">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
}