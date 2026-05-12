import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import WorkOrderPage from '../pages/WorkOrderPage';
import SuccessPage from '../pages/SuccessPage';

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/home', element: <HomePage /> },
  { path: '/work-orders/:id', element: <WorkOrderPage /> },
  { path: '/success', element: <SuccessPage /> }
]);
