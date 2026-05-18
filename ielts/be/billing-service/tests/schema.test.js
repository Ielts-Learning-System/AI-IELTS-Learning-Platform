/**
 * Billing-service — Schema validation tests
 * Covers: Plan model, Subscription model
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');

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

afterEach(async () => {
  await Plan.deleteMany({});
  await Subscription.deleteMany({});
});

// ─── Plan ────────────────────────────────────────────────────────────────────

describe('Plan Schema', () => {
  it('saves a valid plan with defaults', async () => {
    const plan = await Plan.create({ code: 'PLUS_3M', name: 'PLUS 3M', price: 199000, durationMonths: 3 });
    expect(plan._id).toBeDefined();
    expect(plan.isActive).toBe(true);
    expect(plan.benefits.maxHours).toBe(-1);
    expect(plan.benefits.maxFullTests).toBe(0);
    expect(plan.features).toEqual([]);
  });

  it('rejects missing code', async () => {
    await expect(Plan.create({ name: 'No Code', price: 100, durationMonths: 1 })).rejects.toThrow();
  });

  it('rejects missing name', async () => {
    await expect(Plan.create({ code: 'X', price: 100, durationMonths: 1 })).rejects.toThrow();
  });

  it('rejects missing price', async () => {
    await expect(Plan.create({ code: 'X', name: 'X', durationMonths: 1 })).rejects.toThrow();
  });

  it('rejects missing durationMonths', async () => {
    await expect(Plan.create({ code: 'X', name: 'X', price: 100 })).rejects.toThrow();
  });

  it('enforces unique code', async () => {
    await Plan.create({ code: 'UNIQUE_CODE', name: 'Plan A', price: 100, durationMonths: 1 });
    await expect(Plan.create({ code: 'UNIQUE_CODE', name: 'Plan B', price: 200, durationMonths: 2 })).rejects.toThrow();
  });

  it('rejects invalid benefits.skills enum value', async () => {
    await expect(Plan.create({
      code: 'BAD_SKILL', name: 'Bad', price: 100, durationMonths: 1,
      benefits: { skills: ['invalid_skill'] },
    })).rejects.toThrow();
  });

  it('accepts all four valid skill enum values', async () => {
    const plan = await Plan.create({
      code: 'ALL_SKILLS', name: 'All Skills', price: 399000, durationMonths: 12,
      benefits: { skills: ['reading', 'listening', 'writing', 'speaking'] },
    });
    expect(plan.benefits.skills).toHaveLength(4);
  });

  it('saves ui sub-document', async () => {
    const plan = await Plan.create({
      code: 'UI_PLAN', name: 'UI Plan', price: 100, durationMonths: 1,
      ui: { borderColor: '#FF0000', buttonText: 'Subscribe', badge: 'Popular' },
    });
    expect(plan.ui.borderColor).toBe('#FF0000');
    expect(plan.ui.badge).toBe('Popular');
  });

  it('stores features array', async () => {
    const plan = await Plan.create({
      code: 'FEAT_PLAN', name: 'Feature Plan', price: 100, durationMonths: 1,
      features: ['AI grading', 'Band score report'],
    });
    expect(plan.features).toHaveLength(2);
  });

  it('sets timestamps', async () => {
    const plan = await Plan.create({ code: 'TS_PLAN', name: 'TS', price: 1, durationMonths: 1 });
    expect(plan.createdAt).toBeInstanceOf(Date);
    expect(plan.updatedAt).toBeInstanceOf(Date);
  });
});

// ─── Subscription ────────────────────────────────────────────────────────────

describe('Subscription Schema', () => {
  let plan;

  beforeEach(async () => {
    plan = await Plan.create({ code: 'TEST_PLAN', name: 'Test Plan', price: 100, durationMonths: 1 });
  });

  it('saves a valid subscription with defaults', async () => {
    const userId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({
      userId, planId: plan._id, validUntil: new Date(Date.now() + 86400000),
    });
    expect(sub.status).toBe('ACTIVE');
    expect(sub.fullTestUsed).toBe(0);
    expect(sub.cancelledAt).toBeNull();
    expect(sub.cancellationReason).toBeNull();
  });

  it('rejects missing userId', async () => {
    await expect(Subscription.create({ planId: plan._id, validUntil: new Date() })).rejects.toThrow();
  });

  it('rejects missing planId', async () => {
    await expect(Subscription.create({ userId: new mongoose.Types.ObjectId(), validUntil: new Date() })).rejects.toThrow();
  });

  it('rejects missing validUntil', async () => {
    await expect(Subscription.create({ userId: new mongoose.Types.ObjectId(), planId: plan._id })).rejects.toThrow();
  });

  it('rejects invalid status enum', async () => {
    await expect(Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(), status: 'PENDING',
    })).rejects.toThrow();
  });

  it('accepts ACTIVE status', async () => {
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(Date.now() + 86400000), status: 'ACTIVE',
    });
    expect(sub.status).toBe('ACTIVE');
  });

  it('accepts EXPIRED status', async () => {
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(Date.now() - 1000), status: 'EXPIRED',
    });
    expect(sub.status).toBe('EXPIRED');
  });

  it('accepts CANCELLED with valid reason', async () => {
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(), status: 'CANCELLED',
      cancellationReason: 'POLICY_VIOLATION', cancelledAt: new Date(),
    });
    expect(sub.cancellationReason).toBe('POLICY_VIOLATION');
  });

  it('accepts USER_REQUEST_REFUND reason', async () => {
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(), status: 'CANCELLED',
      cancellationReason: 'USER_REQUEST_REFUND', cancelledAt: new Date(),
    });
    expect(sub.cancellationReason).toBe('USER_REQUEST_REFUND');
  });

  it('accepts SYSTEM_ERROR reason', async () => {
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(), status: 'CANCELLED',
      cancellationReason: 'SYSTEM_ERROR', cancelledAt: new Date(),
    });
    expect(sub.cancellationReason).toBe('SYSTEM_ERROR');
  });

  it('rejects invalid cancellationReason', async () => {
    await expect(Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id,
      validUntil: new Date(), cancellationReason: 'FRAUD',
    })).rejects.toThrow();
  });

  it('enforces userId uniqueness', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Subscription.create({ userId, planId: plan._id, validUntil: new Date(Date.now() + 86400000) });
    await expect(Subscription.create({ userId, planId: plan._id, validUntil: new Date(Date.now() + 86400000) })).rejects.toThrow();
  });

  it('sets timestamps', async () => {
    const sub = await Subscription.create({
      userId: new mongoose.Types.ObjectId(), planId: plan._id, validUntil: new Date(Date.now() + 86400000),
    });
    expect(sub.createdAt).toBeInstanceOf(Date);
    expect(sub.updatedAt).toBeInstanceOf(Date);
  });
});
