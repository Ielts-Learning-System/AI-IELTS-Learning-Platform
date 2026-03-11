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

// LƯU Ý: Đã loại bỏ app.use(express.json()) và app.use(express.urlencoded())
// để tránh lỗi mất body khi proxy chuyển tiếp request POST/PUT.

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
 * URL gọi trên Postman: http://localhost:3000/api/auth/...
 */
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': '',
    },
  })
);

/**
 * Reading Service
 * URL gọi trên Postman: http://localhost:3000/api/reading/...
 */
app.use(
  '/api/reading',
  createProxyMiddleware({
    target: process.env.READING_SERVICE_URL || 'http://127.0.0.1:3002',
    changeOrigin: true,
    pathRewrite: {
      '^/api/reading': '',
    },
  })
);


/**
 * Listening Service
 * URL gọi trên Postman: http://localhost:3000/api/listening/...
 */
app.use(
  '/api/dictation',
  createProxyMiddleware({
    target: process.env.LISTENING_SERVICE_URL || 'http://127.0.0.1:3003',
    changeOrigin: true,
    // Express strips mount path, so forward original URL explicitly.
    pathRewrite: (path, req) => req.originalUrl,
  })
);

app.use('/audio', createProxyMiddleware({
  target: process.env.LISTENING_SERVICE_URL || 'http://127.0.0.1:3003',
  changeOrigin: true,
  // Keep /audio prefix when proxying static files.
  pathRewrite: (path, req) => req.originalUrl,
}));

app.use(
  '/api/listening',
  createProxyMiddleware({
    target: process.env.LISTENING_SERVICE_URL || 'http://127.0.0.1:3003',
    changeOrigin: true,
    pathRewrite: {
      '^/api/listening': '',
    },
  })
);

/**
 * Writing Service
 * URL gọi trên Postman: http://localhost:3000/api/writing/...
 */
app.use(
  '/api/writing',
  createProxyMiddleware({
    target: process.env.WRITING_SERVICE_URL || 'http://127.0.0.1:3004',
    changeOrigin: true,
    pathRewrite: {
      '^/api/writing': '',
    },
  })
);

/**
 * Speaking Service
 * URL gọi trên Postman: http://localhost:3000/api/speaking/...
 */
app.use(
  '/api/speaking',
  createProxyMiddleware({
    target: process.env.SPEAKING_SERVICE_URL || 'http://127.0.0.1:3005',
    changeOrigin: true,
    pathRewrite: {
      '^/api/speaking': '',
    },
  })
);

/**
 * Notification Service
 * URL gọi trên Postman: http://localhost:3000/api/notification/...
 */
app.use(
  '/api/notification',
  createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:3006',
    changeOrigin: true,
    pathRewrite: {
      '^/api/notification': '',
    },
  })
);

/**
 * Billing Service
 * URL gọi trên Postman: http://localhost:3000/api/billing/...
 */
app.use(
  '/api/billing',
  createProxyMiddleware({
    target: process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:3005',
    changeOrigin: true,
    pathRewrite: {
      '^/api/billing': '',
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
    message: 'Route not found at Gateway',
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
    message: 'Internal Server Error at Gateway',
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