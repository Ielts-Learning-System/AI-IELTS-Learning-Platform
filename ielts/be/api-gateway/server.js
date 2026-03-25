require('dotenv').config();

const http = require('http');
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
 * Anti-Caching Middleware for Protected Routes
 * =============================
 */
const noCacheHeaders = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  });
  next();
};

// Apply to all protected API routes (exclude auth which is public)
app.use('/api/reading', noCacheHeaders);
app.use('/api/listening', noCacheHeaders);
app.use('/api/dictation', noCacheHeaders);
app.use('/api/writing', noCacheHeaders);
app.use('/api/speaking', noCacheHeaders);
app.use('/api/billing', noCacheHeaders);
app.use('/api/lessons', noCacheHeaders);
app.use('/api/media', noCacheHeaders);
app.use('/api/payment', noCacheHeaders);
app.use('/api/notification', noCacheHeaders);
app.use('/api/users', noCacheHeaders);

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
 * User Management (Auth Service)
 * URL gọi trên Postman: http://localhost:3000/api/users/...
 */
app.use(
  '/api/users',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3001',
    changeOrigin: true,
    // Keep /api/users prefix because auth-service mounts app.use('/api/users', userRoutes).
    pathRewrite: (path, req) => req.originalUrl,
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
    target: process.env.SPEAKING_SERVICE_URL || 'http://127.0.0.1:3008',
    changeOrigin: true,
    pathRewrite: {
      '^/api/speaking': '',
    },
  })
);

/**
 * Notification Service — REST
 * URL gọi trên Postman: http://localhost:3000/api/notification/...
 * Strip /api/notification so the notification service receives root-relative paths.
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
 * Notification Service — WebSocket (Socket.io)
 * FE connects: io("http://localhost:3000", { path: "/socket.io-notification" })
 * Gateway proxies /socket.io-notification/* → notification-service /socket.io/*
 *
 * Stored as a variable so we can call .upgrade(server) below for WS support.
 */
const notificationWsProxy = createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:3006',
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/socket.io-notification': '/socket.io' },
});
app.use('/socket.io-notification', notificationWsProxy);

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
 * Lesson Service
 * URL gọi trên Postman: http://localhost:3000/api/lessons/...
 */
app.use(
  '/api/lessons',
  createProxyMiddleware({
    target: process.env.LESSON_SERVICE_URL || 'http://127.0.0.1:3007',
    changeOrigin: true,
    pathRewrite: {
      '^/api/lessons': '',
    },
  })
);

/**
 * Payment Service (MoMo Gateway)
 * URL gọi trên Postman: http://localhost:3000/api/payment/...
 */
app.use(
  '/api/payment',
  createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL || 'http://127.0.0.1:3009',
    changeOrigin: true,
    pathRewrite: {
      '^/api/payment': '',
    },
  })
);

/**
 * Media Service (Cloudinary Signature, Upload Helpers)
 * URL gọi trên Postman: http://localhost:3000/api/media/...
 */
app.use(
  '/api/media',
  createProxyMiddleware({
    target: process.env.MEDIA_SERVICE_URL || 'http://localhost:3010',
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
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

// Use http.createServer so we can attach WebSocket upgrade handling.
const server = http.createServer(app);

// Subscribe the notification WS proxy to the server's 'upgrade' event.
// Without this, http-proxy-middleware v3 will NOT proxy WebSocket connections.
notificationWsProxy.upgrade(server);

server.listen(PORT, () => {
  console.log(`🚀 API Gateway running at http://localhost:${PORT}`);
});