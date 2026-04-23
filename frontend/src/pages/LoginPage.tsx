import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth.service';

export default function LoginPage() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('ENG12345');
  const [pin, setPin] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const data = await login(employeeId, pin);
      localStorage.setItem('token', data.access_token);
      navigate('/home');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 6v14m0 24v14M6 32h14m24 0h14M13.2 13.2l10 10m17.6 17.6l10 10M50.8 13.2l-10 10M23.2 40.8l-10 10"
              stroke="#1D73B8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M32 20c6.6 0 12 5.4 12 12s-5.4 12-12 12-12-5.4-12-12 5.4-12 12-12Z"
              stroke="#1D73B8"
              strokeWidth="4"
            />
          </svg>
        </div>

        <h1 className="auth-title">Welcome to Yukti</h1>
        <div className="auth-subtitle">Login with your credentials to continue</div>

        <div className="form-label">Email ID</div>
        <input
          className="text-input auth"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="Enter your email id"
          inputMode="email"
          autoComplete={rememberMe ? 'username' : 'off'}
        />

        <div className="form-label">Password</div>
        <div className="password-wrap">
          <input
            className="text-input auth"
            type={showPassword ? 'text' : 'password'}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter your password"
            autoComplete={rememberMe ? 'current-password' : 'off'}
          />
          <button
            type="button"
            className="icon-btn password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
          >
            <svg className="composer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              {!showPassword ? (
                <path
                  d="M4 4l16 16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : null}
            </svg>
          </button>
        </div>

        <div className="auth-row">
          <div className="meta">
            Forgot password? <a className="link" href="#" onClick={(e) => e.preventDefault()}>Reset password</a>
          </div>
        </div>

        <div className="auth-row">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <div />
        </div>

        {error ? <div className="meta" style={{ color: '#dc2626', marginTop: 10 }}>{error}</div> : null}

        <button className="auth-login-btn" onClick={onLogin} disabled={loading}>
          {loading ? 'Please wait...' : 'Login'}
        </button>
      </div>
    </div>
  );
}
