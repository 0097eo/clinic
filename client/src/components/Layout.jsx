import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../context/AuthContext';

const TITLE_MAP = {
  '/dashboard': 'Dashboard',
  '/staff': 'Staff',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/billing': 'Billing',
  '/prescriptions': 'Prescriptions',
  '/lab-orders': 'Lab Orders',
  '/inventory': 'Inventory',
  '/notifications': 'Notifications',
  '/audit-logs': 'Audit Logs',
  '/profile': 'Profile'
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const pageTitle = TITLE_MAP[location.pathname];
    document.title = pageTitle ? `${pageTitle} • ClinicMate` : 'ClinicMate';
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar user={user} />

      <div className="app-main">
        <Topbar user={user} onLogout={logout} />

        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
