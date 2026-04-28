'use strict';
/**
 * test-e2e-flow.js
 *
 * Automated E2E integration test — simulates a real student journey across
 * multiple microservices to prove:
 *   1. Auth service reads from ielts_auth_db  (JWT is issued)
 *   2. Billing service reads from ielts_billing_db  (plans / subscription)
 *   3. Reading service writes to ielts_reading_db  (submit attempt)
 *   4. Writing service populate() works inside ielts_writing_db  (my-submissions)
 *      — the "cross-database populate" canary test
 *
 * Run from /be directory (all services must already be running):
 *   node test-e2e-flow.js
 *
 * Override defaults via environment variables:
 *   GATEWAY_URL    — API Gateway base URL    (default: http://localhost:3000)
 *   TEST_EMAIL     — student account email   (default: student@ielts.test)
 *   TEST_PASSWORD  — student account password (default: Student@123)
 *
 * Exit codes:
 *   0 — all steps passed
 *   1 — one or more steps failed
 */

const fs   = require('fs');
const path = require('path');

// Load gateway .env so GATEWAY_URL / TEST_* can be set there if preferred
if (fs.existsSync(path.resolve(__dirname, '.env'))) {
  require('dotenv').config();
}

const axios = require('axios');

// ── Config ───────────────────────────────────────────────────────────────────
const BASE     = (process.env.GATEWAY_URL    || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL    =  process.env.TEST_EMAIL     || 'student@ielts.test';
const PASSWORD =  process.env.TEST_PASSWORD  || 'Student@123';

// ── ANSI colour helpers ───────────────────────────────────────────────────────
const G   = '\x1b[32m';
const R   = '\x1b[31m';
const Y   = '\x1b[33m';
const C   = '\x1b[36m';
const B   = '\x1b[1m';
const DIM = '\x1b[2m';
const X   = '\x1b[0m';

// ── Result tracking ───────────────────────────────────────────────────────────
const results = [];

function pass(label, hint = '') {
  results.push({ label, ok: true });
  console.log(`  ${G}[PASSED]${X}  ${label}${hint ? `  ${DIM}${hint}${X}` : ''}`);
}

function fail(label, err) {
  results.push({ label, ok: false });
  const status = err?.response?.status ?? 'NO_RESPONSE';
  const body   = JSON.stringify(err?.response?.data ?? { message: err?.message }, null, 2)
    .split('\n').map(l => `           ${l}`).join('\n');
  console.log(`  ${R}[FAILED]${X}  ${label}`);
  console.log(`           ${Y}HTTP ${status}${X}`);
  console.log(body);
}

/** Run a labelled test step; return { ok, data }. */
async function step(label, fn) {
  try {
    const result = await fn();
    pass(label, result.hint);
    return { ok: true, data: result.data };
  } catch (err) {
    fail(label, err);
    return { ok: false };
  }
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Build a dummy answers array (all '') based on test.passages structure. */
function dummyAnswers(test) {
  const total = (test.passages ?? []).reduce((n, p) => n + (p.questions?.length ?? 0), 0);
  return Array(total).fill('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C}${B}╔══════════════════════════════════════════════════════════════╗${X}`);
  console.log(`${C}${B}║   IELTS — Automated E2E Flow Test (Database-per-Service)     ║${X}`);
  console.log(`${C}${B}╚══════════════════════════════════════════════════════════════╝${X}`);
  console.log(`\n  ${DIM}Gateway : ${BASE}${X}`);
  console.log(`  ${DIM}User    : ${EMAIL}${X}\n`);

  let token         = null;
  let readingTestId = null;
  let attemptId     = null;

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1 — Auth Service: Login & extract JWT
  //   Proves: ielts_auth_db is reachable; User documents migrated correctly.
  // ────────────────────────────────────────────────────────────────────────────
  const s1 = await step('Step 1 — Auth › POST /api/auth/login', async () => {
    const res = await axios.post(`${BASE}/api/auth/login`, { email: EMAIL, password: PASSWORD });
    const data = res.data?.data ?? res.data;
    if (!data?.token) throw new Error('Login response is missing the JWT token field.');
    token = data.token;
    return { hint: `userId=${data._id}  role=${data.role}`, data: res.data };
  });

  if (!s1.ok) {
    console.log(`\n${Y}  Cannot proceed without a JWT — aborting remaining steps.${X}`);
    return summary();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 — Billing Service: Plans list (public) + My Subscription (auth)
  //   Proves: ielts_billing_db is reachable; plans migrated; Subscription
  //           .populate('planId') resolves inside the SAME billing DB (no 500).
  // ────────────────────────────────────────────────────────────────────────────
  await step('Step 2a — Billing › GET /api/billing/plans  (ielts_billing_db read)', async () => {
    const res = await axios.get(`${BASE}/api/billing/plans`);
    const plans = res.data?.data ?? res.data;
    const list  = Array.isArray(plans) ? plans : [];
    if (list.length === 0) throw new Error('Plans array is empty — plans collection not migrated.');
    return { hint: `${list.length} plan(s) found`, data: res.data };
  });

  await step('Step 2b — Billing › GET /api/billing/my-subscription  (populate test)', async () => {
    // A 404 is ACCEPTABLE (user has no subscription yet).
    // A 500 means .populate("planId") broke — that would be a [FAILED].
    try {
      const res = await axios.get(`${BASE}/api/billing/my-subscription`, auth(token));
      const sub = res.data?.data;
      return {
        hint: sub ? `planId=${sub.planId?._id ?? sub.planId}  status=${sub.status}` : 'no active subscription',
        data: res.data,
      };
    } catch (err) {
      if (err?.response?.status === 404) {
        // 404 is fine — user has no subscription, populate never executed
        return { hint: '404 — no subscription record (acceptable)', data: null };
      }
      throw err; // 500 or network error → propagates as [FAILED]
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 — Reading Service: Fetch test list → Submit a dummy attempt
  //   Proves: ielts_reading_db is reachable; tests migrated; the write
  //           path (ReadingAttempt.create) persists to the correct DB.
  // ────────────────────────────────────────────────────────────────────────────
  const s3a = await step('Step 3a — Reading › GET /api/reading  (fetch test list)', async () => {
    const res   = await axios.get(`${BASE}/api/reading`);
    const tests = res.data?.data ?? res.data;
    if (!Array.isArray(tests) || tests.length === 0)
      throw new Error('Reading tests array is empty — readingtests collection not migrated.');
    readingTestId = (tests.find(t => t.isPublished) ?? tests[0])._id;
    return { hint: `testId=${readingTestId}  total=${tests.length}`, data: res.data };
  });

  if (s3a.ok && readingTestId) {
    await step(`Step 3b — Reading › POST /api/reading/${readingTestId}/submit`, async () => {
      // Fetch full test detail to build a correctly-sized answers array
      const detail = await axios.get(`${BASE}/api/reading/${readingTestId}`);
      const test   = detail.data?.data ?? detail.data;
      const answers = dummyAnswers(test);

      const res = await axios.post(
        `${BASE}/api/reading/${readingTestId}/submit`,
        { studentAnswers: answers, timeSpent: 60 },
        auth(token)
      );
      if (!res.data?.data?._id)
        throw new Error('Submit response is missing attempt._id — write to reading DB may have failed.');
      attemptId = res.data.data._id;
      return { hint: `attemptId=${attemptId}  band=${res.data.data.bandScore}`, data: res.data };
    });
  } else {
    results.push({ label: 'Step 3b — Reading › POST submit', ok: false });
    console.log(`  ${Y}[SKIP  ]${X}  Step 3b — no test ID available from Step 3a`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 4 — Writing Service: Fetch my-submissions (populate canary)
  //   Proves: ielts_writing_db is reachable; WritingSubmission.populate('writingId')
  //           resolves correctly within ielts_writing_db (no cross-DB populate
  //           error). This is the key regression guard for the DB-per-service
  //           migration — a broken cross-DB populate would return HTTP 500.
  //
  //   Gateway route: GET /api/writing/submissions/my-submissions
  //   Writing service mount: app.use('/submissions', submissionRoutes)
  //   Controller: WritingSubmission.find({ userId }).populate('writingId', 'title type')
  // ────────────────────────────────────────────────────────────────────────────
  await step('Step 4  — Writing › GET /api/writing/submissions/my-submissions  (populate canary)', async () => {
    const res   = await axios.get(`${BASE}/api/writing/submissions/my-submissions`, auth(token));
    const subs  = res.data?.data ?? res.data;
    const count = Array.isArray(subs) ? subs.length : '?';
    // Any 2xx without a 500 proves populate('writingId') works in the isolated DB
    return { hint: `${count} submission(s) — populate resolved without error`, data: res.data };
  });

  summary();
}

function summary() {
  const passed = results.filter(r =>  r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log('');
  console.log(`${C}${B}══════════════════════════  SUMMARY  ══════════════════════════${X}`);
  for (const { label, ok } of results) {
    console.log(`  ${ok ? G + '[PASSED]' : R + '[FAILED]'}${X}  ${label}`);
  }
  console.log('');

  if (failed === 0) {
    console.log(`${G}${B}✔  All ${passed} steps passed.${X} Cross-service communication and DB isolation are healthy.`);
    process.exitCode = 0;
  } else {
    console.log(`${R}${B}✖  ${failed} step(s) failed, ${passed} passed.${X}`);
    console.log(`${Y}  Check the detailed HTTP error logs printed above each [FAILED] step.${X}`);
    process.exitCode = 1;
  }
  console.log('');
}

main().catch(err => {
  console.error(`${R}Fatal:${X}`, err.message);
  process.exit(1);
});
