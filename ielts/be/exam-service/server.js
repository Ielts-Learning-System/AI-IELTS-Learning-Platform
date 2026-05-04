require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { startTimeoutSweeper, stopTimeoutSweeper } = require('./src/services/examTimeout.service');

const PORT = process.env.PORT || 3013;

async function bootstrap() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Exam DB connected');

    startTimeoutSweeper();

    const server = app.listen(PORT, () => {
      console.log(`Exam Service is running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log('Gracefully shutting down exam-service...');
      stopTimeoutSweeper();
      await mongoose.connection.close();
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

bootstrap();
