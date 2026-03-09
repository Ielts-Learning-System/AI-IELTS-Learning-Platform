const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  taskNumber: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  minWords: {
    type: Number,
    required: true,
    min: 150,
    max: 250
  }
});

const WritingTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  tasks: [TaskSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('WritingTest', WritingTestSchema);