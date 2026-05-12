import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth.service';

export default function LoginPage() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('ENG12345');
  const [pin, setPin] = useState('1234');
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
    <div className="screen-center">
      <div className="screen-card">
        <h1 className="section-title">Yukti Login</h1>
        <p className="meta">Login with employee ID and PIN.</p>
        <div className="grid" style={{ marginTop: 20 }}>
          <input
            className="text-input"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Employee ID"
          />
          <input
            className="text-input"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
          />
          {error ? <div className="meta" style={{ color: '#dc2626' }}>{error}</div> : null}
          <button className="btn primary full-width" onClick={onLogin} disabled={loading}>
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
