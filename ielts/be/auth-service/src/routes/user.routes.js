const express = require('express');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');
const {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
} = require('../controllers/user.controller');

const router = express.Router();

router.get('/', verifyToken, isAdmin, getAllUsers);
router.put('/:id/role', verifyToken, isAdmin, updateUserRole);
router.put('/:id/status', verifyToken, isAdmin, toggleUserStatus);

module.exports = router;