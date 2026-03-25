const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const NotificationLog = require('../../src/models/NotificationLog');
const NotificationPreference = require('../../src/models/NotificationPreference');
const { generateTestToken, TEST_JWT_SECRET } = require('../helpers');

// Override JWT secret for tests
process.env.JWT_SECRET = TEST_JWT_SECRET;

const userId = new mongoose.Types.ObjectId();
const token = generateTestToken(userId.toString());

describe('Notification API', () => {
  // Seed some notifications before each test
  beforeEach(async () => {
    await NotificationLog.insertMany([
      {
        userId,
        type: 'grading_completed',
        title: 'Writing Graded',
        message: 'Your writing has been graded.',
        channel: 'in-app',
        isRead: false,
      },
      {
        userId,
        type: 'payment_approved',
        title: 'Payment Approved',
        message: 'Your VIP payment was approved.',
        channel: 'in-app',
        isRead: true,
        readAt: new Date(),
      },
      {
        userId,
        type: 'welcome',
        title: 'Welcome',
        message: 'Welcome email sent.',
        channel: 'email',
        isRead: false,
      },
    ]);
  });

  describe('GET /api/notifications', () => {
    it('should return paginated in-app notifications for the user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.notifications).toHaveLength(2); // only in-app
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by isRead=false', async () => {
      const res = await request(app)
        .get('/api/notifications?isRead=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].title).toBe('Writing Graded');
    });

    it('should return 401 without token', async () => {
      await request(app).get('/api/notifications').expect(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.unreadCount).toBe(1); // 1 unread in-app
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notif = await NotificationLog.findOne({ userId, isRead: false, channel: 'in-app' });

      const res = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.notification.isRead).toBe(true);
      expect(res.body.notification.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .patch(`/api/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all unread notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.modifiedCount).toBe(1);

      const unread = await NotificationLog.countDocuments({ userId, isRead: false, channel: 'in-app' });
      expect(unread).toBe(0);
    });
  });

  describe('Preferences', () => {
    it('GET /api/notifications/preferences should return default preferences', async () => {
      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.preferences.channels.email).toBe(true);
      expect(res.body.preferences.channels.push).toBe(true);
      expect(res.body.preferences.channels.inApp).toBe(true);
    });

    it('PUT /api/notifications/preferences should update preferences', async () => {
      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ channels: { email: false, push: true, inApp: true } })
        .expect(200);

      expect(res.body.preferences.channels.email).toBe(false);
    });
  });
});
