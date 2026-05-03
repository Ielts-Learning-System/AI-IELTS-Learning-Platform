const SystemConfig = require('../models/SystemConfig');
const AILog = require('../models/AILog');
const crypto = require('crypto');

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

const DEFAULT_MONTHLY_QUOTA = Number(process.env.DEFAULT_MONTHLY_TOKEN_QUOTA || 1_000_000);
const ACTIVE_KEY_TEAM = String(process.env.GEMINI_ACTIVE_KEY_TEAM || 'default').trim() || 'default';

function parseTeamQuotaMap() {
  const raw = String(process.env.GEMINI_TEAM_MONTHLY_QUOTAS || '').trim();
  const map = {};

  if (!raw) {
    map[ACTIVE_KEY_TEAM] = DEFAULT_MONTHLY_QUOTA;
    map.default = map.default || DEFAULT_MONTHLY_QUOTA;
    return map;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [team, quota] of Object.entries(parsed)) {
        const q = Number(quota);
        if (!Number.isFinite(q) || q <= 0) continue;
        const key = String(team || '').trim();
        if (!key) continue;
        map[key] = Math.floor(q);
      }
    }
  } catch (err) {
    console.warn('[SystemConfig] Invalid GEMINI_TEAM_MONTHLY_QUOTAS JSON. Falling back to defaults.');
  }

  if (!map[ACTIVE_KEY_TEAM]) map[ACTIVE_KEY_TEAM] = DEFAULT_MONTHLY_QUOTA;
  if (!map.default) map.default = DEFAULT_MONTHLY_QUOTA;
  return map;
}

function resolveQuotaBaseline(requestedTeam) {
  const quotaByTeam = parseTeamQuotaMap();
  const requested = String(requestedTeam || '').trim();
  const team = requested && quotaByTeam[requested]
    ? requested
    : (quotaByTeam[ACTIVE_KEY_TEAM] ? ACTIVE_KEY_TEAM : 'default');
  const monthlyTokenQuota = Number(quotaByTeam[team] || DEFAULT_MONTHLY_QUOTA);
  const quotaOptions = Object.entries(quotaByTeam).map(([key, value]) => ({
    team: key,
    monthlyTokenQuota: Number(value),
  }));

  return {
    keyTeam: team,
    monthlyTokenQuota,
    quotaOptions,
  };
}

function calcCost(inputTokens = 0, outputTokens = 0) {
  return (
    (inputTokens  / 1_000_000) * INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_M
  );
}

function buildKeyFingerprint(apiKey = '') {
  const key = String(apiKey || '').trim();
  if (!key) return '';
  const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 10);
  return `key_${hash}`;
}

/**
 * GET /api/admin/system-config
 * Returns config WITHOUT the API key value (masked).
 * Admin-only.
 */
const getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'global' }).select('+geminiApiKey');
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    if (!config) {
      const baseline = resolveQuotaBaseline(ACTIVE_KEY_TEAM);
      return res.status(200).json({
        geminiApiKeySet: false,
        keyTeam: baseline.keyTeam,
        keyFingerprint: '',
        quotaOptions: baseline.quotaOptions,
        keyQuotaStatus: 'unknown',
        keyQuotaMessage: '',
        readingPromptTemplate: '',
        listeningPromptTemplate: '',
        writingExtractPrompt: '',
        speakingExtractPrompt: '',
        writingGradingPrompt: '',
        speakingGradingPrompt: '',
        monthlyTokenQuota: baseline.monthlyTokenQuota,
        monthlyTokensUsed: 0,
        availableTokens: baseline.monthlyTokenQuota,
        quotaResetMonth: currentMonth,
      });
    }

    const baseline = resolveQuotaBaseline(config.keyTeam);
    const shouldResetMonth = config.quotaResetMonth !== currentMonth;
    const shouldSyncBaseline = Number(config.monthlyTokenQuota || 0) !== Number(baseline.monthlyTokenQuota);
    const shouldSyncTeam = String(config.keyTeam || '') !== baseline.keyTeam;

    if (shouldResetMonth || shouldSyncBaseline || shouldSyncTeam) {
      config.keyTeam = baseline.keyTeam;
      config.monthlyTokenQuota = baseline.monthlyTokenQuota;
    }
    if (shouldResetMonth) {
      config.monthlyTokensUsed = 0;
      config.quotaResetMonth = currentMonth;
    }

    if (shouldResetMonth || shouldSyncBaseline || shouldSyncTeam) {
      await config.save();
    }

    res.status(200).json({
      geminiApiKeySet: !!config.geminiApiKey,
      keyTeam: config.keyTeam || baseline.keyTeam,
      keyFingerprint: config.keyFingerprint || '',
      quotaOptions: baseline.quotaOptions,
      keyQuotaStatus: config.keyQuotaStatus || 'unknown',
      keyQuotaMessage: config.keyQuotaMessage || '',
      readingPromptTemplate: config.readingPromptTemplate,
      listeningPromptTemplate: config.listeningPromptTemplate,
      writingExtractPrompt: config.writingExtractPrompt,
      speakingExtractPrompt: config.speakingExtractPrompt,
      writingGradingPrompt: config.writingGradingPrompt,
      speakingGradingPrompt: config.speakingGradingPrompt,
      monthlyTokenQuota: config.monthlyTokenQuota,
      monthlyTokensUsed: config.monthlyTokensUsed,
      availableTokens: Math.max(0, Number(config.monthlyTokenQuota || 0) - Number(config.monthlyTokensUsed || 0)),
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
      keyTeam,
      readingPromptTemplate,
      listeningPromptTemplate,
      writingExtractPrompt,
      speakingExtractPrompt,
      writingGradingPrompt,
      speakingGradingPrompt,
    } = req.body;

    const existing = await SystemConfig.findOne({ key: 'global' }).select('+geminiApiKey');
    const setFields = {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    const requestedTeam = keyTeam !== undefined ? String(keyTeam || '').trim() : (existing?.keyTeam || ACTIVE_KEY_TEAM);
    const baseline = resolveQuotaBaseline(requestedTeam);

    setFields.keyTeam = baseline.keyTeam;
    setFields.monthlyTokenQuota = baseline.monthlyTokenQuota;

    if (geminiApiKey !== undefined && geminiApiKey.trim() !== '') {
      const nextKey = geminiApiKey.trim();
      setFields.geminiApiKey = nextKey;
      setFields.keyFingerprint = buildKeyFingerprint(nextKey);
      setFields.keyQuotaStatus = 'available';
      setFields.keyQuotaMessage = '';
      // New key should start quota tracking from fresh baseline for this month.
      setFields.monthlyTokensUsed = 0;
      setFields.quotaResetMonth = currentMonth;
    }
    for (const field of PROMPT_FIELDS) {
      if (req.body[field] !== undefined) {
        setFields[field] = req.body[field];
      }
    }
    const updated = await SystemConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: setFields },
      { upsert: true, new: true, runValidators: true }
    ).select('+geminiApiKey');

    res.status(200).json({
      message: 'Configuration updated successfully',
      geminiApiKeySet: !!updated.geminiApiKey,
      keyTeam: updated.keyTeam || baseline.keyTeam,
      keyFingerprint: updated.keyFingerprint || '',
      quotaOptions: baseline.quotaOptions,
      keyQuotaStatus: updated.keyQuotaStatus || 'unknown',
      keyQuotaMessage: updated.keyQuotaMessage || '',
      readingPromptTemplate: updated.readingPromptTemplate,
      listeningPromptTemplate: updated.listeningPromptTemplate,
      writingExtractPrompt: updated.writingExtractPrompt,
      speakingExtractPrompt: updated.speakingExtractPrompt,
      writingGradingPrompt: updated.writingGradingPrompt,
      speakingGradingPrompt: updated.speakingGradingPrompt,
      monthlyTokenQuota: updated.monthlyTokenQuota,
      monthlyTokensUsed: updated.monthlyTokensUsed,
      availableTokens: Math.max(0, Number(updated.monthlyTokenQuota || 0) - Number(updated.monthlyTokensUsed || 0)),
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
 * POST /api/internal/system-config/quota-exhausted
 * Internal endpoint called by ai-service when Gemini returns quota-exhausted.
 */
const markQuotaExhausted = async (req, res) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== process.env.INTERNAL_SECRET) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const message = String(req.body?.message || '').slice(0, 500);

    const updated = await SystemConfig.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          keyQuotaStatus: 'exhausted',
          keyQuotaMessage: message,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      keyQuotaStatus: updated?.keyQuotaStatus || 'exhausted',
      keyQuotaMessage: updated?.keyQuotaMessage || message,
    });
  } catch (err) {
    console.error('[SystemConfig] markQuotaExhausted error:', err);
    return res.status(500).json({ message: 'Internal server error' });
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

    let keyMeta = { keyTeam: 'default', keyFingerprint: '' };
    try {
      const currentConfig = await SystemConfig.findOne({ key: 'global' })
        .select('keyTeam keyFingerprint')
        .lean();
      if (currentConfig) {
        keyMeta = {
          keyTeam: currentConfig.keyTeam || 'default',
          keyFingerprint: currentConfig.keyFingerprint || '',
        };
      }
    } catch (metaErr) {
      console.error('[AILog] key metadata read failed:', metaErr);
    }

    const log = await AILog.create({
      service,
      model: model || '',
      inputTokens: input,
      outputTokens: output,
      totalTokens: total,
      estimatedCost: cost,
      resourceId: resourceId || '',
      keyTeam: keyMeta.keyTeam,
      keyFingerprint: keyMeta.keyFingerprint,
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
  markQuotaExhausted,
  createAILog,
  getAILogs,
};

