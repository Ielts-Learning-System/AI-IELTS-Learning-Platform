/**
 * notification.consumer.js
 * ────────────────────────────────────────────────
 * RabbitMQ consumer for the notification-service.
 *
 * Architecture:
 *   Exchange  : ielts_events (topic, durable)
 *   Queue     : notification_queue (durable, DLX-backed)
 *   DLX       : ielts_events_dlx (fanout)
 *   DLQ       : notification_queue_dlq
 *
 * Routing keys are bound with the topic pattern so the
 * notification-service receives all relevant domain events.
 *
 * Each message is acknowledged ONLY after the handler
 * succeeds; transient failures are requeued, and messages
 * exceeding MAX_RETRIES are forwarded to the DLQ.
 */

const amqplib = require('amqplib');
const mongoose = require('mongoose');
const { sendTemplateEmail, sendWelcomeEmail } = require('../services/email.service');
const { emitToUser } = require('../services/socket.service');
const NotificationLog = require('../models/NotificationLog');

// ──────────── Constants ────────────
const EXCHANGE     = 'ielts_events';
const EXCHANGE_DLX = 'ielts_events_dlx';
const QUEUE        = 'notification_queue';
const QUEUE_DLQ    = 'notification_queue_dlq';
const MAX_RETRIES  = 3;

/**
 * All routing keys the notification-service subscribes to.
 */
const BINDING_KEYS = [
  'auth.user.registered',
  'auth.user.created',
  'auth.user.verified',
  'payment.transaction.success',
  'payment.transaction.declared',
  'payment.transaction.approved',
  'payment.transaction.rejected',
  'writing.submission.created',
  'writing.grading.completed',
  'speaking.submission.created',
  'speaking.grading.completed',
  'reading.test.completed',
  'listening.test.completed',
];

// ──────────── Module state ────────────
let connection = null;
let channel    = null;

function canPersistUserId(userId) {
  return mongoose.isValidObjectId(userId);
}

// ═══════════════════════════════════════════════
//  Event Handlers (routing-key → async function)
// ═══════════════════════════════════════════════

/**
 * auth.user.registered / auth.user.created
 * → Send a welcome email to the newly registered user.
 */
async function onUserRegistered(data) {
  const { userId, metadata = {} } = data;
  const email = metadata.email || data.email;
  const name  = metadata.name || data.name || 'there';

  if (!canPersistUserId(userId)) {
    if (email) {
      await sendWelcomeEmail(email, name);
    }

    console.warn(`Skipping notification log persistence because userId is not a valid ObjectId: ${userId}`);
    return;
  }

  // Persist in-app notification
  const log = await NotificationLog.create({
    userId,
    type: 'welcome',
    title: 'Welcome to IELTS Platform! 🎉',
    message: `Hi ${name}! Your account has been created. Start your IELTS journey now.`,
    channel: 'in-app',
  });

  // Real-time Socket.io push
  emitToUser(userId, {
    _id: log._id,
    type: log.type,
    title: log.title,
    message: log.message,
    createdAt: log.createdAt,
  });

  // Welcome email
  if (email) {
    await sendWelcomeEmail(email, name);

    await NotificationLog.create({
      userId,
      type: 'welcome',
      title: 'Welcome Email Sent',
      message: `Welcome email delivered to ${email}`,
      channel: 'email',
    });
  }
}

/**
 * payment.transaction.success / payment.transaction.approved
 * → Send an email receipt AND a real-time in-app notification.
 */
async function onPaymentSuccess(data) {
  const { userId, entityType, entityId, metadata = {} } = data;
  const planName = metadata.planName || 'VIP';
  const email    = metadata.email;

  // 1. In-app notification
  const log = await NotificationLog.create({
    userId,
    type: 'payment_approved',
    title: 'Payment Approved — VIP Activated! ✅',
    message: `Your payment for the ${planName} plan has been approved. Enjoy premium features!`,
    channel: 'in-app',
    entityType,
    entityId,
    metadata,
  });

  // 2. Real-time Socket.io push to user
  emitToUser(userId, {
    _id: log._id,
    type: log.type,
    title: log.title,
    message: log.message,
    entityType,
    entityId,
    createdAt: log.createdAt,
  });

  // 3. Email receipt
  if (email) {
    await sendTemplateEmail(
      email,
      'Payment Approved — VIP Activated ✅',
      `
        <h2>Payment Approved ✅</h2>
        <p>Your payment for the <strong>${planName}</strong> plan has been approved.</p>
        <p>You now have access to all premium features. Happy studying!</p>
      `
    );

    await NotificationLog.create({
      userId,
      type: 'payment_approved',
      title: 'Payment Receipt Email',
      message: `Payment receipt emailed to ${email}`,
      channel: 'email',
      entityType,
      entityId,
      metadata,
    });
  }
}

