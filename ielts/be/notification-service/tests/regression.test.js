process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const NotificationLog = require('../src/models/NotificationLog');

const SECRET = 'test-jwt-secret';
const userId = new mongoose.Types.ObjectId();
const token = jwt.sign({ id: String(userId), role: 'student' }, SECRET, { expiresIn: '1h' });

describe('Notification regression/security tests', () => {
  beforeEach(async () => {
    await NotificationLog.create({
      userId,
      type: 'system',
      title: 'Secure test',
      message: 'Regression',
      channel: 'in-app',
      isRead: false,
    });
  });

  describe('Auth hardening', () => {
    it('rejects malformed token on protected route', async () => {
      const res = await request(app).patch('/read-all').set('Authorization', 'Bearer bad.token.value');
      expect(res.status).toBe(401);
    });

    it('rejects wrong-secret token', async () => {
      const wrong = jwt.sign({ id: String(userId), role: 'student' }, 'wrong', { expiresIn: '1h' });
      const res = await request(app).patch('/read-all').set('Authorization', `Bearer ${wrong}`);
      expect(res.status).toBe(401);
    });

    it('rejects expired token', async () => {
      const expired = jwt.sign({ id: String(userId), role: 'student' }, SECRET, { expiresIn: '-1s' });
      const res = await request(app).patch('/read-all').set('Authorization', `Bearer ${expired}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Ownership and input edges', () => {
    it('cannot mark notification from another user as read', async () => {
      const otherNotification = await NotificationLog.create({
        userId: new mongoose.Types.ObjectId(),
        type: 'system',
        title: 'Other user',
        message: 'No access',
        channel: 'in-app',
        isRead: false,
      });

      const res = await request(app)
        .patch(`/${otherNotification._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('invalid ObjectId in mark-as-read returns 500 (current behavior)', async () => {
      const res = await request(app).patch('/notanid/read').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });

    it('teacher send validates required body fields', async () => {
      const teacherToken = jwt.sign({ id: String(new mongoose.Types.ObjectId()), role: 'Teacher' }, SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .post('/teacher/send')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ message: 'missing userId' });

      expect(res.status).toBe(400);
    });
  });

  describe('Pagination limits', () => {
    it('caps limit at 100 and normalizes negative page', async () => {
      const res = await request(app).get('/?page=-2&limit=1000').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(100);
    });
  });
});
