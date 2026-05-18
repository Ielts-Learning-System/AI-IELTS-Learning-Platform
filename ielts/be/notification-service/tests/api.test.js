process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const NotificationLog = require('../src/models/NotificationLog');
const NotificationPreference = require('../src/models/NotificationPreference');
const PushSubscription = require('../src/models/PushSubscription');

const SECRET = 'test-jwt-secret';
const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const teacherId = new mongoose.Types.ObjectId();

const studentToken = jwt.sign({ id: String(userId), role: 'student' }, SECRET, { expiresIn: '1h' });
const teacherToken = jwt.sign({ id: String(teacherId), role: 'Teacher' }, SECRET, { expiresIn: '1h' });

describe('Notification API', () => {
  beforeEach(async () => {
    await NotificationLog.insertMany([
      {
        userId,
        type: 'grading_completed',
        title: 'Graded',
        message: 'Done',
        channel: 'in-app',
        isRead: false,
      },
      {
        userId,
        type: 'payment_approved',
        title: 'Paid',
        message: 'Approved',
        channel: 'in-app',
        isRead: true,
        readAt: new Date(),
      },
      {
        userId,
        type: 'welcome',
        title: 'Mail',
        message: 'Email sent',
        channel: 'email',
        isRead: false,
      },
      {
        userId: otherUserId,
        type: 'system',
        title: 'Other',
        message: 'Other user',
        channel: 'in-app',
        isRead: false,
      },
    ]);
  });

  describe('GET /', () => {
    it('returns paginated in-app notifications for authenticated user', async () => {
      const res = await request(app).get('/').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('returns filtered unread notifications', async () => {
      const res = await request(app).get('/?isRead=false').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].title).toBe('Graded');
    });

    it('returns empty shape without token', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.notifications).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('GET /unread-count', () => {
    it('returns unread in-app count', async () => {
      const res = await request(app).get('/unread-count').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(1);
    });

    it('returns 0 without token', async () => {
      const res = await request(app).get('/unread-count');
      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(0);
    });
  });

  describe('PATCH /:id/read and /read-all', () => {
    it('marks one notification as read', async () => {
      const notif = await NotificationLog.findOne({ userId, isRead: false, channel: 'in-app' });
      const res = await request(app)
        .patch(`/${notif._id}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.isRead).toBe(true);
      expect(res.body.notification.readAt).toBeDefined();
    });

    it('returns 404 when notification does not belong to user', async () => {
      const notif = await NotificationLog.findOne({ userId: otherUserId });
      const res = await request(app)
        .patch(`/${notif._id}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });

    it('marks all unread in-app notifications as read', async () => {
      const res = await request(app).patch('/read-all').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.modifiedCount).toBe(1);

      const unread = await NotificationLog.countDocuments({ userId, channel: 'in-app', isRead: false });
      expect(unread).toBe(0);
    });
  });

  describe('Preferences + Push + Teacher endpoints', () => {
    it('creates default preferences if missing', async () => {
      const res = await request(app).get('/preferences').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.preferences.channels.email).toBe(true);
      const saved = await NotificationPreference.findOne({ userId });
      expect(saved).not.toBeNull();
    });

    it('updates preferences', async () => {
      const res = await request(app)
        .put('/preferences')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ channels: { email: false, push: true, inApp: true } });

      expect(res.status).toBe(200);
      expect(res.body.preferences.channels.email).toBe(false);
    });

    it('validates push subscribe payload', async () => {
      const bad = await request(app).post('/push/subscribe').set('Authorization', `Bearer ${studentToken}`).send({});
      expect(bad.status).toBe(400);

      const ok = await request(app)
        .post('/push/subscribe')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ endpoint: 'https://push/sub1', keys: { p256dh: 'k1', auth: 'k2' } });

      expect(ok.status).toBe(201);
      const sub = await PushSubscription.findOne({ userId, endpoint: 'https://push/sub1' });
      expect(sub).not.toBeNull();
    });

    it('unsubscribe requires endpoint and deletes existing subscription', async () => {
      await PushSubscription.create({ userId, endpoint: 'https://push/sub2', keys: { p256dh: 'k1', auth: 'k2' } });

      const missing = await request(app)
        .delete('/push/subscribe')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({});
      expect(missing.status).toBe(400);

      const ok = await request(app)
        .delete('/push/subscribe')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ endpoint: 'https://push/sub2' });

      expect(ok.status).toBe(200);
      expect(ok.body.message).toMatch(/Unsubscribed/i);
      const gone = await PushSubscription.findOne({ userId, endpoint: 'https://push/sub2' });
      expect(gone).toBeNull();
    });

    it('teacher can send and list notifications for a student', async () => {
      const targetUserId = new mongoose.Types.ObjectId().toString();

      const sendRes = await request(app)
        .post('/teacher/send')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ userId: targetUserId, message: 'Please finish homework', title: 'Reminder' });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.notification.userId).toBe(targetUserId);

      const listRes = await request(app)
        .get(`/teacher/users/${targetUserId}/notifications`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.notifications)).toBe(true);
      expect(listRes.body.notifications.length).toBeGreaterThanOrEqual(1);
    });

    it('student is forbidden on teacher endpoints', async () => {
      const targetUserId = new mongoose.Types.ObjectId().toString();
      const listRes = await request(app)
        .get(`/teacher/users/${targetUserId}/notifications`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(listRes.status).toBe(403);

      const sendRes = await request(app)
        .post('/teacher/send')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ userId: targetUserId, message: 'Nope' });

      expect(sendRes.status).toBe(403);
    });
  });
});
