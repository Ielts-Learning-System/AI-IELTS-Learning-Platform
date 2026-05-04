const Writing = require('../models/Writing');

// Get all writings with optional filters (?isSample, ?type, ?page, ?limit)
exports.getItems = async (req, res) => {
  try {
    const filter = {};

    if (req.query.isSample !== undefined) {
      filter.isSample = req.query.isSample === 'true';
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      Writing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Writing.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: items,
      currentPage: page,
      totalPages,
      totalItems,
    });
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

// Get all writings (teacher management list)
exports.getAllTests = async (req, res) => {
  try {
    const items = await Writing.find(
      {},
      '_id title type category contentHtml isSample sampleInfos createdAt'
    );
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get test by ID (used by exam page)
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

// Submit test answers (legacy)
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

// Create a new writing prompt (teacher CRUD) — isSample flag no longer used here
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
      isSample: false,
      sampleInfos: [],
    });

    res.status(201).json({
      success: true,
      message: 'Writing prompt created successfully',
      data: newWriting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update a writing prompt (teacher CRUD)
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

// DELETE /:id  — remove entire writing prompt
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

// ─────────────────────────────────────────────────────────────────────────────
//  Sample-list sub-resource  POST /:id/samples  &  DELETE /:id/samples/:sampleId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /:id/samples
 * Append a new sample essay to an existing Writing prompt.
 * Body: { bandScore, author, contentHtml }
 */
exports.addSample = async (req, res) => {
  try {
    const { bandScore, author, contentHtml } = req.body;

    if (bandScore == null || !contentHtml) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bandScore, contentHtml',
      });
    }

    const band = Number(bandScore);
    if (isNaN(band) || band < 1 || band > 9) {
      return res.status(400).json({
        success: false,
        error: 'bandScore must be a number between 1 and 9',
      });
    }

    const writing = await Writing.findById(req.params.id);
    if (!writing) {
      return res.status(404).json({ success: false, error: 'Writing not found' });
    }

    const newSample = {
      bandScore: band,
      contentHtml: String(contentHtml).trim(),
      author: author ? String(author).trim() : 'IELTS Master',
    };

    writing.sampleInfos.push(newSample);
    await writing.save();

    const added = writing.sampleInfos[writing.sampleInfos.length - 1];

    res.status(201).json({
      success: true,
      message: 'Sample added successfully',
      data: added,
      writing,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /:id/samples/:sampleId
 * Update an existing sample essay.
 */
exports.updateSample = async (req, res) => {
  try {
    const { bandScore, author, contentHtml } = req.body;
    const { id, sampleId } = req.params;

    const writing = await Writing.findById(id);
    if (!writing) return res.status(404).json({ success: false, error: 'Writing not found' });

    const sample = writing.sampleInfos.id(sampleId);
    if (!sample) return res.status(404).json({ success: false, error: 'Sample not found' });

    if (bandScore != null) sample.bandScore = Number(bandScore);
    if (contentHtml) sample.contentHtml = String(contentHtml).trim();
    if (author) sample.author = String(author).trim();

    await writing.save();
    res.json({ success: true, message: 'Sample updated successfully', data: sample, writing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /:id/samples/:sampleId
 * Remove a specific sample essay from a Writing prompt.
 */
exports.deleteSample = async (req, res) => {
  try {
    const { id, sampleId } = req.params;

    const writing = await Writing.findById(id);
    if (!writing) {
      return res.status(404).json({ success: false, error: 'Writing not found' });
    }

    const before = writing.sampleInfos.length;
    writing.sampleInfos = writing.sampleInfos.filter(
      (s) => String(s._id) !== String(sampleId)
    );

    if (writing.sampleInfos.length === before) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }

    await writing.save();

    res.json({ success: true, message: 'Sample deleted successfully', writing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
