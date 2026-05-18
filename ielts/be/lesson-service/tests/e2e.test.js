process.env.JWT_SECRET = 'lesson-test-secret';
process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const Lesson = require('../src/models/lesson.model');
const lessonRoutes = require('../src/routes/lesson.routes');
const { makeToken } = require('./helpers');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/', lessonRoutes);
  return app;
};

describe('Lesson E2E flow', () => {
  const app = buildApp();
  const teacherToken = makeToken('teacher', '64a8d2f8c9e77f0012345678');
  const studentToken = makeToken('student');

  it('teacher creates published lesson -> student can list and fetch by id', async () => {
    const createRes = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'IELTS Speaking Part 2',
        description: 'Practice cue card strategies',
        videoUrl: 'https://cdn.example/speaking.mp4',
        status: 'Published',
      });

    expect(createRes.status).toBe(201);
    const lessonId = createRes.body.data._id;

    const listRes = await request(app).get('/').set('Authorization', `Bearer ${studentToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((x) => x._id === lessonId)).toBe(true);

    const getRes = await request(app).get(`/${lessonId}`).set('Authorization', `Bearer ${studentToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.title).toMatch(/speaking/i);
  });

  it('teacher creates draft lesson -> hidden from student list but visible in teacher list', async () => {
    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Draft lesson',
        description: 'Hidden for now',
        videoUrl: 'https://cdn.example/draft.mp4',
        status: 'Draft',
      })
      .expect(201);

    const studentList = await request(app).get('/').set('Authorization', `Bearer ${studentToken}`);
    expect(studentList.status).toBe(200);
    expect(studentList.body.data.find((x) => x.title === 'Draft lesson')).toBeUndefined();

    const teacherList = await request(app).get('/teacher').set('Authorization', `Bearer ${teacherToken}`);
    expect(teacherList.status).toBe(200);
    expect(teacherList.body.data.find((x) => x.title === 'Draft lesson')).toBeDefined();
  });

  it('teacher deletes lesson successfully', async () => {
    const lesson = await Lesson.create({
      title: 'Delete flow',
      description: 'to delete',
      videoUrl: 'https://cdn.example/delete.mp4',
      teacherId: '64a8d2f8c9e77f0012345678',
      status: 'Published',
    });

    const delRes = await request(app).delete(`/${lesson._id}`).set('Authorization', `Bearer ${teacherToken}`);
    expect(delRes.status).toBe(200);

    const exists = await Lesson.findById(lesson._id);
    expect(exists).toBeNull();
  });
});
