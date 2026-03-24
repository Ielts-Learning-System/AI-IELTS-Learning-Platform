const request = require('supertest');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const app = require('../../app');
const Plan = require('../../src/models/Plan');
const Subscription = require('../../src/models/Subscription');
const User = require('../../src/models/User');
const { generateTestToken } = require('../helpers');
require('../setup');

describe('Billing Routes — Integration', () => {
  let studentUser;
  let studentToken;

  beforeEach(async () => {
    // Billing auth middleware queries User from DB, so we must seed one
    studentUser = await User.create({
      email: 'student@test.com',
      password: 'Pass1234',
      name: 'Test Student',
      role: 'student',
    });
    studentToken = generateTestToken(studentUser._id.toString(), 'student');
  });

  // ============================================================
  // GET /plans — public
  // ============================================================
  describe('GET /plans', () => {
    it('should return all plans sorted by price', async () => {
      await Plan.create([
        { code: 'FREE', name: 'Free', price: 0, features: ['Basic access'], maxFullTests: 0 },
        { code: 'PRO', name: 'Pro', price: 299000, features: ['Unlimited'], maxFullTests: -1 },
        { code: 'PLUS', name: 'Plus', price: 99000, features: ['10 tests'], maxFullTests: 10 },
      ]);

      const res = await request(app).get('/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      // Sorted by price ascending
      expect(res.body.data[0].code).toBe('FREE');
      expect(res.body.data[1].code).toBe('PLUS');
      expect(res.body.data[2].code).toBe('PRO');
    });

    it('should return empty array if no plans', async () => {
      const res = await request(app).get('/plans');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ============================================================
  // GET /my-plan — authenticated student
  // ============================================================
  describe('GET /my-plan', () => {
    it('should create and return default FREE subscription', async () => {
      const res = await request(app)
        .get('/my-plan')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('FREE');
      expect(res.body.data.fullTestUsed).toBe(0);
    });

    it('should return existing subscription', async () => {
      await Subscription.create({
        userId: studentUser._id,
        plan: 'PLUS',
        fullTestUsed: 3,
      });

      const res = await request(app)
        .get('/my-plan')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe('PLUS');
      expect(res.body.data.fullTestUsed).toBe(3);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/my-plan');
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // POST /upgrade — upgrade plan
  // ============================================================
  describe('POST /upgrade', () => {
    it('should upgrade to PLUS', async () => {
      const res = await request(app)
        .post('/upgrade')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'PLUS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('PLUS');
    });

    it('should upgrade to PRO', async () => {
      const res = await request(app)
        .post('/upgrade')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'PRO' });

      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe('PRO');
    });

    it('should return 400 for invalid plan', async () => {
      const res = await request(app)
        .post('/upgrade')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'ULTRA' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reset fullTestUsed on upgrade', async () => {
      await Subscription.create({
        userId: studentUser._id,
        plan: 'PLUS',
        fullTestUsed: 8,
      });

      const res = await request(app)
        .post('/upgrade')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ plan: 'PRO' });

      expect(res.status).toBe(200);
      expect(res.body.data.fullTestUsed).toBe(0);
    });
  });

  // ============================================================
  // GET /check-eligibility
  // ============================================================
  describe('GET /check-eligibility', () => {
    it('should be ineligible for FREE plan', async () => {
      const res = await request(app)
        .get('/check-eligibility')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.eligible).toBe(false);
      expect(res.body.plan).toBe('FREE');
    });

    it('should be eligible for PLUS with under 10 uses', async () => {
      await Subscription.create({
        userId: studentUser._id,
        plan: 'PLUS',
        fullTestUsed: 5,
      });

      const res = await request(app)
        .get('/check-eligibility')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.eligible).toBe(true);
      expect(res.body.plan).toBe('PLUS');
    });

    it('should be ineligible for PLUS at 10 uses', async () => {
      await Subscription.create({
        userId: studentUser._id,
        plan: 'PLUS',
        fullTestUsed: 10,
      });

      const res = await request(app)
        .get('/check-eligibility')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.eligible).toBe(false);
    });

    it('should always be eligible for PRO', async () => {
      await Subscription.create({
        userId: studentUser._id,
        plan: 'PRO',
        fullTestUsed: 999,
      });

      const res = await request(app)
        .get('/check-eligibility')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.eligible).toBe(true);
    });
  });
});
