const mongoose = require('mongoose');
const SpeakingSubmission = require('../models/SpeakingSubmission');

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
    const submissions = await SpeakingSubmission.find({
      status: 'Pending',
      audioUrl: { $ne: '' },
    }).sort({ createdAt: 1 });

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

    if (!submission.audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Student has not submitted an audio recording yet',
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