/**
 * payment.transaction.rejected
 */
async function onPaymentRejected(data) {
  const { userId, entityType, entityId, metadata = {} } = data;
  const planName = metadata.planName || 'VIP';

  const log = await NotificationLog.create({
    userId,
    type: 'payment_rejected',
    title: 'Payment Rejected ❌',
    message: `Your payment for the ${planName} plan was rejected. Please contact support.`,
    channel: 'in-app',
    entityType,
    entityId,
    metadata,
  });

  emitToUser(userId, {
    _id: log._id,
    type: log.type,
    title: log.title,
    message: log.message,
    createdAt: log.createdAt,
  });
}

/**
 * writing.grading.completed
 */
async function onWritingGraded(data) {
  const { userId, entityType, entityId, metadata = {} } = data;
  const band = metadata.bandScore ? ` — Band ${metadata.bandScore}` : '';

  const log = await NotificationLog.create({
    userId,
    type: 'grading_completed',
    title: 'Writing Grading Complete ✍️',
    message: `Your writing submission has been graded${band}. View your detailed feedback now.`,
    channel: 'in-app',
    entityType: entityType || 'WritingSubmission',
    entityId,
    metadata,
  });

  emitToUser(userId, {
    _id: log._id, type: log.type, title: log.title,
    message: log.message, entityType, entityId, createdAt: log.createdAt,
  });
}

/**
 * speaking.grading.completed
 */
async function onSpeakingGraded(data) {
  const { userId, entityType, entityId, metadata = {} } = data;
  const band = metadata.bandScore ? ` — Band ${metadata.bandScore}` : '';

  const log = await NotificationLog.create({
    userId,
    type: 'grading_completed',
    title: 'Speaking Grading Complete 🎤',
    message: `Your speaking submission has been graded${band}. View your detailed feedback now.`,
    channel: 'in-app',
    entityType: entityType || 'SpeakingSubmission',
    entityId,
    metadata,
  });

  emitToUser(userId, {
    _id: log._id, type: log.type, title: log.title,
    message: log.message, entityType, entityId, createdAt: log.createdAt,
  });
}

/**
 * reading.test.completed
 */
async function onReadingCompleted(data) {
  const { userId, entityType, entityId, metadata = {} } = data;
  const score = metadata.score != null ? ` — Score: ${metadata.score}` : '';

  const log = await NotificationLog.create({
    userId,
    type: 'test_completed',
    title: 'Reading Test Results Ready 📖',
    message: `Your reading test has been auto-graded${score}. Check your results.`,
    channel: 'in-app',
    entityType: entityType || 'ReadingTest',
    entityId,
    metadata,
  });

  emitToUser(userId, {
    _id: log._id, type: log.type, title: log.title,
    message: log.message, createdAt: log.createdAt,
  });
}

/**
 * listening.test.completed
 */
async function onListeningCompleted(data) {
  const { userId, entityType, entityId, metadata = {} } = data;
  const score = metadata.score != null ? ` — Score: ${metadata.score}` : '';

  const log = await NotificationLog.create({
    userId,
    type: 'test_completed',
    title: 'Listening Test Results Ready 🎧',
    message: `Your listening test has been auto-graded${score}. Check your results.`,
    channel: 'in-app',
    entityType: entityType || 'ListeningTest',
    entityId,
    metadata,
  });

  emitToUser(userId, {
    _id: log._id, type: log.type, title: log.title,
    message: log.message, createdAt: log.createdAt,
  });
}

