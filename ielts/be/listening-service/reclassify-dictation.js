/**
 * reclassify-dictation.js
 * -------------------------------------------------------------------
 * Reclassify DictationWord documents based on transcript word count:
 *   ≤  9 words → easy
 *   10–11 words → medium
 *   ≥ 12 words → hard
 *
 * Runs only on documents whose current difficulty is 'medium' that
 * should be promoted to 'hard' (long sentences were originally
 * mis-classified as medium when seeded from the JSON file).
 *
 * Usage:
 *   node reclassify-dictation.js
 *   node reclassify-dictation.js --dry-run   (preview only, no writes)
 * -------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DictationWord = require('./src/models/DictationWord');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Thresholds ────────────────────────────────────────────────────
const HARD_MIN_WORDS = 12;   // ≥ this → hard
const EASY_MAX_WORDS = 9;    // ≤ this → easy

function classifyByWordCount(transcript) {
  const words = transcript.trim().split(/\s+/).length;
  if (words <= EASY_MAX_WORDS) return 'easy';
  if (words >= HARD_MIN_WORDS) return 'hard';
  return 'medium';
}

async function reclassify() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) { console.error('❌  MONGO_URI not set'); process.exit(1); }

  await mongoose.connect(mongoUri);
  console.log('🍃  Connected to MongoDB');
  if (DRY_RUN) console.log('🔍  DRY-RUN mode — no writes will happen\n');

  const all = await DictationWord.find({}).lean();
  console.log(`📄  Total documents: ${all.length}`);

  const toUpdate = all.filter(doc => {
    const expected = classifyByWordCount(doc.transcript);
    return expected !== doc.difficulty;
  });

  if (toUpdate.length === 0) {
    console.log('✅  All documents already have the correct difficulty. Nothing to update.');
    await mongoose.disconnect();
    return;
  }

  // Preview
  console.log(`\n🔄  ${toUpdate.length} document(s) will be reclassified:\n`);
  const summary = { easy: 0, medium: 0, hard: 0 };
  for (const doc of toUpdate) {
    const newDiff = classifyByWordCount(doc.transcript);
    summary[newDiff] = (summary[newDiff] || 0) + 1;
    const words = doc.transcript.trim().split(/\s+/).length;
    console.log(
      `  [${doc.difficulty} → ${newDiff}]  ${words}w  "${doc.transcript.slice(0, 60)}${doc.transcript.length > 60 ? '…' : ''}"`
    );
  }
  console.log('\nSummary of changes:');
  Object.entries(summary).forEach(([d, n]) => console.log(`  → ${d}: +${n}`));

  if (DRY_RUN) {
    console.log('\n🔍  Dry run complete. Pass without --dry-run to apply.');
    await mongoose.disconnect();
    return;
  }

  // Apply
  let updated = 0;
  for (const doc of toUpdate) {
    const newDiff = classifyByWordCount(doc.transcript);
    await DictationWord.updateOne({ _id: doc._id }, { $set: { difficulty: newDiff } });
    updated++;
  }

  console.log(`\n✅  Updated ${updated} documents.`);
  await mongoose.disconnect();
  console.log('🔌  Done.');
}

reclassify().catch(err => { console.error('❌ ', err.message); process.exit(1); });
