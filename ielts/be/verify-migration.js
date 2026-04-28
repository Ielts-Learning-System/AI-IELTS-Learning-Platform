'use strict';
/**
 * verify-migration.js
 *
 * Reads each service's own .env file (e.g. ./auth-service/.env) to obtain
 * the MONGO_URI it actually uses in production, then connects to that DB
 * and counts documents in every key collection.
 *
 * Rules:
 *   count > 0  → [OK]
 *   count = 0  → [WARNING] — possible migration failure
 *   URI absent → [SKIP]
 *   connection error → [ERROR]
 *
 * Run from the /be directory:
 *   node verify-migration.js
 *
 * No extra packages needed beyond what is already installed:
 *   mongodb   (transitive dep via services)
 *   dotenv    (already in auth-service / billing-service)
 */

const fs   = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// ── ANSI colour helpers ──────────────────────────────────────────────────────
const C   = '\x1b[36m';   // cyan
const G   = '\x1b[32m';   // green
const Y   = '\x1b[33m';   // yellow
const R   = '\x1b[31m';   // red
const B   = '\x1b[1m';    // bold
const DIM = '\x1b[2m';
const X   = '\x1b[0m';

// ── Utility: read MONGO_URI from a service's .env without polluting process.env
function readMongoUri(relativeEnvPath) {
  const fullPath = path.resolve(__dirname, relativeEnvPath);
  if (!fs.existsSync(fullPath)) return null;
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  return parsed.MONGO_URI || null;
}

// ── Migration manifest ───────────────────────────────────────────────────────
// Each entry: { label, envFile, collections: [{ name, warnIfEmpty }] }
const MANIFEST = [
  {
    label:   'Auth DB          (ielts_auth_db)',
    envFile: 'auth-service/.env',
    collections: [
      { name: 'users', warnIfEmpty: true },
    ],
  },
  {
    label:   'Billing DB       (ielts_billing_db)',
    envFile: 'billing-service/.env',
    collections: [
      { name: 'plans',         warnIfEmpty: true  },
      { name: 'subscriptions', warnIfEmpty: false }, // may be 0 if no users subscribed yet
    ],
  },
  {
    label:   'Payment DB       (ielts_payment_db)',
    envFile: 'payment-service/.env',
    collections: [
      { name: 'transactions', warnIfEmpty: false },
    ],
  },
  {
    label:   'Reading DB       (ielts_reading_db)',
    envFile: 'reading-service/.env',
    collections: [
      { name: 'readingtests',    warnIfEmpty: true  },
      { name: 'readingattempts', warnIfEmpty: false },
    ],
  },
  {
    label:   'Listening DB     (ielts_listening_db)',
    envFile: 'listening-service/.env',
    collections: [
      { name: 'listeningtests',    warnIfEmpty: true  },
      { name: 'listeningattempts', warnIfEmpty: false },
    ],
  },
  {
    label:   'Writing DB       (ielts_writing_db)',
    envFile: 'writing-service/.env',
    collections: [
      { name: 'writings',           warnIfEmpty: true  },
      { name: 'writingsubmissions', warnIfEmpty: false },
    ],
  },
  {
    label:   'Speaking DB      (ielts_speaking_db)',
    envFile: 'speaking-service/.env',
    collections: [
      { name: 'speakingtests',       warnIfEmpty: true  },
      { name: 'speakingsubmissions', warnIfEmpty: false },
    ],
  },
  {
    label:   'Notification DB  (ielts_notification_db)',
    envFile: 'notification-service/.env',
    collections: [
      { name: 'notificationpreferences', warnIfEmpty: false },
      { name: 'notificationlogs',        warnIfEmpty: false },
      { name: 'pushsubscriptions',       warnIfEmpty: false },
    ],
  },
  {
    label:   'Lesson DB        (ielts_lesson_db)',
    envFile: 'lesson-service/.env',
    collections: [
      { name: 'lessons', warnIfEmpty: true },
    ],
  },
];

