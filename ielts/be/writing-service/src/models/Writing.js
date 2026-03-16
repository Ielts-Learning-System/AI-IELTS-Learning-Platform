const mongoose = require('mongoose');

const SampleInfoSchema = new mongoose.Schema(
  {
    bandScore: { type: Number, required: true },
    contentHtml: { type: String, required: true },
    author: { type: String, default: 'IELTS Master' },
  },
  { _id: false }
);

const WritingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['Task 1', 'Task 2'], required: true },
    category: { type: String, default: 'Mixed' },
    timeLimit: { type: Number },
    contentHtml: { type: String, required: true },
    isSample: { type: Boolean, default: false },
    sampleInfo: { type: SampleInfoSchema, default: undefined },
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
