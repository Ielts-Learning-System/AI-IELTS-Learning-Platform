const mongoose = require('mongoose');

const OverallBandSchema = new mongoose.Schema(
  {
    reading: { type: Number, min: 0, max: 9 },
    listening: { type: Number, min: 0, max: 9 },
    writing: { type: Number, min: 0, max: 9 },
    speaking: { type: Number, min: 0, max: 9 },
    overall: { type: Number, min: 0, max: 9 },
  },
  { _id: false }
);

const ExamAttemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    globalStartTime: { type: Date, required: true },
    globalEndTime: { type: Date, required: true, index: true },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    overallBandScores: { type: OverallBandSchema, default: () => ({}) },
    lastActivityAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ExamAttemptSchema.index({ examId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model('ExamAttempt', ExamAttemptSchema);
