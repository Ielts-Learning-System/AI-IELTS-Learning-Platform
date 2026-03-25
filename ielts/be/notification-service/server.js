require('dotenv').config();

const http = require('http');
const connectDB = require('./src/config/db');
const app = require('./app');

// ── New modular imports ──
const { initSocketIO } = require('./src/services/socket.service');
const { configurePush } = require('./src/services/push.service');
const { startConsumer, stopConsumer } = require('./src/consumers/notification.consumer');
const { startCronJobs } = require('./src/cron/reminder.cron');

const PORT = process.env.PORT || 3006;

async function start() {
  // 1. Connect MongoDB
  await connectDB();

  // 2. Create HTTP server and attach Socket.io
  const server = http.createServer(app);
  initSocketIO(server);

  // 3. Configure Web Push (VAPID)
  configurePush();

  // 4. Connect RabbitMQ and start consuming
  try {
    await startConsumer();
  } catch (err) {
    console.error('Failed to connect to RabbitMQ:', err.message);
    console.warn('⚠️  Service will run without RabbitMQ — REST endpoints still available.');
  }

  // 5. Start CRON jobs
  startCronJobs();

  // 6. Start listening
  server.listen(PORT, () => {
    console.log(`🚀 Notification Service running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await stopConsumer();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
