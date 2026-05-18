process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const NotificationLog = require('../src/models/NotificationLog');
const NotificationPreference = require('../src/models/NotificationPreference');
const PushSubscription = require('../src/models/PushSubscription');

describe('Notification Service Schemas', () => {
  const userId = new mongoose.Types.ObjectId();

  describe('NotificationLog', () => {
    it('saves valid in-app notification', async () => {
      const doc = await NotificationLog.create({
        userId,
        type: 'system',
        title: 'System',
        message: 'Hello',
        channel: 'in-app',
      });

      expect(doc._id).toBeDefined();
      expect(doc.isRead).toBe(false);
      expect(doc.readAt).toBeNull();
      expect(doc.metadata).toEqual({});
    });

    it('rejects invalid type enum', async () => {
      await expect(
        NotificationLog.create({
          userId,
          type: 'invalid-type',
          title: 'T',
          message: 'M',
          channel: 'in-app',
        })
      ).rejects.toThrow();
    });

    it('rejects invalid channel enum', async () => {
      await expect(
        NotificationLog.create({
          userId,
          type: 'system',
          title: 'T',
          message: 'M',
          channel: 'sms',
        })
      ).rejects.toThrow();
    });
  });

  describe('NotificationPreference', () => {
    it('creates with default channel/category flags', async () => {
      const pref = await NotificationPreference.create({ userId });
      expect(pref.channels.email).toBe(true);
      expect(pref.channels.push).toBe(true);
      expect(pref.channels.inApp).toBe(true);
      expect(pref.categories.payment).toBe(true);
      expect(pref.categories.grading).toBe(true);
      expect(pref.categories.reminder).toBe(true);
      expect(pref.categories.system).toBe(true);
    });

    it('enforces unique userId', async () => {
      await NotificationPreference.create({ userId });
      await expect(NotificationPreference.create({ userId })).rejects.toThrow();
    });
  });

  describe('PushSubscription', () => {
    it('saves valid push subscription', async () => {
      const sub = await PushSubscription.create({
        userId,
        endpoint: 'https://push.service/sub/1',
        keys: { p256dh: 'k1', auth: 'k2' },
      });
      expect(sub._id).toBeDefined();
      expect(sub.endpoint).toContain('push.service');
    });

    it('enforces unique userId + endpoint pair', async () => {
      const endpoint = 'https://push.service/sub/dupe';
      await PushSubscription.create({
        userId,
        endpoint,
        keys: { p256dh: 'k1', auth: 'k2' },
      });

      await expect(
        PushSubscription.create({
          userId,
          endpoint,
          keys: { p256dh: 'k3', auth: 'k4' },
        })
      ).rejects.toThrow();
    });
  });
});
