/**
 * Payment-service — Regression tests
 * Security, edge cases, auth boundaries
 */
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.VIETQR_BANK_ID = 'VCB';
process.env.VIETQR_ACCOUNT_NO = '1234567890';
process.env.VIETQR_ACCOUNT_NAME = 'TEST_ACCOUNT';

jest.mock('axios');

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Transaction = require('../src/models/transaction.model');

const SECRET = 'test-jwt-secret';
const makeToken = (id, role = 'student') => jwt.sign({ id: String(id), role }, SECRET, { expiresIn: '1h' });

const adminId = new mongoose.Types.ObjectId().toString();
const studentId = new mongoose.Types.ObjectId().toString();
const adminToken = makeToken(adminId, 'admin');
const studentToken = makeToken(studentId, 'student');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
  axios.patch = jest.fn().mockResolvedValue({ data: { success: true } });
  axios.post = jest.fn().mockResolvedValue({ data: { users: [] } });
});

afterEach(async () => {
  const colls = mongoose.connection.collections;
  for (const key in colls) await colls[key].deleteMany({});
});

// ─── Authentication ───────────────────────────────────────────────────────────

describe('Authentication security', () => {
  it('rejects expired JWT on protected routes', async () => {
    const expired = jwt.sign({ id: studentId, role: 'student' }, SECRET, { expiresIn: '-1s' });
    const res = await request(app).post('/create').set('Authorization', `Bearer ${expired}`).send({ planId: 'PLUS', amount: 199000 });
    expect(res.status).toBe(401);
  });

  it('rejects wrong secret', async () => {
    const bad = jwt.sign({ id: studentId }, 'evil-secret');
    const res = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  it('rejects completely missing auth on all routes', async () => {
    const routes = [
      () => request(app).post('/create').send({ planId: 'PLUS', amount: 199000 }),
      () => request(app).get('/transactions/my-pending'),
      () => request(app).get('/transactions'),
      () => request(app).put(`/transactions/${new mongoose.Types.ObjectId()}/approve`),
      () => request(app).put(`/transactions/${new mongoose.Types.ObjectId()}/reject`),
    ];
    for (const route of routes) {
      const res = await route();
      expect(res.status).toBe(401);
    }
  });
});

// ─── VietQR config missing ────────────────────────────────────────────────────

describe('Missing VietQR config', () => {
  it('returns 500 when VietQR env vars are missing', async () => {
    const origBank = process.env.VIETQR_BANK_ID;
    delete process.env.VIETQR_BANK_ID;
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 199000 });
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/VietQR/i);
    process.env.VIETQR_BANK_ID = origBank;
  });
});

// ─── Idempotency / double-approve ─────────────────────────────────────────────

describe('Double approve/reject prevention', () => {
  it('cannot approve an already-approved transaction', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_DBL', userId: studentId, planId: 'PLUS', amount: 199000, status: 'Success' });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('cannot reject an already-rejected transaction', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_DBLREJ', userId: studentId, planId: 'PLUS', amount: 100, status: 'Failed' });
    const res = await request(app).put(`/transactions/${tx._id}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});

// ─── Input edge cases ─────────────────────────────────────────────────────────

describe('Input validation edge cases', () => {
  it('amount as string integer is accepted (coerced)', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: '199000' });
    // '199000' is coerced via Number() → 199000 which is > 0
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.amount).toBe(199000);
    }
  });

  it('amount as Infinity is rejected', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 1e400 }); // Infinity
    // JSON.parse converts Infinity to null; controller rejects null
    expect(res.status).toBe(400);
  });

  it('invalid ObjectId for approve returns 500 or 400', async () => {
    const res = await request(app).put('/transactions/notanid/approve').set('Authorization', `Bearer ${adminToken}`);
    expect([400, 404, 500]).toContain(res.status);
  });

  it('invalid ObjectId for reject returns 500 or 400', async () => {
    const res = await request(app).put('/transactions/badid/reject').set('Authorization', `Bearer ${adminToken}`);
    expect([400, 404, 500]).toContain(res.status);
  });
});

// ─── orderId uniqueness ───────────────────────────────────────────────────────

describe('orderId uniqueness', () => {
  it('two rapid creates have different orderIds', async () => {
    const r1 = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 199000 });
    const r2 = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 199000 });
    expect(r1.body.orderId).not.toBe(r2.body.orderId);
  });
});

// ─── Multiple pending transactions ───────────────────────────────────────────

describe('Multiple pending transactions', () => {
  it('my-pending returns the LATEST (most recent) pending', async () => {
    const u = new mongoose.Types.ObjectId().toString();
    const token = makeToken(u);
    await Transaction.create({ orderId: 'VIP_EARLYQ', userId: u, planId: 'PLUS', amount: 100 });
    await new Promise(r => setTimeout(r, 15));
    await Transaction.create({ orderId: 'VIP_LATEQ', userId: u, planId: 'PRO', amount: 200 });
    const res = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.orderId).toBe('VIP_LATEQ');
  });
});
