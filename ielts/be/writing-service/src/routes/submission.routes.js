const express = require('express');
const {
  submitWriting,
  getMySubmissions,
  getPendingSubmissions,
  getGradedSubmissions,
  getSubmissionStats,
  gradeSubmission,
} = require('../controllers/submission.controller');
const { verifyToken, isTeacher, isTeacherOrAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Student submits a writing response.
router.post('/', verifyToken, submitWriting);

// Student fetches their own submission history.
router.get('/my-submissions', verifyToken, getMySubmissions);

// Teacher fetches submissions waiting for manual grading.
router.get('/pending', verifyToken, isTeacherOrAdmin, getPendingSubmissions);

// Teacher fetches already-graded submissions.
router.get('/graded', verifyToken, isTeacherOrAdmin, getGradedSubmissions);

// Teacher/Admin dashboard stats.
router.get('/stats', verifyToken, isTeacherOrAdmin, getSubmissionStats);

// Teacher grades a specific writing submission.
router.put('/:id/grade', verifyToken, isTeacherOrAdmin, gradeSubmission);

module.exports = router;