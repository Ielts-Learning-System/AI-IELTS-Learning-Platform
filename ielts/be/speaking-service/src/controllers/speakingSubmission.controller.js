const mongoose = require('mongoose');
const SpeakingSubmission = require('../models/SpeakingSubmission');
const SpeakingTest = require('../models/SpeakingTest');

const roundToNearestHalf = (value) => Math.round(value * 2) / 2;

const calculateOverallBand = ({ FC, LR, GRA, PR }) => {
  const average = (Number(FC) + Number(LR) + Number(GRA) + Number(PR)) / 4;
  return roundToNearestHalf(average);
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

exports.assignSpeakingQuestions = async (req, res) => {
  try {
    const { studentId, questions } = req.body;

    if (!studentId || !isObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid studentId is required',
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questions must be a non-empty array of strings',
      });
    }

    const normalizedQuestions = questions
      .map((question) => String(question || '').trim())
      .filter(Boolean);

    if (normalizedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questions must include at least one non-empty string',
      });
    }

    const submission = await SpeakingSubmission.create({
      studentId,
      questions: normalizedQuestions,
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Speaking questions assigned successfully',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMyPendingSpeakingTest = async (req, res) => {
  try {
    const submission = await SpeakingSubmission.findOne({
      studentId: req.user.id,
      status: 'Pending',
    }).sort({ createdAt: 1 });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'No pending speaking test found',
      });
    }

    return res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.submitSpeakingAudio = async (req, res) => {
  try {
    const { audioUrl } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'audioUrl is required',
      });
    }

    const submission = await SpeakingSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Speaking submission not found',
      });
    }

    if (String(submission.studentId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit your own speaking test',
      });
    }

    if (submission.status === 'Graded') {
      return res.status(400).json({
        success: false,
        message: 'This submission has already been graded',
      });
    }

    submission.audioUrl = String(audioUrl).trim();
    await submission.save();

    return res.json({
      success: true,
      message: 'Audio submitted successfully',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPendingSpeakingSubmissions = async (req, res) => {
  try {
    // Accept both legacy single-audio submissions and new per-question ones
    const submissions = await SpeakingSubmission.find({
      status: 'Pending',
      $or: [
        { 'answers.0': { $exists: true } },
        { audioUrl: { $ne: '' } },
      ],
    })
      .populate('testId', 'title part1 part2 part3')
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getGradedSpeakingSubmissions = async (req, res) => {
  try {
    const submissions = await SpeakingSubmission.find({ status: 'Graded' })
      .populate('testId', 'title part1 part2 part3')
      .sort({ 'grading.gradedAt': -1 });

    return res.json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.gradeSpeakingSubmission = async (req, res) => {
  try {
    const { criteria, teacherFeedback } = req.body;

    if (!criteria) {
      return res.status(400).json({
        success: false,
        message: 'criteria is required',
      });
    }

    const { FC, LR, GRA, PR } = criteria;
    const scores = { FC, LR, GRA, PR };
    const hasInvalidScore = Object.values(scores).some(
      (score) => Number.isNaN(Number(score)) || Number(score) < 0 || Number(score) > 9
    );

    if (hasInvalidScore) {
      return res.status(400).json({
        success: false,
        message: 'FC, LR, GRA, PR must be numbers between 0 and 9',
      });
    }

    const submission = await SpeakingSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Speaking submission not found',
      });
    }

    if (!submission.answers?.length && !submission.audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Student has not submitted any audio recordings yet',
      });
    }

    submission.status = 'Graded';
    submission.grading = {
      FC: Number(FC),
      LR: Number(LR),
      GRA: Number(GRA),
      PR: Number(PR),
      overallBand: calculateOverallBand(scores),
      teacherFeedback: teacherFeedback || '',
      gradedBy: req.user.id,
      gradedAt: new Date(),
    };

    await submission.save();

    return res.json({
      success: true,
      message: 'Speaking submission graded successfully',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Student: Submit (or re-submit) per-question audio answers for a specific speaking test.
 * `answers` is an array of { questionKey, audioUrl } pairs.
 * questionKey format: 'p1_0', 'p1_1', ..., 'p2', 'p3_0', 'p3_1', ...
 * Creates a new submission if none exists, or replaces the answers on the existing one.
 */
exports.startOrUpdateAttempt = async (req, res) => {
  try {
    const { answers, forceNew } = req.body;
    const { testId } = req.params;

    if (!testId || !isObjectId(testId)) {
      return res.status(400).json({ success: false, message: 'Valid testId is required' });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'answers must be a non-empty array' });
    }

    // Validate each entry
    for (const entry of answers) {
      if (!entry.questionKey || !entry.audioUrl) {
        return res.status(400).json({
          success: false,
          message: 'Each answer must have questionKey and audioUrl',
        });
      }
    }

    const test = await SpeakingTest.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Speaking test not found' });
    }

    const mappedAnswers = answers.map((a) => ({
      questionKey: String(a.questionKey).trim(),
      audioUrl: String(a.audioUrl).trim(),
    }));

    let submission;
    if (!forceNew) {
      // Upsert: update the most recent Pending submission for this student+test
      const existing = await SpeakingSubmission.findOne({
        studentId: req.user.id,
        testId,
        status: 'Pending',
      }).sort({ createdAt: -1 });

      if (existing) {
        existing.answers = mappedAnswers;
        await existing.save();
        submission = existing;
      }
    }

    if (!submission) {
      // Create a fresh attempt (either forceNew=true or no existing Pending found)
      submission = await SpeakingSubmission.create({
        studentId: req.user.id,
        testId,
        answers: mappedAnswers,
        status: 'Pending',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Answers submitted successfully',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Student: Get my own speaking submission history, populated with test data.
 */
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await SpeakingSubmission.find({ studentId: req.user.id })
      .populate('testId', 'title part1 part2 part3')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Teacher: Get all submissions for a specific test (with audio).
 */
exports.getSubmissionsByTest = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId || !isObjectId(testId)) {
      return res.status(400).json({ success: false, message: 'Valid testId is required' });
    }

    const submissions = await SpeakingSubmission.find({ testId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
