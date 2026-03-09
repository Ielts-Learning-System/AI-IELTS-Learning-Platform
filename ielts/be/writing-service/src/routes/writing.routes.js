const express = require('express');
const router = express.Router();
const {
  getAllTests,
  getTestById,
  submitTest
} = require('../controllers/writing.controller');

// GET / - Get all tests
router.get('/', getAllTests);

// GET /:id - Get test by ID
router.get('/:id', getTestById);

// POST /submit - Submit test answers
router.post('/submit', submitTest);

module.exports = router;