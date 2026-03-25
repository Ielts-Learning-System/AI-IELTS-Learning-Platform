/**
 * push.service.js
 * ────────────────────────────────────────────────
 * Web-Push (VAPID) configuration and send helper.
 * Uses VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT from env.
 */

const webPush = require('web-push');

let configured = false;

/**
 * Configure web-push with VAPID credentials (call once at startup).
 */
function configurePush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ielts-platform.com';

  if (publicKey && privateKey) {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    console.log('🔔 Web Push configured with VAPID keys');
  } else {
    console.warn('⚠️  VAPID keys not set — push notifications disabled');
  }
}

/**
 * Send a push notification to a browser subscription.
 *
 * @param {Object} subscription – { endpoint, keys: { p256dh, auth } }
 * @param {Object} payload      – { title, body, icon?, url? }
 * @returns {Promise<Object>}   web-push send result
 */
async function sendPushNotification(subscription, payload) {
  if (!configured) {
    console.warn('⚠️  Push not configured — skipping');
    return null;
  }

  const data = JSON.stringify(payload);
  const result = await webPush.sendNotification(subscription, data);
  console.log(`🔔 Push sent to ${subscription.endpoint.slice(0, 50)}...`);
  return result;
}

module.exports = { configurePush, sendPushNotification };
