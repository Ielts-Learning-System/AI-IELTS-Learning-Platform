const express = require('express');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');
const {
  getSystemConfig,
  updateSystemConfig,
  getInternalConfig,
  createAILog,
  getAILogs,
} = require('../controllers/systemConfig.controller');

const router = express.Router();

// Admin-facing routes (JWT + Admin role)
router.get('/api/admin/system-config', verifyToken, isAdmin, getSystemConfig);
router.put('/api/admin/system-config', verifyToken, isAdmin, updateSystemConfig);

// AI usage log routes
router.post('/api/admin/ai-logs', verifyToken, createAILog);   // teacher or admin can log usage
router.get('/api/admin/ai-logs', verifyToken, isAdmin, getAILogs);

// Internal route – called by ai-service inside Docker network only
router.get('/api/internal/system-config', getInternalConfig);

module.exports = router;
