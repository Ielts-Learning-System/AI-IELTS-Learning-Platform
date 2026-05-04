const express = require('express');
const router = express.Router();
const listeningController = require('../controllers/listening.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

// ====== Routes ======

// GET / - Lấy danh sách tất cả đề thi
router.get('/', listeningController.getAllTests);

// GET /attempts - Teacher/Admin xem danh sách kết quả auto-graded
router.get('/attempts', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.getAttempts);

// GET /my-attempts - Student xem lịch sử làm bài của chính mình
router.get('/my-attempts', verifyToken, authorizeRoles('student', 'teacher', 'admin'), listeningController.getMyAttempts);

// GET /stats - Admin/Teacher lấy số liệu tổng quan attempts
router.get('/stats', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.getAttemptStats);

// GET /:id - Lấy chi tiết một đề thi (ẩn đáp án)
router.get('/:id', listeningController.getTestById);

// POST / - Tạo đề thi mới (Admin/Teacher)
router.post('/', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.createTest);

// PUT /:id - Sửa đề thi (Admin/Teacher)
router.put('/:id', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.updateTest);

// DELETE /:id - Xóa đề thi (Admin/Teacher)
router.delete('/:id', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.deleteTest);

// POST /:id/submit - Chấm điểm toàn bộ đề thi (legacy / full test)
router.post('/:id/submit', verifyToken, authorizeRoles('student'), listeningController.submitTest);

// POST /:id/submit-part - Chấm điểm một Part cụ thể
router.post('/:id/submit-part', verifyToken, authorizeRoles('student'), listeningController.submitPart);

module.exports = router;
