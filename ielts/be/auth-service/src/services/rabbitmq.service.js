const amqp = require('amqplib');

const EXCHANGE_NAME = 'ielts_events';
let connectionPromise = null;
let channelPromise = null;

async function createChannel() {
  const rabbitmqUrl = process.env.RABBITMQ_URL;

  if (!rabbitmqUrl) {
    throw new Error('RABBITMQ_URL is not configured');
  }

  if (!connectionPromise) {
    connectionPromise = amqp.connect(rabbitmqUrl).then((connection) => {
      connection.on('error', (error) => {
        console.error('RabbitMQ connection error:', error.message);
        connectionPromise = null;
        channelPromise = null;
      });

      connection.on('close', () => {
        console.warn('RabbitMQ connection closed');
        connectionPromise = null;
        channelPromise = null;
      });

      return connection;
    });
  }

  if (!channelPromise) {
    channelPromise = connectionPromise.then(async (connection) => {
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      return channel;
    });
  }

  return channelPromise;
}

async function publishEvent(routingKey, data) {
  try {
    const channel = await createChannel();
    const payload = Buffer.from(
      JSON.stringify({
        eventType: routingKey,
        data,
      })
    );

    const published = channel.publish(EXCHANGE_NAME, routingKey, payload, {
      contentType: 'application/json',
      persistent: true,
    });

    if (!published) {
      console.warn(`RabbitMQ publish buffer is full for routing key: ${routingKey}`);
    }

    return published;
  } catch (error) {
    console.error(`Failed to publish RabbitMQ event [${routingKey}]:`, error.message);
    return false;
  }
}

module.exports = {
  EXCHANGE_NAME,
  publishEvent,
};