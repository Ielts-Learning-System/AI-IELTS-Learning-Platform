const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const billingRoutes = require('./src/routes/billing.routes');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/', billingRoutes);

module.exports = app;
