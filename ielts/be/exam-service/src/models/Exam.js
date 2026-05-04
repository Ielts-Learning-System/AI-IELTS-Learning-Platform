const mongoose = require('mongoose');

const SkillDurationSchema = new mongoose.Schema(
  {
    reading: { type: Number, default: 60, min: 1 },
    listening: { type: Number, default: 30, min: 1 },
    writing: { type: Number, default: 60, min: 1 },
    speaking: { type: Number, default: 15, min: 1 },
  },
  { _id: false }
);

const SkillRefsSchema = new mongoose.Schema(
  {
    readingId: { type: String, required: true, trim: true },
    listeningId: { type: String, required: true, trim: true },
    writingId: { type: String, required: true, trim: true },
    speakingId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 165, min: 1 },
    globalLimitHours: { type: Number, default: 24, min: 1 },
    skillDurations: { type: SkillDurationSchema, default: () => ({}) },
    skillRefs: { type: SkillRefsSchema, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    createdBy: { type: String, required: true, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', ExamSchema);
