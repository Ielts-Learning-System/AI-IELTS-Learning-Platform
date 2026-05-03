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
    keyFingerprint: {
      type: String,
      default: '',
      trim: true,
    },
    keyTeam: {
      type: String,
      default: 'default',
      trim: true,
    },
    keyQuotaStatus: {
      type: String,
      enum: ['available', 'exhausted', 'unknown'],
      default: 'unknown',
    },
    keyQuotaMessage: {
      type: String,
      default: '',
    },
    // Per-feature system prompts (image-based legacy endpoints)
    readingPromptTemplate: {
      type: String,
      default: '',
    },
    listeningPromptTemplate: {
      type: String,
      default: '',
    },
    // PDF extraction prompts (stored in DB so admin can override via AIManager)
    writingExtractPrompt: {
      type: String,
      default: '',
    },
    speakingExtractPrompt: {
      type: String,
      default: '',
    },
    // Grading prompts
    writingGradingPrompt: {
      type: String,
      default: '',
    },
    speakingGradingPrompt: {
      type: String,
      default: '',
    },
    // Monthly quota tracking (token count)
    monthlyTokenQuota: {
      type: Number,
      default: 1_000_000, // 1M tokens default
    },
    monthlyTokensUsed: {
      type: Number,
      default: 0,
    },
    quotaResetMonth: {
      type: String, // "YYYY-MM"
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
