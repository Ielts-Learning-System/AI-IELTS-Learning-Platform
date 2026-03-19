const mongoose = require('mongoose');

const SpeakingTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    part1: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Part 1 must have at least one question',
      },
    },
    part2: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) => String(value || '').trim().length > 0,
        message: 'Part 2 cue card prompt is required',
      },
    },
    part3: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Part 3 must have at least one question',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpeakingTest', SpeakingTestSchema);
