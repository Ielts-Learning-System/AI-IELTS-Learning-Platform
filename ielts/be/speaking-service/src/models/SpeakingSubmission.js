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
    questions: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one speaking question is required',
      },
    },
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
