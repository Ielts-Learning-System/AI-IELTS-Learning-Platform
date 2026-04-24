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
  deleteSample,
} = require('../controllers/writing.controller');
const { verifyToken, isTeacher } = require('../middlewares/auth.middleware');

// WritingItem routes (public list page)
router.get('/items', getItems);
router.get('/items/:id', getItemById);

// Teacher management list
router.get('/', getAllTests);

// GET /:id — get writing detail (exam page)
router.get('/:id', getTestById);

// POST / — create new writing prompt (no sample info here)
router.post('/', verifyToken, isTeacher, createTest);

// PUT /:id — update writing prompt fields
router.put('/:id', verifyToken, isTeacher, updateTest);

// DELETE /:id — remove writing prompt entirely
router.delete('/:id', verifyToken, isTeacher, deleteTest);

// ── Sample sub-resource ──────────────────────────────────────────────────────
// POST   /:id/samples        — append a sample essay to an existing prompt
router.post('/:id/samples', verifyToken, isTeacher, addSample);

// DELETE /:id/samples/:sampleId — remove a specific sample essay
router.delete('/:id/samples/:sampleId', verifyToken, isTeacher, deleteSample);

// POST /submit — submit test answers (legacy)
router.post('/submit', submitTest);

module.exports = router;