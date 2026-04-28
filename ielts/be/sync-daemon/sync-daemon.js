'use strict';
/**
 * sync-daemon.js
 *
 * Bi-directional real-time synchronisation between per-service MongoDB
 * databases and the central backup database (ielts_backup_db).
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  Service DB  ──▶  [Change Stream]  ──▶  ielts_backup_db  (backup)   │
 *  │  ielts_backup_db  ──▶  [Change Stream]  ──▶  Service DB  (push)     │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  Startup sequence:
 *    1. Connect to all databases.
 *    2. Initial snapshot: upsert every service DB document into backup DB.
 *    3. Start 10 change-stream watchers (one per service DB + one on backup DB).
 *
 *  Loop prevention:
 *    Every _id the daemon writes is registered in pendingSyncs for 5 s.
 *    The reverse change stream checks this map and skips its own echoes.
 *
 *  Run locally (from /be):
 *    node sync-daemon/sync-daemon.js
 *
 *  Run in Docker:
 *    docker compose up sync-daemon
 */

const path   = require('path');
const dotenv = require('dotenv');

// Outside Docker: load /be/.env for all MONGO_URI_* vars
if (!process.env.MONGO_URI_BACKUP) {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

const { MongoClient } = require('mongodb');

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const G   = '\x1b[32m';
const Y   = '\x1b[33m';
const R   = '\x1b[31m';
const C   = '\x1b[36m';
const DIM = '\x1b[2m';
const B   = '\x1b[1m';
const X   = '\x1b[0m';

const ts   = () => `${DIM}[${new Date().toISOString()}]${X}`;
const info = (m) => console.log(`${ts()} ${C}[INFO]${X}  ${m}`);
const syncd = (m) => console.log(`${ts()} ${G}[SYNC]${X}  ${m}`);
const warn = (m) => console.log(`${ts()} ${Y}[WARN]${X}  ${m}`);
const fail = (m) => console.log(`${ts()} ${R}[ERR ]${X}  ${m}`);

// ── URIs ──────────────────────────────────────────────────────────────────────
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

// ── Collection ↔ service mapping ──────────────────────────────────────────────
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

// Reverse map: collection name → service name
const COL_TO_SERVICE = {};
for (const [svc, cols] of Object.entries(SERVICE_COLS)) {
  for (const col of cols) COL_TO_SERVICE[col] = svc;
}

const ALL_SYNCED_COLS = new Set(Object.keys(COL_TO_SERVICE));

// ── Loop-prevention registry ──────────────────────────────────────────────────
// When the daemon writes to a target DB, it marks the _id for 5 s.
// The reverse change stream then ignores that _id during the TTL window.
const pendingSyncs = new Map(); // key `col:id` → expiry ms

function markSync(col, id, ttlMs = 5000) {
  const key = `${col}:${id}`;
  pendingSyncs.set(key, Date.now() + ttlMs);
  setTimeout(() => pendingSyncs.delete(key), ttlMs + 200);
}

function isSyncing(col, id) {
  const key = `${col}:${id}`;
  const exp = pendingSyncs.get(key);
  if (!exp) return false;
  if (Date.now() > exp) { pendingSyncs.delete(key); return false; }
  return true;
}

// ── Apply one change event to a target collection ─────────────────────────────
async function applyChange(targetCol, colName, change) {
  if (!targetCol) return;
  const id = change.documentKey._id;
  markSync(colName, id.toString());

  try {
    const op = change.operationType;
    if (op === 'insert' || op === 'replace') {
      const doc = change.fullDocument;
      if (!doc) { warn(`${colName} [${op}]: no fullDocument`); return; }
      await targetCol.replaceOne({ _id: id }, doc, { upsert: true });
    } else if (op === 'update') {
      const doc = change.fullDocument; // requires updateLookup
      if (!doc) { warn(`${colName} [update]: no fullDocument`); return; }
      await targetCol.replaceOne({ _id: id }, doc, { upsert: true });
    } else if (op === 'delete') {
      await targetCol.deleteOne({ _id: id });
    } else {
      return; // invalidate, drop, rename — skip
    }
  } catch (e) {
    fail(`applyChange ${colName}: ${e.message}`);
  }
}

// ── Watch a source DB, sync matching collections to a resolved target col ─────
// getTargetCol(colName) must return the target Collection or null to skip.
async function watchDb(sourceDb, sourceLabel, getTargetCol, targetLabel, allowedCols) {
  let resumeToken = null;

  while (true) { // reconnection loop
    try {
      const stream = sourceDb.watch([], {
        fullDocument: 'updateLookup',
        ...(resumeToken ? { resumeAfter: resumeToken } : {}),
      });

      info(`Watching [${B}${sourceLabel}${X}] ──▶ [${B}${targetLabel}${X}]  (${[...allowedCols].join(', ')})`);

      for await (const change of stream) {
        resumeToken = change._id;

        const colName = change.ns?.coll;
        if (!colName || !allowedCols.has(colName)) continue;

        const docId = change.documentKey?._id?.toString() ?? '';
        if (isSyncing(colName, docId)) continue; // own echo — skip

        const targetCol = getTargetCol(colName);
        if (!targetCol) continue;

        await applyChange(targetCol, colName, change);
        syncd(`[${sourceLabel}] → [${targetLabel}]  ${colName}  [${change.operationType}]  _id=${docId}`);
      }

    } catch (e) {
      if (e.codeName === 'ChangeStreamFatalError' || /HistoryLost/i.test(e.message)) {
        warn(`Change stream history lost [${sourceLabel}] — resetting resume token`);
        resumeToken = null;
      } else {
        fail(`Watch error [${sourceLabel}]: ${e.message}`);
      }
      info(`Reconnecting [${sourceLabel}] in 5 s…`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ── Initial snapshot: service DBs → backup DB ────────────────────────────────
async function runInitialSnapshot(serviceDBs, backupDb) {
  info('Running initial snapshot (all service DBs → backup DB)…');
  let grandTotal = 0;

  for (const [svc, db] of Object.entries(serviceDBs)) {
    const cols = SERVICE_COLS[svc] ?? [];
    let svcTotal = 0;

    for (const colName of cols) {
      let docs;
      try {
        docs = await db.collection(colName).find({}).toArray();
      } catch (e) {
        warn(`  [${svc}] ${colName}: read error — ${e.message}`);
        continue;
      }

      if (docs.length === 0) {
        warn(`  [${svc}] ${colName}: 0 documents — nothing to snapshot`);
        continue;
      }

      for (const doc of docs) {
        await backupDb.collection(colName).replaceOne({ _id: doc._id }, doc, { upsert: true });
      }

      syncd(`  [${svc}] ${colName}: ${docs.length} doc(s) ──▶ backup`);
      svcTotal += docs.length;
    }

    if (svcTotal > 0) info(`  [${svc}] snapshot done — ${svcTotal} doc(s) total`);
    grandTotal += svcTotal;
  }

  info(`Snapshot complete — ${G}${B}${grandTotal}${X} document(s) synced to backup DB\n`);
}

// ── Connect helper ────────────────────────────────────────────────────────────
async function connectDB(uri, label) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  await client.connect();
  info(`Connected  [${G}${label}${X}]  →  "${client.db().databaseName}"`);
  return client;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C}${B}╔═════════════════════════════════════════════════════════════════╗${X}`);
  console.log(`${C}${B}║   IELTS — Bi-directional DB Sync Daemon                         ║${X}`);
  console.log(`${C}${B}╚═════════════════════════════════════════════════════════════════╝${X}`);
  console.log('');

  if (!BACKUP_URI) {
    fail('MONGO_URI_BACKUP is not set. Add it to /be/.env or docker-compose environment.');
    process.exit(1);
  }

  // 1. Connect to backup DB ───────────────────────────────────────────────────
  info('Connecting to backup database…');
  const backupClient = await connectDB(BACKUP_URI, 'backup');
  const backupDb     = backupClient.db(); // database name embedded in MONGO_URI_BACKUP

  // 2. Connect to each service DB ─────────────────────────────────────────────
  const serviceClients = {};
  const serviceDBs     = {};

  for (const [svc, uri] of Object.entries(SERVICE_URIS)) {
    if (!uri) { warn(`[${svc}] MONGO_URI not set — skipped`); continue; }
    try {
      const client = await connectDB(uri, svc);
      serviceClients[svc] = client;
      serviceDBs[svc]     = client.db();
    } catch (e) {
      fail(`Cannot connect to [${svc}] DB: ${e.message}`);
    }
  }

  // 3. Initial snapshot (service → backup) ────────────────────────────────────
  await runInitialSnapshot(serviceDBs, backupDb);

  // 4. Start change-stream watchers ───────────────────────────────────────────
  const watchers = [];

  // 4a. Each service DB → backup DB (one watcher per service)
  for (const [svc, db] of Object.entries(serviceDBs)) {
    const allowedCols = new Set(SERVICE_COLS[svc] ?? []);
    if (allowedCols.size === 0) continue;

    watchers.push(
      watchDb(
        db, svc,
        (colName) => backupDb.collection(colName),
        'backup',
        allowedCols,
      )
    );
  }

  // 4b. Backup DB → appropriate service DB (single watcher, routes by colName)
  watchers.push(
    watchDb(
      backupDb, 'backup',
      (colName) => {
        const svc = COL_TO_SERVICE[colName];
        const db  = serviceDBs[svc];
        return db ? db.collection(colName) : null;
      },
      'services',
      ALL_SYNCED_COLS,
    )
  );

  info(`${G}${B}Started ${watchers.length} change-stream watcher(s)${X}`);
  info(`${G}Sync daemon running. Press Ctrl+C to stop.${X}\n`);

  // 5. Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (sig) => {
    info(`\nReceived ${sig} — shutting down gracefully…`);
    for (const c of Object.values(serviceClients)) await c.close().catch(() => {});
    await backupClient.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep process alive
  await Promise.allSettled(watchers);
}

main().catch(e => {
  fail(`Fatal: ${e.message}`);
  process.exit(1);
});
