const mongoose = require('mongoose');
const SpeakingTest = require('../models/SpeakingTest');
const SpeakingSubmission = require('../models/SpeakingSubmission');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * Get speaking tests for the student practice list.
 * Returns only list-safe fields to avoid shipping full question payloads.
 */
exports.getAllSpeakingTests = async (req, res) => {
  try {
    const tests = await SpeakingTest.find({}, '_id title createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all speaking tests (for teacher prompt bank)
 */
exports.getAllTests = async (req, res) => {
  try {
    const tests = await SpeakingTest.find({})
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get a single speaking test by ID
 */
exports.getTestById = async (req, res) => {
  try {
    const test = await SpeakingTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Speaking test not found',
      });
    }

    return res.json({
      success: true,
      data: test,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create a new speaking test (teacher only)
 */
exports.createTest = async (req, res) => {
  try {
    const { title, part1, part2, part3 } = req.body;

    // Validate input
    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    if (!Array.isArray(part1) || part1.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Part 1 must be a non-empty array of questions',
      });
    }

    if (!part2 || !String(part2).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Part 2 cue card prompt is required',
      });
    }

    if (!Array.isArray(part3) || part3.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Part 3 must be a non-empty array of questions',
      });
    }

    const test = await SpeakingTest.create({
      title: String(title).trim(),
      part1: part1.map((q) => String(q).trim()).filter(Boolean),
      part2: String(part2).trim(),
      part3: part3.map((q) => String(q).trim()).filter(Boolean),
    });

    return res.status(201).json({
      success: true,
      message: 'Speaking test created successfully',
      data: test,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update a speaking test (teacher/admin only)
 */
exports.updateTest = async (req, res) => {
  try {
    const { title, part1, part2, part3 } = req.body;

    const test = await SpeakingTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Speaking test not found',
      });
    }

    // Update fields if provided
    if (title) test.title = String(title).trim();
    if (Array.isArray(part1) && part1.length > 0) {
      test.part1 = part1.map((q) => String(q).trim()).filter(Boolean);
    }
    if (part2) test.part2 = String(part2).trim();
    if (Array.isArray(part3) && part3.length > 0) {
      test.part3 = part3.map((q) => String(q).trim()).filter(Boolean);
    }

    await test.save();

    return res.json({
      success: true,
      message: 'Speaking test updated successfully',
      data: test,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a speaking test (teacher/admin only)
 */
exports.deleteTest = async (req, res) => {
  try {
    const test = await SpeakingTest.findByIdAndDelete(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Speaking test not found',
      });
    }

    return res.json({
      success: true,
      message: 'Speaking test deleted successfully',
      data: test,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Assign a test to a student (creates a pending submission)
 */
exports.assignTestToStudent = async (req, res) => {
  try {
    const { studentId, testId } = req.body;

    if (!studentId || !isObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid studentId is required',
      });
    }

    if (!testId || !isObjectId(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid testId is required',
      });
    }

    const test = await SpeakingTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Speaking test not found',
      });
    }

    // Convert test data to questions array format for submission
    const questions = [
      ...test.part1,
      test.part2,
      ...test.part3,
    ];

    const submission = await SpeakingSubmission.create({
      studentId,
      questions,
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Speaking test assigned successfully',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
