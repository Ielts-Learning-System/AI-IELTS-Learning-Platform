const Writing = require('../models/Writing');

// Get all writings with optional filters (?isSample, ?type)
exports.getItems = async (req, res) => {
  try {
    const filter = {};

    if (req.query.isSample !== undefined) {
      filter.isSample = req.query.isSample === 'true';
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const items = await Writing.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single writing by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Writing.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Writing not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all writings (legacy list endpoint)
exports.getAllTests = async (req, res) => {
  try {
    const items = await Writing.find({}, '_id title type category isSample');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get test by ID (legacy)
exports.getTestById = async (req, res) => {
  try {
    const item = await Writing.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit test answers
exports.submitTest = async (req, res) => {
  try {
    const { testId, answers } = req.body;

    if (!testId || !answers) {
      return res.status(400).json({ error: 'Missing required fields: testId, answers' });
    }

    res.json({
      success: true,
      message: 'Writing test submitted successfully',
      testId,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
