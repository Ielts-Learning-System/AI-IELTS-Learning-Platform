process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const NotificationLog = require('../src/models/NotificationLog');

const SECRET = 'test-jwt-secret';

const makeToken = (id, role = 'student') => jwt.sign({ id: String(id), role }, SECRET, { expiresIn: '1h' });

describe('Notification E2E flows', () => {
  it('student lifecycle: list -> read one -> unread count decreases -> read all', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId, 'student');

    await NotificationLog.insertMany([
      { userId, type: 'system', title: 'N1', message: 'M1', channel: 'in-app', isRead: false },
      { userId, type: 'system', title: 'N2', message: 'M2', channel: 'in-app', isRead: false },
    ]);

    const list1 = await request(app).get('/').set('Authorization', `Bearer ${token}`);
    expect(list1.status).toBe(200);
    expect(list1.body.notifications).toHaveLength(2);

    const firstId = list1.body.notifications[0]._id;
    const readOne = await request(app).patch(`/${firstId}/read`).set('Authorization', `Bearer ${token}`);
    expect(readOne.status).toBe(200);
    expect(readOne.body.notification.isRead).toBe(true);

    const unread = await request(app).get('/unread-count').set('Authorization', `Bearer ${token}`);
    expect(unread.status).toBe(200);
    expect(unread.body.unreadCount).toBe(1);

    const readAll = await request(app).patch('/read-all').set('Authorization', `Bearer ${token}`);
    expect(readAll.status).toBe(200);
    expect(readAll.body.modifiedCount).toBe(1);

    const unreadAfter = await request(app).get('/unread-count').set('Authorization', `Bearer ${token}`);
    expect(unreadAfter.body.unreadCount).toBe(0);
  });

  it('teacher workflow: send to student -> teacher can query target user notifications', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    const targetUserId = new mongoose.Types.ObjectId();
    const teacherToken = makeToken(teacherId, 'Teacher');

    const send = await request(app)
      .post('/teacher/send')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ userId: String(targetUserId), message: 'Ôn lại task 2', title: 'Nhắc nhở' });

    expect(send.status).toBe(201);
    expect(send.body.notification.channel).toBe('in-app');

    const list = await request(app)
      .get(`/teacher/users/${targetUserId}/notifications`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(list.status).toBe(200);
    expect(list.body.notifications.length).toBe(1);
    expect(list.body.notifications[0].message).toMatch(/task 2/i);
  });

  it('public fallback behavior keeps client stable without token', async () => {
    const list = await request(app).get('/');
    expect(list.status).toBe(200);
    expect(list.body.notifications).toEqual([]);

    const unread = await request(app).get('/unread-count');
    expect(unread.status).toBe(200);
    expect(unread.body.unreadCount).toBe(0);
  });
});
