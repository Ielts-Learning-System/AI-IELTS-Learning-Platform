'use strict';
/**
 * writing-service — e2e.test.js
 * Black-box user journey tests.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'test';

const app = require('../app');
const Writing = require('../src/models/Writing');

let mongod;

const makeToken = (id = new mongoose.Types.ObjectId().toString(), role = 'Student') =>
  jwt.sign({ id, role }, JWT_SECRET);
const makeTeacherToken = () =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'Teacher' }, JWT_SECRET);

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Journey 1: Student submits writing and sees it in history ────────────────
describe('Journey: Student submits writing and retrieves history', () => {
  beforeAll(() => clearCollections());

  let studentToken;
  let writingId;

  it('Step 1 — Teacher creates a writing prompt', async () => {
    const teacherToken = makeTeacherToken();
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'IELTS Task 1: Water Usage Graph',
        type: 'Task 1',
        contentHtml: '<p>The graph shows water usage from 1900 to 2000.</p>',
      });
    expect(res.status).toBe(201);
    writingId = res.body.data._id;
  });

  it('Step 2 — Student views the prompt', async () => {
    const res = await request(app).get(`/items/${writingId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('IELTS Task 1: Water Usage Graph');
  });

  it('Step 3 — Student submits a Task 1 response', async () => {
    studentToken = makeToken();
    const res = await request(app)
      .post('/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        writingId,
        taskType: 'Task 1',
        content: 'The graph illustrates a dramatic increase in global water usage over the 20th century. Agricultural demand was the dominant driver throughout the period.',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Pending');
  });

  it('Step 4 — Student sees submission in history', async () => {
    const res = await request(app)
      .get('/submissions/my-submissions')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

// ─── Journey 2: Task type mismatch is rejected ────────────────────────────────
describe('Journey: Task type mismatch is blocked', () => {
  beforeAll(() => clearCollections());

  let writingId;

  it('Step 1 — Create Task 2 prompt', async () => {
    const teacherToken = makeTeacherToken();
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Technology essay',
        type: 'Task 2',
        contentHtml: '<p>Some people think technology is harmful. Discuss.</p>',
      });
    expect(res.status).toBe(201);
    writingId = res.body.data._id;
  });

  it('Step 2 — Submitting Task 1 against Task 2 prompt is rejected', async () => {
    const res = await request(app)
      .post('/submissions')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ writingId, taskType: 'Task 1', content: 'Wrong task type response.' });
    expect(res.status).toBe(400);
  });
});