// ──────────── Routing table ────────────
const ROUTE_TABLE = {
  'auth.user.registered':          onUserRegistered,
  'auth.user.created':             onUserRegistered,   // alias
  'payment.transaction.success':   onPaymentSuccess,
  'payment.transaction.approved':  onPaymentSuccess,   // alias
  'payment.transaction.rejected':  onPaymentRejected,
  'writing.grading.completed':     onWritingGraded,
  'speaking.grading.completed':    onSpeakingGraded,
  'reading.test.completed':        onReadingCompleted,
  'listening.test.completed':      onListeningCompleted,
};

// ═══════════════════════════════════════════════
//  RabbitMQ Connection & Consumer
// ═══════════════════════════════════════════════

/**
 * Extract the x-death retry count from message headers.
 */
function getDeathCount(msg) {
  const deaths = msg.properties.headers?.['x-death'];
  if (!Array.isArray(deaths) || deaths.length === 0) return 0;
  return deaths.reduce((sum, d) => sum + (d.count || 0), 0);
}

/**
 * Connect to RabbitMQ, assert the topic exchange + queues,
 * bind all routing keys, and start consuming.
 *
 * Includes automatic reconnection with exponential backoff.
 */
async function startConsumer() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let retries = 0;
  const maxRetries = 10;

  while (retries < maxRetries) {
    try {
      // ── Connect ──
      connection = await amqplib.connect(url);
      channel    = await connection.createChannel();

      // ── Assert exchanges ──
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      await channel.assertExchange(EXCHANGE_DLX, 'fanout', { durable: true });

      // ── Dead-letter queue ──
      await channel.assertQueue(QUEUE_DLQ, { durable: true });
      await channel.bindQueue(QUEUE_DLQ, EXCHANGE_DLX, '');

      // ── Main queue with DLX ──
      await channel.assertQueue(QUEUE, {
        durable: true,
        arguments: { 'x-dead-letter-exchange': EXCHANGE_DLX },
      });

      // ── Bind routing keys ──
      for (const key of BINDING_KEYS) {
        await channel.bindQueue(QUEUE, EXCHANGE, key);
      }

      // ── Fair dispatch ──
      await channel.prefetch(10);

      // ── Consume ──
      channel.consume(QUEUE, async (msg) => {
        if (!msg) return;

        const routingKey = msg.fields.routingKey;
        const deathCount = getDeathCount(msg);

        try {
          const payload = JSON.parse(msg.content.toString());

          // Resolve handler: check eventType field first, then routingKey
          const eventType = payload.eventType || routingKey;
          const handler   = ROUTE_TABLE[eventType];

          if (handler) {
            console.log(`📨 Processing [${eventType}] for user ${payload.data?.userId || 'N/A'}`);
            await handler(payload.data || payload);
          } else {
            console.warn(`⚠️  No handler for event: ${eventType}`);
          }

          // ✅ Acknowledge after successful processing
          channel.ack(msg);
        } catch (err) {
          console.error(`❌ Error processing [${routingKey}]:`, err.message);

          if (deathCount >= MAX_RETRIES) {
            console.error(`💀 Message sent to DLQ after ${MAX_RETRIES} retries`);
            channel.nack(msg, false, false); // reject → DLQ
          } else {
            channel.nack(msg, false, true);  // requeue for retry
          }
        }
      });

      console.log(`🐇 RabbitMQ connected — consuming on [${QUEUE}]`);

      // ── Reconnect on connection loss ──
      connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err.message);
      });

      connection.on('close', () => {
        console.warn('⚠️  RabbitMQ connection closed. Reconnecting in 5 s...');
        channel = null;
        connection = null;
        setTimeout(() => startConsumer(), 5000);
      });

      return { connection, channel };

    } catch (err) {
      retries++;
      const delay = Math.min(1000 * 2 ** retries, 30_000);
      console.error(
        `RabbitMQ attempt ${retries}/${maxRetries} failed: ${err.message}. ` +
        `Retrying in ${delay} ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error('Failed to connect to RabbitMQ after maximum retries');
}

/**
 * Gracefully close channel & connection (called on SIGTERM / SIGINT).
 */
async function stopConsumer() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
    console.log('🐇 RabbitMQ connection closed gracefully');
  } catch (err) {
    console.error('Error closing RabbitMQ:', err.message);
  }
}

module.exports = {
  startConsumer,
  stopConsumer,
  EXCHANGE,
  QUEUE,
  BINDING_KEYS,
  ROUTE_TABLE,
};
