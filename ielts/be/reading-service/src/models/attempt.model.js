const mongoose = require('mongoose');

const AttemptDetailSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    studentAnswer: { type: String, default: '' },
    correctAnswer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

const AttemptSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReadingTest',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentAnswers: [{ type: String, default: '' }],
    rawScore: { type: Number, required: true, min: 0 },
    bandScore: { type: Number, required: true, min: 0, max: 9 },
    timeSpent: { type: Number, default: 0, min: 0 },
    // null = full-test submission (legacy); 1-3 = single-passage submission
    passageNumber: { type: Number, default: null },
    details: { type: [AttemptDetailSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReadingAttempt', AttemptSchema);