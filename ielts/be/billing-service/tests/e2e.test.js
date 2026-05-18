/**
 * Billing-service — E2E tests
 * Full lifecycle: admin creates plan → internal activates → student checks subscription/skills
 * → admin manages → cancels → restores
 */
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../src/services/rabbitmq.service', () => ({
  publishEvent: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/config/reportingConnections', () => ({
  getAuthUser: jest.fn(),
  getTransaction: jest.fn(),
  getAILog: jest.fn(),
  getReadingAttempt: jest.fn(),
  getReadingTest: jest.fn(),
}));
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { data: [{ name: 'Jane Doe', email: 'jane@test.com' }] } }),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');
const { publishEvent } = require('../src/services/rabbitmq.service');
const { getAuthUser } = require('../src/config/reportingConnections');

const SECRET = 'test-jwt-secret';
const makeToken = (id, role, plan = 'FREE') =>
  jwt.sign({ id: String(id), role, plan }, SECRET, { expiresIn: '1h' });

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
  getAuthUser.mockReturnValue({
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  });
  publishEvent.mockResolvedValue(true);
});

afterEach(async () => {
  const colls = mongoose.connection.collections;
  for (const key in colls) await colls[key].deleteMany({});
  jest.clearAllMocks();
  getAuthUser.mockReturnValue({
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  });
});

const adminId = new mongoose.Types.ObjectId().toString();
const studentId = new mongoose.Types.ObjectId().toString();
const adminToken = makeToken(adminId, 'admin');

// ─── Flow 1: Plan lifecycle ───────────────────────────────────────────────────

describe('E2E: Plan management lifecycle', () => {
  it('creates → reads public → updates → toggles → deletes', async () => {
    // 1. Create plan
    const createRes = await request(app)
      .post('/admin/plans').set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'E2E_PLAN', name: 'E2E Plan', price: 199000, durationMonths: 3, benefits: { skills: ['reading', 'listening'] } });
    expect(createRes.status).toBe(201);
    const planId = createRes.body.data._id;

    // 2. Public listing shows plan
    const listRes = await request(app).get('/plans');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.find(p => p.code === 'E2E_PLAN')).toBeDefined();

    // 3. Update plan price
    const updateRes = await request(app)
      .put(`/admin/plans/${planId}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 249000 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.price).toBe(249000);

    // 4. Toggle inactive
    const toggleRes = await request(app)
      .patch(`/admin/plans/${planId}/toggle-active`).set('Authorization', `Bearer ${adminToken}`);
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.isActive).toBe(false);

    // 5. Public listing no longer shows plan
    const listRes2 = await request(app).get('/plans');
    expect(listRes2.body.data.find(p => p.code === 'E2E_PLAN')).toBeUndefined();

    // 6. Delete plan
    const deleteRes = await request(app)
      .delete(`/admin/plans/${planId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    // 7. Admin listing shows 0 plans
    const adminList = await request(app)
      .get('/admin/plans').set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.body.data).toHaveLength(0);
  });
});

// ─── Flow 2: Subscription activation → skill check ───────────────────────────

describe('E2E: Subscription activation and skill access', () => {
  it('FREE user gets no skills → internal activates PLUS → user gets skills', async () => {
    // 1. FREE user has no skills
    const token = makeToken(studentId, 'student', 'FREE');
    const skillRes1 = await request(app).get('/my-skills').set('Authorization', `Bearer ${token}`);
    expect(skillRes1.status).toBe(200);
    expect(skillRes1.body.data.allowedSkills).toEqual([]);

    // 2. Admin creates plan
    await request(app)
      .post('/admin/plans').set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'PLUS_E2E', name: 'PLUS E2E', price: 199000, durationMonths: 3, benefits: { skills: ['reading', 'listening'] } });

    // 3. Internal activation (no auth required)
    const activateRes = await request(app)
      .post('/internal/subscriptions/activate')
      .send({ userId: studentId, planCode: 'PLUS_E2E', validUntil: new Date(Date.now() + 30 * 86400000) });
    expect(activateRes.status).toBe(200);
    expect(activateRes.body.data.status).toBe('ACTIVE');

    // 4. Student with PLUS token can access allowed skills via skill-check
    const plusToken = makeToken(studentId, 'student', 'PLUS_E2E');
    const skillCheck = await request(app).get('/skill-check/reading').set('Authorization', `Bearer ${plusToken}`);
    expect(skillCheck.status).toBe(200);
    expect(skillCheck.body.allowed).toBe(true);

    // 5. Denied for non-allowed skill
    const denyCheck = await request(app).get('/skill-check/writing').set('Authorization', `Bearer ${plusToken}`);
    expect(denyCheck.status).toBe(403);
  });
});

