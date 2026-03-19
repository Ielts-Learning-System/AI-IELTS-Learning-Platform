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
} = require('../controllers/writing.controller');
const { verifyToken, isTeacher } = require('../middlewares/auth.middleware');

// WritingItem routes (list page)
router.get('/items', getItems);
router.get('/items/:id', getItemById);

// Legacy WritingTest routes (exam page)
router.get('/', getAllTests);

// GET /:id - Get test by ID
router.get('/:id', getTestById);

// POST / - Create new writing test (teacher CRUD)
router.post('/', verifyToken, isTeacher, createTest);

// PUT /:id - Update writing test (teacher CRUD)
router.put('/:id', verifyToken, isTeacher, updateTest);

// DELETE /:id - Delete writing test (teacher CRUD)
router.delete('/:id', verifyToken, isTeacher, deleteTest);

// POST /submit - Submit test answers
router.post('/submit', submitTest);

module.exports = router;