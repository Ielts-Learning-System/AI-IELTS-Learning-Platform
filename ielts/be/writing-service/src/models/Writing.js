const mongoose = require('mongoose');

const SampleInfoSchema = new mongoose.Schema(
  {
    bandScore: { type: Number, required: true },
    contentHtml: { type: String, required: true },
    author: { type: String, default: 'IELTS Master' },
  },
  { _id: true, timestamps: true }
);

const WritingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['Task 1', 'Task 2'], required: true },
    category: { type: String, default: 'Mixed' },
    timeLimit: { type: Number },
    contentHtml: { type: String, required: true },
    isSample: { type: Boolean, default: false },
    // Legacy single sampleInfo kept for backward compat (read-only, no longer written)
    sampleInfo: { type: Object, default: undefined },
    // New: list of sample essays attached to this prompt
    sampleInfos: { type: [SampleInfoSchema], default: [] },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Default timeLimit based on type
WritingSchema.pre('validate', function () {
  if (this.timeLimit == null) {
    this.timeLimit = this.type === 'Task 1' ? 20 : 40;
  }
});

module.exports = mongoose.model('Writing', WritingSchema);
