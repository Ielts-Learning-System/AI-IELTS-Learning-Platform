'use strict';
/**
 * initial-snapshot.js
 *
 * One-shot: copies every document from each service DB into ielts_backup_db.
 * Idempotent — uses replaceOne + upsert, so safe to re-run at any time.
 *
 * Run from /be:
 *   node initial-snapshot.js
 */

const path   = require('path');
const dotenv = require('dotenv');

if (!process.env.MONGO_URI_BACKUP) {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
}

const { MongoClient } = require('mongodb');

const G   = '\x1b[32m';
const Y   = '\x1b[33m';
const R   = '\x1b[31m';
const C   = '\x1b[36m';
const B   = '\x1b[1m';
const X   = '\x1b[0m';

const ok   = (m) => console.log(`  ${G}✔${X}  ${m}`);
const warn = (m) => console.log(`  ${Y}⚠${X}  ${m}`);
const err  = (m) => console.log(`  ${R}✖${X}  ${m}`);

const BACKUP_URI = process.env.MONGO_URI_BACKUP;

const SERVICE_URIS = {
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

const SERVICE_COLS = {
  auth:         ['users'],
  billing:      ['plans', 'subscriptions'],
  payment:      ['transactions'],
  reading:      ['readingtests', 'readingattempts'],
  listening:    ['listeningtests', 'listeningattempts'],
  writing:      ['writings', 'writingsubmissions'],
  speaking:     ['speakingtests', 'speakingsubmissions'],
  notification: ['notificationlogs', 'notificationpreferences', 'pushsubscriptions'],
  lesson:       ['lessons'],
};

async function connectDB(uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
  await client.connect();
  return client;
}

async function main() {
  console.log('');
  console.log(`${C}${B}╔═════════════════════════════════════════════════════════════════╗${X}`);
  console.log(`${C}${B}║   IELTS — Initial Backup Snapshot (service DBs → backup DB)     ║${X}`);
  console.log(`${C}${B}╚═════════════════════════════════════════════════════════════════╝${X}`);
  console.log('');

  if (!BACKUP_URI) {
    err('MONGO_URI_BACKUP not set in .env');
    process.exit(1);
  }

  const backupClient = await connectDB(BACKUP_URI);
  const backupDb = backupClient.db();
  console.log(`  Connected to backup: "${backupDb.databaseName}"\n`);

  let grandTotal = 0;

  for (const [svc, uri] of Object.entries(SERVICE_URIS)) {
    if (!uri) { warn(`${svc}: MONGO_URI not set — skipped`); continue; }

    let svcClient;
    try {
      svcClient = await connectDB(uri);
    } catch (e) {
      err(`${svc}: cannot connect — ${e.message}`);
      continue;
    }

    const serviceDb = svcClient.db();
    const cols = SERVICE_COLS[svc] ?? [];
    let svcTotal = 0;

    for (const col of cols) {
      try {
        const docs = await serviceDb.collection(col).find({}).toArray();
        if (docs.length === 0) {
          warn(`${svc}.${col}: 0 docs — nothing to snapshot`);
          continue;
        }
        for (const doc of docs) {
          await backupDb.collection(col).replaceOne({ _id: doc._id }, doc, { upsert: true });
        }
        ok(`${svc}.${col}: ${docs.length} doc(s) ──▶ backup`);
        svcTotal += docs.length;
      } catch (e) {
        err(`${svc}.${col}: ${e.message}`);
      }
    }

    await svcClient.close().catch(() => {});
    if (svcTotal > 0) console.log(`     ${svc}: ${svcTotal} total docs synced\n`);
    grandTotal += svcTotal;
  }

  await backupClient.close().catch(() => {});
  console.log('');
  console.log(`${G}${B}✔  Snapshot complete — ${grandTotal} document(s) upserted into ielts_backup_db${X}`);
  console.log('');
}

main().catch(e => {
  console.error(`${R}Fatal:${X}`, e.message);
  process.exit(1);
});
