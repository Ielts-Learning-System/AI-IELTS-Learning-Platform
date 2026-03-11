require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const listeningRoutes = require('./src/routes/listening.routes');

const app = express();
const PORT = process.env.PORT || 3003;
const path = require('path');

// Middleware
app.use(cors());

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve audio files from data/audio directory
app.use('/audio', express.static(path.join(__dirname, 'data', 'audio')));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'listening-service' });
});

// Routes
app.use('/', listeningRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
  app.listen(PORT, () => {
    console.log(`Listening service running on port ${PORT}`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});