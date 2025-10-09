import { FiCalendar, FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export function Topbar({ user, onLogout }) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const label = (user?.fullName || user?.email || 'C').trim();
  const initials = (label ? label.charAt(0) : 'C').toUpperCase();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div>
        <p className="topbar__eyebrow">Welcome back,</p>
        <h1 className="topbar__title">{user?.fullName || 'Care Provider'}</h1>
        {user?.role ? <span className="topbar__badge">{user.role}</span> : null}
      </div>

      <div className="topbar__actions">
        <div className="topbar__calendar">
          <FiCalendar />
          <span>{formattedDate}</span>
        </div>

        <button
          type="button"
          className="topbar__avatar"
          aria-label={user?.fullName ? `Profile for ${user.fullName}` : 'Profile'}
          onClick={() => navigate('/profile')}
        >
          {initials}
        </button>

        {onLogout ? (
          <button type="button" className="icon-button icon-button--danger" onClick={onLogout} aria-label="Log out">
            <FiLogOut />
          </button>
        ) : null}
      </div>
    </header>
  );
}
