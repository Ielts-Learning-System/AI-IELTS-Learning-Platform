const NotificationLog = require('../models/NotificationLog');
const NotificationPreference = require('../models/NotificationPreference');
const PushSubscription = require('../models/PushSubscription');
const { sendTemplateEmail } = require('./email.service');
const { sendPushNotification } = require('./push.service');
const { emitToUser } = require('./socket.service');

/**
 * Dispatch a notification across all enabled channels based on user preferences.
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.type - Notification type enum value
 * @param {string} opts.category - Preference category key (payment, grading, reminder, system)
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.entityType]
 * @param {string} [opts.entityId]
 * @param {Object} [opts.metadata]
 * @param {string} [opts.emailSubject] - Override email subject
 * @param {string} [opts.emailHtml] - Override email body
 * @param {string} [opts.userEmail] - Recipient email address
 */
async function dispatch(opts) {
  const {
    userId, type, category, title, message,
    entityType, entityId, metadata,
    emailSubject, emailHtml, userEmail,
  } = opts;

  // Load user preferences (default: all enabled)
  let prefs = await NotificationPreference.findOne({ userId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ userId });
  }

  // Check category opt-in
  if (category && prefs.categories && prefs.categories[category] === false) {
    return; // User opted out of this category
  }

  const results = [];

  // --- In-App ---
  if (prefs.channels.inApp !== false) {
    const log = await NotificationLog.create({
      userId, type, title, message,
      channel: 'in-app',
      entityType, entityId, metadata,
    });
    results.push(log);

    // Real-time via Socket.io
    emitToUser(userId, {
      _id: log._id,
      type, title, message,
      entityType, entityId,
      createdAt: log.createdAt,
    });
  }

  // --- Email ---
  if (prefs.channels.email !== false && userEmail) {
    try {
      await sendTemplateEmail(
        userEmail,
        emailSubject || title,
        emailHtml || `<p>${message}</p>`
      );
      await NotificationLog.create({
        userId, type, title, message,
        channel: 'email',
        entityType, entityId, metadata,
      });
    } catch (err) {
      console.error(`Email dispatch failed for user ${userId}:`, err.message);
    }
  }

  // --- Push ---
  if (prefs.channels.push !== false) {
    const subscriptions = await PushSubscription.find({ userId });
    for (const sub of subscriptions) {
      try {
        await sendPushNotification(sub, { title, body: message });
        await NotificationLog.create({
          userId, type, title, message,
          channel: 'push',
          entityType, entityId, metadata,
        });
      } catch (err) {
        console.error(`Push dispatch failed for user ${userId}:`, err.message);
        // Remove invalid subscriptions (410 Gone)
        if (err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }
  }

  return results;
}

module.exports = { dispatch };
