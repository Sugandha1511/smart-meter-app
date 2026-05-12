import { Link, useLocation } from 'react-router-dom';

interface SuccessState {
  submissionId?: string;
  submittedAt?: string;
}

export default function SuccessPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as SuccessState;

  const formattedTime = state.submittedAt
    ? new Date(state.submittedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;

  return (
    <div className="screen-center">
      <div className="screen-card" style={{ textAlign: 'center' }}>
        <div className="success-icon">✅</div>
        <h1 className="section-title">Work Order Submitted</h1>
        <p className="meta" style={{ marginTop: 6 }}>
          The meter installation work order has been submitted successfully.
        </p>

        {state.submissionId && (
          <div style={{ marginTop: 20, textAlign: 'left' }}>
            <div className="meta-row">
              <span className="meta">Submission ID</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{state.submissionId}</span>
            </div>
            {formattedTime && (
              <div className="meta-row">
                <span className="meta">Submitted At</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{formattedTime}</span>
              </div>
            )}
          </div>
        )}

        <Link to="/home" style={{ textDecoration: 'none' }}>
          <button className="btn primary full-width" style={{ marginTop: 24 }}>
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}

