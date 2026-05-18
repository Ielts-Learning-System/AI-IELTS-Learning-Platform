process.env.JWT_SECRET = 'lesson-test-secret';
process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const lessonRoutes = require('../src/routes/lesson.routes');
const Lesson = require('../src/models/lesson.model');
const { makeToken } = require('./helpers');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/', lessonRoutes);
  return app;
};

describe('Lesson regression/security', () => {
  const app = buildApp();
  const teacherToken = makeToken('teacher', '64a8d2f8c9e77f0012345678');
  const studentToken = makeToken('student');

  it('rejects malformed JWT on protected route', async () => {
    const res = await request(app).get('/').set('Authorization', 'Bearer malformed.token');
    expect(res.status).toBe(401);
  });

  it('rejects missing token', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid lesson id', async () => {
    const res = await request(app).get('/bad').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid lesson ID/i);
  });

  it('returns 404 for non-existing valid lesson id', async () => {
    const fakeId = '64a8d2f8c9e77f0012345678';
    const res = await request(app).get(`/${fakeId}`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(404);
  });

  it('teacher search endpoint supports search query', async () => {
    await Lesson.create({
      title: 'Grammar Basics',
      description: 'English grammar intro',
      videoUrl: 'https://cdn.example/grammar.mp4',
      teacherId: '64a8d2f8c9e77f0012345678',
      status: 'Published',
    });

    const res = await request(app).get('/teacher?search=grammar').set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('student cannot delete lesson (403)', async () => {
    const lesson = await Lesson.create({
      title: 'Protected lesson',
      description: 'cannot delete',
      videoUrl: 'https://cdn.example/protected.mp4',
      teacherId: '64a8d2f8c9e77f0012345678',
      status: 'Published',
    });

    const res = await request(app).delete(`/${lesson._id}`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });
});
