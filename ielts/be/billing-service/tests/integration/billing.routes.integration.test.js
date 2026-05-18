const request = require('supertest');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/services/rabbitmq.service', () => ({
  EXCHANGE_NAME: 'ielts_events',
  publishEvent: jest.fn(async () => true),
}));

jest.mock('../../src/config/reportingConnections', () => ({
  getAuthUser: jest.fn(() => ({
    find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) })),
  })),
  getTransaction: jest.fn(),
  getAILog: jest.fn(),
  getReadingAttempt: jest.fn(),
  getReadingTest: jest.fn(),
}));

jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { data: [] } }),
}));

const app = require('../../app');
const Plan = require('../../src/models/Plan');
const Subscription = require('../../src/models/Subscription');
const User = require('../../src/models/User');
const { publishEvent } = require('../../src/services/rabbitmq.service');
const { generateTestToken } = require('../helpers');
require('../setup');

describe('Billing Routes — Integration (Dynamic Subscription)', () => {
  let studentUser;
  let adminUser;
  let studentToken;
  let adminToken;

  beforeEach(async () => {
    studentUser = await User.create({
      email: 'student@test.com',
      password: 'Pass1234',
      name: 'Test Student',
      role: 'student',
    });

    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'Pass1234',
      name: 'Test Admin',
      role: 'admin',
    });

    studentToken = generateTestToken(studentUser._id.toString(), 'student');
    adminToken = generateTestToken(adminUser._id.toString(), 'admin');
  });

  describe('GET /plans', () => {
    it('returns active plans sorted by price ascending', async () => {
      await Plan.create([
        {
          code: 'VIP_PRO_6M',
          name: 'VIP PRO',
          price: 399000,
          durationMonths: 6,
          isActive: true,
          benefits: { skills: ['reading', 'listening'] },
        },
        {
          code: 'VIP_PLUS_3M',
          name: 'VIP PLUS',
          price: 199000,
          durationMonths: 3,
          isActive: true,
          benefits: { skills: ['reading'] },
        },
        {
          code: 'VIP_OLD',
          name: 'VIP OLD',
          price: 99000,
          durationMonths: 1,
          isActive: false,
          benefits: { skills: ['reading'] },
        },
      ]);

      const res = await request(app).get('/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].code).toBe('VIP_PLUS_3M');
      expect(res.body.data[1].code).toBe('VIP_PRO_6M');
    });
  });

  describe('GET /my-subscription', () => {
    it('returns 200 with data:null when subscription does not exist (FREE plan)', async () => {
      const res = await request(app)
        .get('/my-subscription')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
      expect(res.body.planFallback).toBeDefined();
    });

    it('returns populated subscription and auto-expires when validUntil is in the past', async () => {
      const plan = await Plan.create({
        code: 'VIP_PRO_3M',
        name: 'VIP PRO',
        price: 299000,
        durationMonths: 3,
        isActive: true,
        benefits: { skills: ['reading', 'listening', 'writing', 'speaking'] },
      });

      await Subscription.create({
        userId: studentUser._id,
        planId: plan._id,
        status: 'ACTIVE',
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get('/my-subscription')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.planId.name).toBe('VIP PRO');
      expect(res.body.data.status).toBe('EXPIRED');
    });
  });

  describe('Admin plan APIs', () => {
    it('allows admin to create, update and toggle plan active status', async () => {
      const createRes = await request(app)
        .post('/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'VIP_PLUS_1M',
          name: 'VIP PLUS',
          price: 99000,
          durationMonths: 1,
          isActive: true,
          benefits: { skills: ['reading'] },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.code).toBe('VIP_PLUS_1M');

      const planId = createRes.body.data._id;

      const updateRes = await request(app)
        .put(`/admin/plans/${planId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          durationMonths: 3,
          benefits: { skills: ['reading', 'listening'] },
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.durationMonths).toBe(3);
      expect(updateRes.body.data.benefits.skills).toEqual(['reading', 'listening']);

      const toggleRes = await request(app)
        .patch(`/admin/plans/${planId}/toggle-active`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.isActive).toBe(false);
    });

    it('blocks student from admin endpoints', async () => {
      const res = await request(app)
        .get('/admin/plans')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /admin/subscriptions', () => {
    it('returns subscriptions with populated plan and daysRemaining', async () => {
      const plan = await Plan.create({
        code: 'VIP_PRO_1M',
        name: 'VIP PRO',
        price: 149000,
        durationMonths: 1,
        isActive: true,
        benefits: { skills: ['reading', 'listening'] },
      });

      await Subscription.create({
        userId: studentUser._id,
        planId: plan._id,
        status: 'ACTIVE',
        validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].planId.name).toBe('VIP PRO');
      expect(res.body.data[0].planId.durationMonths).toBe(1);
      expect(res.body.data[0].daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('POST /admin/remind/:userId', () => {
    it('publishes billing.subscription.reminder event', async () => {
      const plan = await Plan.create({
        code: 'VIP_PRO_12M',
        name: 'VIP PRO',
        price: 799000,
        durationMonths: 12,
        isActive: true,
        benefits: { skills: ['reading', 'listening', 'writing', 'speaking'] },
      });

      await Subscription.create({
        userId: studentUser._id,
        planId: plan._id,
        status: 'ACTIVE',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post(`/admin/remind/${studentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(publishEvent).toHaveBeenCalledWith(
        'billing.subscription.reminder',
        expect.objectContaining({
          userId: studentUser._id.toString(),
          planName: 'VIP PRO',
        })
      );
    });
  });
});
