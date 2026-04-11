import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';

export default function ForgotEmail() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone) {
      setMessage('Please enter your phone number');
      return;
    }
    setMessage('Your email address will be sent to your phone');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Safety<span>Mint</span></h1>
          <p>Recover Your Email</p>
        </div>
        <form onSubmit={handleSubmit}>
          {message && <div style={{ color: '#00d4aa', marginBottom: '15px', textAlign: 'center' }}>{message}</div>}
          <div className="form-group">
            <label>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faPhone} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8898aa' }} />
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Recover Email</button>
        </form>
        <div className="auth-footer">
          <p><Link to="/login">Back to Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}