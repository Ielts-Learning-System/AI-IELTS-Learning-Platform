const express = require('express');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');
const {
  getSystemConfig,
  updateSystemConfig,
  getInternalConfig,
} = require('../controllers/systemConfig.controller');

const router = express.Router();

// Admin-facing routes (JWT + Admin role)
router.get('/api/admin/system-config', verifyToken, isAdmin, getSystemConfig);
router.put('/api/admin/system-config', verifyToken, isAdmin, updateSystemConfig);

// Internal route – called by ai-service inside Docker network only
router.get('/api/internal/system-config', getInternalConfig);

module.exports = router;
