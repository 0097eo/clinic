const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const notificationService = require('../src/services/notification.service');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const employeeUser = {
  id: 'employee-1',
  role: 'ADMIN',
  fullName: 'Notification User',
  email: 'notify@clinic.com'
};

const authHeader = () => `Bearer ${signToken({ id: employeeUser.id, role: employeeUser.role })}`;

describe('Notification routes', () => {
  beforeEach(() => {
    mockPrisma.employee.findUnique.mockReset();
    mockPrisma.employee.findUnique.mockResolvedValue(employeeUser);
    notificationService.getNotifications.mockClear();
    notificationService.getUnreadCount.mockClear();
  });

  it('returns notifications with pagination data', async () => {
    const notifications = [
      { id: 'notif-1', message: 'Hello' },
      { id: 'notif-2', message: 'World' }
    ];

    notificationService.getNotifications.mockResolvedValueOnce(notifications);
    notificationService.getUnreadCount.mockResolvedValueOnce(1);

    const response = await request(app, {
      method: 'GET',
      url: '/api/notifications?page=1&pageSize=2',
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(notifications);
    expect(response.body.unreadCount).toBe(1);
  });

  it('returns unread notification count', async () => {
    notificationService.getUnreadCount.mockResolvedValueOnce(3);

    const response = await request(app, {
      method: 'GET',
      url: '/api/notifications/unread',
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ unread: 3 });
  });

  it('marks a notification as read', async () => {
    const notification = { id: 'notif-3', status: 'READ' };
    notificationService.markAsRead.mockResolvedValueOnce(notification);

    const response = await request(app, {
      method: 'PATCH',
      url: `/api/notifications/${notification.id}/read`,
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(notification);
    expect(notificationService.markAsRead).toHaveBeenCalledWith(notification.id, employeeUser.id);
  });

  it('marks all notifications as read', async () => {
    notificationService.markAllAsRead.mockResolvedValueOnce({ count: 5 });

    const response = await request(app, {
      method: 'PATCH',
      url: '/api/notifications/read-all',
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ updated: 5 });
  });

  it('deletes a notification', async () => {
    notificationService.deleteNotification.mockResolvedValueOnce({ count: 1 });

    const response = await request(app, {
      method: 'DELETE',
      url: '/api/notifications/notif-9',
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(204);
    expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-9', employeeUser.id);
  });
});
