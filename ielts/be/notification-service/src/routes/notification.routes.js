const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/notification.controller');

// List notifications. If unauthenticated, return empty shape to keep client stable.
router.get('/', (req, res, next) => {
	if (!req.headers.authorization) {
		return res.status(200).json({ notifications: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
	}

	return authMiddleware(req, res, () => ctrl.listNotifications(req, res, next));
});

// Public diagnostic unread-count route for routing validation.
// If the client sends Authorization, return the real unread count.
router.get('/unread-count', (req, res, next) => {
	if (!req.headers.authorization) {
		return res.status(200).json({ unreadCount: 0 });
	}

	return authMiddleware(req, res, () => ctrl.getUnreadCount(req, res, next));
});

// Protected notification operations
router.use(authMiddleware);

router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);

// Preferences
router.get('/preferences', ctrl.getPreferences);
router.put('/preferences', ctrl.updatePreferences);

// Push subscriptions
router.post('/push/subscribe', ctrl.pushSubscribe);
router.delete('/push/subscribe', ctrl.pushUnsubscribe);

// Teacher/Admin endpoints — view & send notifications for a specific student
router.get('/teacher/users/:userId/notifications', ctrl.getNotificationsForUser);
router.post('/teacher/send', ctrl.sendNotificationToUser);

module.exports = router;
