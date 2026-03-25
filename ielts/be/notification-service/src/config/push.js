const webPush = require('web-push');

function configurePush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ielts-platform.com';

  if (publicKey && privateKey) {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    console.log('🔔 Web Push configured with VAPID keys');
  } else {
    console.warn('⚠️  VAPID keys not set — push notifications disabled');
  }
}

/**
 * Send a push notification to a subscription.
 * @param {Object} subscription - { endpoint, keys: { p256dh, auth } }
 * @param {Object} payload - { title, body, icon?, url? }
 */
async function sendPush(subscription, payload) {
  const data = JSON.stringify(payload);
  await webPush.sendNotification(subscription, data);
  console.log(`🔔 Push sent to ${subscription.endpoint.slice(0, 50)}...`);
}

module.exports = { configurePush, sendPush };
