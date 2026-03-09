const express = require('express');
const router = express.Router();
const listeningController = require('../controllers/listening.controller');

// ====== Routes ======

// GET / - Lấy danh sách tất cả đề thi
router.get('/', listeningController.getAllTests);

// GET /:id - Lấy chi tiết một đề thi (ẩn đáp án)
router.get('/:id', listeningController.getTestById);

// POST / - Tạo đề thi mới (Admin/Teacher)
router.post('/', listeningController.createTest);

// POST /:id/submit - Chấm điểm đề thi
router.post('/:id/submit', listeningController.submitTest);

module.exports = router;
