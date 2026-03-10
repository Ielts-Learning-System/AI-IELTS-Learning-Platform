const express = require('express');
const multer = require('multer');
const router = express.Router();
const readingController = require('../controllers/reading.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

// ====== Multer Configuration (Memory Storage for AI Processing) ======
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ====== Routes ======

// GET / - Lấy danh sách tất cả đề thi (public)
router.get('/', readingController.getAllTests);

// GET /:id - Lấy chi tiết một đề thi (public)
router.get('/:id', readingController.getTestById);

// POST / - Tạo đề thi mới (Admin/Teacher only)
router.post('/', verifyToken, authorizeRoles('admin', 'teacher'), readingController.createTest);

// PUT /:id - Sửa đề thi (Owner/Admin only)
router.put('/:id', verifyToken, authorizeRoles('admin', 'teacher'), readingController.updateTest);

// DELETE /:id - Xóa đề thi (Owner/Admin only)
router.delete('/:id', verifyToken, authorizeRoles('admin', 'teacher'), readingController.deleteTest);

// POST /:id/submit - Chấm điểm đề thi (Student/Teacher/Admin)
router.post('/:id/submit', verifyToken, readingController.submitTest);

// POST /extract-ai - AI Extraction từ file (Admin/Teacher only)
router.post('/extract-ai', verifyToken, authorizeRoles('admin', 'teacher'), upload.single('file'), readingController.extractTestFromImage);

module.exports = router;
