const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/reports.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

/**
 * GET /admin/reports/dashboard
 * Proxied by API Gateway as: GET /api/reports/dashboard
 *
 * Returns the full analytics payload for the Admin AnalyticsReport page:
 *   quickStats, dailyData (30d MRR + new users), topTests, subDistribution,
 *   apiHealth (AI token / cost by skill), totalApiTokens, totalApiCost.
 */
router.get(
  '/dashboard',
  verifyToken,
  authorizeRoles('admin'),
  getDashboard
);

module.exports = router;
