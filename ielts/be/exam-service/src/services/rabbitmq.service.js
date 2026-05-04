const amqp = require('amqplib');

const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || 'ielts_events';
let connectionPromise = null;
let channelPromise = null;

async function getConnection() {
  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (!rabbitmqUrl) {
    throw new Error('RABBITMQ_URL is not configured');
  }

  if (!connectionPromise) {
    connectionPromise = amqp.connect(rabbitmqUrl).then((connection) => {
      connection.on('error', (error) => {
        console.error('RabbitMQ connection error:', error.message);
      });

      connection.on('close', () => {
        console.warn('RabbitMQ connection closed');
        connectionPromise = null;
        channelPromise = null;
      });

      return connection;
    });
  }

  return connectionPromise;
}

async function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const connection = await getConnection();
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      return channel;
    })();
  }

  return channelPromise;
}

async function publishEvent(routingKey, data) {
  try {
    const channel = await getChannel();
    const payload = Buffer.from(
      JSON.stringify({
        eventType: routingKey,
        data,
        timestamp: new Date().toISOString(),
      })
    );

    const published = channel.publish(EXCHANGE_NAME, routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
    });

    if (!published) {
      console.warn(`RabbitMQ publish buffer is full for routing key: ${routingKey}`);
    }

    return true;
  } catch (error) {
    console.error(`Failed to publish RabbitMQ event [${routingKey}]:`, error.message);
    return false;
  }
}

module.exports = { publishEvent };
