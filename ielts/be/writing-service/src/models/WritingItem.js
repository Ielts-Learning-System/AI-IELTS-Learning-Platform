const mongoose = require('mongoose');

const SampleInfoSchema = new mongoose.Schema(
  {
    bandScore: { type: Number, required: true },
    content: { type: String, required: true },
    author: { type: String, default: 'IELTS Master' },
  },
  { _id: false }
);

const WritingItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['Task 1', 'Task 2'], required: true },
    category: { type: String },
    timeLimit: { type: Number },
    prompt: { type: String, required: true },
    imageUrls: [{ type: String }],
    isSample: { type: Boolean, default: false },
    sampleInfo: { type: SampleInfoSchema, default: undefined },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Default timeLimit based on type
WritingItemSchema.pre('validate', function () {
  if (this.timeLimit == null) {
    this.timeLimit = this.type === 'Task 1' ? 20 : 40;
  }
});

module.exports = mongoose.model('WritingItem', WritingItemSchema);
