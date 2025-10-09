import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './index.css';

import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { StaffPage } from './pages/StaffPage';
import { PatientsPage } from './pages/PatientsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { BillingPage } from './pages/BillingPage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { LabOrdersPage } from './pages/LabOrdersPage';
import { InventoryPage } from './pages/InventoryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAuth } from './context/AuthContext';

function DefaultRoute() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/patients" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DefaultRoute />} />
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="lab-orders" element={<LabOrdersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/patients" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
