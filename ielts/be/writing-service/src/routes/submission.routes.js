const express = require('express');
const {
  submitWriting,
  getMySubmissions,
  getPendingSubmissions,
  getGradedSubmissions,
  gradeSubmission,
} = require('../controllers/submission.controller');
const { verifyToken, isTeacher } = require('../middlewares/auth.middleware');

const router = express.Router();

// Student submits a writing response.
router.post('/', verifyToken, submitWriting);

// Student fetches their own submission history.
router.get('/my-submissions', verifyToken, getMySubmissions);

// Teacher fetches submissions waiting for manual grading.
router.get('/pending', verifyToken, isTeacher, getPendingSubmissions);

// Teacher fetches already-graded submissions.
router.get('/graded', verifyToken, isTeacher, getGradedSubmissions);

// Teacher grades a specific writing submission.
router.put('/:id/grade', verifyToken, isTeacher, gradeSubmission);

module.exports = router;