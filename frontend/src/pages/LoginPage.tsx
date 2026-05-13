import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth.service';
import { warmupBackend } from '../services/api';

function SnowflakeIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <line x1="32" y1="4" x2="32" y2="60" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="4" y1="32" x2="60" y2="32" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="9.37" y1="9.37" x2="54.63" y2="54.63" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="54.63" y1="9.37" x2="9.37" y2="54.63" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="32" y1="18" x2="26" y2="13" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="18" x2="38" y2="13" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="46" x2="26" y2="51" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="46" x2="38" y2="51" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="32" x2="13" y2="26" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="32" x2="13" y2="38" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="46" y1="32" x2="51" y2="26" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="46" y1="32" x2="51" y2="38" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('ENG12345');
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(true);
  const [error, setError] = useState('');

  // Wake up the Render backend as soon as the login page mounts
  useEffect(() => {
    warmupBackend();
    const timer = setTimeout(() => setWarming(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const onLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const data = await login(employeeId, pin);
      localStorage.setItem('token', data.access_token);
      navigate('/home');
    } catch {
      setError('Invalid Employee ID or PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <SnowflakeIcon />
      <h1 className="login-title">Welcome to Yukti</h1>
      <p className="login-subtitle">Login with your credentials to continue</p>

      <div className="login-form">
        <div className="login-field">
          <label className="login-label">Employee ID</label>
          <div className="login-input-wrap">
            <input
              className="login-input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Enter your employee ID"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="login-field">
          <label className="login-label">PIN</label>
          <div className="login-input-wrap">
            <input
              className="login-input"
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              autoComplete="current-password"
              onKeyDown={(e) => { if (e.key === 'Enter') void onLogin(); }}
            />
            <button
              type="button"
              className="login-eye-btn"
              onClick={() => setShowPin(!showPin)}
              aria-label="Toggle PIN visibility"
            >
              {showPin ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="login-forgot">
          Forgot PIN? <a href="#" onClick={(e) => e.preventDefault()}>Reset PIN</a>
        </div>

        <label className="login-remember">
          <input
            type="checkbox"
            className="login-checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>

        {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}

        <button className="login-btn" onClick={() => void onLogin()} disabled={loading || warming}>
          {loading ? 'Please wait...' : warming ? '⏳ Starting server...' : 'Login'}
        </button>
      </div>
    </div>
  );
}
