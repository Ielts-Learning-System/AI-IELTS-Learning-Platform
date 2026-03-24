const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const speakingRoutes = require('./src/routes/speaking.routes');

const app = express();

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Speaking Service is healthy' });
});

app.use('/', speakingRoutes);

app.use((err, req, res, next) => {
  console.error('Speaking service error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

module.exports = app;
