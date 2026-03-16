const express = require('express');
const router = express.Router();
const {
  getAllTests,
  getTestById,
  submitTest,
  getItems,
  getItemById,
} = require('../controllers/writing.controller');

// WritingItem routes (list page)
router.get('/items', getItems);
router.get('/items/:id', getItemById);

// Legacy WritingTest routes (exam page)
router.get('/', getAllTests);

// GET /:id - Get test by ID
router.get('/:id', getTestById);

// POST /submit - Submit test answers
router.post('/submit', submitTest);

module.exports = router;