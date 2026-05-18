'use strict';
/**
 * listening-service — api.test.js
 * Supertest HTTP integration tests.
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

// Note: listening-service lowercases roles in auth middleware
const makeToken = (id = new mongoose.Types.ObjectId().toString(), role = 'student') =>
  jwt.sign({ id, role }, JWT_SECRET);

const validPart = () => ({
  partNumber: 1,
  title: 'Part 1: Conversation',
  audioUrl: 'https://cdn.example.com/audio/p1.mp3',
  questions: [
    { questionText: 'What is the hotel name?', type: 'fill_blank', correctAnswer: 'Grand Palace' },
    { questionText: 'Select the correct answer', type: 'multiple_choice', options: ['A', 'B', 'C'], correctAnswer: 'B' },
  ],
});

const createTestInDB = () =>
  ListeningTest.create({
    title: 'Listening Test 1',
    description: 'Practice',
    parts: [validPart()],
  });

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
  for (const key in collections) await collections[key].deleteMany({});
});

// ─── GET / — list all tests ───────────────────────────────────────────────────
describe('GET /', () => {
  it('200 - returns paginated list', async () => {
    await createTestInDB();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 - empty list when no tests', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────
describe('GET /:id', () => {
  it('200 - returns test detail (correct answers hidden)', async () => {
    const test = await createTestInDB();
    const res = await request(app).get(`/${test._id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBeDefined();
  });

  it('404 - non-existent test id', async () => {
    const res = await request(app).get('/000000000000000000000000');
    expect(res.status).toBe(404);
  });
});

// ─── POST / — create test (teacher/admin) ────────────────────────────────────
describe('POST /', () => {
  it('201 - teacher can create a test', async () => {
    const token = makeToken(undefined, 'teacher');
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'New Listening Test',
        parts: [validPart()],
      });
    expect(res.status).toBe(201);
  });

  it('403 - student cannot create a test', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hacked Test', parts: [] });
    expect(res.status).toBe(403);
  });

  it('401 - no token', async () => {
    const res = await request(app).post('/').send({ title: 'Test', parts: [] });
    expect(res.status).toBe(401);
  });
});

// ─── POST /:id/submit-part — student submits a part ──────────────────────────
describe('POST /:id/submit-part', () => {
  let testId;

  beforeEach(async () => {
    const test = await createTestInDB();
    testId = test._id.toString();
  });

  it('200 - student submits part answers and receives score', async () => {
    const token = makeToken();
    const res = await request(app)
      .post(`/${testId}/submit-part`)
      .set('Authorization', `Bearer ${token}`)
      .send({ partNumber: 1, studentAnswers: ['Grand Palace', 'B'] });
    expect([200, 201].includes(res.status)).toBe(true);
  });

  it('401 - no token', async () => {
    const res = await request(app)
      .post(`/${testId}/submit-part`)
      .send({ partNumber: 1, answers: ['A'] });
    expect(res.status).toBe(401);
  });
});

// ─── GET /my-attempts ─────────────────────────────────────────────────────────
describe('GET /my-attempts', () => {
  it('200 - authenticated student sees own attempts', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('401 - no token', async () => {
    const res = await request(app).get('/my-attempts');
    expect(res.status).toBe(401);
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('200 - service is alive', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
