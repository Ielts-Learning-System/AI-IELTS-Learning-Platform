const express = require('express');
const lessonController = require('../controllers/lesson.controller');
const { verifyToken, isTeacher, isAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

const isTeacherOrAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();

  if (role === 'teacher' || role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: teacher or admin access required',
  });
};

// POST / - Protect with verifyToken and isTeacher/isAdmin middleware
router.post('/', verifyToken, isTeacherOrAdmin, lessonController.createLesson);

// GET / - Protect with verifyToken so only logged-in users can see
router.get('/', verifyToken, lessonController.getAllLessons);

// GET /:id - Protect with verifyToken
router.get('/:id', verifyToken, lessonController.getLessonById);

// DELETE /:id - Protect with verifyToken and isTeacher/isAdmin middleware
router.delete('/:id', verifyToken, isTeacherOrAdmin, lessonController.deleteLesson);

module.exports = router;
