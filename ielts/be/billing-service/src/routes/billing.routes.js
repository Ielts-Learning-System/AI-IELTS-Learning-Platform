const express = require('express');
const router = express.Router();

const billingController = require('../controllers/billing.controller');
const adminController = require('../controllers/admin.controller');
const subscriptionController = require('../controllers/subscription.controller');

const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { requireSkill } = require('../middleware/requireSkill.middleware');

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Billing Service is healthy 🚀',
    timestamp: new Date(),
  });
});

// Public plans for student purchase screens
router.get('/plans', billingController.getAllPlans);

// Student endpoints
// Trả về subscription đầy đủ (kèm planFallback nếu không có subscription record)
router.get('/my-subscription', verifyToken, subscriptionController.getMySubscription);

// Backward-compatible alias
router.get('/my-plan', verifyToken, subscriptionController.getMySubscription);

/**
 * GET /api/billing/my-skills
 * Endpoint nhẹ, trả về allowedSkills dựa trên user.plan → Plan.code
 * Dùng cho Frontend hook useAllowedSkills để poll quyền theo thời gian thực.
 */
router.get('/my-skills', verifyToken, subscriptionController.getMySkills);

// Admin endpoints
router.get('/admin/plans', verifyToken, authorizeRoles('admin'), adminController.getAllPlansForAdmin);
router.get('/admin/stats', verifyToken, authorizeRoles('admin'), adminController.getBillingStats);
router.post('/admin/plans', verifyToken, authorizeRoles('admin'), adminController.createPlan);
router.put('/admin/plans/:planId', verifyToken, authorizeRoles('admin'), adminController.updatePlan);
router.patch('/admin/plans/:planId/toggle-active', verifyToken, authorizeRoles('admin'), adminController.togglePlanActive);
router.delete('/admin/plans/:planId', verifyToken, authorizeRoles('admin'), adminController.deletePlan);
router.get('/admin/subscriptions', verifyToken, authorizeRoles('admin'), adminController.getAllUserSubscriptions);
router.post('/admin/remind/:userId', verifyToken, authorizeRoles('admin'), adminController.triggerReminderNotification);
router.post('/admin/subscriptions/:subscriptionId/cancel', verifyToken, authorizeRoles('admin'), adminController.cancelSubscription);
router.post('/admin/subscriptions/:subscriptionId/restore', verifyToken, authorizeRoles('admin'), adminController.restoreSubscription);

// ─────────────────────────────────────────────────────────
// Ví dụ áp dụng requireSkill cho các endpoint học tập
// Pattern: verifyToken → requireSkill(skill) → controller
// ─────────────────────────────────────────────────────────

/**
 * GET /api/billing/skill-check/:skillName
 * Endpoint tiện ích để Frontend kiểm tra nhanh quyền truy cập một skill.
 * Trả về 200 nếu được phép, 403 nếu không.
 */
router.get(
  '/skill-check/:skillName',
  verifyToken,
  (req, res, next) => requireSkill(req.params.skillName)(req, res, next),
  (req, res) => res.json({ success: true, allowed: true, skill: req.params.skillName })
);

/**
 * POST /api/billing/example/writing/submit
 * Ví dụ: endpoint nộp bài Writing được bảo vệ bởi requireSkill('writing').
 * Chỉ user có plan chứa 'writing' trong benefits.skills mới được truy cập.
 */
router.post(
  '/example/writing/submit',
  verifyToken,
  requireSkill('writing'),
  (req, res) => {
    // Placeholder: thực tế sẽ gọi writingController.submitAnswer
    return res.status(201).json({
      success: true,
      message: 'Bài writing đã được nộp thành công.',
      data: { submittedAt: new Date() },
    });
  }
);

module.exports = router;