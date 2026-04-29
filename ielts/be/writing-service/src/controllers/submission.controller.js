const Writing = require('../models/Writing');
const WritingSubmission = require('../models/writingSubmission.model');

const roundToNearestHalf = (value) => Math.round(value * 2) / 2;

const calculateOverallBand = ({ TR, CC, LR, GRA }) => {
  const average = (Number(TR) + Number(CC) + Number(LR) + Number(GRA)) / 4;
  return roundToNearestHalf(average);
};

const countWords = (content) => {
  const plainText = String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText ? plainText.split(' ').length : 0;
};

exports.submitWriting = async (req, res) => {
  try {
    const { writingId, taskType, content } = req.body;

    if (!writingId || !taskType || !content) {
      return res.status(400).json({
        success: false,
        message: 'writingId, taskType, and content are required',
      });
    }

    const writing = await Writing.findById(writingId).select('title type');
    if (!writing) {
      return res.status(404).json({
        success: false,
        message: 'Writing prompt not found',
      });
    }

    if (writing.type !== taskType) {
      return res.status(400).json({
        success: false,
        message: 'taskType does not match the selected writing prompt',
      });
    }

    const submission = await WritingSubmission.create({
      studentId: req.user.id,
      writingId,
      taskType,
      content,
      wordCount: countWords(content),
    });

    return res.status(201).json({
      success: true,
      message: 'Writing submitted successfully',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await WritingSubmission.find({ studentId: req.user.id })
      .populate('writingId', 'title type')
      .sort({ createdAt: -1 });

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

exports.getPendingSubmissions = async (req, res) => {
  try {
    const submissions = await WritingSubmission.find({ status: 'Pending' })
      .populate('writingId', 'title type')
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

exports.getGradedSubmissions = async (req, res) => {
  try {
    const submissions = await WritingSubmission.find({ status: 'Graded' })
      .populate('writingId', 'title type')
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

exports.getSubmissionStats = async (req, res) => {
  try {
    const [pendingCount, gradedCount, totalSubmissions, avgBandAgg] = await Promise.all([
      WritingSubmission.countDocuments({ status: 'Pending' }),
      WritingSubmission.countDocuments({ status: 'Graded' }),
      WritingSubmission.countDocuments({}),
      WritingSubmission.aggregate([
        { $match: { status: 'Graded' } },
        { $group: { _id: null, avgBand: { $avg: '$grading.overallBand' } } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        pendingCount,
        gradedCount,
        totalSubmissions,
        avgBand: Number((avgBandAgg?.[0]?.avgBand || 0).toFixed(2)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const { criteria, teacherFeedback } = req.body;

    if (!criteria) {
      return res.status(400).json({
        success: false,
        message: 'criteria is required',
      });
    }

    const { TR, CC, LR, GRA } = criteria;
    const scores = { TR, CC, LR, GRA };
    const hasInvalidScore = Object.values(scores).some(
      (score) => Number.isNaN(Number(score)) || Number(score) < 0 || Number(score) > 9
    );

    if (hasInvalidScore) {
      return res.status(400).json({
        success: false,
        message: 'TR, CC, LR, and GRA must be numbers between 0 and 9',
      });
    }

    const submission = await WritingSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    submission.status = 'Graded';
    submission.grading = {
      criteria: {
        TR: Number(TR),
        CC: Number(CC),
        LR: Number(LR),
        GRA: Number(GRA),
      },
      overallBand: calculateOverallBand(scores),
      teacherFeedback: teacherFeedback || { content: '', overall_feedback: '' },
      gradedBy: req.user.id,
      gradedAt: new Date(),
    };

    await submission.save();

    await submission.populate('writingId', 'title type');

    return res.json({
      success: true,
      message: 'Submission graded successfully',
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};