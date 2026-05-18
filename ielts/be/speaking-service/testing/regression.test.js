'use strict';
/**
 * speaking-service — regression.test.js
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
  for (const k in collections) await collections[k].deleteMany({});
});

// ─── Forged token ────────────────────────────────────────────────────────────
describe('Security: forged JWT', () => {
  it('rejects wrong-secret token 401', async () => {
    const forged = jwt.sign({ id: 'x', role: 'teacher' }, 'wrong-secret');
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${forged}`)
      .send({ title: 'X', part1: ['Q'], part2: 'P', part3: ['Q3'] });
    expect(res.status).toBe(401);
  });
});

// ─── NoSQL injection ─────────────────────────────────────────────────────────
describe('Security: NoSQL injection in GET /tests/:id', () => {
  it('handles ObjectId injection gracefully', async () => {
    const res = await request(app).get('/tests/$ne');
    expect([400, 404, 500].includes(res.status)).toBe(true);
  });
});

// ─── Vietnamese content ──────────────────────────────────────────────────────
describe('Regression: Vietnamese characters', () => {
  it('teacher creates test with Vietnamese parts', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${makeToken('teacher')}`)
      .set('Content-Type', 'application/json; charset=utf-8')
      .send({
        title: 'Bài kiểm tra nói IELTS số 1',
        part1: ['Bạn đang làm gì?', 'Hãy kể về quê hương bạn.'],
        part2: 'Mô tả một địa điểm bạn yêu thích.',
        part3: ['Tại sao du lịch quan trọng?', 'Tương lai của du lịch sẽ như thế nào?'],
      });
    expect(res.status).toBe(201);
  });
});

// ─── User isolation ──────────────────────────────────────────────────────────
describe('Regression: user isolation in my-submissions', () => {
  it('two students only see their own submissions', async () => {
    const tokenA = makeToken('student');
    const tokenB = makeToken('student');

    const resA = await request(app).get('/submissions/my-submissions').set('Authorization', `Bearer ${tokenA}`);
    const resB = await request(app).get('/submissions/my-submissions').set('Authorization', `Bearer ${tokenB}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    // Each should be empty since different students
    expect(resA.body.data).toHaveLength(0);
    expect(resB.body.data).toHaveLength(0);
  });
});

// ─── Re-submission (upsert) ───────────────────────────────────────────────────
describe('Regression: student re-submission upserts Pending attempt', () => {
  it('second submission updates existing Pending record', async () => {
    const test = await SpeakingTest.create({
      title: 'T',
      part1: ['Q1'],
      part2: 'Desc',
      part3: ['Q3'],
    });
    const token = makeToken('student');

    await request(app)
      .post(`/tests/${test._id}/attempt`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionKey: 'p1_0', audioUrl: 'https://cdn.example.com/a.mp3' }] });

    const res = await request(app)
      .post(`/tests/${test._id}/attempt`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionKey: 'p1_0', audioUrl: 'https://cdn.example.com/b.mp3' }] });

    expect(res.status).toBe(201);
  });
});

// ─── Grade boundary ──────────────────────────────────────────────────────────
describe('Regression: grading boundary validation', () => {
  it('grade of exactly 9 is valid', async () => {
    const sub = await SpeakingSubmission.create({
      studentId: new mongoose.Types.ObjectId(),
      audioUrl: 'https://cdn.example.com/audio.mp3',
    });
    const res = await request(app)
      .put(`/${sub._id}/grade`)
      .set('Authorization', `Bearer ${makeToken('teacher')}`)
      .send({ criteria: { FC: 9, LR: 9, GRA: 9, PR: 9 } });
    expect(res.status).toBe(200);
    expect(res.body.data.grading.overallBand).toBe(9.0);
  });

  it('grade of 0 is valid', async () => {
    const sub = await SpeakingSubmission.create({
      studentId: new mongoose.Types.ObjectId(),
      audioUrl: 'https://cdn.example.com/audio.mp3',
    });
    const res = await request(app)
      .put(`/${sub._id}/grade`)
      .set('Authorization', `Bearer ${makeToken('teacher')}`)
      .send({ criteria: { FC: 0, LR: 0, GRA: 0, PR: 0 } });
    expect(res.status).toBe(200);
    expect(res.body.data.grading.overallBand).toBe(0);
  });
});
