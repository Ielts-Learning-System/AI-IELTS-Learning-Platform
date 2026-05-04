const ApiKey = require('../models/ApiKey');

// ── helpers ──────────────────────────────────────────────────────────────────

/** Mask a key string so only the first 8 chars are visible, rest replaced by *** */
function maskKey(keyString) {
  if (!keyString || keyString.length < 10) return '***';
  return keyString.slice(0, 8) + '***' + keyString.slice(-4);
}

/** Ensure exactly one ACTIVE key exists after a status change. */
async function _ensureOneActive() {
  const activeCount = await ApiKey.countDocuments({ status: 'ACTIVE' });
  if (activeCount === 0) {
    // Promote the oldest AVAILABLE key
    const next = await ApiKey.findOneAndUpdate(
      { status: 'AVAILABLE' },
      { status: 'ACTIVE' },
      { sort: { createdAt: 1 }, new: true }
    );
    return next;
  }
  return null;
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/api-keys
 * Returns all keys with masked keyString.
 */
const listApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find().select('+keyString').sort({ createdAt: 1 });
    const masked = keys.map((k) => ({
      _id: k._id,
      label: k.label,
      maskedKey: maskKey(k.keyString),
      status: k.status,
      usageCount: k.usageCount,
      lastUsedAt: k.lastUsedAt,
      exhaustedAt: k.exhaustedAt,
      createdAt: k.createdAt,
    }));
    res.json({ success: true, data: masked });
  } catch (err) {
    console.error('[ApiKey] listApiKeys error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/admin/api-keys/bulk
 * Body: { keys: "AIza...,AIzb...,AIzc..." }   (comma-separated)
 * Inserts each unique key. Already-existing keys are silently skipped.
 * The first key gets ACTIVE status if no ACTIVE key exists yet.
 */
const bulkAddApiKeys = async (req, res) => {
  try {
    const raw = String(req.body?.keys || '').trim();
    if (!raw) return res.status(400).json({ message: '"keys" field is required.' });

    const incoming = raw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (incoming.length === 0) {
      return res.status(400).json({ message: 'No valid keys found in input.' });
    }

    const activeExists = (await ApiKey.countDocuments({ status: 'ACTIVE' })) > 0;
    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < incoming.length; i++) {
      const keyString = incoming[i];
      const exists = await ApiKey.exists({ keyString });
      if (exists) { skippedCount++; continue; }

      // First key ever (no ACTIVE exists) → make it ACTIVE
      const status = !activeExists && i === 0 ? 'ACTIVE' : 'AVAILABLE';
      await ApiKey.create({ keyString, status });
      addedCount++;
    }

    res.status(201).json({
      success: true,
      message: `Added ${addedCount} key(s). Skipped ${skippedCount} duplicate(s).`,
      addedCount,
      skippedCount,
    });
  } catch (err) {
    console.error('[ApiKey] bulkAddApiKeys error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /api/admin/api-keys/:id
 * Removes a key. If the deleted key was ACTIVE, the next AVAILABLE key is promoted.
 */
const deleteApiKey = async (req, res) => {
  try {
    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) return res.status(404).json({ message: 'Key not found.' });

    if (key.status === 'ACTIVE') {
      await _ensureOneActive();
    }

    res.json({ success: true, message: 'Key deleted.' });
  } catch (err) {
    console.error('[ApiKey] deleteApiKey error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/admin/api-keys/reset-quotas
 * Sets all EXHAUSTED keys back to AVAILABLE.
 * Also promotes one to ACTIVE if none is currently ACTIVE.
 */
const resetAllQuotas = async (req, res) => {
  try {
    const result = await ApiKey.updateMany(
      { status: 'EXHAUSTED' },
      { $set: { status: 'AVAILABLE', exhaustedAt: null } }
    );

    await _ensureOneActive();

    res.json({
      success: true,
      message: `Reset ${result.modifiedCount} exhausted key(s) to AVAILABLE.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error('[ApiKey] resetAllQuotas error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Internal endpoint called by ai-service ────────────────────────────────────

/**
 * GET /api/internal/api-keys/active
 * Returns the current ACTIVE key string for the ai-service.
 * Protected by x-internal-secret header.
 */
const getActiveKey = async (req, res) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== process.env.INTERNAL_SECRET) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const key = await ApiKey.findOne({ status: 'ACTIVE' }).select('+keyString');
    if (!key) {
      return res.status(503).json({
        message: 'No active Gemini API key configured. Please add keys in Admin → AI Manager.',
      });
    }

    res.json({ keyId: key._id, keyString: key.keyString });
  } catch (err) {
    console.error('[ApiKey] getActiveKey error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/internal/api-keys/rotate
 * Body: { exhaustedKeyId: "<ObjectId string>" }
 *
 * 1. Marks the exhausted key's status as EXHAUSTED (idempotent – safe to call
 *    multiple times).
 * 2. Promotes the oldest AVAILABLE key to ACTIVE.
 * 3. Returns the new ACTIVE key string so ai-service can retry immediately.
 *
 * Protected by x-internal-secret header.
 */
const rotateKey = async (req, res) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== process.env.INTERNAL_SECRET) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { exhaustedKeyId } = req.body || {};

    // Mark exhausted key
    if (exhaustedKeyId) {
      await ApiKey.findByIdAndUpdate(exhaustedKeyId, {
        $set: { status: 'EXHAUSTED', exhaustedAt: new Date() },
      });
    }

    // Find & promote next AVAILABLE key
    const nextKey = await ApiKey.findOneAndUpdate(
      { status: 'AVAILABLE' },
      { $set: { status: 'ACTIVE' } },
      { sort: { createdAt: 1 }, new: true }
    ).select('+keyString');

    if (!nextKey) {
      return res.status(503).json({
        message: 'Tất cả API key đã hết quota. Vui lòng thêm key mới hoặc chờ đến 00:00 để quota tự động reset.',
        allExhausted: true,
      });
    }

    res.json({ keyId: nextKey._id, keyString: nextKey.keyString });
  } catch (err) {
    console.error('[ApiKey] rotateKey error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  listApiKeys,
  bulkAddApiKeys,
  deleteApiKey,
  resetAllQuotas,
  getActiveKey,
  rotateKey,
};
