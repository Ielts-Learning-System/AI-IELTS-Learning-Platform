const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const notificationRoutes = require('./src/routes/notification.routes');

const app = express();

// Middleware
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes — gateway strips /api/notification, so /api/notification becomes / here.
app.use('/', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Notification Service is ALIVE!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
