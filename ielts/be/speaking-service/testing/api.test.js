'use strict';
/**
 * speaking-service — api.test.js
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'test';

const app = require('../app');
const SpeakingTest = require('../src/models/SpeakingTest');
const SpeakingSubmission = require('../src/models/SpeakingSubmission');

let mongod;

const makeToken = (id = new mongoose.Types.ObjectId().toString(), role = 'student') =>
  jwt.sign({ id, role }, JWT_SECRET);

const validTestBody = () => ({
  title: 'IELTS Speaking Mock Test 1',
  part1: ['Do you work or study?', 'Tell me about your hometown.'],
  part2: 'Describe a book you recently read. You should say: what it was, what it was about, why you liked or disliked it.',
  part3: ['How has reading changed with technology?', 'Do young people read less nowadays?'],
});

const createTestInDB = () => SpeakingTest.create(validTestBody());

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const k in collections) await collections[k].deleteMany({});
});

// ─── GET / ────────────────────────────────────────────────────────────────────
describe('GET /', () => {
  it('200 - returns list of speaking tests', async () => {
    await createTestInDB();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 - empty array when no tests', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── GET /tests/:id ───────────────────────────────────────────────────────────
describe('GET /tests/:id', () => {
  it('200 - returns test detail', async () => {
    const t = await createTestInDB();
    const res = await request(app).get(`/tests/${t._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe(validTestBody().title);
  });

  it('404 - non-existent id', async () => {
    const res = await request(app).get('/tests/000000000000000000000000');
    expect(res.status).toBe(404);
  });
});

// ─── POST /tests ──────────────────────────────────────────────────────────────
describe('POST /tests', () => {
  it('201 - teacher creates test', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${makeToken(undefined, 'teacher')}`)
      .send(validTestBody());
    expect(res.status).toBe(201);
    expect(res.body.data._id).toBeDefined();
  });

  it('403 - student cannot create test', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validTestBody());
    expect(res.status).toBe(403);
  });

  it('401 - no token', async () => {
    const res = await request(app).post('/tests').send(validTestBody());
    expect(res.status).toBe(401);
  });

  it('400 - missing required part1', async () => {
    const bad = validTestBody();
    delete bad.part1;
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${makeToken(undefined, 'teacher')}`)
      .send(bad);
    expect([400, 500].includes(res.status)).toBe(true);
  });
});

// ─── POST /tests/:testId/attempt ──────────────────────────────────────────────
describe('POST /tests/:testId/attempt', () => {
  let testId;

  beforeEach(async () => {
    const t = await createTestInDB();
    testId = t._id.toString();
  });

  it('201 - student submits answers', async () => {
    const res = await request(app)
      .post(`/tests/${testId}/attempt`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        answers: [
          { questionKey: 'p1_0', audioUrl: 'https://cdn.example.com/p1_0.mp3' },
          { questionKey: 'p2', audioUrl: 'https://cdn.example.com/p2.mp3' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Pending');
  });

  it('400 - empty answers array', async () => {
    const res = await request(app)
      .post(`/tests/${testId}/attempt`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ answers: [] });
    expect(res.status).toBe(400);
  });

  it('401 - no token', async () => {
    const res = await request(app)
      .post(`/tests/${testId}/attempt`)
      .send({ answers: [{ questionKey: 'p1_0', audioUrl: 'https://cdn.example.com/x.mp3' }] });
    expect(res.status).toBe(401);
  });
});

// ─── GET /submissions/my-submissions ─────────────────────────────────────────
describe('GET /submissions/my-submissions', () => {
  it('200 - authenticated student sees own submissions', async () => {
    const res = await request(app)
      .get('/submissions/my-submissions')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 - no token', async () => {
    const res = await request(app).get('/submissions/my-submissions');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /:id/grade ───────────────────────────────────────────────────────────
describe('PUT /:id/grade', () => {
  it('200 - teacher grades a submission', async () => {
    const studentId = new mongoose.Types.ObjectId();
    const sub = await SpeakingSubmission.create({
      studentId,
      audioUrl: 'https://cdn.example.com/audio.mp3',
      status: 'Pending',
    });
    const res = await request(app)
      .put(`/${sub._id}/grade`)
      .set('Authorization', `Bearer ${makeToken(undefined, 'teacher')}`)
      .send({ criteria: { FC: 7, LR: 7, GRA: 7, PR: 7 }, teacherFeedback: 'Good effort.' });
    expect(res.status).toBe(200);
    expect(res.body.data.grading.overallBand).toBe(7.0);
  });

  it('400 - score out of range', async () => {
    const sub = await SpeakingSubmission.create({
      studentId: new mongoose.Types.ObjectId(),
      audioUrl: 'https://cdn.example.com/audio.mp3',
    });
    const res = await request(app)
      .put(`/${sub._id}/grade`)
      .set('Authorization', `Bearer ${makeToken(undefined, 'teacher')}`)
      .send({ criteria: { FC: 11, LR: 7, GRA: 7, PR: 7 } });
    expect(res.status).toBe(400);
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('200 - service is alive', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
