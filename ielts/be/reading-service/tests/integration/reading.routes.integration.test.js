const request = require('supertest');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const app = require('../../app');
const ReadingTest = require('../../src/models/ReadingTest');
const { generateTestToken } = require('../helpers');
require('../setup');

// Helper to build a minimal valid reading test payload
function buildTestPayload(overrides = {}) {
  return {
    title: 'Cambridge IELTS 18 - Test 1',
    description: 'Academic reading test',
    passages: [
      {
        passageNumber: 1,
        title: 'Passage 1',
        content: '<p>Sample reading passage content...</p>',
        questions: [
          {
            questionNumber: 1,
            type: 'MULTIPLE_CHOICE',
            text: 'What is the main idea?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B',
          },
          {
            questionNumber: 2,
            type: 'TFNG',
            text: 'The sky is blue.',
            correctAnswer: 'TRUE',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('Reading Routes — Integration', () => {
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
    it('should return paginated tests', async () => {
      await ReadingTest.create({
        ...buildTestPayload(),
        createdBy: teacherId,
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('should return empty array when no tests exist', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should respect page and limit query params', async () => {
      // Create 3 tests
      for (let i = 0; i < 3; i++) {
        await ReadingTest.create({
          ...buildTestPayload({ title: `Test ${i + 1}` }),
          createdBy: teacherId,
        });
      }

      const res = await request(app).get('/?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.pages).toBe(2);
    });
  });

  // ============================================================
  // GET /:id — get test details
  // ============================================================
  describe('GET /:id', () => {
    it('should return full test details', async () => {
      const test = await ReadingTest.create({
        ...buildTestPayload(),
        createdBy: teacherId,
      });

      const res = await request(app).get(`/${test._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Cambridge IELTS 18 - Test 1');
      expect(res.body.data.passages).toHaveLength(1);
    });

    it('should return 404 for non-existent test', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // POST / — create test (teacher only)
  // ============================================================
  describe('POST /', () => {
    it('should create a test as teacher', async () => {
      const payload = buildTestPayload();

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.isPublished).toBe(false);
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ passages: buildTestPayload().passages });

      expect(res.status).toBe(400);
    });

    it('should return 400 if passages are empty', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ title: 'No passages', passages: [] });

      expect(res.status).toBe(400);
    });

    it('should return 403 for student role', async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(buildTestPayload());

      expect(res.status).toBe(403);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/')
        .send(buildTestPayload());

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // POST /:id/submit — student submits and gets auto-graded
  // ============================================================
  describe('POST /:id/submit', () => {
    let testId;

    beforeEach(async () => {
      const test = await ReadingTest.create({
        ...buildTestPayload(),
        createdBy: teacherId,
        isPublished: true,
      });
      testId = test._id.toString();
    });

    it('should auto-grade and return band score', async () => {
      const res = await request(app)
        .post(`/${testId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentAnswers: ['B', 'TRUE'], // Both correct
          timeSpent: 1200,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rawScore).toBe(2);
      expect(res.body.data.bandScore).toBeDefined();
    });

    it('should handle partially correct answers', async () => {
      const res = await request(app)
        .post(`/${testId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentAnswers: ['B', 'FALSE'], // 1 correct, 1 wrong
          timeSpent: 900,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rawScore).toBe(1);
    });

    it('should handle all wrong answers', async () => {
      const res = await request(app)
        .post(`/${testId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentAnswers: ['A', 'FALSE'],
          timeSpent: 600,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rawScore).toBe(0);
    });

    it('should return 400 if studentAnswers is not an array', async () => {
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

    it('should return 403 for teacher role', async () => {
      const res = await request(app)
        .post(`/${testId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentAnswers: ['B', 'TRUE'] });

      expect(res.status).toBe(403);
    });
  });
});
