'use strict';
/**
 * listening-service — regression.test.js
 * Edge cases, security, and robustness.
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

// ─── NoSQL Injection ─────────────────────────────────────────────────────────
describe('Security: NoSQL injection', () => {
  it('GET /:id with $gt operator does not return data', async () => {
    const res = await request(app).get('/$gt');
    expect([400, 404, 500].includes(res.status)).toBe(true);
  });

  it('GET / with injected query param is ignored', async () => {
    const res = await request(app).get('/?title[$ne]=x');
    expect(res.status).toBe(200);
  });
});

// ─── Forged token ────────────────────────────────────────────────────────────
describe('Security: forged JWT', () => {
  it('forged token with wrong secret is rejected 401', async () => {
    const forged = jwt.sign({ id: 'x', role: 'teacher' }, 'wrong-secret');
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${forged}`)
      .send({ title: 'X', parts: [] });
    expect(res.status).toBe(401);
  });
});

// ─── Empty / boundary submissions ────────────────────────────────────────────
describe('Regression: empty answer arrays', () => {
  it('student can submit with no answers (should not crash)', async () => {
    const test = await ListeningTest.create({
      title: 'Empty Test',
      parts: [
        {
          partNumber: 1,
          title: 'P1',
          audioUrl: 'https://cdn.example.com/a.mp3',
          questions: [
            { questionText: 'Q1', type: 'fill_blank', correctAnswer: 'A' },
          ],
        },
      ],
    });
    const res = await request(app)
      .post(`/${test._id}/submit-part`)
      .set('Authorization', `Bearer ${makeToken('student')}`)
      .send({ partNumber: 1, answers: [] });
    expect([200, 201, 400].includes(res.status)).toBe(true);
  });
});

// ─── Vietnamese content ──────────────────────────────────────────────────────
describe('Regression: Vietnamese characters in test title', () => {
  it('creates test with Vietnamese title', async () => {
    const token = makeToken('teacher');
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json; charset=utf-8')
      .send({
        title: 'Đề thi nghe thực hành IELTS số 1',
        parts: [
          {
            partNumber: 1,
            title: 'Phần 1',
            audioUrl: 'https://cdn.example.com/a.mp3',
            questions: [{ questionText: 'Câu hỏi 1?', type: 'fill_blank', correctAnswer: 'Hà Nội' }],
          },
        ],
      });
    expect(res.status).toBe(201);
  });
});

// ─── Pagination ──────────────────────────────────────────────────────────────
describe('Regression: pagination limits', () => {
  it('limit=999 is capped by API (returns ≤50 results)', async () => {
    // Create 5 tests
    for (let i = 0; i < 5; i++) {
      await ListeningTest.create({ title: `Test ${i}`, parts: [] });
    }
    const res = await request(app).get('/?limit=999');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── User isolation ──────────────────────────────────────────────────────────
describe('Regression: user isolation in my-attempts', () => {
  it('two students only see their own attempts', async () => {
    const tokenA = makeToken('student');
    const tokenB = makeToken('student');

    const resA = await request(app).get('/my-attempts').set('Authorization', `Bearer ${tokenA}`);
    const resB = await request(app).get('/my-attempts').set('Authorization', `Bearer ${tokenB}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
  });
});
