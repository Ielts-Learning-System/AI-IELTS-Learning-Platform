const express = require('express');
const examController = require('../controllers/exam.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, service: 'exam-service' });
});

router.get('/exams', verifyToken, authorizeRoles('student', 'teacher', 'admin'), examController.listStudentExams);
router.post('/exams/:examId/start', verifyToken, authorizeRoles('student', 'teacher', 'admin'), examController.startExam);
router.get('/attempts/:attemptId', verifyToken, authorizeRoles('student', 'teacher', 'admin'), examController.getAttempt);
router.post('/attempts/:attemptId/skills/:skillType/start', verifyToken, authorizeRoles('student', 'teacher', 'admin'), examController.startSkill);
router.put('/attempts/:attemptId/skills/:skillType/snapshot', verifyToken, authorizeRoles('student', 'teacher', 'admin'), examController.saveSkillSnapshot);
router.post('/attempts/:attemptId/skills/:skillType/submit', verifyToken, authorizeRoles('student', 'teacher', 'admin'), examController.submitSkill);
router.post('/attempts/:attemptId/submit', verifyToken, authorizeRoles('student', 'teacher', 'admin'), examController.submitExam);

router.get('/teacher/exams', verifyToken, authorizeRoles('teacher', 'admin'), examController.listTeacherExams);
// SSE endpoint — must be declared before /:examId to avoid path collision
router.get('/teacher/exams/orchestrate-progress/:jobId', verifyToken, authorizeRoles('teacher', 'admin'), examController.orchestrateProgress);
router.post('/teacher/exams', verifyToken, authorizeRoles('teacher', 'admin'), examController.createExam);
router.post('/teacher/exams/:examId/publish', verifyToken, authorizeRoles('teacher', 'admin'), examController.publishExam);
router.delete('/teacher/exams/:examId', verifyToken, authorizeRoles('teacher', 'admin'), examController.deleteExam);
router.post(
  '/teacher/exams/orchestrate-pdf',
  verifyToken,
  authorizeRoles('teacher', 'admin'),
  examController.upload.fields([
    { name: 'fullExamPdf', maxCount: 1 },
    { name: 'answerKeyPdf', maxCount: 1 },
  ]),
  examController.createExamFromPdf
);

router.get('/teacher/monitoring/attempts', verifyToken, authorizeRoles('teacher', 'admin'), examController.listMonitoringAttempts);
router.get('/teacher/students/:userId/attempts', verifyToken, authorizeRoles('teacher', 'admin'), examController.getStudentAttempts);
router.get('/teacher/attempts/:attemptId', verifyToken, authorizeRoles('teacher', 'admin'), examController.getAttemptForTeacher);
router.post('/teacher/attempts/:attemptId/grade', verifyToken, authorizeRoles('teacher', 'admin'), examController.gradeAttempt);

module.exports = router;
