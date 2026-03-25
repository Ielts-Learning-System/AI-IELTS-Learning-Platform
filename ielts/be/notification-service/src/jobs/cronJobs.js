const cron = require('node-cron');
const { dispatch } = require('../services/dispatcher');
const NotificationPreference = require('../models/NotificationPreference');

/**
 * Start CRON scheduled jobs for engagement reminders.
 */
function startCronJobs() {
  const schedule = process.env.CRON_REMINDER_SCHEDULE || '0 8 * * *';

  // Daily engagement reminder
  cron.schedule(schedule, async () => {
    console.log('⏰ CRON: Running daily engagement reminder job...');

    try {
      // Find users who opted in to reminders
      const prefs = await NotificationPreference.find({
        'categories.reminder': true,
        'channels.inApp': true,
      }).lean();

      for (const pref of prefs) {
        await dispatch({
          userId: pref.userId,
          type: 'reminder',
          category: 'reminder',
          title: 'Time to Practice! 📚',
          message: 'Keep your IELTS preparation on track. Practice a Reading or Listening test today!',
        });
      }

      console.log(`⏰ CRON: Sent reminders to ${prefs.length} users`);
    } catch (err) {
      console.error('CRON reminder job error:', err.message);
    }
  });

  console.log(`⏰ CRON jobs scheduled (${schedule})`);
}

module.exports = { startCronJobs };
