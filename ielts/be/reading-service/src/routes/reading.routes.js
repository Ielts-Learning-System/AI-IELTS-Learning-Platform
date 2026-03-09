const express = require('express');
const router = express.Router();
const readingController = require('../controllers/reading.controller');

// ====== Routes ======

// GET / - Lấy danh sách tất cả đề thi
router.get('/', readingController.getAllTests);

// GET /:id - Lấy chi tiết một đề thi (ẩn đáp án)
router.get('/:id', readingController.getTestById);

// POST / - Tạo đề thi mới (Admin/Teacher)
router.post('/', readingController.createTest);

// POST /:id/submit - Chấm điểm đề thi
router.post('/:id/submit', readingController.submitTest);

module.exports = router;
