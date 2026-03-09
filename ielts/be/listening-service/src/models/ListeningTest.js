const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'fill_blank', 'map_labeling', 'matching'],
    required: true
  },
  options: [{
    type: String
  }],
  imageUrl: {
    type: String,
    required: false
  },
  correctAnswer: {
    type: String,
    required: true
  }
});

const PartSchema = new mongoose.Schema({
  partNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  title: {
    type: String,
    required: true
  },
  audioUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  questions: [QuestionSchema]
});

const ListeningTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  parts: [PartSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('ListeningTest', ListeningTestSchema);