// patch-valid-until.js
// Migration script to backfill validUntil field for all subscriptions
// and remove the legacy plan field
require('dotenv').config();
const mongoose = require('mongoose');

// --- Load models ---
const Subscription = require('./src/models/Subscription');
const Plan = require('./src/models/Plan');

// --- MongoDB connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ielts_billing';

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✓ Connected to MongoDB');

  // Fetch all subscriptions, populate planId to get durationMonths
  const subs = await Subscription.find({}).populate('planId').lean();
  console.log(`Found ${subs.length} total subscriptions`);

  let updated = 0;
  let skipped = 0;

  for (const sub of subs) {
    // Only patch if validUntil is missing and planId is populated with durationMonths
    if (!sub.validUntil && sub.planId && typeof sub.planId.durationMonths === 'number') {
      const createdAt = sub.createdAt ? new Date(sub.createdAt) : null;
      if (!createdAt || isNaN(createdAt)) {
        console.warn(`  ⚠ Skipping sub ${sub._id}: invalid createdAt`);
        skipped++;
        continue;
      }

      // Calculate validUntil by adding durationMonths to createdAt
      const validUntil = new Date(createdAt);
      validUntil.setMonth(validUntil.getMonth() + sub.planId.durationMonths);

      // Update: set validUntil, unset legacy plan
      await Subscription.updateOne(
        { _id: sub._id },
        {
          $set: { validUntil },
          $unset: { plan: "" }
        }
      );
      updated++;
      console.log(
        `  ✓ Updated sub ${sub._id}: validUntil=${validUntil.toISOString()}, planId=${sub.planId._id}, removed legacy plan field`
      );
    } else if (sub.validUntil && sub.plan) {
      // Has validUntil but still has legacy plan field - remove it
      await Subscription.updateOne(
        { _id: sub._id },
        { $unset: { plan: "" } }
      );
      updated++;
      console.log(`  ✓ Cleaned up sub ${sub._id}: removed legacy plan field`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✓ Migration complete.`);
  console.log(`  Updated: ${updated} subscriptions`);
  console.log(`  Skipped: ${skipped} subscriptions (already have validUntil or no planId)`);

  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB');
  process.exit(0);
}

main().catch(err => {
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
});
