const mongoose = require('mongoose');

const GradingCriteriaSchema = new mongoose.Schema(
  {
    TR: { type: Number, required: true, min: 0, max: 9 },
    CC: { type: Number, required: true, min: 0, max: 9 },
    LR: { type: Number, required: true, min: 0, max: 9 },
    GRA: { type: Number, required: true, min: 0, max: 9 },
  },
  { _id: false }
);

const GradingSchema = new mongoose.Schema(
  {
    criteria: { type: GradingCriteriaSchema, required: true },
    overallBand: { type: Number, required: true, min: 0, max: 9 },
    teacherFeedback: {
      content: { type: String, default: '' },
      overall_feedback: { type: String, default: '' }
    },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gradedAt: { type: Date, required: true },
  },
  { _id: false }
);

const WritingSubmissionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    writingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Writing', required: true, index: true },
    taskType: { type: String, enum: ['Task 1', 'Task 2'], required: true },
    content: { type: String, required: true, trim: true },
    wordCount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Pending', 'Graded'], default: 'Pending', index: true },
    grading: { type: GradingSchema, default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WritingSubmission', WritingSubmissionSchema);