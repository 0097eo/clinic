import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiUsers,
  FiUserPlus,
  FiCalendar,
  FiPackage,
  FiDollarSign,
  FiClipboard,
  FiActivity,
  FiBell,
  FiFileText
} from 'react-icons/fi';

const menuItems = [
  { label: 'Dashboard', icon: <FiHome />, to: '/dashboard', roles: ['ADMIN'] },
  { label: 'Staff', icon: <FiUserPlus />, to: '/staff', roles: ['ADMIN'] },
  {
    label: 'Patients',
    icon: <FiUsers />,
    to: '/patients',
    roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT']
  },
  {
    label: 'Appointments',
    icon: <FiCalendar />,
    to: '/appointments',
    roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'ACCOUNTANT']
  },
  {
    label: 'Billing',
    icon: <FiDollarSign />,
    to: '/billing',
    roles: ['ADMIN', 'ACCOUNTANT']
  },
  {
    label: 'Prescriptions',
    icon: <FiClipboard />,
    to: '/prescriptions',
    roles: ['ADMIN', 'DOCTOR', 'PHARMACIST']
  },
  {
    label: 'Lab Orders',
    icon: <FiActivity />,
    to: '/lab-orders',
    roles: ['ADMIN', 'DOCTOR']
  },
  {
    label: 'Inventory',
    icon: <FiPackage />,
    to: '/inventory',
    roles: ['ADMIN', 'PHARMACIST']
  },
  { label: 'Notifications', icon: <FiBell />, to: '/notifications' },
  { label: 'Audit Logs', icon: <FiFileText />, to: '/audit-logs', roles: ['ADMIN'] }
];

export function Sidebar({ user }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__branding">
        <span className="sidebar__logo">CM</span>
        <div>
          <p className="sidebar__title">ClinicMate</p>
          <p className="sidebar__subtitle">Health Management</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {menuItems
          .filter((item) => {
            if (!item.roles || item.roles.length === 0) {
              return true;
            }
            return item.roles.includes(user?.role);
          })
          .map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `sidebar__nav-item ${isActive ? 'is-active' : ''}`}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

    </aside>
  );
}