// ─── Flow 3: Cancel → restore subscription ───────────────────────────────────

describe('E2E: Admin cancel and restore subscription', () => {
  it('admin cancels active → validates → restores → active again', async () => {
    const plan = await Plan.create({ code: 'CANRES_PLAN', name: 'Cancel Restore', price: 199000, durationMonths: 3 });
    const userId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({
      userId, planId: plan._id, validUntil: new Date(Date.now() + 30 * 86400000),
    });

    // 1. Cancel subscription
    const cancelRes = await request(app)
      .post(`/admin/subscriptions/${sub._id}/cancel`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'POLICY_VIOLATION', editedTitle: 'Policy violation', editedMessage: 'Your account violated terms.' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(publishEvent).toHaveBeenCalledWith('billing.subscription.cancelled', expect.objectContaining({
      userId: userId.toString(),
    }));

    // 2. Cannot cancel again (not ACTIVE)
    const doubleCancelRes = await request(app)
      .post(`/admin/subscriptions/${sub._id}/cancel`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'POLICY_VIOLATION', editedTitle: 'T', editedMessage: 'M' });
    expect(doubleCancelRes.status).toBe(400);

    // 3. Restore subscription
    jest.clearAllMocks();
    publishEvent.mockResolvedValue(true);
    const restoreRes = await request(app)
      .post(`/admin/subscriptions/${sub._id}/restore`).set('Authorization', `Bearer ${adminToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.status).toBe('ACTIVE');
    expect(publishEvent).toHaveBeenCalledWith('billing.subscription.restored', expect.any(Object));

    // 4. Now can see active subscription in admin list
    const subsList = await request(app).get('/admin/subscriptions').set('Authorization', `Bearer ${adminToken}`);
    expect(subsList.status).toBe(200);
  });
});

// ─── Flow 4: Stats reflect actual data ───────────────────────────────────────

describe('E2E: Billing statistics accuracy', () => {
  it('stats increase after subscriptions are created', async () => {
    // Initial stats
    const stats1 = await request(app).get('/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(stats1.body.data.totalSubscriptions).toBe(0);

    // Create plan and subscriptions
    const plan = await Plan.create({ code: 'STATS_E2E', name: 'Stats E2E', price: 299000, durationMonths: 6 });
    const u1 = new mongoose.Types.ObjectId();
    const u2 = new mongoose.Types.ObjectId();
    const u3 = new mongoose.Types.ObjectId();
    await Subscription.create([
      { userId: u1, planId: plan._id, status: 'ACTIVE', validUntil: new Date(Date.now() + 86400000) },
      { userId: u2, planId: plan._id, status: 'ACTIVE', validUntil: new Date(Date.now() + 86400000) },
      { userId: u3, planId: plan._id, status: 'EXPIRED', validUntil: new Date(Date.now() - 1000) },
    ]);

    // Updated stats
    const stats2 = await request(app).get('/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(stats2.body.data.totalSubscriptions).toBe(3);
    expect(stats2.body.data.activeSubscriptions).toBe(2);
    expect(stats2.body.data.totalRevenue).toBeGreaterThan(0);
  });
});

// ─── Flow 5: Reminder notification ───────────────────────────────────────────

describe('E2E: Subscription expiry reminder', () => {
  it('admin sends reminder for expiring subscription', async () => {
    const plan = await Plan.create({ code: 'REM_E2E', name: 'Remind E2E', price: 100, durationMonths: 1 });
    const userId = new mongoose.Types.ObjectId();
    await Subscription.create({ userId, planId: plan._id, validUntil: new Date(Date.now() + 7 * 86400000) });

    const remindRes = await request(app)
      .post(`/admin/remind/${userId.toString()}`).set('Authorization', `Bearer ${adminToken}`);
    expect(remindRes.status).toBe(200);
    expect(publishEvent).toHaveBeenCalledWith(
      'billing.subscription.reminder',
      expect.objectContaining({ userId: userId.toString() })
    );
  });
});
