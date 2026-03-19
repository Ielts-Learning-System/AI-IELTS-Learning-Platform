const express = require('express');
const { verifyToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');
const {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  getUsersByIds,
} = require('../controllers/user.controller');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('Admin', 'Teacher'), getAllUsers);
router.post('/lookup', verifyToken, authorizeRoles('Admin', 'Teacher'), getUsersByIds);
router.put('/:id/role', verifyToken, isAdmin, updateUserRole);
router.put('/:id/status', verifyToken, isAdmin, toggleUserStatus);

module.exports = router;