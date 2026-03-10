const express = require('express');
const router = express.Router();

// 1. Import toàn bộ controller
const billingController = require('../controllers/billing.controller');

// 2. Import middleware
const { verifyToken } = require('../middleware/auth.middleware');

// --- CÁC ĐƯỜNG DẪN API ---

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Billing Service is healthy 🚀',
    timestamp: new Date(),
  });
});
// API Public: Lấy danh sách gói cước
router.get('/plans', billingController.getAllPlans);

// API Private: Yêu cầu có token đăng nhập
router.get('/my-plan', verifyToken, billingController.getMySubscription);
router.post('/upgrade', verifyToken, billingController.upgradePlan);
router.get('/check-eligibility', verifyToken, billingController.checkFullTestEligibility);

module.exports = router;