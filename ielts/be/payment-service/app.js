const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const paymentRoutes = require('./src/routes/payment.routes');

const app = express();
app.use(express.json());
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/', paymentRoutes);

module.exports = app;
