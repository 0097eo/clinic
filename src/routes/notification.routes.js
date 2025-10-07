const { Router } = require('express');

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification
} = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread', getUnreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
