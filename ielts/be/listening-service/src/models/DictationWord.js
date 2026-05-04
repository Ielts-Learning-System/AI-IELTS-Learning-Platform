const mongoose = require('mongoose');

const DictationWordSchema = new mongoose.Schema(
  {
    transcript: {
      type: String,
      required: [true, 'transcript is required'],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    speaker: {
      type: String,
      trim: true,
      default: 'unknown',
    },
    audioUrl: {
      type: String,
      required: [true, 'audioUrl is required'],
    },
    // Stores the Cloudinary public_id for reliable deletion.
    // Null for records migrated from the local JSON file.
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'cloudinary',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DictationWord', DictationWordSchema);
