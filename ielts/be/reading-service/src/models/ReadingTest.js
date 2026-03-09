const mongoose = require('mongoose');

// ====== Question Schema ======
const QuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false_ng', 'matching', 'fill_blank'],
      required: true,
    },
    options: {
      type: [String],
      default: [], // Không bắt buộc
    },
    correctAnswer: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

// ====== Passage Schema ======
const PassageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true, // Chứa bài đọc
    },
    questions: {
      type: [QuestionSchema],
      required: true,
    },
  },
  { _id: true }
);

// ====== Reading Test Schema ======
const ReadingTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    passages: {
      type: [PassageSchema],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReadingTest', ReadingTestSchema);