// ── Core verification function ───────────────────────────────────────────────
async function verifyService({ label, envFile, collections }) {
  const uri = readMongoUri(envFile);

  if (!uri) {
    console.log(`\n  ${DIM}[SKIP]${X}   ${B}${label}${X}`);
    console.log(`           ${DIM}${envFile} not found or MONGO_URI not set${X}`);
    return { label, status: 'skip', warnings: 0, errors: 0 };
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
  let warnings = 0;
  let errors   = 0;

  try {
    await client.connect();
    const db     = client.db();
    const dbName = db.databaseName;

    console.log(`\n  ${G}✔${X}  ${B}${label}${X}`);
    console.log(`     ${DIM}URI: ${uri.replace(/:([^:@]+)@/, ':***@')}${X}`);  // mask password
    console.log(`     ${DIM}Connected to: "${dbName}"${X}`);

    // List existing collections so we can distinguish "empty" vs "missing"
    const existingCols = new Set(
      (await db.listCollections().toArray()).map(c => c.name)
    );

    for (const { name, warnIfEmpty } of collections) {
      if (!existingCols.has(name)) {
        console.log(`     ${R}[WARNING]${X} ${name}: collection does not exist`);
        warnings++;
        continue;
      }

      const count = await db.collection(name).countDocuments();

      if (count === 0 && warnIfEmpty) {
        console.log(`     ${Y}[WARNING]${X} ${name}: ${Y}0 documents — possible migration failure${X}`);
        warnings++;
      } else if (count === 0) {
        console.log(`     ${DIM}[ OK  ]${X} ${name}: 0 documents (expected — none yet)`);
      } else {
        console.log(`     ${G}[ OK  ]${X} ${name}: ${G}${count}${X} document(s)`);
      }
    }

    return { label, status: 'ok', warnings, errors };
  } catch (err) {
    console.log(`\n  ${R}[ERROR]${X}  ${B}${label}${X}`);
    console.log(`     ${R}Connection failed: ${err.message}${X}`);
    return { label, status: 'error', warnings, errors: 1 };
  } finally {
    await client.close().catch(() => {});
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C}${B}╔══════════════════════════════════════════════════════════════╗${X}`);
  console.log(`${C}${B}║   IELTS — Database-per-Service Migration Verification        ║${X}`);
  console.log(`${C}${B}╚══════════════════════════════════════════════════════════════╝${X}`);
  console.log(`  ${DIM}Reading MONGO_URI from each service's own .env file${X}\n`);

  const results = [];
  for (const entry of MANIFEST) {
    results.push(await verifyService(entry));
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('');
  console.log(`${C}${B}════════════════════════  SUMMARY  ════════════════════════════${X}`);

  let totalWarnings = 0;
  let totalErrors   = 0;

  for (const { label, status, warnings, errors } of results) {
    totalWarnings += warnings;
    totalErrors   += errors;

    if (status === 'skip') {
      console.log(`  ${DIM}[SKIP ]${X}  ${label}`);
    } else if (status === 'error') {
      console.log(`  ${R}[ERROR]${X}  ${label}`);
    } else if (warnings > 0) {
      console.log(`  ${Y}[WARN ]${X}  ${label}  ${DIM}(${warnings} warning(s))${X}`);
    } else {
      console.log(`  ${G}[PASS ]${X}  ${label}`);
    }
  }

  console.log('');

  if (totalErrors > 0) {
    console.log(`${R}${B}✖  ${totalErrors} service(s) could not connect. Check Atlas credentials and network.${X}`);
    process.exitCode = 2;
  } else if (totalWarnings > 0) {
    console.log(`${Y}${B}⚠  ${totalWarnings} collection(s) are empty. Re-run migrate-to-micro-dbs.js if migration was skipped.${X}`);
    process.exitCode = 1;
  } else {
    console.log(`${G}${B}✔  All databases verified — migration data is seated correctly.${X}`);
    process.exitCode = 0;
  }
  console.log('');
}

main().catch(err => {
  console.error(`${R}Fatal:${X}`, err.message);
  process.exit(1);
});
