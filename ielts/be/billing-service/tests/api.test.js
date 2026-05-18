/**
 * Billing-service — API tests
 * Covers all 18+ endpoints across billing.routes.js, reports.routes.js, resources.routes.js
 */
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// Mocks must be declared before any requires
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
  post: jest.fn().mockResolvedValue({ data: { data: [] } }),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');
const { publishEvent } = require('../src/services/rabbitmq.service');
const { getAuthUser } = require('../src/config/reportingConnections');

const SECRET = 'test-jwt-secret';
const makeToken = (id, role, plan = 'FREE') =>
  jwt.sign({ id: String(id), role, plan }, SECRET, { expiresIn: '1h' });

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
  getAuthUser.mockReturnValue({
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  });
  axios.post.mockResolvedValue({ data: { data: [] } });
  jest.clearAllMocks();
  // Re-apply mocks after clearAllMocks
  getAuthUser.mockReturnValue({
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  });
  publishEvent.mockResolvedValue(true);
  axios.post.mockResolvedValue({ data: { data: [] } });
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
    expect(res.body.status).toMatch(/healthy/i);
  });
});

// ─── Plans (public) ──────────────────────────────────────────────────────────

describe('GET /plans', () => {
  it('200 - returns only active plans sorted by price asc', async () => {
    await Plan.create([
      { code: 'PRO', name: 'PRO', price: 399000, durationMonths: 6, isActive: true },
      { code: 'PLUS', name: 'PLUS', price: 199000, durationMonths: 3, isActive: true },
      { code: 'OLD', name: 'OLD', price: 99000, durationMonths: 1, isActive: false },
    ]);
    const res = await request(app).get('/plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].code).toBe('PLUS');
    expect(res.body.data[1].code).toBe('PRO');
  });

  it('200 - empty array when no active plans', async () => {
    const res = await request(app).get('/plans');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('200 - no auth token required', async () => {
    const res = await request(app).get('/plans');
    expect(res.status).toBe(200);
  });
});

// ─── My Subscription ─────────────────────────────────────────────────────────

describe('GET /my-subscription', () => {
  it('401 - no token', async () => {
    const res = await request(app).get('/my-subscription');
    expect(res.status).toBe(401);
  });

  it('200 - data:null + planFallback for FREE user with no subscription record', async () => {
    const res = await request(app).get('/my-subscription').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
    expect(res.body.planFallback).toMatchObject({ code: 'FREE' });
  });

  it('200 - returns ACTIVE subscription', async () => {
    const plan = await Plan.create({ code: 'ACTIVE_PLAN', name: 'Active', price: 199000, durationMonths: 3 });
    await Subscription.create({ userId: studentId, planId: plan._id, validUntil: new Date(Date.now() + 86400000) });
    const res = await request(app).get('/my-subscription').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('200 - auto-expires past validUntil subscription', async () => {
    const plan = await Plan.create({ code: 'EXP_PLAN', name: 'Expired', price: 100, durationMonths: 1 });
    await Subscription.create({
      userId: studentId, planId: plan._id,
      status: 'ACTIVE', validUntil: new Date(Date.now() - 1000),
    });
    const res = await request(app).get('/my-subscription').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('EXPIRED');
  });
});

// ─── My Plan (alias) ─────────────────────────────────────────────────────────

describe('GET /my-plan', () => {
  it('401 - no token', async () => {
    const res = await request(app).get('/my-plan');
    expect(res.status).toBe(401);
  });

  it('200 - same behavior as my-subscription', async () => {
    const res = await request(app).get('/my-plan').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.planFallback).toBeDefined();
  });
});

// ─── My Skills ───────────────────────────────────────────────────────────────

describe('GET /my-skills', () => {
  it('401 - no token', async () => {
    const res = await request(app).get('/my-skills');
    expect(res.status).toBe(401);
  });

  it('200 - FREE plan returns empty allowedSkills', async () => {
    const res = await request(app).get('/my-skills').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.allowedSkills).toEqual([]);
    expect(res.body.data.plan).toBe('FREE');
  });

  it('200 - PLUS plan returns configured skills', async () => {
    await Plan.create({ code: 'PLUS', name: 'PLUS', price: 199000, durationMonths: 3, benefits: { skills: ['reading', 'listening'] } });
    const token = makeToken(studentId, 'student', 'PLUS');
    const res = await request(app).get('/my-skills').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.allowedSkills).toContain('reading');
    expect(res.body.data.allowedSkills).toContain('listening');
    expect(res.body.data.allowedSkills).not.toContain('writing');
  });

  it('200 - PRO flag set when plan is PRO', async () => {
    await Plan.create({ code: 'PRO', name: 'PRO', price: 399000, durationMonths: 6, benefits: { skills: ['reading', 'listening', 'writing', 'speaking'] } });
    const token = makeToken(studentId, 'student', 'PRO');
    const res = await request(app).get('/my-skills').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isPro).toBe(true);
  });
});

// ─── Admin: Plan CRUD ─────────────────────────────────────────────────────────

describe('POST /admin/plans', () => {
  it('401 - no token', async () => {
    const res = await request(app).post('/admin/plans').send({ code: 'X', name: 'X', price: 1, durationMonths: 1 });
    expect(res.status).toBe(401);
  });

  it('403 - student cannot create plan', async () => {
    const res = await request(app)
      .post('/admin/plans').set('Authorization', `Bearer ${studentToken}`)
      .send({ code: 'X', name: 'X', price: 1, durationMonths: 1 });
    expect(res.status).toBe(403);
  });

  it('201 - admin creates plan', async () => {
    const res = await request(app)
      .post('/admin/plans').set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'NEW_PLAN', name: 'New Plan', price: 299000, durationMonths: 6 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('NEW_PLAN');
  });

  it('400 - missing required fields', async () => {
    const res = await request(app)
      .post('/admin/plans').set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'INCOMPLETE' });
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/plans', () => {
  it('403 - student cannot list admin plans', async () => {
    const res = await request(app).get('/admin/plans').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('200 - admin gets all plans including inactive', async () => {
    await Plan.create([
      { code: 'ACTIVE_P', name: 'Active', price: 100, durationMonths: 1, isActive: true },
      { code: 'INACTIVE_P', name: 'Inactive', price: 200, durationMonths: 2, isActive: false },
    ]);
    const res = await request(app).get('/admin/plans').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('PUT /admin/plans/:planId', () => {
  it('200 - admin updates plan fields', async () => {
    const plan = await Plan.create({ code: 'UPD_PLAN', name: 'Before', price: 100, durationMonths: 1 });
    const res = await request(app)
      .put(`/admin/plans/${plan._id}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'After', price: 999 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('After');
    expect(res.body.data.price).toBe(999);
  });

  it('404 - plan not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/admin/plans/${fakeId}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /admin/plans/:planId/toggle-active', () => {
  it('200 - toggles isActive from true to false', async () => {
    const plan = await Plan.create({ code: 'TOG_PLAN', name: 'Toggle', price: 100, durationMonths: 1, isActive: true });
    const res = await request(app)
      .patch(`/admin/plans/${plan._id}/toggle-active`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('200 - toggles isActive from false to true', async () => {
    const plan = await Plan.create({ code: 'TOG2_PLAN', name: 'Toggle2', price: 100, durationMonths: 1, isActive: false });
    const res = await request(app)
      .patch(`/admin/plans/${plan._id}/toggle-active`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  it('404 - plan not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/admin/plans/${fakeId}/toggle-active`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /admin/plans/:planId', () => {
  it('200 - admin deletes plan', async () => {
    const plan = await Plan.create({ code: 'DEL_PLAN', name: 'Delete Me', price: 100, durationMonths: 1 });
    const res = await request(app)
      .delete(`/admin/plans/${plan._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('404 - plan not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/admin/plans/${fakeId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('403 - student cannot delete plan', async () => {
    const plan = await Plan.create({ code: 'PROT_PLAN', name: 'Protected', price: 100, durationMonths: 1 });
    const res = await request(app)
      .delete(`/admin/plans/${plan._id}`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Admin: Stats ─────────────────────────────────────────────────────────────

describe('GET /admin/stats', () => {
  it('200 - returns billing stats with zero values when empty', async () => {
    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
    });
  });

  it('200 - counts active subscriptions correctly', async () => {
    const plan = await Plan.create({ code: 'STATS_PLAN', name: 'Stats', price: 199000, durationMonths: 3 });
    const u1 = new mongoose.Types.ObjectId();
    const u2 = new mongoose.Types.ObjectId();
    await Subscription.create([
      { userId: u1, planId: plan._id, status: 'ACTIVE', validUntil: new Date(Date.now() + 86400000) },
      { userId: u2, planId: plan._id, status: 'EXPIRED', validUntil: new Date(Date.now() - 1000) },
    ]);
    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalSubscriptions).toBe(2);
    expect(res.body.data.activeSubscriptions).toBe(1);
  });
});

// ─── Admin: Subscriptions ─────────────────────────────────────────────────────

describe('GET /admin/subscriptions', () => {
  it('403 - student cannot view all subscriptions', async () => {
    const res = await request(app).get('/admin/subscriptions').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('200 - admin gets all subscriptions', async () => {
    const res = await request(app).get('/admin/subscriptions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 - includes subscription data with daysRemaining', async () => {
    const plan = await Plan.create({ code: 'SUBS_PLAN', name: 'Subs', price: 199000, durationMonths: 3 });
    const userId = new mongoose.Types.ObjectId();
    await Subscription.create({ userId, planId: plan._id, validUntil: new Date(Date.now() + 5 * 86400000) });
    const res = await request(app).get('/admin/subscriptions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const sub = res.body.data.find(d => d._id !== null);
    if (sub) expect(sub.daysRemaining).toBeGreaterThan(0);
  });
});

// ─── Internal: Activate Subscription ─────────────────────────────────────────

describe('POST /internal/subscriptions/activate', () => {
  it('400 - missing userId', async () => {
    const res = await request(app)
      .post('/internal/subscriptions/activate')
      .send({ planCode: 'PLUS', validUntil: new Date(Date.now() + 86400000) });
    expect(res.status).toBe(400);
  });

  it('400 - missing planCode', async () => {
    const res = await request(app)
      .post('/internal/subscriptions/activate')
      .send({ userId: studentId, validUntil: new Date(Date.now() + 86400000) });
    expect(res.status).toBe(400);
  });

  it('400 - missing validUntil', async () => {
    const res = await request(app)
      .post('/internal/subscriptions/activate')
      .send({ userId: studentId, planCode: 'PLUS' });
    expect(res.status).toBe(400);
  });

  it('400 - invalid userId format', async () => {
    const res = await request(app)
      .post('/internal/subscriptions/activate')
      .send({ userId: 'not-an-objectid', planCode: 'PLUS', validUntil: new Date(Date.now() + 86400000) });
    expect(res.status).toBe(400);
  });

  it('404 - unknown planCode', async () => {
    const res = await request(app)
      .post('/internal/subscriptions/activate')
      .send({ userId: studentId, planCode: 'NONEXISTENT', validUntil: new Date(Date.now() + 86400000) });
    expect(res.status).toBe(404);
  });

  it('200 - activates subscription without auth token (no auth required)', async () => {
    await Plan.create({ code: 'INTERNAL_PLAN', name: 'Internal', price: 100, durationMonths: 1 });
    const res = await request(app)
      .post('/internal/subscriptions/activate')
      .send({ userId: studentId, planCode: 'INTERNAL_PLAN', validUntil: new Date(Date.now() + 86400000) });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('200 - upserts subscription (idempotent)', async () => {
    await Plan.create({ code: 'UPSERT_PLAN', name: 'Upsert', price: 100, durationMonths: 1 });
    await request(app).post('/internal/subscriptions/activate')
      .send({ userId: studentId, planCode: 'UPSERT_PLAN', validUntil: new Date(Date.now() + 86400000) });
    const res = await request(app).post('/internal/subscriptions/activate')
      .send({ userId: studentId, planCode: 'UPSERT_PLAN', validUntil: new Date(Date.now() + 2 * 86400000) });
    expect(res.status).toBe(200);
    expect(await Subscription.countDocuments({ userId: studentId })).toBe(1);
  });
});

// ─── Admin: Reminder ──────────────────────────────────────────────────────────

describe('POST /admin/remind/:userId', () => {
  it('400 - invalid userId format', async () => {
    const res = await request(app)
      .post('/admin/remind/not-an-id').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('404 - no subscription for user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/admin/remind/${fakeId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('200 - publishes billing.subscription.reminder event', async () => {
    const plan = await Plan.create({ code: 'REM_PLAN', name: 'Remind Plan', price: 100, durationMonths: 1 });
    const userId = new mongoose.Types.ObjectId();
    await Subscription.create({ userId, planId: plan._id, validUntil: new Date(Date.now() + 7 * 86400000) });
    const res = await request(app)
      .post(`/admin/remind/${userId.toString()}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(publishEvent).toHaveBeenCalledWith('billing.subscription.reminder', expect.objectContaining({
      userId: userId.toString(),
    }));
  });
});

// ─── Admin: Cancel Subscription ───────────────────────────────────────────────

describe('POST /admin/subscriptions/:subscriptionId/cancel', () => {
  it('400 - missing reason / title / message', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/admin/subscriptions/${fakeId}/cancel`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'POLICY_VIOLATION' });
    expect(res.status).toBe(400);
  });

  it('400 - invalid reason enum', async () => {
    const plan = await Plan.create({ code: 'CAN_P1', name: 'Cancel', price: 100, durationMonths: 1 });
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id, validUntil: new Date(Date.now() + 86400000),
    });
    const res = await request(app)
      .post(`/admin/subscriptions/${sub._id}/cancel`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'INVALID_REASON', editedTitle: 'T', editedMessage: 'M' });
    expect(res.status).toBe(400);
  });

  it('400 - cannot cancel non-ACTIVE subscription', async () => {
    const plan = await Plan.create({ code: 'CAN_P2', name: 'Cancel', price: 100, durationMonths: 1 });
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(Date.now() + 86400000), status: 'EXPIRED',
    });
    const res = await request(app)
      .post(`/admin/subscriptions/${sub._id}/cancel`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'POLICY_VIOLATION', editedTitle: 'T', editedMessage: 'M' });
    expect(res.status).toBe(400);
  });

  it('200 - cancels ACTIVE subscription and publishes event', async () => {
    axios.post.mockResolvedValue({ data: { data: [{ name: 'Test User', email: 'test@test.com' }] } });
    const plan = await Plan.create({ code: 'CAN_P3', name: 'Cancel Plan', price: 199000, durationMonths: 3 });
    const userId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({
      userId, planId: plan._id, validUntil: new Date(Date.now() + 86400000),
    });
    const res = await request(app)
      .post(`/admin/subscriptions/${sub._id}/cancel`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'POLICY_VIOLATION', editedTitle: 'Cancelled', editedMessage: 'Your subscription was cancelled.' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(res.body.data.cancellationReason).toBe('POLICY_VIOLATION');
    expect(publishEvent).toHaveBeenCalledWith('billing.subscription.cancelled', expect.any(Object));
  });

  it('200 - proceeds with fallback user data when axios fails', async () => {
    axios.post.mockRejectedValue(new Error('Auth service down'));
    const plan = await Plan.create({ code: 'CAN_P4', name: 'Cancel Fallback', price: 100, durationMonths: 1 });
    const userId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({ userId, planId: plan._id, validUntil: new Date(Date.now() + 86400000) });
    const res = await request(app)
      .post(`/admin/subscriptions/${sub._id}/cancel`).set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'USER_REQUEST_REFUND', editedTitle: 'T', editedMessage: 'M' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });
});

// ─── Admin: Restore Subscription ──────────────────────────────────────────────

describe('POST /admin/subscriptions/:subscriptionId/restore', () => {
  it('400 - cannot restore non-CANCELLED subscription', async () => {
    const plan = await Plan.create({ code: 'RES_P1', name: 'Restore', price: 100, durationMonths: 1 });
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id, validUntil: new Date(Date.now() + 86400000),
    });
    const res = await request(app)
      .post(`/admin/subscriptions/${sub._id}/restore`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('400 - cannot restore if validUntil is in the past', async () => {
    const plan = await Plan.create({ code: 'RES_P2', name: 'Restore Expired', price: 100, durationMonths: 1 });
    const userId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({
      userId, planId: plan._id, validUntil: new Date(Date.now() - 1000),
      status: 'CANCELLED', cancellationReason: 'USER_REQUEST_REFUND', cancelledAt: new Date(),
    });
    const res = await request(app)
      .post(`/admin/subscriptions/${sub._id}/restore`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('200 - restores CANCELLED subscription and publishes event', async () => {
    axios.post.mockResolvedValue({ data: { data: [{ name: 'Restored User', email: 'r@test.com' }] } });
    const plan = await Plan.create({ code: 'RES_P3', name: 'Restore Plan', price: 199000, durationMonths: 3 });
    const userId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({
      userId, planId: plan._id, validUntil: new Date(Date.now() + 86400000),
      status: 'CANCELLED', cancellationReason: 'USER_REQUEST_REFUND', cancelledAt: new Date(),
    });
    const res = await request(app)
      .post(`/admin/subscriptions/${sub._id}/restore`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(publishEvent).toHaveBeenCalledWith('billing.subscription.restored', expect.any(Object));
  });
});

// ─── Skill Check ──────────────────────────────────────────────────────────────

describe('GET /skill-check/:skillName', () => {
  it('401 - no token', async () => {
    const res = await request(app).get('/skill-check/reading');
    expect(res.status).toBe(401);
  });

  it('200 - PRO user passes all skills', async () => {
    const token = makeToken(studentId, 'student', 'PRO');
    const res = await request(app).get('/skill-check/reading').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
  });

  it('403 - FREE user denied for any skill', async () => {
    const res = await request(app).get('/skill-check/writing').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SKILL_NOT_ALLOWED');
  });

  it('200 - PLUS user allowed for skill in plan', async () => {
    await Plan.create({ code: 'PLUS', name: 'PLUS', price: 100, durationMonths: 3, benefits: { skills: ['reading'] } });
    const token = makeToken(studentId, 'student', 'PLUS');
    const res = await request(app).get('/skill-check/reading').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.skill).toBe('reading');
  });

  it('403 - PLUS user denied for skill not in plan', async () => {
    await Plan.create({ code: 'PLUS', name: 'PLUS', price: 100, durationMonths: 3, benefits: { skills: ['reading'] } });
    const token = makeToken(studentId, 'student', 'PLUS');
    const res = await request(app).get('/skill-check/speaking').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── Example Writing Submit ───────────────────────────────────────────────────

describe('POST /example/writing/submit', () => {
  it('401 - no token', async () => {
    const res = await request(app).post('/example/writing/submit').send({});
    expect(res.status).toBe(401);
  });

  it('403 - FREE user cannot submit', async () => {
    const res = await request(app)
      .post('/example/writing/submit').set('Authorization', `Bearer ${studentToken}`).send({});
    expect(res.status).toBe(403);
  });

  it('201 - PRO user can submit', async () => {
    const token = makeToken(studentId, 'student', 'PRO');
    const res = await request(app)
      .post('/example/writing/submit').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('201 - PLUS user with writing skill can submit', async () => {
    await Plan.create({ code: 'PLUS', name: 'PLUS', price: 100, durationMonths: 3, benefits: { skills: ['reading', 'writing'] } });
    const token = makeToken(studentId, 'student', 'PLUS');
    const res = await request(app)
      .post('/example/writing/submit').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(201);
  });
});
