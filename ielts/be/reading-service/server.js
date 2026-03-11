require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const readingRoutes = require('./src/routes/reading.routes');

const app = express();

// ====== Middleware ======
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ====== Database Connection ======
connectDB();

// ====== Health Check (Cực kỳ quan trọng cho Docker) ======
// Giúp Docker biết container này vẫn đang "khỏe mạnh"
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Reading Service is healthy' });
});

// ====== Routes ======
// Đổi từ '/api/tests' sang '/' để khớp hoàn toàn với request từ API Gateway ném sang
app.use('/', readingRoutes);

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