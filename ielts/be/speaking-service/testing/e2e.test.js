'use strict';
/**
 * speaking-service — e2e.test.js
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

let mongod;
const makeToken = (role = 'student', id = new mongoose.Types.ObjectId().toString()) =>
  jwt.sign({ id, role }, JWT_SECRET);

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const k in collections) await collections[k].deleteMany({});
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Journey 1: Teacher creates → student attempts → teacher grades ───────────
describe('Journey: full speaking flow', () => {
  beforeAll(() => clearCollections());

  let testId;
  let submissionId;
  const studentId = new mongoose.Types.ObjectId().toString();
  const studentToken = makeToken('student', studentId);
  const teacherToken = makeToken('teacher');

  it('Step 1 — Teacher creates a speaking test', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'IELTS Speaking Practice — Technology',
        part1: ['Do you use social media?', 'How often do you use the internet?'],
        part2: 'Describe a piece of technology you find useful.',
        part3: ['How has technology changed education?', 'Will AI replace teachers?'],
      });
    expect(res.status).toBe(201);
    testId = res.body.data._id;
  });

  it('Step 2 — Test appears in public list', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.data.some((t) => t._id === testId)).toBe(true);
  });

  it('Step 3 — Student submits per-question audio answers', async () => {
    const res = await request(app)
      .post(`/tests/${testId}/attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          { questionKey: 'p1_0', audioUrl: 'https://cdn.example.com/p1_0.mp3' },
          { questionKey: 'p1_1', audioUrl: 'https://cdn.example.com/p1_1.mp3' },
          { questionKey: 'p2', audioUrl: 'https://cdn.example.com/p2.mp3' },
          { questionKey: 'p3_0', audioUrl: 'https://cdn.example.com/p3_0.mp3' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Pending');
    submissionId = res.body.data._id;
  });

  it('Step 4 — Student sees submission in history', async () => {
    const res = await request(app)
      .get('/submissions/my-submissions')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((s) => s._id === submissionId)).toBe(true);
  });

  it('Step 5 — Teacher grades the submission', async () => {
    const res = await request(app)
      .put(`/${submissionId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        criteria: { FC: 7, LR: 7.5, GRA: 6.5, PR: 7 },
        teacherFeedback: 'Good fluency. Work on coherence.',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Graded');
    expect(typeof res.body.data.grading.overallBand).toBe('number');
  });
});

// ─── Journey 2: Role enforcement ─────────────────────────────────────────────
describe('Journey: role gates', () => {
  beforeAll(() => clearCollections());

  it('student cannot create a test', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${makeToken('student')}`)
      .send({ title: 'X', part1: ['Q'], part2: 'P', part3: ['Q3'] });
    expect(res.status).toBe(403);
  });

  it('unauthenticated cannot view my-submissions', async () => {
    const res = await request(app).get('/submissions/my-submissions');
    expect(res.status).toBe(401);
  });
});
