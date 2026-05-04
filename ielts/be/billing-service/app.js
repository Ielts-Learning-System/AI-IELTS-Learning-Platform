const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const billingRoutes   = require('./src/routes/billing.routes');
const reportsRoutes   = require('./src/routes/reports.routes');
const resourcesRoutes = require('./src/routes/resources.routes');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Core billing routes (plans, subscriptions, …)
app.use('/', billingRoutes);

// Admin analytics dashboard
// Proxied by gateway: GET /api/reports/* → /admin/reports/*
app.use('/admin/reports', reportsRoutes);

// Admin resource management (files + tags)
// Proxied by gateway: /api/resources/* → /admin/resources/*
app.use('/admin/resources', resourcesRoutes);

module.exports = app;
