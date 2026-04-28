'use strict';

/**
 * migrate-to-micro-dbs.js
 *
 * One-shot migration: copies every collection from the OLD shared Atlas DB
 * into the correct NEW per-service DB.
 *
 * SAFETY: idempotent — if a target collection already has documents the
 *         migration for that collection is SKIPPED to prevent duplicates.
 *
 * Run from /be directory:
 *   node migrate-to-micro-dbs.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// ── Connection strings ──────────────────────────────────────────────────────
const OLD_URI = process.env.MONGO_URI_OLD_SHARED;
if (!OLD_URI) {
  console.error('❌  MONGO_URI_OLD_SHARED is not set in .env');
  process.exit(1);
}

const NEW_URIS = {
  auth:         process.env.MONGO_URI_AUTH,
  billing:      process.env.MONGO_URI_BILLING,
  payment:      process.env.MONGO_URI_PAYMENT,
  reading:      process.env.MONGO_URI_READING,
  listening:    process.env.MONGO_URI_LISTENING,
  writing:      process.env.MONGO_URI_WRITING,
  speaking:     process.env.MONGO_URI_SPEAKING,
  notification: process.env.MONGO_URI_NOTIFICATION,
  lesson:       process.env.MONGO_URI_LESSON,
};

// ── Collection → target service mapping ────────────────────────────────────
// Each entry: [sourceCollection, targetService, targetCollection]
const COLLECTION_MAP = [
  ['users',                   'auth',         'users'],
  ['plans',                   'billing',      'plans'],
  ['subscriptions',           'billing',      'subscriptions'],
  ['transactions',            'payment',      'transactions'],
  ['readingtests',            'reading',      'readingtests'],
  ['readingattempts',         'reading',      'readingattempts'],
  ['listeningtests',          'listening',    'listeningtests'],
  ['listeningattempts',       'listening',    'listeningattempts'],
  ['writings',                'writing',      'writings'],
  ['writingsubmissions',      'writing',      'writingsubmissions'],
  ['speakingtests',           'speaking',     'speakingtests'],
  ['speakingsubmissions',     'speaking',     'speakingsubmissions'],
  ['notificationlogs',        'notification', 'notificationlogs'],
  ['notificationpreferences', 'notification', 'notificationpreferences'],
  ['pushsubscriptions',       'notification', 'pushsubscriptions'],
  ['lessons',                 'lesson',       'lessons'],
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const C = '\x1b[36m', G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', X = '\x1b[0m';

async function connect(uri, label) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const dbName = client.db().databaseName;
  console.log(`   ${G}✔${X} [${label}] → "${dbName}"`);
  return client;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C}╔══════════════════════════════════════════════════════════╗${X}`);
  console.log(`${C}║        IELTS — Database-per-Service Migration            ║${X}`);
  console.log(`${C}╚══════════════════════════════════════════════════════════╝${X}`);
  console.log('');

  // Connect old DB
  console.log('🔌 Connecting to OLD shared database …');
  const oldClient = await connect(OLD_URI, 'old');
  const oldDb = oldClient.db();

  // Connect all new DBs
  console.log('\n🔌 Connecting to NEW per-service databases …');
  const newClients = {};
  for (const [service, uri] of Object.entries(NEW_URIS)) {
    if (!uri) { console.log(`   ${Y}⚠️  ${service}: MONGO_URI not set, skipping${X}`); continue; }
    newClients[service] = await connect(uri, service);
  }

  // List source collections
  const srcCollections = (await oldDb.listCollections().toArray()).map(c => c.name);
  console.log(`\n📦 Collections found in source: ${srcCollections.join(', ')}\n`);

  let totalCopied = 0;
  let totalSkipped = 0;

  for (const [srcCol, service, dstCol] of COLLECTION_MAP) {
    const client = newClients[service];
    if (!client) {
      console.log(`${Y}⚠️  [${srcCol}] — service "${service}" has no connection, skipping.${X}`);
      totalSkipped++;
      continue;
    }

    console.log(`📋 Migrating [${srcCol}] → ${service} (${dstCol})`);

    if (!srcCollections.includes(srcCol)) {
      console.log(`   ${Y}⚪ [${srcCol}] — not found in source, skipping.${X}`);
      totalSkipped++;
      continue;
    }

    const destDb  = client.db();
    const destCol = destDb.collection(dstCol);
    const existing = await destCol.countDocuments();
    if (existing > 0) {
      console.log(`   ${Y}⚠️  [${dstCol}] — target already has ${existing} docs, skipping to avoid duplicates.${X}`);
      totalSkipped++;
      continue;
    }

    const docs = await oldDb.collection(srcCol).find({}).toArray();
    if (docs.length === 0) {
      console.log(`   ${Y}⚪ [${srcCol}] — empty in source, skipping.${X}`);
      totalSkipped++;
      continue;
    }

    await destCol.insertMany(docs, { ordered: false });
    console.log(`   ${G}✅ [${dstCol}] — copied ${docs.length} / ${docs.length} documents.${X}`);
    totalCopied += docs.length;
  }

  // Close all connections
  await oldClient.close();
  for (const c of Object.values(newClients)) await c.close();

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`${G}🎉 Migration complete!${X}`);
  console.log(`   Documents migrated : ${totalCopied}`);
  console.log(`   Collections skipped: ${totalSkipped}`);
  console.log('══════════════════════════════════════════════════════════\n');
  console.log('NEXT STEPS:');
  console.log('  1. Verify each new database in MongoDB Atlas.');
  console.log('  2. Run your services and smoke-test critical endpoints.');
  console.log('  3. Once verified, you can drop the old shared database.');
}

main().catch(e => {
  console.error(`${R}Fatal migration error:${X}`, e.message);
  process.exit(1);
});
