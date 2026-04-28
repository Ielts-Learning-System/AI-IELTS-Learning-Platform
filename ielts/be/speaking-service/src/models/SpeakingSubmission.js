const mongoose = require('mongoose');

const SpeakingGradingSchema = new mongoose.Schema(
  {
    FC: { type: Number, required: true, min: 0, max: 9 },
    LR: { type: Number, required: true, min: 0, max: 9 },
    GRA: { type: Number, required: true, min: 0, max: 9 },
    PR: { type: Number, required: true, min: 0, max: 9 },
    overallBand: { type: Number, required: true, min: 0, max: 9 },
    teacherFeedback: { type: String, default: '' },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gradedAt: { type: Date, required: true },
  },
  { _id: false }
);

const SpeakingSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpeakingTest',
      index: true,
      default: null,
    },
    questions: {
      type: [String],
      default: [],
    },
    // Per-question audio answers: each entry links a stable questionKey to a Cloudinary URL.
    // questionKey format: 'p1_0', 'p1_1', ..., 'p2', 'p3_0', 'p3_1', ...
    answers: {
      type: [
        {
          questionKey: { type: String, required: true },
          audioUrl: { type: String, required: true },
        },
      ],
      default: [],
    },
    // Kept for backward-compatibility with legacy single-audio submissions.
    audioUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Graded'],
      default: 'Pending',
      index: true,
    },
    grading: {
      type: SpeakingGradingSchema,
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpeakingSubmission', SpeakingSubmissionSchema);
