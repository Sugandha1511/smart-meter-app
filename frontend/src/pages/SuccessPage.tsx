import { Link } from 'react-router-dom';

export default function SuccessPage() {
  return (
    <div className="screen-center">
      <div className="screen-card" style={{ textAlign: 'center' }}>
        <h1 className="section-title">Submitted</h1>
        <p className="meta">The work order has been submitted successfully.</p>
        <Link to="/home" style={{ textDecoration: 'none' }}>
          <button className="btn primary" style={{ marginTop: 16 }}>Back to Home</button>
        </Link>
      </div>
    </div>
  );
}
