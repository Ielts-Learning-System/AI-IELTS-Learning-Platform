const mongoose = require('mongoose');

/**
 * ApiKey – one document per Gemini API key in the pool.
 *
 * status enum:
 *   ACTIVE    – the key currently being used (exactly one at a time)
 *   AVAILABLE – in the pool, ready to become ACTIVE when needed
 *   EXHAUSTED – quota hit; will be reset to AVAILABLE by the nightly cron
 */
const apiKeySchema = new mongoose.Schema(
  {
    keyString: {
      type: String,
      required: true,
      unique: true,
      select: false, // never returned by default – must use .select('+keyString')
    },
    label: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'AVAILABLE', 'EXHAUSTED'],
      default: 'AVAILABLE',
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    exhaustedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiKey', apiKeySchema);
