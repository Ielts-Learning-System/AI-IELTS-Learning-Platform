const amqp = require('amqplib');

async function fireTestEvent() {
  try {
    const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
    const channel = await connection.createChannel();

    const exchangeName = 'ielts_events';
    const routingKey = 'auth.user.registered';

    const payload = {
      email: 'tranv@yopmail.com',
      name: 'Trần V',
      userId: '123456789',
    };

    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(payload)));

    console.log(`🚀 Đã bắn thành công event [${routingKey}] vào RabbitMQ!`);

    setTimeout(() => {
      connection.close();
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error('Lỗi bắn tin nhắn:', error);
    process.exit(1);
  }
}

fireTestEvent();