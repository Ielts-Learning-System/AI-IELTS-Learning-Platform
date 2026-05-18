/**
 * Payment-service — API tests
 * Covers all 6 endpoints
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
  axios.post = jest.fn().mockResolvedValue({ data: { success: true } });
  axios.get = jest.fn().mockResolvedValue({ data: { users: [] } });
});

afterEach(async () => {
  const colls = mongoose.connection.collections;
  for (const key in colls) await colls[key].deleteMany({});
});

// ─── Health ──────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('200 - service alive', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('200 - root endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('payment-service');
  });
});

// ─── POST /create ─────────────────────────────────────────────────────────────

describe('POST /create', () => {
  it('401 - no token', async () => {
    const res = await request(app).post('/create').send({ planId: 'PLUS', amount: 199000 });
    expect(res.status).toBe(401);
  });

  it('400 - missing planId', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`).send({ amount: 199000 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/planId/i);
  });

  it('400 - missing amount', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`).send({ planId: 'PLUS' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/amount/i);
  });

  it('400 - amount is zero', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 0 });
    expect(res.status).toBe(400);
  });

  it('400 - amount is negative', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: -100 });
    expect(res.status).toBe(400);
  });

  it('400 - amount is non-numeric string', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 'free' });
    expect(res.status).toBe(400);
  });

  it('200 - creates pending transaction and returns QR URL', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 199000 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.qrUrl).toMatch(/img\.vietqr\.io/);
    expect(res.body.orderId).toMatch(/^VIP/);
    expect(res.body.amount).toBe(199000);
    const tx = await Transaction.findOne({ orderId: res.body.orderId });
    expect(tx).not.toBeNull();
    expect(tx.status).toBe('Pending');
    expect(String(tx.userId)).toBe(studentId);
    expect(tx.planId).toBe('PLUS');
  });

  it('200 - POST /create-vietqr works as alias', async () => {
    const res = await request(app).post('/create-vietqr').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PRO', amount: 399000 });
    expect(res.status).toBe(200);
    expect(res.body.qrUrl).toMatch(/img\.vietqr\.io/);
  });

  it('200 - QR URL includes encoded orderId and accountName', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 199000 });
    expect(res.body.qrUrl).toContain('addInfo=VIP');
    expect(res.body.qrUrl).toContain('accountName=');
  });

  it('200 - QR URL includes amount', async () => {
    const res = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PRO', amount: 399000 });
    expect(res.body.qrUrl).toContain('amount=399000');
  });
});

// ─── GET /transactions/my-pending ─────────────────────────────────────────────

describe('GET /transactions/my-pending', () => {
  it('401 - no token', async () => {
    const res = await request(app).get('/transactions/my-pending');
    expect(res.status).toBe(401);
  });

  it('200 - data:null when no pending', async () => {
    const res = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('200 - returns latest pending transaction', async () => {
    await Transaction.create({ orderId: 'VIP_OLD', userId: studentId, planId: 'PLUS', amount: 100, status: 'Pending' });
    await new Promise(r => setTimeout(r, 10));
    await Transaction.create({ orderId: 'VIP_NEW', userId: studentId, planId: 'PRO', amount: 399000, status: 'Pending' });
    const res = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.orderId).toBe('VIP_NEW');
  });

  it('200 - returns null when only Success/Failed transactions', async () => {
    await Transaction.create({ orderId: 'VIP_DONE', userId: studentId, planId: 'PLUS', amount: 100, status: 'Success' });
    const res = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('200 - only returns transactions for authenticated user', async () => {
    const other = new mongoose.Types.ObjectId();
    await Transaction.create({ orderId: 'VIP_OTHER', userId: other, planId: 'PLUS', amount: 100, status: 'Pending' });
    const res = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

// ─── GET /transactions ────────────────────────────────────────────────────────

describe('GET /transactions', () => {
  it('401 - no token', async () => {
    const res = await request(app).get('/transactions');
    expect(res.status).toBe(401);
  });

  it('200 - returns all transactions sorted desc', async () => {
    await Transaction.create([
      { orderId: 'VIP_T1', userId: studentId, planId: 'PLUS', amount: 100, status: 'Pending' },
      { orderId: 'VIP_T2', userId: adminId, planId: 'PRO', amount: 200, status: 'Success' },
    ]);
    // Mock axios for batch user fetch
    axios.post.mockResolvedValue({ data: { users: [{ _id: studentId, name: 'Student', email: 's@test.com' }] } });
    const res = await request(app).get('/transactions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('200 - still returns when auth-service is down (fallback)', async () => {
    await Transaction.create({ orderId: 'VIP_NOAUTH', userId: studentId, planId: 'PLUS', amount: 100 });
    axios.post.mockRejectedValue(new Error('Auth service down'));
    const res = await request(app).get('/transactions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // userId should be the raw id object when auth lookup fails
    expect(res.body.data[0].userId).toBeDefined();
  });

  it('200 - empty array when no transactions', async () => {
    const res = await request(app).get('/transactions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ─── PUT /transactions/:id/approve ───────────────────────────────────────────

describe('PUT /transactions/:id/approve', () => {
  it('401 - no token', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/transactions/${fakeId}/approve`);
    expect(res.status).toBe(401);
  });

  it('404 - transaction not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/transactions/${fakeId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('400 - cannot approve non-Pending transaction', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_DONE2', userId: studentId, planId: 'PLUS', amount: 100, status: 'Success' });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pending/i);
  });

  it('400 - unsupported planId', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_UNK', userId: studentId, planId: 'UNKNOWN_PLAN', amount: 100 });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unsupported/i);
  });

  it('200 - approves PLUS transaction, updates status to Success', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_PLUS', userId: studentId, planId: 'PLUS', amount: 199000 });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Success');
    expect(axios.patch).toHaveBeenCalled(); // called auth-service
    const saved = await Transaction.findById(tx._id);
    expect(saved.status).toBe('Success');
  });

  it('200 - approves PRO transaction', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_PRO', userId: studentId, planId: 'PRO', amount: 399000 });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Success');
    const patchCall = axios.patch.mock.calls[0][1];
    expect(patchCall.plan).toBe('PRO');
  });

  it('200 - approves VIP_1_MONTH transaction as PLUS/30 days', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_1M', userId: studentId, planId: 'VIP_1_MONTH', amount: 199000 });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const patchCall = axios.patch.mock.calls[0][1];
    expect(patchCall.plan).toBe('PLUS');
    const validUntil = new Date(patchCall.vipValidUntil);
    const daysFromNow = (validUntil - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysFromNow).toBeGreaterThan(29);
    expect(daysFromNow).toBeLessThan(31);
  });

  it('200 - approves VIP_6_MONTH as PLUS/180 days', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_6M', userId: studentId, planId: 'VIP_6_MONTH', amount: 299000 });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const patchCall = axios.patch.mock.calls[0][1];
    const daysFromNow = (new Date(patchCall.vipValidUntil) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysFromNow).toBeGreaterThan(179);
  });

  it('502 - returns 502 when auth-service is down', async () => {
    axios.patch.mockRejectedValue(new Error('Auth unreachable'));
    const tx = await Transaction.create({ orderId: 'VIP_502', userId: studentId, planId: 'PLUS', amount: 199000 });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(502);
    // Transaction status should NOT be updated to Success
    const saved = await Transaction.findById(tx._id);
    expect(saved.status).toBe('Pending');
  });

  it('200 - billing-service failure is non-fatal (still 200)', async () => {
    // auth-service succeeds, billing-service fails
    axios.patch.mockResolvedValue({ data: { success: true } });
    axios.post.mockRejectedValue(new Error('Billing unreachable'));
    const tx = await Transaction.create({ orderId: 'VIP_BILFAIL', userId: studentId, planId: 'PLUS', amount: 199000 });
    const res = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Success');
  });
});

// ─── PUT /transactions/:id/reject ────────────────────────────────────────────

describe('PUT /transactions/:id/reject', () => {
  it('401 - no token', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/transactions/${fakeId}/reject`);
    expect(res.status).toBe(401);
  });

  it('404 - transaction not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/transactions/${fakeId}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('400 - cannot reject non-Pending transaction', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_NOTPEND', userId: studentId, planId: 'PLUS', amount: 100, status: 'Failed' });
    const res = await request(app).put(`/transactions/${tx._id}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pending/i);
  });

  it('200 - rejects pending transaction, status becomes Failed', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_REJECT', userId: studentId, planId: 'PLUS', amount: 199000 });
    const res = await request(app).put(`/transactions/${tx._id}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Failed');
    const saved = await Transaction.findById(tx._id);
    expect(saved.status).toBe('Failed');
  });

  it('200 - reject does not call auth-service', async () => {
    const tx = await Transaction.create({ orderId: 'VIP_REJ2', userId: studentId, planId: 'PLUS', amount: 199000 });
    await request(app).put(`/transactions/${tx._id}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(axios.patch).not.toHaveBeenCalled();
  });
});
