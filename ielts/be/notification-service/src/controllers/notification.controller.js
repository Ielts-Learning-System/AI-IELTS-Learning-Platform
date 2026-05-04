const NotificationLog = require('../models/NotificationLog');
const NotificationPreference = require('../models/NotificationPreference');
const PushSubscription = require('../models/PushSubscription');

/**
 * GET /api/notifications
 * List notifications for the authenticated user (paginated, filterable).
 */
exports.listNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { userId, channel: 'in-app' };
    if (req.query.isRead === 'true') filter.isRead = true;
    if (req.query.isRead === 'false') filter.isRead = false;

    const [notifications, total] = await Promise.all([
      NotificationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NotificationLog.countDocuments(filter),
    ]);

    res.json({
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('listNotifications error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationLog.countDocuments({
      userId: req.user.id,
      channel: 'in-app',
      isRead: false,
    });
    res.json({ unreadCount: count });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await NotificationLog.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ notification });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await NotificationLog.updateMany(
      { userId: req.user.id, channel: 'in-app', isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/notifications/preferences
 */
exports.getPreferences = async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ userId: req.user.id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId: req.user.id });
    }
    res.json({ preferences: prefs });
  } catch (err) {
    console.error('getPreferences error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/notifications/preferences
 */
exports.updatePreferences = async (req, res) => {
  try {
    const { channels, categories } = req.body;
    const update = {};
    if (channels) update.channels = channels;
    if (categories) update.categories = categories;

    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId: req.user.id },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ preferences: prefs });
  } catch (err) {
    console.error('updatePreferences error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/notifications/push/subscribe
 */
exports.pushSubscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ message: 'Invalid push subscription payload' });
    }

    const sub = await PushSubscription.findOneAndUpdate(
      { userId: req.user.id, endpoint },
      { userId: req.user.id, endpoint, keys },
      { upsert: true, new: true }
    );

    res.status(201).json({ subscription: sub });
  } catch (err) {
    console.error('pushSubscribe error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /api/notifications/push/subscribe
 */
exports.pushUnsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' });
    }

    await PushSubscription.deleteOne({ userId: req.user.id, endpoint });
    res.json({ message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('pushUnsubscribe error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/notification/teacher/users/:userId/notifications
 * Teacher/Admin: list in-app notifications for a specific student.
 */
exports.getNotificationsForUser = async (req, res) => {
  try {
    const role = req.user.role || '';
    if (!['Admin', 'Teacher'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { userId } = req.params;
    const notifications = await NotificationLog.find({ userId, channel: 'in-app' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ notifications });
  } catch (err) {
    console.error('getNotificationsForUser error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/notification/teacher/send
 * Teacher/Admin: send an in-app notification to a specific student.
 * Body: { userId, message, title? }
 */
exports.sendNotificationToUser = async (req, res) => {
  try {
    const role = req.user.role || '';
    if (!['Admin', 'Teacher'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { userId, message, title } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ message: 'userId and message are required' });
    }
    const notification = await NotificationLog.create({
      userId,
      type: 'system',
      title: title || 'Nhắc nhở từ giáo viên',
      message,
      channel: 'in-app',
    });
    res.status(201).json({ notification });
  } catch (err) {
    console.error('sendNotificationToUser error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
