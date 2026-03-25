/**
 * reminder.cron.js
 * ────────────────────────────────────────────────
 * Scheduled CRON jobs for engagement & retention reminders.
 *
 * Uses CRON_REMINDER_SCHEDULE from env (default "0 8 * * *" = daily at 08:00 UTC).
 * Queries users who haven't studied in 3+ days
 * and sends push/email reminders.
 */

const cron = require('node-cron');
const NotificationLog = require('../models/NotificationLog');
const NotificationPreference = require('../models/NotificationPreference');
const PushSubscription = require('../models/PushSubscription');
const { sendTemplateEmail } = require('../services/email.service');
const { sendPushNotification } = require('../services/push.service');
const { emitToUser } = require('../services/socket.service');

/**
 * Find users who opted in to reminders AND have not received any
 * notification (proxy for "no activity") in the last 3 days.
 * In a production system this would query a dedicated UserActivity
 * collection instead.
 */
async function findInactiveUsers() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Users who opted in to reminders
  const prefs = await NotificationPreference.find({
    'categories.reminder': { $ne: false },
  }).lean();

  const inactiveUsers = [];

  for (const pref of prefs) {
    // Check last notification as an activity proxy
    const lastNotification = await NotificationLog.findOne({
      userId: pref.userId,
      channel: 'in-app',
      createdAt: { $gte: threeDaysAgo },
    }).lean();

    if (!lastNotification) {
      inactiveUsers.push(pref);
    }
  }

  return inactiveUsers;
}

/**
 * Send reminder to a single user across enabled channels.
 */
async function sendReminder(pref) {
  const { userId, channels = {} } = pref;
  const title   = 'Time to Practice! 📚';
  const message = 'You haven\'t studied in a while. Practice a Reading or Listening test today to stay on track!';

  // In-app notification
  if (channels.inApp !== false) {
    const log = await NotificationLog.create({
      userId,
      type: 'reminder',
      title,
      message,
      channel: 'in-app',
    });

    emitToUser(userId, {
      _id: log._id,
      type: log.type,
      title: log.title,
      message: log.message,
      createdAt: log.createdAt,
    });
  }

  // Push notification
  if (channels.push !== false) {
    const subs = await PushSubscription.find({ userId });
    for (const sub of subs) {
      try {
        await sendPushNotification(sub, { title, body: message });
      } catch (err) {
        console.error(`Push reminder failed for user ${userId}:`, err.message);
        if (err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }
  }

  // Email reminder (placeholder — requires email on user record)
  // In production, fetch user email from auth-service or a local cache.
  // if (channels.email !== false && userEmail) {
  //   await sendTemplateEmail(userEmail, title, `<p>${message}</p>`);
  // }
}

/**
 * Start all CRON jobs. Call once from the main entry point.
 */
function startCronJobs() {
  const schedule = process.env.CRON_REMINDER_SCHEDULE || '0 8 * * *';

  // ── Daily engagement reminder ──
  cron.schedule(schedule, async () => {
    console.log('⏰ CRON: Running daily engagement reminder job...');

    try {
      const inactive = await findInactiveUsers();

      for (const pref of inactive) {
        await sendReminder(pref);
      }

      console.log(`⏰ CRON: Sent reminders to ${inactive.length} inactive user(s)`);
    } catch (err) {
      console.error('CRON reminder job error:', err.message);
    }
  });

  console.log(`⏰ CRON jobs scheduled (schedule: "${schedule}")`);
}

module.exports = { startCronJobs, findInactiveUsers, sendReminder };
