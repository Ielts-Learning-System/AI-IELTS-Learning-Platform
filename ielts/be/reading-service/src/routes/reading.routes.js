const express = require('express');
const router = express.Router();
const readingController = require('../controllers/reading.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

// ====== Routes ======

// GET / - Lấy danh sách tất cả đề thi (public)
router.get('/', readingController.getAllTests);

// GET /attempts - Teacher/Admin xem danh sách kết quả auto-graded
router.get('/attempts', verifyToken, authorizeRoles('admin', 'teacher'), readingController.getAttempts);

// GET /my-attempts - Student xem lịch sử làm bài của chính mình
router.get('/my-attempts', verifyToken, authorizeRoles('student', 'teacher', 'admin'), readingController.getMyAttempts);

// GET /stats - Admin/Teacher lấy số liệu tổng quan attempts
router.get('/stats', verifyToken, authorizeRoles('admin', 'teacher'), readingController.getAttemptStats);

// GET /:id - Lấy chi tiết một đề thi (public)
router.get('/:id', readingController.getTestById);

// POST / - Tạo đề thi mới (Admin/Teacher only)
router.post('/', verifyToken, authorizeRoles('admin', 'teacher'), readingController.createTest);

// PUT /:id - Sửa đề thi (Owner/Admin only)
router.put('/:id', verifyToken, authorizeRoles('admin', 'teacher'), readingController.updateTest);

// DELETE /:id - Xóa đề thi (Owner/Admin only)
router.delete('/:id', verifyToken, authorizeRoles('admin', 'teacher'), readingController.deleteTest);

// POST /:id/submit - Student nộp toàn bộ bài (legacy / full test)
router.post('/:id/submit', verifyToken, authorizeRoles('student'), readingController.submitTest);

// POST /:id/submit-passage - Student nộp một Passage cụ thể
router.post('/:id/submit-passage', verifyToken, authorizeRoles('student'), readingController.submitPassage);

// POST /generate-ai - Generate test from AI based on parameters (Admin/Teacher only)
router.post('/generate-ai', verifyToken, authorizeRoles('admin', 'teacher'), readingController.generateTestFromAI);

module.exports = router;
