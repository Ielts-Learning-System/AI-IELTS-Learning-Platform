const express = require('express');
const {
	register,
	login,
	getProfile,
	updateUserRole,
	updateProfile,
	changePassword,
	batchGetUsersInternal,
	updateSubscriptionInternal,
} = require('../controllers/auth.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Internal service routes (API Composition — no JWT required, network-internal only)
router.post('/internal/users/batch', batchGetUsersInternal);
router.patch('/internal/users/:id/subscription', updateSubscriptionInternal);

// Protected routes - Require authentication
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

// Admin only routes
router.put('/update-role/:id', verifyToken, authorizeRoles('Admin'), updateUserRole);

module.exports = router;