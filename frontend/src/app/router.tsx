import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import WorkOrderPage from '../pages/WorkOrderPage';
import SuccessPage from '../pages/SuccessPage';

function ErrorPage() {
  const error = useRouteError() as { status?: number; statusText?: string; message?: string } | null;
  const is404 = !error || error.status === 404;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>{is404 ? 'Page not found' : 'Something went wrong'}</h2>
      <p style={{ color: '#6b7280', textAlign: 'center' }}>
        {is404 ? 'The page you are looking for does not exist.' : (error?.message ?? 'An unexpected error occurred.')}
      </p>
      <a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>Go to Login</a>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage />, errorElement: <ErrorPage /> },
  { path: '/home', element: <HomePage />, errorElement: <ErrorPage /> },
  { path: '/work-orders/:id', element: <WorkOrderPage />, errorElement: <ErrorPage /> },
  { path: '/success', element: <SuccessPage />, errorElement: <ErrorPage /> },
  { path: '*', element: <Navigate to="/" replace /> }
]);
