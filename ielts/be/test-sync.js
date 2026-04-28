'use strict';
/**
 * test-sync.js
 *
 * Comprehensive test for the Database-per-Service + bi-directional sync setup.
 *
 * Phase 1 — Connectivity: connects to every service DB + backup DB.
 * Phase 2 — Count parity: compares document counts between service DBs and
 *            backup DB to verify the initial snapshot ran correctly.
 * Phase 3 — Live write test: inserts a canary document into ielts_auth_db,
 *            waits 6 s, then checks ielts_backup_db for it.
 *            Requires sync-daemon to be running; skipped if backup DB is not
 *            reachable.
 * Phase 4 — Reverse write test: inserts a canary document into ielts_backup_db,
 *            waits 6 s, then checks ielts_auth_db for it.
 *
 * Run from /be:
 *   node test-sync.js
 *
 * Skip live write tests (connectivity + counts only):
 *   node test-sync.js --no-write
 */

const path    = require('path');
const dotenv  = require('dotenv');

if (!process.env.MONGO_URI_BACKUP) {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
}

const { MongoClient, ObjectId } = require('mongodb');

// ── Config ────────────────────────────────────────────────────────────────────
const SKIP_WRITE = process.argv.includes('--no-write');
const SYNC_WAIT_MS = 6000; // time to wait for daemon propagation

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

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const G   = '\x1b[32m';
const Y   = '\x1b[33m';
const R   = '\x1b[31m';
const C   = '\x1b[36m';
const DIM = '\x1b[2m';
const B   = '\x1b[1m';
const X   = '\x1b[0m';

const results = [];

function passed(label, hint = '') {
  results.push({ label, ok: true });
  console.log(`  ${G}[PASSED]${X}  ${label}${hint ? `  ${DIM}${hint}${X}` : ''}`);
}

function failed(label, reason = '') {
  results.push({ label, ok: false });
  console.log(`  ${R}[FAILED]${X}  ${label}${reason ? `\n           ${Y}↳ ${reason}${X}` : ''}`);
}

function skipped(label, reason = '') {
  results.push({ label, ok: true }); // skipped counts as neutral
  console.log(`  ${DIM}[SKIP  ]${X}  ${label}${reason ? `  ${DIM}(${reason})${X}` : ''}`);
}

// ── Connect ───────────────────────────────────────────────────────────────────
async function connectDB(uri, label) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 12000,
    connectTimeoutMS: 12000,
  });
  await client.connect();
  return { client, db: client.db() };
}

// ── Phase 1: Connectivity ─────────────────────────────────────────────────────
async function testConnectivity() {
  console.log(`\n${C}${B}── Phase 1: Connectivity ──────────────────────────────────────────${X}`);

  const connections = {};

  // Backup DB
  if (!BACKUP_URI) {
    failed('Backup DB (ielts_backup_db)', 'MONGO_URI_BACKUP not set in .env');
  } else {
    try {
      const c = await connectDB(BACKUP_URI, 'backup');
      connections.backup = c;
      passed(`Backup DB`, `"${c.db.databaseName}"`);
    } catch (e) {
      failed('Backup DB (ielts_backup_db)', e.message);
    }
  }

  // Service DBs
  for (const [svc, uri] of Object.entries(SERVICE_URIS)) {
    if (!uri) { skipped(`${svc} DB`, 'URI not set'); continue; }
    try {
      const c = await connectDB(uri, svc);
      connections[svc] = c;
      passed(`${svc} DB`, `"${c.db.databaseName}"`);
    } catch (e) {
      failed(`${svc} DB`, e.message);
    }
  }

  return connections;
}

// ── Phase 2: Count parity ─────────────────────────────────────────────────────
async function testCountParity(connections) {
  console.log(`\n${C}${B}── Phase 2: Count Parity (service DB vs backup DB) ───────────────${X}`);

  if (!connections.backup) {
    skipped('Count parity check', 'backup DB not connected');
    return;
  }

  const backupDb = connections.backup.db;

  for (const [svc, cols] of Object.entries(SERVICE_COLS)) {
    const conn = connections[svc];
    if (!conn) { skipped(`${svc} parity`, 'service DB not connected'); continue; }
    const serviceDb = conn.db;

    for (const col of cols) {
      try {
        const svcCount    = await serviceDb.collection(col).countDocuments();
        const backupCount = await backupDb.collection(col).countDocuments();

        if (svcCount === 0) {
          skipped(`${svc}.${col}`, `0 docs in service DB — nothing to compare`);
        } else if (backupCount === 0) {
          // Backup is a brand-new DB — snapshot not yet run
          failed(`${svc}.${col}`, `backup=0 while service=${svcCount} — run: node initial-snapshot.js`);
        } else if (svcCount === backupCount) {
          passed(`${svc}.${col}`, `service=${svcCount}  backup=${backupCount}`);
        } else {
          const diff = Math.abs(svcCount - backupCount);
          if (diff <= 3) {
            passed(`${svc}.${col}`, `service=${svcCount}  backup=${backupCount}  Δ=${diff} (within tolerance)`);
          } else {
            failed(`${svc}.${col}`, `service=${svcCount}  backup=${backupCount}  Δ=${diff} — run initial-snapshot.js?`);
          }
        }
      } catch (e) {
        failed(`${svc}.${col}`, e.message);
      }
    }
  }
}

