const mongoose = require('mongoose');

/**
 * AILog – one document per Gemini API call.
 * Tracks token usage and estimated cost for the AI Manager dashboard.
 */
const AILogSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      // e.g. "Extract Reading", "Extract Writing", "Extract Speaking",
      //      "Extract Listening", "Grade Writing", "Grade Speaking"
    },
    model: {
      type: String,
      default: '',
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    // Estimated cost in USD. Caller is responsible for calculating this.
    // gemini-2.5-flash pricing (as of 2025): ~$0.075 / 1M input, ~$0.30 / 1M output
    estimatedCost: {
      type: Number,
      default: 0,
    },
    // Optional: reference to the created resource (e.g. the test _id)
    resourceId: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Index for efficient dashboard queries (recent logs, per-service aggregation)
AILogSchema.index({ createdAt: -1 });
AILogSchema.index({ service: 1, createdAt: -1 });

module.exports = mongoose.model('AILog', AILogSchema);
