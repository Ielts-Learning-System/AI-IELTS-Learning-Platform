'use strict';

/**
 * verify-dbs.js
 *
 * Connects to every per-service Atlas database and counts documents in
 * key collections, proving the Database-per-Service migration is complete
 * and data is seated correctly.
 *
 * Run from /be directory:
 *   node verify-dbs.js
 *
 * Prerequisites: .env in /be (for the MONGO_URI_* vars) must be readable.
 * The script does NOT depend on mongoose — raw driver only, no schemas.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// ── Colour helpers ───────────────────────────────────────────────────────────
const C = '\x1b[36m'; // cyan
const G = '\x1b[32m'; // green
const Y = '\x1b[33m'; // yellow
const R = '\x1b[31m'; // red
const X = '\x1b[0m';  // reset

// ── Database / collection manifest ──────────────────────────────────────────
// [label, env var, [ ...collections to count ]]
const MANIFEST = [
  {
    label: 'Auth DB',
    uri: process.env.MONGO_URI_AUTH,
    collections: ['users'],
  },
  {
    label: 'Billing DB',
    uri: process.env.MONGO_URI_BILLING,
    collections: ['plans', 'subscriptions'],
  },
  {
    label: 'Payment DB',
    uri: process.env.MONGO_URI_PAYMENT,
    collections: ['transactions'],
  },
  {
    label: 'Reading DB',
    uri: process.env.MONGO_URI_READING,
    collections: ['readingtests', 'readingattempts'],
  },
  {
    label: 'Listening DB',
    uri: process.env.MONGO_URI_LISTENING,
    collections: ['listeningtests', 'listeningattempts'],
  },
  {
    label: 'Writing DB',
    uri: process.env.MONGO_URI_WRITING,
    collections: ['writings', 'writingsubmissions'],
  },
  {
    label: 'Speaking DB',
    uri: process.env.MONGO_URI_SPEAKING,
    collections: ['speakingtests', 'speakingsubmissions'],
  },
  {
    label: 'Notification DB',
    uri: process.env.MONGO_URI_NOTIFICATION,
    collections: ['notificationlogs', 'notificationpreferences', 'pushsubscriptions'],
  },
  {
    label: 'Lesson DB',
    uri: process.env.MONGO_URI_LESSON,
    collections: ['lessons'],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
async function verifyDatabase({ label, uri, collections }) {
  if (!uri) {
    console.log(`  ${Y}⚠  [${label}]${X} — URI not set, skipping`);
    return { label, ok: false, reason: 'URI not set' };
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  let ok = true;

  try {
    await client.connect();
    const db = client.db();
    console.log(`\n  ${G}✔${X} ${C}${label}${X}  →  "${db.databaseName}"`);

    const existingCollections = new Set(
      (await db.listCollections().toArray()).map((c) => c.name)
    );

    for (const col of collections) {
      if (!existingCollections.has(col)) {
        console.log(`      ${Y}⚠  ${col}${X}: collection not found`);
        ok = false;
        continue;
      }
      const count = await db.collection(col).countDocuments();
      const badge = count > 0 ? G : Y;
      console.log(`      ${badge}${col}${X}: ${count} document(s)`);
      if (count === 0) ok = false;
    }

    return { label, ok };
  } catch (err) {
    console.log(`  ${R}✖  [${label}]${X} — Connection failed: ${err.message}`);
    return { label, ok: false, reason: err.message };
  } finally {
    await client.close().catch(() => {});
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C}╔══════════════════════════════════════════════════════════╗${X}`);
  console.log(`${C}║     IELTS — Database-per-Service Verification            ║${X}`);
  console.log(`${C}╚══════════════════════════════════════════════════════════╝${X}`);
  console.log('');

  const results = [];
  for (const entry of MANIFEST) {
    results.push(await verifyDatabase(entry));
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log(`${C}══════════════════════  SUMMARY  ══════════════════════════${X}`);
  let allPassed = true;
  for (const { label, ok, reason } of results) {
    if (ok) {
      console.log(`  ${G}[PASSED]${X}  ${label}`);
    } else {
      console.log(`  ${R}[FAILED]${X}  ${label}${reason ? ` — ${reason}` : ' — one or more collections empty/missing'}`);
      allPassed = false;
    }
  }
  console.log('');
  if (allPassed) {
    console.log(`${G}✔  All databases verified. Migration is complete.${X}`);
  } else {
    console.log(`${Y}⚠  Some databases have issues. Review output above.${X}`);
    process.exitCode = 1;
  }
  console.log('');
}

main().catch((err) => {
  console.error(`${R}Fatal error:${X}`, err);
  process.exit(1);
});
