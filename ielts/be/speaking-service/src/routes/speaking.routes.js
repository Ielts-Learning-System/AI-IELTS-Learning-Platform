const express = require('express');
const {
  assignSpeakingQuestions,
  getMyPendingSpeakingTest,
  submitSpeakingAudio,
  getPendingSpeakingSubmissions,
  getGradedSpeakingSubmissions,
  gradeSpeakingSubmission,
  startOrUpdateAttempt,
  getMySubmissions,
  getSubmissionsByTest,
} = require('../controllers/speakingSubmission.controller');
const {
  getAllSpeakingTests,
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
} = require('../controllers/speakingTest.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// ── Student practice list ──────────────────────────────────────────────────
router.get('/', getAllSpeakingTests);

// ── Test CRUD (teacher/admin) ──────────────────────────────────────────────
router.get('/tests', getAllTests);
router.get('/tests/:id', getTestById);
router.post('/tests', verifyToken, authorizeRoles('teacher', 'admin'), createTest);
router.put('/tests/:id', verifyToken, authorizeRoles('teacher', 'admin'), updateTest);
router.delete('/tests/:id', verifyToken, authorizeRoles('teacher', 'admin'), deleteTest);

// ── Student self-service submission ───────────────────────────────────────
// Student uploads audio directly from a test (no teacher assignment needed)
router.post('/tests/:testId/attempt', verifyToken, authorizeRoles('student', 'teacher', 'admin'), startOrUpdateAttempt);

// ── Student history ────────────────────────────────────────────────────────
router.get('/submissions/my-submissions', verifyToken, getMySubmissions);

// ── Legacy assignment flow (kept for backward-compat, soft-deprecated) ─────
router.post('/assign', verifyToken, authorizeRoles('teacher', 'admin'), assignSpeakingQuestions);
router.get('/my-pending', verifyToken, getMyPendingSpeakingTest);
router.put('/:id/submit', verifyToken, authorizeRoles('student', 'teacher', 'admin'), submitSpeakingAudio);

// ── Teacher grading ────────────────────────────────────────────────────────
router.get('/pending', verifyToken, authorizeRoles('teacher', 'admin'), getPendingSpeakingSubmissions);
router.get('/graded', verifyToken, authorizeRoles('teacher', 'admin'), getGradedSpeakingSubmissions);
router.get('/tests/:testId/submissions', verifyToken, authorizeRoles('teacher', 'admin'), getSubmissionsByTest);
router.put('/:id/grade', verifyToken, authorizeRoles('teacher', 'admin'), gradeSpeakingSubmission);

module.exports = router;
