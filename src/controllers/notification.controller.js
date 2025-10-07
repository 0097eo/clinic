const notificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const skip = (page - 1) * pageSize;

  const data = await notificationService.getNotifications(req.user.id, { skip, take: pageSize });
  const unreadCount = await notificationService.getUnreadCount(req.user.id);

  res.json({
    data,
    pagination: {
      page,
      pageSize
    },
    unreadCount
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.json({ data: { unread: count } });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);
  res.json({ data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.json({ data: { updated: result.count } });
});

const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user.id);
  res.status(204).send();
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification
};
