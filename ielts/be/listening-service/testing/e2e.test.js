'use strict';
/**
 * listening-service — e2e.test.js
 * Black-box journey tests.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'test';

const app = require('../app');
const ListeningTest = require('../src/models/ListeningTest');

let mongod;

const makeToken = (role = 'student') =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role }, JWT_SECRET);

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

// ─── Journey 1: Teacher creates test, student takes it ───────────────────────
describe('Journey: Teacher creates test, student submits a part', () => {
  beforeAll(() => clearCollections());

  let testId;
  let studentToken;

  it('Step 1 — Teacher creates a 4-part listening test', async () => {
    const teacherToken = makeToken('teacher');
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'IELTS Practice Listening Test',
        parts: [
          {
            partNumber: 1,
            title: 'Social Conversation',
            audioUrl: 'https://cdn.example.com/p1.mp3',
            questions: [
              { questionText: 'Name of the hotel?', type: 'fill_blank', correctAnswer: 'Grand Palace' },
              { questionText: 'Room type?', type: 'multiple_choice', options: ['single', 'double', 'suite'], correctAnswer: 'double' },
            ],
          },
        ],
      });
    expect(res.status).toBe(201);
    testId = res.body._id;
  });

  it('Step 2 — Test appears in public list', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Step 3 — Student views the test detail', async () => {
    const res = await request(app).get(`/${testId}`);
    expect(res.status).toBe(200);
  });

  it('Step 4 — Student submits Part 1 answers', async () => {
    studentToken = makeToken('student');
    const res = await request(app)
      .post(`/${testId}/submit-part`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ partNumber: 1, studentAnswers: ['Grand Palace', 'double'] });
    expect([200, 201].includes(res.status)).toBe(true);
    if (res.body.data) {
      expect(typeof res.body.data.rawScore).toBe('number');
    }
  });

  it('Step 5 — Student can view own attempts', async () => {
    const res = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── Journey 2: Role gate enforcement ────────────────────────────────────────
describe('Journey: Role gates prevent unauthorized access', () => {
  beforeAll(() => clearCollections());

  it('student cannot create a test', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${makeToken('student')}`)
      .send({ title: 'Unauthorised', parts: [] });
    expect(res.status).toBe(403);
  });

  it('unauthenticated user cannot submit a part', async () => {
    const test = await ListeningTest.create({
      title: 'T',
      parts: [],
    });
    const res = await request(app)
      .post(`/${test._id}/submit-part`)
      .send({ partNumber: 1, answers: [] });
    expect(res.status).toBe(401);
  });
});
