const WritingTest = require('../models/WritingTest');

// Get all tests
exports.getAllTests = async (req, res) => {
  try {
    const tests = await WritingTest.find({}, '_id title description');
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get test by ID
exports.getTestById = async (req, res) => {
  try {
    const test = await WritingTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit test answers
exports.submitTest = async (req, res) => {
  try {
    const { testId, answers } = req.body;

    // Validate input
    if (!testId || !answers || !answers.task1 || !answers.task2) {
      return res.status(400).json({ error: 'Missing required fields: testId, answers.task1, answers.task2' });
    }

    // Here you would typically save the submission to database
    // For now, just return confirmation
    res.json({
      success: true,
      message: 'Writing test submitted successfully',
      testId,
      answers: {
        task1: answers.task1.substring(0, 100) + '...', // Truncate for response
        task2: answers.task2.substring(0, 100) + '...'
      },
      submittedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
