const express = require('express');
const lessonController = require('../controllers/lesson.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

const isTeacherOrAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'teacher' || role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Forbidden: teacher or admin access required' });
};

// Student: GET /api/lessons?page=1&search=...
router.get('/', verifyToken, lessonController.getAllLessons);

// Teacher/Admin: GET /api/lessons/teacher?page=1&search=...
router.get('/teacher', verifyToken, isTeacherOrAdmin, lessonController.getAllLessonsTeacher);

// GET /:id
router.get('/:id', verifyToken, lessonController.getLessonById);

// POST / – create (upload or YouTube link)
router.post('/', verifyToken, isTeacherOrAdmin, lessonController.createLesson);

// DELETE /:id
router.delete('/:id', verifyToken, isTeacherOrAdmin, lessonController.deleteLesson);

module.exports = router;
