#!/usr/bin/env node
/**
 * reset-api-key-quotas.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Nightly cron job – resets all EXHAUSTED Gemini API keys back to AVAILABLE.
 * Run this at 00:05 every day (a few minutes after midnight to let Gemini
 * quotas actually reset before we mark keys as available again).
 *
 * Suggested crontab entry (Linux/Mac):
 *   5 0 * * * /usr/bin/node /app/reset-api-key-quotas.js >> /var/log/key-reset.log 2>&1
 *
 * Or add to docker-compose as a one-off service, or use node-cron inside the
 * auth-service itself (see inline note at the bottom).
 *
 * Environment variables required (same as auth-service):
 *   MONGODB_URI   – MongoDB connection string
 */

'use strict';

require('dotenv').config();

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ielts';

// ── Inline schema (no need to import the full model) ─────────────────────────
const apiKeySchema = new mongoose.Schema(
  {
    keyString: { type: String, select: false },
    label:     { type: String },
    status:    { type: String, enum: ['ACTIVE', 'AVAILABLE', 'EXHAUSTED'] },
    usageCount:  { type: Number },
    lastUsedAt:  { type: Date },
    exhaustedAt: { type: Date },
  },
  { timestamps: true }
);
const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);

async function run() {
  console.log(`[${new Date().toISOString()}] Starting nightly API key quota reset…`);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  // 1. Reset all EXHAUSTED → AVAILABLE
  const resetResult = await ApiKey.updateMany(
    { status: 'EXHAUSTED' },
    { $set: { status: 'AVAILABLE', exhaustedAt: null } }
  );
  console.log(`Reset ${resetResult.modifiedCount} EXHAUSTED key(s) → AVAILABLE.`);

  // 2. Ensure exactly one ACTIVE key exists
  const activeCount = await ApiKey.countDocuments({ status: 'ACTIVE' });
  if (activeCount === 0) {
    const promoted = await ApiKey.findOneAndUpdate(
      { status: 'AVAILABLE' },
      { $set: { status: 'ACTIVE' } },
      { sort: { createdAt: 1 }, new: true }
    );
    if (promoted) {
      console.log(`Promoted key ${promoted._id} to ACTIVE (no active key existed).`);
    } else {
      console.warn('No AVAILABLE keys found – pool is empty!');
    }
  } else {
    console.log(`${activeCount} ACTIVE key(s) already present – no promotion needed.`);
  }

  await mongoose.disconnect();
  console.log(`[${new Date().toISOString()}] Quota reset complete.`);
}

run().catch((err) => {
  console.error('Quota reset failed:', err);
  process.exit(1);
});

/*
 * ─── Alternative: embed as a node-cron inside auth-service/server.js ─────────
 *
 * const cron = require('node-cron');
 * const { ApiKey } = require('./src/models/ApiKey');
 *
 * // Every day at 00:05
 * cron.schedule('5 0 * * *', async () => {
 *   try {
 *     const r = await ApiKey.updateMany({ status: 'EXHAUSTED' }, { $set: { status: 'AVAILABLE', exhaustedAt: null } });
 *     console.log(`[cron] Reset ${r.modifiedCount} exhausted keys.`);
 *     const activeCount = await ApiKey.countDocuments({ status: 'ACTIVE' });
 *     if (activeCount === 0) {
 *       await ApiKey.findOneAndUpdate({ status: 'AVAILABLE' }, { $set: { status: 'ACTIVE' } }, { sort: { createdAt: 1 } });
 *     }
 *   } catch (err) {
 *     console.error('[cron] Key quota reset failed:', err);
 *   }
 * });
 *
 * If using this option, run: npm install node-cron
 */
