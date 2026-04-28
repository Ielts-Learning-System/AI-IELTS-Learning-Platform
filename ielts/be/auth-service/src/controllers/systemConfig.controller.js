const SystemConfig = require('../models/SystemConfig');

/**
 * GET /api/admin/system-config
 * Returns config WITHOUT the API key value (masked).
 * Admin-only.
 */
const getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'global' });
    if (!config) {
      return res.status(200).json({
        geminiApiKey: '',
        readingPromptTemplate: '',
        listeningPromptTemplate: '',
      });
    }
    res.status(200).json({
      // Never expose the raw key to the client; just tell the UI whether one is set
      geminiApiKeySet: config.readingPromptTemplate !== undefined,
      readingPromptTemplate: config.readingPromptTemplate,
      listeningPromptTemplate: config.listeningPromptTemplate,
      updatedAt: config.updatedAt,
    });
  } catch (err) {
    console.error('[SystemConfig] getSystemConfig error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/admin/system-config
 * Updates config. Only sends geminiApiKey to DB when the field is non-empty
 * (allows partial updates without wiping the stored key).
 * Admin-only.
 */
const updateSystemConfig = async (req, res) => {
  try {
    const { geminiApiKey, readingPromptTemplate, listeningPromptTemplate } = req.body;

    const setFields = {};
    if (geminiApiKey !== undefined && geminiApiKey.trim() !== '') {
      setFields.geminiApiKey = geminiApiKey.trim();
    }
    if (readingPromptTemplate !== undefined) {
      setFields.readingPromptTemplate = readingPromptTemplate;
    }
    if (listeningPromptTemplate !== undefined) {
      setFields.listeningPromptTemplate = listeningPromptTemplate;
    }

    const updated = await SystemConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: setFields },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Configuration updated successfully',
      geminiApiKeySet: !!updated.geminiApiKey,
      readingPromptTemplate: updated.readingPromptTemplate,
      listeningPromptTemplate: updated.listeningPromptTemplate,
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
 * Returns the raw API key (must only be accessible inside the Docker network).
 * Protected by a shared INTERNAL_SECRET header instead of JWT.
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
      // No config document yet – return safe empty values so the ai-service
      // can surface a clean "not configured" 503 instead of a confusing 502.
      return res.status(200).json({
        geminiApiKey: '',
        readingPromptTemplate: '',
        listeningPromptTemplate: '',
      });
    }

    res.status(200).json({
      geminiApiKey: config.geminiApiKey,
      readingPromptTemplate: config.readingPromptTemplate,
      listeningPromptTemplate: config.listeningPromptTemplate,
    });
  } catch (err) {
    console.error('[SystemConfig] getInternalConfig error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getSystemConfig, updateSystemConfig, getInternalConfig };
