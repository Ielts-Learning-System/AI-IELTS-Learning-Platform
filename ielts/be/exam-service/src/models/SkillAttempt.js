const mongoose = require('mongoose');

const SkillAttemptSchema = new mongoose.Schema(
  {
    examAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    skillType: {
      type: String,
      enum: ['reading', 'listening', 'writing', 'speaking'],
      required: true,
      index: true,
    },
    skillRefId: { type: String, required: true },
    skillStartTime: { type: Date },
    skillEndTime: { type: Date },
    deadlineAt: { type: Date, index: true },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED'],
      default: 'NOT_STARTED',
      index: true,
    },
    timeRemainingSeconds: { type: Number, default: 0, min: 0 },
    answerSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    unansweredCount: { type: Number, default: 0, min: 0 },
    autoSubmitted: { type: Boolean, default: false },
    gradedBand: { type: Number, min: 0, max: 9 },
    gradingMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSavedAt: { type: Date },
  },
  { timestamps: true }
);

SkillAttemptSchema.index({ examAttemptId: 1, skillType: 1 }, { unique: true });

module.exports = mongoose.model('SkillAttempt', SkillAttemptSchema);
