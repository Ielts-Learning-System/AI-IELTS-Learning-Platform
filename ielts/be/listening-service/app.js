const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const listeningRoutes = require('./src/routes/listening.routes');
const dictationRoutes = require('./src/routes/dictation.routes');

const app = express();

// Middleware
app.use(cors());

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve audio files from data/audio directory
app.use('/audio', express.static(path.join(__dirname, 'data', 'audio')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'listening-service' });
});

// Routes
app.use('/api/dictation', dictationRoutes);
app.use('/', listeningRoutes);

module.exports = app;
