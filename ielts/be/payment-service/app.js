const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const paymentRoutes = require('./src/routes/payment.routes');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'payment-service' });
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'payment-service' });
});

app.use('/', paymentRoutes);

module.exports = app;
