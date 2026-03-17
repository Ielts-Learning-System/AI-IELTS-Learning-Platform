require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const lessonRoutes = require('./src/routes/lesson.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

connectDB();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Lesson Service is healthy' });
});

app.use('/', lessonRoutes);

app.use((err, req, res, next) => {
  console.error('Lesson Service Error:', err.message);
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

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Lesson Service running on port ${PORT}`);
});
