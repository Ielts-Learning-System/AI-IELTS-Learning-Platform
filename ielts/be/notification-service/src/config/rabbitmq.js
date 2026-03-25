const amqplib = require('amqplib');

const EXCHANGE = 'ielts_events';
const EXCHANGE_DLX = 'ielts_events_dlx';
const QUEUE = 'notification_queue';
const QUEUE_DLQ = 'notification_queue_dlq';
const MAX_RETRIES = 3;

const BINDING_KEYS = [
  'auth.user.created',
  'auth.user.verified',
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

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ with automatic reconnection and exponential backoff.
 */
async function connectRabbitMQ(onMessage) {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let retries = 0;
  const maxRetries = 10;

  while (retries < maxRetries) {
    try {
      connection = await amqplib.connect(url);
      channel = await connection.createChannel();

      // --- Assert exchanges ---
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      await channel.assertExchange(EXCHANGE_DLX, 'fanout', { durable: true });

      // --- Assert dead-letter queue ---
      await channel.assertQueue(QUEUE_DLQ, { durable: true });
      await channel.bindQueue(QUEUE_DLQ, EXCHANGE_DLX, '');

      // --- Assert main queue with DLX ---
      await channel.assertQueue(QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGE_DLX,
        },
      });

      // --- Bind routing keys ---
      for (const key of BINDING_KEYS) {
        await channel.bindQueue(QUEUE, EXCHANGE, key);
      }

      // --- Prefetch for fair dispatch ---
      await channel.prefetch(10);

      // --- Start consuming ---
      channel.consume(QUEUE, async (msg) => {
        if (!msg) return;

        const deathCount = getDeathCount(msg);

        try {
          const content = JSON.parse(msg.content.toString());
          await onMessage(content, msg);
          channel.ack(msg);
        } catch (err) {
          console.error('❌ Error processing message:', err.message);

          if (deathCount >= MAX_RETRIES) {
            // Exceeded retries — reject to DLQ (no requeue)
            console.error(`💀 Message sent to DLQ after ${MAX_RETRIES} retries`);
            channel.nack(msg, false, false);
          } else {
            // Transient failure — requeue for retry
            channel.nack(msg, false, true);
          }
        }
      });

      console.log(`🐇 RabbitMQ connected — consuming on [${QUEUE}]`);

      // --- Handle connection errors for reconnect ---
      connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err.message);
      });

      connection.on('close', () => {
        console.warn('⚠️  RabbitMQ connection closed. Reconnecting in 5s...');
        setTimeout(() => connectRabbitMQ(onMessage), 5000);
      });

      return { connection, channel };
    } catch (err) {
      retries++;
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      console.error(
        `RabbitMQ connection attempt ${retries}/${maxRetries} failed: ${err.message}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to connect to RabbitMQ after maximum retries');
}

/**
 * Extract x-death count from message headers.
 */
function getDeathCount(msg) {
  const deaths = msg.properties.headers && msg.properties.headers['x-death'];
  if (!deaths || !Array.isArray(deaths) || deaths.length === 0) return 0;
  return deaths.reduce((sum, d) => sum + (d.count || 0), 0);
}

/**
 * Gracefully close RabbitMQ connection.
 */
async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('🐇 RabbitMQ connection closed gracefully');
  } catch (err) {
    console.error('Error closing RabbitMQ:', err.message);
  }
}

function getChannel() {
  return channel;
}

module.exports = {
  connectRabbitMQ,
  closeRabbitMQ,
  getChannel,
  EXCHANGE,
  QUEUE,
  BINDING_KEYS,
};
