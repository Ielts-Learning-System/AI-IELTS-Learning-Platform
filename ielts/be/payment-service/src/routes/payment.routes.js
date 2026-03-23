const express = require('express');
const router = express.Router();
const {
	createVietQRPayment,
	getMyPendingTransaction,
	getTransactions,
	approveTransaction,
	rejectTransaction,
} = require('../controllers/payment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Tạo link thanh toán VietQR — yêu cầu đăng nhập
router.post('/create', verifyToken, createVietQRPayment);
router.post('/create-vietqr', verifyToken, createVietQRPayment);

// Transaction management (admin should be enforced by role middleware)
router.get('/transactions/my-pending', verifyToken, getMyPendingTransaction);
router.get('/transactions', verifyToken, getTransactions);
router.put('/transactions/:id/approve', verifyToken, approveTransaction);
router.put('/transactions/:id/reject', verifyToken, rejectTransaction);

module.exports = router;
