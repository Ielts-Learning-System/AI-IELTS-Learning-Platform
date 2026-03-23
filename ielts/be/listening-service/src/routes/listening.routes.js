const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');
const listeningController = require('../controllers/listening.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

// ====== Routes ======

// GET /api/dictation - Must stay above generic routes like / and /:id
router.get('/api/dictation', async (req, res) => {
	try {
		const dictationPath = path.join(__dirname, '..', '..', 'data', 'dictation_lessons.json');
		const raw = await fs.readFile(dictationPath, 'utf8');
		const lessons = JSON.parse(raw);

		if (!Array.isArray(lessons)) {
			return res.status(500).json({
				success: false,
				message: 'Invalid dictation data format',
			});
		}

		return res.status(200).json({
			success: true,
			data: lessons,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch dictation lessons',
			error: error.message,
		});
	}
});

// GET / - Lấy danh sách tất cả đề thi
router.get('/', listeningController.getAllTests);

// GET /attempts - Teacher/Admin xem danh sách kết quả auto-graded
router.get('/attempts', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.getAttempts);

// GET /:id - Lấy chi tiết một đề thi (ẩn đáp án)
router.get('/:id', listeningController.getTestById);

// POST / - Tạo đề thi mới (Admin/Teacher)
router.post('/', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.createTest);

// PUT /:id - Sửa đề thi (Admin/Teacher)
router.put('/:id', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.updateTest);

// DELETE /:id - Xóa đề thi (Admin/Teacher)
router.delete('/:id', verifyToken, authorizeRoles('admin', 'teacher'), listeningController.deleteTest);

// POST /:id/submit - Chấm điểm đề thi
router.post('/:id/submit', verifyToken, authorizeRoles('student'), listeningController.submitTest);

module.exports = router;
