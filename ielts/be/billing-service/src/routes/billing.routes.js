const express = require('express');
const router = express.Router();

const billingController = require('../controllers/billing.controller');
const adminController = require('../controllers/admin.controller');
const subscriptionController = require('../controllers/subscription.controller');

const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Billing Service is healthy 🚀',
    timestamp: new Date(),
  });
});

// Public plans for student purchase screens
router.get('/plans', billingController.getAllPlans);

// Student endpoint
router.get('/my-subscription', verifyToken, subscriptionController.getMySubscription);

// Backward-compatible alias
router.get('/my-plan', verifyToken, subscriptionController.getMySubscription);

// Admin endpoints
router.get('/admin/plans', verifyToken, authorizeRoles('admin'), adminController.getAllPlansForAdmin);
router.post('/admin/plans', verifyToken, authorizeRoles('admin'), adminController.createPlan);
router.put('/admin/plans/:planId', verifyToken, authorizeRoles('admin'), adminController.updatePlan);
router.patch('/admin/plans/:planId/toggle-active', verifyToken, authorizeRoles('admin'), adminController.togglePlanActive);
router.delete('/admin/plans/:planId', verifyToken, authorizeRoles('admin'), adminController.deletePlan);
router.get('/admin/subscriptions', verifyToken, authorizeRoles('admin'), adminController.getAllUserSubscriptions);
router.post('/admin/remind/:userId', verifyToken, authorizeRoles('admin'), adminController.triggerReminderNotification);

module.exports = router;