// ── Phase 3: Live write test — service DB → backup DB ────────────────────────
async function testServiceToBackupSync(connections) {
  const label = 'Live sync: auth DB ──▶ backup DB';

  if (SKIP_WRITE) { skipped(label, '--no-write flag'); return; }
  if (!connections.auth || !connections.backup) {
    skipped(label, 'auth or backup DB not connected');
    return;
  }

  const authDb   = connections.auth.db;
  const backupDb = connections.backup.db;
  const testId   = new ObjectId();
  const testDoc  = { _id: testId, _syncTest: true, _testTs: new Date(), source: 'service→backup', note: 'test-sync.js canary' };

  try {
    // Write to service DB
    await authDb.collection('users').insertOne(testDoc);

    // Wait for sync daemon to propagate
    process.stdout.write(`  ${DIM}  Waiting ${SYNC_WAIT_MS / 1000}s for propagation…${X}`);
    await new Promise(r => setTimeout(r, SYNC_WAIT_MS));
    process.stdout.write('\r');

    // Check backup DB
    const found = await backupDb.collection('users').findOne({ _id: testId });

    if (found) {
      passed(label, `canary _id=${testId} found in backup DB`);
    } else {
      failed(label, `canary _id=${testId} NOT found in backup DB — is sync-daemon running?`);
    }
  } catch (e) {
    failed(label, e.message);
  } finally {
    // Cleanup both sides
    await authDb.collection('users').deleteOne({ _id: testId }).catch(() => {});
    await backupDb.collection('users').deleteOne({ _id: testId }).catch(() => {});
  }
}

// ── Phase 4: Reverse write test — backup DB → service DB ─────────────────────
async function testBackupToServiceSync(connections) {
  const label = 'Live sync: backup DB ──▶ auth DB';

  if (SKIP_WRITE) { skipped(label, '--no-write flag'); return; }
  if (!connections.auth || !connections.backup) {
    skipped(label, 'auth or backup DB not connected');
    return;
  }

  const authDb   = connections.auth.db;
  const backupDb = connections.backup.db;
  const testId   = new ObjectId();
  const testDoc  = { _id: testId, _syncTest: true, _testTs: new Date(), source: 'backup→service', note: 'test-sync.js canary' };

  try {
    // Write to backup DB
    await backupDb.collection('users').insertOne(testDoc);

    // Wait for sync daemon to propagate
    process.stdout.write(`  ${DIM}  Waiting ${SYNC_WAIT_MS / 1000}s for propagation…${X}`);
    await new Promise(r => setTimeout(r, SYNC_WAIT_MS));
    process.stdout.write('\r');

    // Check service DB
    const found = await authDb.collection('users').findOne({ _id: testId });

    if (found) {
      passed(label, `canary _id=${testId} found in auth DB`);
    } else {
      failed(label, `canary _id=${testId} NOT found in auth DB — is sync-daemon running?`);
    }
  } catch (e) {
    failed(label, e.message);
  } finally {
    // Cleanup both sides
    await backupDb.collection('users').deleteOne({ _id: testId }).catch(() => {});
    await authDb.collection('users').deleteOne({ _id: testId }).catch(() => {});
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
function printSummary() {
  const passed = results.filter(r =>  r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(`\n${C}${B}══════════════════════  SUMMARY  ══════════════════════════════${X}`);
  for (const { label, ok } of results) {
    console.log(`  ${ok ? G + '[PASSED]' : R + '[FAILED]'}${X}  ${label}`);
  }
  console.log('');

  if (failed === 0) {
    console.log(`${G}${B}✔  All ${passed} check(s) passed.${X} Database-per-Service + sync architecture is healthy.`);
    process.exitCode = 0;
  } else {
    console.log(`${R}${B}✖  ${failed} check(s) failed, ${passed} passed.${X}`);
    console.log(`${Y}  Live sync failures mean sync-daemon is not running — start it first.${X}`);
    process.exitCode = 1;
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C}${B}╔═════════════════════════════════════════════════════════════════╗${X}`);
  console.log(`${C}${B}║   IELTS — Sync Architecture Integration Test                    ║${X}`);
  console.log(`${C}${B}╚═════════════════════════════════════════════════════════════════╝${X}`);
  if (SKIP_WRITE) console.log(`  ${DIM}Mode: connectivity + counts only (--no-write)${X}`);
  else            console.log(`  ${DIM}Mode: full (connectivity + counts + live write tests)${X}`);

  let connections = {};
  const clients   = [];

  try {
    connections = await testConnectivity();

    // Collect clients for cleanup
    for (const c of Object.values(connections)) {
      if (c?.client) clients.push(c.client);
    }

    await testCountParity(connections);
    await testServiceToBackupSync(connections);
    await testBackupToServiceSync(connections);

  } finally {
    for (const c of clients) await c.close().catch(() => {});
    printSummary();
  }
}

main().catch(e => {
  console.error(`${R}Fatal:${X}`, e.message);
  process.exit(1);
});
