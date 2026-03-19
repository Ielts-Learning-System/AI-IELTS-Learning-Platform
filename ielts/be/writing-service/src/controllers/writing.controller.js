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

// Create a new writing test (teacher CRUD)
exports.createTest = async (req, res) => {
  try {
    const { title, type, category, contentHtml } = req.body;

    if (!title || !type || !contentHtml) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, type, contentHtml',
      });
    }

    const newWriting = await Writing.create({
      title: String(title).trim(),
      type,
      category: category || 'Mixed',
      contentHtml: String(contentHtml).trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Writing test created successfully',
      data: newWriting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update a writing test (teacher CRUD)
exports.updateTest = async (req, res) => {
  try {
    const { title, type, category, contentHtml } = req.body;
    const testId = req.params.id;

    const writing = await Writing.findById(testId);
    if (!writing) {
      return res.status(404).json({
        success: false,
        error: 'Writing test not found',
      });
    }

    if (title) writing.title = String(title).trim();
    if (type) writing.type = type;
    if (category) writing.category = category;
    if (contentHtml) writing.contentHtml = String(contentHtml).trim();

    await writing.save();

    res.json({
      success: true,
      message: 'Writing test updated successfully',
      data: writing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete a writing test (teacher CRUD)
exports.deleteTest = async (req, res) => {
  try {
    const testId = req.params.id;

    const writing = await Writing.findByIdAndDelete(testId);
    if (!writing) {
      return res.status(404).json({
        success: false,
        error: 'Writing test not found',
      });
    }

    res.json({
      success: true,
      message: 'Writing test deleted successfully',
      data: writing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
