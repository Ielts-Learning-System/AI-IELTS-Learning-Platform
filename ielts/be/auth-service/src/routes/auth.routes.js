const express = require('express');
const { register, login, getProfile, updateUserRole, updateProfile, changePassword } = require('../controllers/auth.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes - Require authentication
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

// Admin only routes
router.put('/update-role/:id', verifyToken, authorizeRoles('Admin'), updateUserRole);

module.exports = router;