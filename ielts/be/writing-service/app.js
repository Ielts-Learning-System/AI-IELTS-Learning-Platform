const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const writingRoutes = require('./src/routes/writing.routes');
const submissionRoutes = require('./src/routes/submission.routes');

const app = express();

// Middleware
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', writingRoutes);
app.use('/submissions', submissionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'writing-service' });
});

module.exports = app;
