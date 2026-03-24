const request = require('supertest');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.VIETQR_BANK_ID = 'VCB';
process.env.VIETQR_ACCOUNT_NO = '1234567890';
process.env.VIETQR_ACCOUNT_NAME = 'TEST ACCOUNT';

const app = require('../../app');
const Transaction = require('../../src/models/transaction.model');
const User = require('../../src/models/user.model');
const { generateTestToken } = require('../helpers');
require('../setup');

describe('Payment Routes — Integration', () => {
  const userId = new mongoose.Types.ObjectId();
  let userToken;

  beforeAll(() => {
    userToken = generateTestToken(userId.toString(), 'student');
  });

  // ============================================================
  // POST /create — create VietQR payment
  // ============================================================
  describe('POST /create', () => {
    it('should create a pending transaction and return QR URL', async () => {
      const res = await request(app)
        .post('/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ planId: 'PLUS', amount: 99000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.qrUrl).toMatch(/img\.vietqr\.io/);
      expect(res.body.orderId).toMatch(/^VIP/);
      expect(res.body.amount).toBe(99000);

      // Verify transaction was created in DB
      const tx = await Transaction.findOne({ orderId: res.body.orderId });
      expect(tx).toBeDefined();
      expect(tx.status).toBe('Pending');
    });

    it('should return 400 if planId missing', async () => {
      const res = await request(app)
        .post('/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 99000 });

      expect(res.status).toBe(400);
    });

    it('should return 400 if amount is zero or negative', async () => {
      const res = await request(app)
        .post('/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ planId: 'PLUS', amount: -100 });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/create')
        .send({ planId: 'PLUS', amount: 99000 });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // GET /transactions/my-pending
  // ============================================================
  describe('GET /transactions/my-pending', () => {
    it('should return latest pending transaction', async () => {
      await Transaction.create({
        orderId: 'VIP123456',
        userId,
        planId: 'PLUS',
        amount: 99000,
        status: 'Pending',
      });

      const res = await request(app)
        .get('/transactions/my-pending')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBe('VIP123456');
    });

    it('should return null if no pending transaction', async () => {
      const res = await request(app)
        .get('/transactions/my-pending')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  // ============================================================
  // GET /transactions — admin list
  // ============================================================
  describe('GET /transactions', () => {
    it('should return all transactions', async () => {
      await Transaction.create({
        orderId: 'VIP111111',
        userId,
        planId: 'PRO',
        amount: 299000,
        status: 'Pending',
      });

      const res = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  // ============================================================
  // PUT /transactions/:id/approve
  // ============================================================
  describe('PUT /transactions/:id/approve', () => {
    let transactionId;

    beforeEach(async () => {
      // Create a user in the users collection for the approval to update
      await User.create({
        _id: userId,
        subscriptionPlan: 'Free',
      });

      const tx = await Transaction.create({
        orderId: 'VIP222222',
        userId,
        planId: 'PLUS',
        amount: 99000,
        status: 'Pending',
      });
      transactionId = tx._id.toString();
    });

    it('should approve a pending transaction and upgrade user', async () => {
      const res = await request(app)
        .put(`/transactions/${transactionId}/approve`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Success');

      // Verify user was upgraded
      const user = await User.findById(userId);
      expect(user.subscriptionPlan).toBe('VIP_1_MONTH');
      expect(user.vipValidUntil).toBeDefined();
    });

    it('should return 404 for non-existent transaction', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/transactions/${fakeId}/approve`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 if transaction already approved', async () => {
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Success' });

      const res = await request(app)
        .put(`/transactions/${transactionId}/approve`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/pending/i);
    });
  });

  // ============================================================
  // PUT /transactions/:id/reject
  // ============================================================
  describe('PUT /transactions/:id/reject', () => {
    let transactionId;

    beforeEach(async () => {
      const tx = await Transaction.create({
        orderId: 'VIP333333',
        userId,
        planId: 'PRO',
        amount: 299000,
        status: 'Pending',
      });
      transactionId = tx._id.toString();
    });

    it('should reject a pending transaction', async () => {
      const res = await request(app)
        .put(`/transactions/${transactionId}/reject`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Failed');
    });

    it('should return 400 if already rejected', async () => {
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });

      const res = await request(app)
        .put(`/transactions/${transactionId}/reject`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });
  });
});
