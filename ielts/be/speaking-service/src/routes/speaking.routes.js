const express = require('express');
const {
  assignSpeakingQuestions,
  getMyPendingSpeakingTest,
  submitSpeakingAudio,
  getPendingSpeakingSubmissions,
  gradeSpeakingSubmission,
} = require('../controllers/speakingSubmission.controller');
const {
  getAllSpeakingTests,
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  assignTestToStudent,
} = require('../controllers/speakingTest.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Student practice list
router.get('/', getAllSpeakingTests);

// Test management routes (CRUD for teacher prompt bank)
router.get('/tests', getAllTests);
router.get('/tests/:id', getTestById);
router.post('/tests', verifyToken, authorizeRoles('teacher', 'admin'), createTest);
router.put('/tests/:id', verifyToken, authorizeRoles('teacher', 'admin'), updateTest);
router.delete('/tests/:id', verifyToken, authorizeRoles('teacher', 'admin'), deleteTest);

// Assignment and submission routes
router.post('/assign', verifyToken, authorizeRoles('teacher', 'admin'), assignTestToStudent);
router.get('/my-pending', verifyToken, getMyPendingSpeakingTest);
router.put('/:id/submit', verifyToken, authorizeRoles('student', 'teacher', 'admin'), submitSpeakingAudio);
router.get('/pending', verifyToken, authorizeRoles('teacher', 'admin'), getPendingSpeakingSubmissions);
router.put('/:id/grade', verifyToken, authorizeRoles('teacher', 'admin'), gradeSpeakingSubmission);

module.exports = router;
