/**
 * Payment-service — E2E tests
 * Full lifecycle: create payment → approve → reject → full flow
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
  axios.get = jest.fn().mockResolvedValue({ data: { users: [] } });
});

afterEach(async () => {
  const colls = mongoose.connection.collections;
  for (const key in colls) await colls[key].deleteMany({});
});

// ─── Flow 1: PLUS subscription payment ───────────────────────────────────────

describe('E2E: Student creates payment → admin approves → Success', () => {
  it('full PLUS approval flow', async () => {
    // 1. Student creates payment
    const createRes = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PLUS', amount: 199000 });
    expect(createRes.status).toBe(200);
    expect(createRes.body.orderId).toMatch(/^VIP/);
    const orderId = createRes.body.orderId;

    // 2. Student sees pending transaction
    const pendingRes = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${studentToken}`);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data.orderId).toBe(orderId);
    expect(pendingRes.body.data.status).toBe('Pending');
    const txId = pendingRes.body.data._id;

    // 3. Admin views all transactions
    const allTxRes = await request(app).get('/transactions').set('Authorization', `Bearer ${adminToken}`);
    expect(allTxRes.status).toBe(200);
    expect(allTxRes.body.data.find(t => t.orderId === orderId)).toBeDefined();

    // 4. Admin approves transaction
    const approveRes = await request(app).put(`/transactions/${txId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('Success');

    // 5. Verify auth-service was called with correct plan
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining('/subscription'),
      expect.objectContaining({ plan: 'PLUS' }),
      expect.any(Object)
    );

    // 6. Billing-service sync was called
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/activate'),
      expect.objectContaining({ planCode: 'PLUS', userId: studentId }),
      expect.any(Object)
    );

    // 7. No more pending transactions for student
    const pendingAfter = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${studentToken}`);
    expect(pendingAfter.body.data).toBeNull();
  });
});

// ─── Flow 2: Payment rejection ────────────────────────────────────────────────

describe('E2E: Student creates payment → admin rejects → Failed', () => {
  it('full rejection flow', async () => {
    // 1. Create payment
    const createRes = await request(app).post('/create').set('Authorization', `Bearer ${studentToken}`)
      .send({ planId: 'PRO', amount: 399000 });
    expect(createRes.status).toBe(200);
    const txId = (await Transaction.findOne({ orderId: createRes.body.orderId }))._id;

    // 2. Admin rejects
    const rejectRes = await request(app).put(`/transactions/${txId}/reject`).set('Authorization', `Bearer ${adminToken}`);
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('Failed');

    // 3. Auth-service NOT called for rejected transactions
    expect(axios.patch).not.toHaveBeenCalled();

    // 4. Cannot approve after rejection
    const approveRes = await request(app).put(`/transactions/${txId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(400);
  });
});

// ─── Flow 3: Multiple plan types ──────────────────────────────────────────────

describe('E2E: Multiple plan approval flows', () => {
  const planAmounts = [
    { planId: 'PLUS', amount: 199000, expectedPlan: 'PLUS', expectedDays: 30 },
    { planId: 'VIP_1_MONTH', amount: 199000, expectedPlan: 'PLUS', expectedDays: 30 },
    { planId: 'VIP_6_MONTH', amount: 299000, expectedPlan: 'PLUS', expectedDays: 180 },
    { planId: 'PRO', amount: 399000, expectedPlan: 'PRO', expectedDays: 365 },
    { planId: 'VIP_1_YEAR', amount: 399000, expectedPlan: 'PRO', expectedDays: 365 },
  ];

  it.each(planAmounts)('$planId → plan=$expectedPlan for $expectedDays days', async ({ planId, amount, expectedPlan, expectedDays }) => {
    const uid = new mongoose.Types.ObjectId().toString();
    const token = makeToken(uid);
    const createRes = await request(app).post('/create').set('Authorization', `Bearer ${token}`)
      .send({ planId, amount });
    expect(createRes.status).toBe(200);
    const tx = await Transaction.findOne({ orderId: createRes.body.orderId });
    const approveRes = await request(app).put(`/transactions/${tx._id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    const patchCall = axios.patch.mock.calls[axios.patch.mock.calls.length - 1][1];
    expect(patchCall.plan).toBe(expectedPlan);
    const daysFromNow = (new Date(patchCall.vipValidUntil) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysFromNow).toBeGreaterThan(expectedDays - 1);
    expect(daysFromNow).toBeLessThan(expectedDays + 1);
    jest.clearAllMocks();
    axios.patch = jest.fn().mockResolvedValue({ data: { success: true } });
    axios.post = jest.fn().mockResolvedValue({ data: { users: [] } });
  });
});

// ─── Flow 4: Multi-user isolation ────────────────────────────────────────────

describe('E2E: Multiple users - pending isolation', () => {
  it('each student only sees their own pending transaction', async () => {
    const u1 = new mongoose.Types.ObjectId().toString();
    const u2 = new mongoose.Types.ObjectId().toString();
    const t1 = makeToken(u1);
    const t2 = makeToken(u2);

    await request(app).post('/create').set('Authorization', `Bearer ${t1}`).send({ planId: 'PLUS', amount: 199000 });
    await request(app).post('/create').set('Authorization', `Bearer ${t2}`).send({ planId: 'PRO', amount: 399000 });

    const r1 = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${t1}`);
    const r2 = await request(app).get('/transactions/my-pending').set('Authorization', `Bearer ${t2}`);

    expect(r1.body.data.planId).toBe('PLUS');
    expect(r2.body.data.planId).toBe('PRO');
    expect(r1.body.data._id).not.toBe(r2.body.data._id);
  });
});
