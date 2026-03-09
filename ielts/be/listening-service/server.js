require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const listeningRoutes = require('./src/routes/listening.routes');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());

const path = require('path');

// Cấp quyền truy cập công khai cho thư mục 'public'
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', listeningRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'listening-service' });
});

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