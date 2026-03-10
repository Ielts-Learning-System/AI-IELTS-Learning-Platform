require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const connectDB = require('./src/config/db');
const readingRoutes = require('./src/routes/reading.routes');

const app = express();

// ====== Middleware ======
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ====== Database Connection ======
connectDB();

// ====== Routes ======
app.use('/api/tests', readingRoutes);

// ====== Multer Error Handling ======
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Multer error: ${err.message}`,
    });
  }
  next(err);
});

// ====== Error Handling Middleware ======
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message,
  });
});

// ====== 404 Handler ======
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tìm thấy',
  });
});

// ====== Start Server ======
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`📖 Reading Service is running on port ${PORT}`);
});
