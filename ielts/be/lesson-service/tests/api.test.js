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
  app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));
  app.use('/', lessonRoutes);
  return app;
};

describe('Lesson API', () => {
  const app = buildApp();
  const teacherToken = makeToken('teacher');
  const studentToken = makeToken('student');

  it('GET /health works', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('POST / creates lesson for teacher', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Lesson 01',
        description: 'Desc 01',
        videoUrl: 'https://cdn.example/1.mp4',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Lesson 01');
  });

  it('POST / blocks student role', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'X', description: 'Y', videoUrl: 'https://z' });

    expect(res.status).toBe(403);
  });

  it('GET / returns only Published lessons for students', async () => {
    await Lesson.create({
      title: 'Published lesson',
      description: 'Desc',
      videoUrl: 'https://cdn.example/p.mp4',
      teacherId: resizableTeacherId(),
      status: 'Published',
    });
    await Lesson.create({
      title: 'Draft lesson',
      description: 'Desc',
      videoUrl: 'https://cdn.example/d.mp4',
      teacherId: resizableTeacherId(),
      status: 'Draft',
    });

    const res = await request(app).get('/').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Published lesson');
  });

  it('GET /teacher returns both Draft and Published for teacher/admin', async () => {
    await Lesson.create({
      title: 'Pub',
      description: 'Desc',
      videoUrl: 'https://cdn.example/a.mp4',
      teacherId: resizableTeacherId(),
      status: 'Published',
    });
    await Lesson.create({
      title: 'Dr',
      description: 'Desc',
      videoUrl: 'https://cdn.example/b.mp4',
      teacherId: resizableTeacherId(),
      status: 'Draft',
    });

    const res = await request(app).get('/teacher').set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('GET /:id and DELETE /:id work with valid ids', async () => {
    const lesson = await Lesson.create({
      title: 'Delete me',
      description: 'Desc',
      videoUrl: 'https://cdn.example/c.mp4',
      teacherId: resizableTeacherId(),
      status: 'Published',
    });

    const getRes = await request(app).get(`/${lesson._id}`).set('Authorization', `Bearer ${studentToken}`);
    expect(getRes.status).toBe(200);

    const delRes = await request(app).delete(`/${lesson._id}`).set('Authorization', `Bearer ${teacherToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });
});

function resizableTeacherId() {
  return '64a8d2f8c9e77f0012345678';
}
