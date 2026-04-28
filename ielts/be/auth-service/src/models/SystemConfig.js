const mongoose = require('mongoose');

/**
 * Singleton config document – always upserted with key = 'global'.
 * Sensitive fields (geminiApiKey) are excluded from default queries.
 */
const SystemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global',
      unique: true,
      immutable: true,
    },
    geminiApiKey: {
      type: String,
      default: '',
      select: false, // never returned unless explicitly projected
    },
    readingPromptTemplate: {
      type: String,
      default: '',
    },
    listeningPromptTemplate: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
