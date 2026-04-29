const SystemConfig = require('../models/SystemConfig');
const AILog = require('../models/AILog');

// ── Prompt field list (keeps controller and schema in sync) ───────────────
const PROMPT_FIELDS = [
  'readingPromptTemplate',
  'listeningPromptTemplate',
  'writingExtractPrompt',
  'speakingExtractPrompt',
  'writingGradingPrompt',
  'speakingGradingPrompt',
];

// ── Cost calculation helper ───────────────────────────────────────────────
// gemini-2.5-flash pricing (USD per 1M tokens, approximate)
const INPUT_COST_PER_M  = 0.075;
const OUTPUT_COST_PER_M = 0.30;

function calcCost(inputTokens = 0, outputTokens = 0) {
  return (
    (inputTokens  / 1_000_000) * INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_M
  );
}

/**
 * GET /api/admin/system-config
 * Returns config WITHOUT the API key value (masked).
 * Admin-only.
 */
const getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'global' }).select('+geminiApiKey');
    if (!config) {
      return res.status(200).json({
        geminiApiKeySet: false,
        readingPromptTemplate: '',
        listeningPromptTemplate: '',
        writingExtractPrompt: '',
        speakingExtractPrompt: '',
        writingGradingPrompt: '',
        speakingGradingPrompt: '',
        monthlyTokenQuota: 1_000_000,
        monthlyTokensUsed: 0,
        quotaResetMonth: '',
      });
    }

    // Auto-reset monthly counter if the month has rolled over
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    if (config.quotaResetMonth !== currentMonth) {
      config.monthlyTokensUsed = 0;
      config.quotaResetMonth = currentMonth;
      await config.save();
    }

    res.status(200).json({
      geminiApiKeySet: !!config.geminiApiKey,
      readingPromptTemplate: config.readingPromptTemplate,
      listeningPromptTemplate: config.listeningPromptTemplate,
      writingExtractPrompt: config.writingExtractPrompt,
      speakingExtractPrompt: config.speakingExtractPrompt,
      writingGradingPrompt: config.writingGradingPrompt,
      speakingGradingPrompt: config.speakingGradingPrompt,
      monthlyTokenQuota: config.monthlyTokenQuota,
      monthlyTokensUsed: config.monthlyTokensUsed,
      quotaResetMonth: config.quotaResetMonth,
      updatedAt: config.updatedAt,
    });
  } catch (err) {
    console.error('[SystemConfig] getSystemConfig error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/admin/system-config
 * Updates config. Only sends geminiApiKey to DB when the field is non-empty.
 * Admin-only.
 */
const updateSystemConfig = async (req, res) => {
  try {
    const {
      geminiApiKey,
      readingPromptTemplate,
      listeningPromptTemplate,
      writingExtractPrompt,
      speakingExtractPrompt,
      writingGradingPrompt,
      speakingGradingPrompt,
      monthlyTokenQuota,
    } = req.body;

    const setFields = {};
    if (geminiApiKey !== undefined && geminiApiKey.trim() !== '') {
      setFields.geminiApiKey = geminiApiKey.trim();
    }
    for (const field of PROMPT_FIELDS) {
      if (req.body[field] !== undefined) {
        setFields[field] = req.body[field];
      }
    }
    if (monthlyTokenQuota !== undefined && Number.isFinite(Number(monthlyTokenQuota))) {
      setFields.monthlyTokenQuota = Number(monthlyTokenQuota);
    }

    const updated = await SystemConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: setFields },
      { upsert: true, new: true, runValidators: true }
    ).select('+geminiApiKey');

    res.status(200).json({
      message: 'Configuration updated successfully',
      geminiApiKeySet: !!updated.geminiApiKey,
      readingPromptTemplate: updated.readingPromptTemplate,
      listeningPromptTemplate: updated.listeningPromptTemplate,
      writingExtractPrompt: updated.writingExtractPrompt,
      speakingExtractPrompt: updated.speakingExtractPrompt,
      writingGradingPrompt: updated.writingGradingPrompt,
      speakingGradingPrompt: updated.speakingGradingPrompt,
      monthlyTokenQuota: updated.monthlyTokenQuota,
      monthlyTokensUsed: updated.monthlyTokensUsed,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    console.error('[SystemConfig] updateSystemConfig error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/internal/system-config
 * Internal endpoint called by the ai-service.
 * Returns the raw API key + prompt overrides.
 * Protected by a shared INTERNAL_SECRET header.
 */
const getInternalConfig = async (req, res) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== process.env.INTERNAL_SECRET) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const config = await SystemConfig.findOne({ key: 'global' }).select(
      '+geminiApiKey'
    );
    if (!config) {
      return res.status(200).json({
        geminiApiKey: '',
        readingPromptTemplate: '',
        listeningPromptTemplate: '',
        writingExtractPrompt: '',
        speakingExtractPrompt: '',
        writingGradingPrompt: '',
        speakingGradingPrompt: '',
      });
    }

    res.status(200).json({
      geminiApiKey: config.geminiApiKey,
      readingPromptTemplate: config.readingPromptTemplate,
      listeningPromptTemplate: config.listeningPromptTemplate,
      writingExtractPrompt: config.writingExtractPrompt,
      speakingExtractPrompt: config.speakingExtractPrompt,
      writingGradingPrompt: config.writingGradingPrompt,
      speakingGradingPrompt: config.speakingGradingPrompt,
    });
  } catch (err) {
    console.error('[SystemConfig] getInternalConfig error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/admin/ai-logs
 * Record a single Gemini API usage event and increment the monthly quota counter.
 * Called by the frontend immediately after a successful AI extraction.
 * Admin or Teacher role required (validated by route middleware).
 */
const createAILog = async (req, res) => {
  try {
    const { service, model, inputTokens, outputTokens, totalTokens, resourceId } = req.body;

    if (!service) {
      return res.status(400).json({ message: 'service is required' });
    }

    const input  = Number(inputTokens)  || 0;
    const output = Number(outputTokens) || 0;
    const total  = Number(totalTokens)  || input + output;
    const cost   = calcCost(input, output);

    const log = await AILog.create({
      service,
      model: model || '',
      inputTokens: input,
      outputTokens: output,
      totalTokens: total,
      estimatedCost: cost,
      resourceId: resourceId || '',
    });

    // Update monthly quota counter (best-effort, no failure on error)
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await SystemConfig.findOneAndUpdate(
        { key: 'global' },
        {
          $inc: { monthlyTokensUsed: total },
          $setOnInsert: { quotaResetMonth: currentMonth },
        },
        { upsert: true }
      );
    } catch (quotaErr) {
      console.error('[AILog] quota update failed:', quotaErr);
    }

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    console.error('[AILog] createAILog error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/admin/ai-logs
 * Returns recent AI usage logs (latest 100), plus aggregated stats.
 * Admin-only.
 */
const getAILogs = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await AILog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ logs });
  } catch (err) {
    console.error('[AILog] getAILogs error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getSystemConfig,
  updateSystemConfig,
  getInternalConfig,
  createAILog,
  getAILogs,
};

