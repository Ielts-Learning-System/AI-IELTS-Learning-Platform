const express = require('express');
const router = express.Router();
const {
  getAllTests,
  getTestById,
  submitTest,
  getItems,
  getItemById,
  createTest,
  updateTest,
  deleteTest,
  addSample,
  updateSample,
  deleteSample,
} = require('../controllers/writing.controller');
const { verifyToken, isTeacher, isTeacherOrAdmin } = require('../middlewares/auth.middleware');

// WritingItem routes (public list page)
router.get('/items', getItems);
router.get('/items/:id', getItemById);

// Teacher management list
router.get('/', getAllTests);

// GET /:id — get writing detail (exam page)
router.get('/:id', getTestById);

// POST / — create new writing prompt (no sample info here)
router.post('/', verifyToken, isTeacherOrAdmin, createTest);

// PUT /:id — update writing prompt fields
router.put('/:id', verifyToken, isTeacherOrAdmin, updateTest);

// DELETE /:id — remove writing prompt entirely
router.delete('/:id', verifyToken, isTeacherOrAdmin, deleteTest);

// ── Sample sub-resource ──────────────────────────────────────────────────────
// POST   /:id/samples        — append a sample essay to an existing prompt
router.post('/:id/samples', verifyToken, isTeacherOrAdmin, addSample);

// PUT    /:id/samples/:sampleId — update a specific sample essay
router.put('/:id/samples/:sampleId', verifyToken, isTeacherOrAdmin, updateSample);

// DELETE /:id/samples/:sampleId — remove a specific sample essay
router.delete('/:id/samples/:sampleId', verifyToken, isTeacherOrAdmin, deleteSample);

// POST /submit — submit test answers (legacy)
router.post('/submit', submitTest);

module.exports = router;