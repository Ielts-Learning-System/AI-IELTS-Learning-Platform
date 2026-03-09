require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

/**
 * =============================
 * Global Middleware
 * =============================
 */
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * =============================
 * Health Check
 * =============================
 */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'API Gateway is running 🚀',
    timestamp: new Date(),
  });
});

/**
 * =============================
 * Service Proxy
 * =============================
 */

/**
 * Auth Service
 * Example:
 * POST http://localhost:3000/api/auth/login
 */
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': '',
    },
  })
);

/**
 * Listening Service
 */
app.use(
  '/api/listening',
  createProxyMiddleware({
    target: process.env.LISTENING_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
      '^/api/listening': '',
    },
  })
);

/**
 * Reading Service
 */
app.use(
  '/api/reading',
  createProxyMiddleware({
    target: process.env.READING_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: {
      '^/api/reading': '',
    },
  })
);

/**
 * Writing Service
 */
app.use(
  '/api/writing',
  createProxyMiddleware({
    target: process.env.WRITING_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: {
      '^/api/writing': '',
    },
  })
);

/**
 * Speaking Service
 */
app.use(
  '/api/speaking',
  createProxyMiddleware({
    target: process.env.SPEAKING_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: {
      '^/api/speaking': '',
    },
  })
);

/**
 * Notification Service
 */
app.use(
  '/api/notification',
  createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    changeOrigin: true,
    pathRewrite: {
      '^/api/notification': '',
    },
  })
);

/**
 * =============================
 * 404 Handler
 * =============================
 */
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
  });
});

/**
 * =============================
 * Global Error Handler
 * =============================
 */
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);

  res.status(500).json({
    message: 'Internal Server Error',
  });
});

/**
 * =============================
 * Start Server
 * =============================
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running at http://localhost:${PORT}`);
});