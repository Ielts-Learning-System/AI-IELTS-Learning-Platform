const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/notification.controller');

// Public diagnostic route to verify Gateway -> App -> Router wiring.
router.get('/', (req, res) => {
	res.status(200).json({ message: 'Notification service is working' });
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

module.exports = router;
