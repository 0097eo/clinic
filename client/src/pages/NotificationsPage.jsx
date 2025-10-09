import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { getNotificationsList, markNotificationRead, deleteNotification } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getNotificationsList({ pageSize: 50 }, token);
      setNotifications(response?.data ?? []);
    } catch (err) {
      console.error('Failed to load notifications', err);
      setError(err?.details?.message || err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id, token);
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, status: 'READ', readAt: new Date().toISOString() } : notification))
      );
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id, token);
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader title="Notifications" subtitle="Inbox" />

      {error ? (
        <div className="panel panel--error">
          <h2 className="panel__title">{error}</h2>
        </div>
      ) : null}

      <div className="panel notifications-panel">
        {loading ? <p>Loading notifications…</p> : null}
        {notifications.length === 0 && !loading ? <p>No notifications yet.</p> : null}

        <ul className="notifications-list">
          {notifications.map((notification) => (
            <li key={notification.id} className={notification.status === 'READ' ? 'is-read' : ''}>
              <div>
                <p className="notifications-list__title">{notification.title}</p>
                <p className="notifications-list__message">{notification.message}</p>
                <p className="notifications-list__meta">
                  {notification.type} • {notification.channel} • {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="notifications-list__actions">
                {notification.status !== 'READ' ? (
                  <button type="button" onClick={() => handleMarkRead(notification.id)}>
                    Mark read
                  </button>
                ) : null}
                <button type="button" onClick={() => handleDelete(notification.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
