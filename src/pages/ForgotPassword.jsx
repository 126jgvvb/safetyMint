import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }
    setMessage('Password reset link sent to your email');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Safety<span>Mint</span></h1>
          <p>Reset Your Password</p>
        </div>
        <form onSubmit={handleSubmit}>
          {message && <div style={{ color: '#00d4aa', marginBottom: '15px', textAlign: 'center' }}>{message}</div>}
          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faEnvelope} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa' }} />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Send Reset Link</button>
        </form>
        <div className="auth-footer">
          <p><Link to="/login">Back to Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}