const request = require('supertest');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const app = require('../../app');
const ListeningTest = require('../../src/models/ListeningTest');
const { generateTestToken } = require('../helpers');
require('../setup');

function buildListeningTest(overrides = {}) {
  return {
    title: 'IELTS Listening Practice Test 1',
    description: 'Full listening test with 4 parts',
    parts: [
      {
        partNumber: 1,
        title: 'Part 1 - Conversation',
        audioUrl: 'https://example.com/audio/part1.mp3',
        description: 'A conversation about booking a hotel room',
        questions: [
          {
            questionText: 'What is the guest name?',
            type: 'fill_blank',
            correctAnswer: 'Smith',
          },
          {
            questionText: 'How many nights?',
            type: 'multiple_choice',
            options: ['2', '3', '4', '5'],
            correctAnswer: '3',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('Listening Routes — Integration', () => {
  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  let teacherToken;
  let studentToken;

  beforeAll(() => {
    teacherToken = generateTestToken(teacherId.toString(), 'teacher');
    studentToken = generateTestToken(studentId.toString(), 'student');
  });

  // ============================================================
  // GET / — list all tests
  // ============================================================
  describe('GET /', () => {
    it('should return paginated listening tests', async () => {
      await ListeningTest.create(buildListeningTest());

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('should return empty data when no tests', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ============================================================
  // GET /:id — get test (answers hidden)
  // ============================================================
  describe('GET /:id', () => {
    it('should return test without correct answers', async () => {
      const test = await ListeningTest.create(buildListeningTest());

      const res = await request(app).get(`/${test._id}`);

      expect(res.status).toBe(200);
      // correctAnswer should be excluded via .select('-parts.questions.correctAnswer')
      const firstQ = res.body.parts?.[0]?.questions?.[0];
      expect(firstQ).toBeDefined();
      expect(firstQ.correctAnswer).toBeUndefined();
    });

    it('should return 404 for non-existent test', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // POST / — create test (teacher/admin)
  // ============================================================
  describe('POST /', () => {
    it('should create a listening test as teacher', async () => {
      const payload = buildListeningTest();

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(buildListeningTest());

      expect(res.status).toBe(403);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/')
        .send(buildListeningTest());

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // POST /:id/submit — student submits and auto-graded
  // ============================================================
  describe('POST /:id/submit', () => {
    let testId;

    beforeEach(async () => {
      const test = await ListeningTest.create(buildListeningTest());
      testId = test._id.toString();
    });

    it('should auto-grade and return band score', async () => {
      const res = await request(app)
        .post(`/${testId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentAnswers: ['Smith', '3'], // Both correct
          timeSpent: 1800,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rawScore).toBe(2);
      expect(res.body.data.bandScore).toBeDefined();
    });

    it('should handle case-insensitive answer matching', async () => {
      const res = await request(app)
        .post(`/${testId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentAnswers: ['smith', '3'], // lowercase should match
          timeSpent: 900,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rawScore).toBe(2);
    });

    it('should return 400 if studentAnswers is not array', async () => {
      const res = await request(app)
        .post(`/${testId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ studentAnswers: 'not-array' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent test', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/${fakeId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ studentAnswers: ['A'] });

      expect(res.status).toBe(404);
    });
  });
});
