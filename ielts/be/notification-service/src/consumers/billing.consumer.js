const NotificationLog = require('../models/NotificationLog');
const { emitToUser } = require('../services/socket.service');
const { sendTemplateEmail } = require('../services/email.service');

const shouldSendBillingEmail = (type) => {
  return type === 'subscription_cancelled' || type === 'subscription_restored';
};

async function persistAndEmit({
  userId,
  type,
  title,
  message,
  entityId,
  metadata,
}) {
  const savedNotification = await NotificationLog.create({
    userId,
    type,
    title,
    message,
    channel: 'in-app',
    entityType: 'Subscription',
    entityId: entityId || null,
    isRead: false,
    metadata: metadata || {},
  });

  emitToUser(userId, {
    _id: savedNotification._id,
    userId,
    type: savedNotification.type,
    title: savedNotification.title,
    message: savedNotification.message,
    read: savedNotification.isRead,
    createdAt: savedNotification.createdAt,
    metadata: savedNotification.metadata,
  });

  return savedNotification;
}

async function maybeSendBillingEmail({
  type,
  userEmail,
  title,
  message,
  name,
  planName,
}) {
  if (!userEmail || !shouldSendBillingEmail(type)) {
    return;
  }

  const greetingName = name || 'there';
  await sendTemplateEmail(
    userEmail,
    title,
    `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2>${title}</h2>
        <p>Hi ${greetingName},</p>
        <p>${message}</p>
        ${planName ? `<p><strong>Plan:</strong> ${planName}</p>` : ''}
      </div>
    `
  );
}

async function handleBillingSubscriptionCancelled(data) {
  const {
    userId,
    subscriptionId,
    title,
    message,
    type,
    email,
    name,
    planName,
    reason,
    cancelledAt,
  } = data;

  const notificationType = type || 'subscription_cancelled';
  const notificationTitle = title || '❌ Subscription Cancelled';
  const notificationMessage = message || `Your ${planName || 'subscription'} has been cancelled.`;

  await persistAndEmit({
    userId,
    type: notificationType,
    title: notificationTitle,
    message: notificationMessage,
    entityId: subscriptionId,
    metadata: {
      planName,
      reason,
      cancelledAt,
    },
  });

  await maybeSendBillingEmail({
    type: notificationType,
    userEmail: email,
    title: notificationTitle,
    message: notificationMessage,
    name,
    planName,
  });
}

async function handleBillingSubscriptionRestored(data) {
  const {
    userId,
    subscriptionId,
    title,
    message,
    type,
    email,
    name,
    planName,
    validUntil,
    restoredAt,
  } = data;

  const notificationType = type || 'subscription_restored';
  const notificationTitle = title || '✅ Subscription Restored';
  const notificationMessage =
    message ||
    `Welcome back! Your ${planName || 'subscription'} plan is active until ${new Date(validUntil).toLocaleDateString()}.`;

  await persistAndEmit({
    userId,
    type: notificationType,
    title: notificationTitle,
    message: notificationMessage,
    entityId: subscriptionId,
    metadata: {
      planName,
      validUntil,
      restoredAt,
    },
  });

  await maybeSendBillingEmail({
    type: notificationType,
    userEmail: email,
    title: notificationTitle,
    message: notificationMessage,
    name,
    planName,
  });
}

module.exports = {
  handleBillingSubscriptionCancelled,
  handleBillingSubscriptionRestored,
};