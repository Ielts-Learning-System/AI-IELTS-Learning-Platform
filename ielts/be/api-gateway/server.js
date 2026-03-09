require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Middleware
app.use(cors()); // Allow all origins for easy testing
app.use(morgan('dev')); // Log all requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy configuration
// Route /api/auth requests to Auth Service
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '', // Remove /api/auth prefix when forwarding to auth service
  },
}));

// TODO: Add proxy for other services
// app.use('/api/reading', createProxyMiddleware({ target: 'http://localhost:3002', ... }));
// app.use('/api/listening', createProxyMiddleware({ target: 'http://localhost:3003', ... }));
// app.use('/api/writing', createProxyMiddleware({ target: 'http://localhost:5000', ... }));
// app.use('/api/speaking', createProxyMiddleware({ target: 'http://localhost:5001', ... }));
// app.use('/api/billing', createProxyMiddleware({ target: 'http://localhost:3004', ... }));
// app.use('/api/notification', createProxyMiddleware({ target: 'http://localhost:3005', ... }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// 500 error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API Gateway is running on port ${PORT}`);
});
