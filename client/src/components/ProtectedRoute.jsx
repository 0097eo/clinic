import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginOverlay } from './LoginOverlay';

export function ProtectedRoute({ requireAdmin = false }) {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token) {
    return <LoginOverlay />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/patients" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
