/**
 * reportingConnections.js
 *
 * Lazy-initialised, read-only Mongoose connections to sibling services'
 * MongoDB databases. Used exclusively by the Reports dashboard aggregations.
 *
 * Each connection is created once on first use and reused for the lifetime of
 * the process. Because these are secondary connections (not the default
 * mongoose.connection), models must be registered on the specific connection
 * instance using conn.model(), not the global mongoose.model().
 */

const mongoose = require('mongoose');

// ─── Private connection singletons ──────────────────────────────────
let _paymentConn = null;
let _authConn = null;
let _readingConn = null;

// ─── Minimal schemas (only fields needed for aggregations) ──────────
const transactionSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    amount: { type: Number, default: 0 },
    status: { type: String, default: 'Pending' },
  },
  { timestamps: true }
);

const aiLogSchema = new mongoose.Schema(
  {
    service: { type: String, default: '' },
    model: { type: String, default: '' },
    totalTokens: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const authUserSchema = new mongoose.Schema(
  {
    role: { type: String, default: 'Student' },
    plan: { type: String, default: 'FREE' },
  },
  { timestamps: true }
);

const readingAttemptSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

const readingTestSchema = new mongoose.Schema(
  { title: { type: String, default: '' } },
  { strict: false }
);

// ─── Connection getters ──────────────────────────────────────────────
function getPaymentConn() {
  if (!_paymentConn) {
    const uri = process.env.MONGO_URI_PAYMENT || process.env.MONGO_URI;
    _paymentConn = mongoose.createConnection(uri);
    _paymentConn.on('error', (err) =>
      console.error('[reportingConnections] payment DB error:', err.message)
    );
  }
  return _paymentConn;
}

function getAuthConn() {
  if (!_authConn) {
    const uri = process.env.MONGO_URI_AUTH || process.env.MONGO_URI;
    _authConn = mongoose.createConnection(uri);
    _authConn.on('error', (err) =>
      console.error('[reportingConnections] auth DB error:', err.message)
    );
  }
  return _authConn;
}

function getReadingConn() {
  if (!_readingConn) {
    const uri = process.env.MONGO_URI_READING || process.env.MONGO_URI;
    _readingConn = mongoose.createConnection(uri);
    _readingConn.on('error', (err) =>
      console.error('[reportingConnections] reading DB error:', err.message)
    );
  }
  return _readingConn;
}

// ─── Idempotent model getters ────────────────────────────────────────
// conn.model(name) throws OverwriteModelError if called twice with a schema,
// so we try the no-schema form first.
function getOrDefineModel(conn, name, schema) {
  try {
    return conn.model(name);
  } catch {
    return conn.model(name, schema);
  }
}

const getTransaction = () =>
  getOrDefineModel(getPaymentConn(), 'Transaction', transactionSchema);

const getAILog = () =>
  getOrDefineModel(getAuthConn(), 'AILog', aiLogSchema);

const getAuthUser = () =>
  getOrDefineModel(getAuthConn(), 'User', authUserSchema);

const getReadingAttempt = () =>
  getOrDefineModel(getReadingConn(), 'ReadingAttempt', readingAttemptSchema);

const getReadingTest = () =>
  getOrDefineModel(getReadingConn(), 'ReadingTest', readingTestSchema);

module.exports = {
  getTransaction,
  getAILog,
  getAuthUser,
  getReadingAttempt,
  getReadingTest,
};
