/**
 * ============================================================
 * INTEGRATION TESTS — API / HTTP Layer
 * ============================================================
 * Scope  : Every Express route defined in reading.routes.js is
 *          exercised via Supertest against a real in-memory
 *          MongoDB instance.
 * Method : MongoMemoryServer spins up once per file.  Seed data
 *          is created per-describe block to keep concerns clean.
 *
 * Covers : HTTP status codes · response envelope shape ·
 *          auth guards (401 / 403) · pagination · error paths.
 * ============================================================
 */

// ── Environment bootstrapping ───────────────────────────────────────────────
process.env.JWT_SECRET = 'api-test-secret';
process.env.NODE_ENV   = 'test';

// The controller imports GoogleGenerativeAI at module load time.
// Mock it so tests never hit a real AI endpoint.
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
}));

// ── Dependencies ─────────────────────────────────────────────────────────────
const request   = require('supertest');
const mongoose  = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt       = require('jsonwebtoken');

const app          = require('../app');
const ReadingTest  = require('../src/models/ReadingTest');
const ReadingAttempt = require('../src/models/attempt.model');

// ── In-memory DB lifecycle ──────────────────────────────────────────────────
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  for (const key of Object.keys(mongoose.connection.collections)) {
    await mongoose.connection.collections[key].deleteMany({});
  }
});

// ── Token factory ─────────────────────────────────────────────────────────────
const makeToken = (id, role) =>
  jwt.sign({ id: id.toString(), role }, process.env.JWT_SECRET, { expiresIn: '1h' });

// ── Test-data factories ───────────────────────────────────────────────────────
const TEACHER_ID = new mongoose.Types.ObjectId();
const STUDENT_ID = new mongoose.Types.ObjectId();
const ADMIN_ID   = new mongoose.Types.ObjectId();

const teacherToken = makeToken(TEACHER_ID, 'teacher');
const studentToken = makeToken(STUDENT_ID, 'student');
const adminToken   = makeToken(ADMIN_ID,   'admin');

/** Minimal valid test payload for POST / */
const testPayload = (overrides = {}) => ({
  title: 'Cambridge IELTS 18 - Test 1',
  description: 'Reading test for integration',
  passages: [{
    passageNumber: 1,
    title: 'The History of Paper',
    content: '<p>Paper was invented in ancient China...</p>',
    questions: [
      { questionNumber: 1, type: 'TFNG',           text: 'Paper was invented in China.',  correctAnswer: 'TRUE' },
      { questionNumber: 2, type: 'MULTIPLE_CHOICE', text: 'What material was used first?', correctAnswer: 'B', options: ['A','B','C','D'] },
    ],
  }],
  ...overrides,
});

/** Seed a test that belongs to TEACHER_ID and return its doc */
const seedTest = (overrides = {}) =>
  ReadingTest.create({ ...testPayload(overrides), createdBy: TEACHER_ID });

// ============================================================
// GET /  — list all tests (public)
// ============================================================
describe('GET / — list all tests', () => {

  it('200 returns paginated envelope with empty data when no tests exist', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('200 returns one record after seeding', async () => {
    await seedTest();
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it('200 respects ?page=2&limit=2 (returns 1 of 3)', async () => {
    await Promise.all([seedTest(), seedTest(), seedTest()]);
    const res = await request(app).get('/?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.pages).toBe(2);
  });

  it('200 list items do NOT expose correctAnswer field (security)', async () => {
    await seedTest();
    const res = await request(app).get('/');

    const passages = res.body.data[0].passages;
    // List projection shows passageNumber/title/questionCount only
    passages.forEach((p) => {
      expect(p.questions).toBeUndefined(); // questions stripped in list view
    });
  });
});

// ============================================================
// GET /:id — test detail (public)
// ============================================================
describe('GET /:id — test detail', () => {

  it('200 returns full test with passages and questions', async () => {
    const test = await seedTest();
    const res  = await request(app).get(`/${test._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Cambridge IELTS 18 - Test 1');
    expect(res.body.data.passages).toHaveLength(1);
    expect(res.body.data.passages[0].questions).toHaveLength(2);
  });

  it('404 when the test does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res    = await request(app).get(`/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('500 when id is malformed (not a valid ObjectId)', async () => {
    // Mongoose CastError surfaces as 500 via the global error handler
    const res = await request(app).get('/not-a-valid-objectid');
    expect([404, 500]).toContain(res.status);
  });
});

// ============================================================
// POST /  — create test (teacher / admin only)
// ============================================================
describe('POST / — create test', () => {

  it('201 teacher can create a test', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(testPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
  });

  it('201 admin can also create a test', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(testPayload());

    expect(res.status).toBe(201);
  });

  it('400 when title is missing', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(testPayload({ title: undefined }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 when passages is empty array', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(testPayload({ passages: [] }));

    expect(res.status).toBe(400);
  });

  it('401 when no Authorization header is sent', async () => {
    const res = await request(app)
      .post('/')
      .send(testPayload());

    expect(res.status).toBe(401);
  });

  it('403 when a student tries to create a test', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(testPayload());

    expect(res.status).toBe(403);
  });
});

// ============================================================
// PUT /:id — update test
// ============================================================
describe('PUT /:id — update test', () => {

  it('200 owner (teacher) can update their own test', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .put(`/${test._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
  });

  it('200 admin can update any test regardless of ownership', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .put(`/${test._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin Updated' });

    expect(res.status).toBe(200);
  });

  it('403 when a different teacher (non-owner) tries to update', async () => {
    const otherTeacherId = new mongoose.Types.ObjectId();
    const otherToken = makeToken(otherTeacherId, 'teacher');
    const test = await seedTest(); // owned by TEACHER_ID

    const res = await request(app)
      .put(`/${test._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked Title' });

    expect(res.status).toBe(403);
  });

  it('404 when updating a non-existent test', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res    = await request(app)
      .put(`/${fakeId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Ghost Update' });

    expect(res.status).toBe(404);
  });
});

// ============================================================
// DELETE /:id — delete test
// ============================================================
describe('DELETE /:id — delete test', () => {

  it('200 owner can delete their own test', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .delete(`/${test._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm the document is gone from DB
    const gone = await ReadingTest.findById(test._id);
    expect(gone).toBeNull();
  });

  it('403 non-owner teacher cannot delete', async () => {
    const test = await seedTest();
    const otherToken = makeToken(new mongoose.Types.ObjectId(), 'teacher');
    const res  = await request(app)
      .delete(`/${test._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('404 deleting a non-existent test', async () => {
    const res = await request(app)
      .delete(`/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(404);
  });
});

// ============================================================
// POST /:id/submit — full test submission (student only)
// ============================================================
describe('POST /:id/submit — full test submission', () => {

  it('201 student submits answers and receives graded attempt', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: ['TRUE', 'B'], timeSpent: 1200 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rawScore).toBe(2);   // both answers correct
    expect(res.body.data.bandScore).toBe(2.0); // raw 2 → band 2.0
    expect(res.body.data.details).toHaveLength(2);
  });

  it('201 with rawScore 0 when all answers are wrong', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: ['WRONG', 'WRONG'], timeSpent: 30 });

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0);
    expect(res.body.data.bandScore).toBe(1.5);
  });

  it('201 with rawScore 0 when studentAnswers is empty', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: [], timeSpent: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0);
  });

  it('400 when studentAnswers is not an array', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: 'TRUE', timeSpent: 0 });

    expect(res.status).toBe(400);
  });

  it('401 when unauthenticated', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit`)
      .send({ studentAnswers: ['TRUE', 'B'] });

    expect(res.status).toBe(401);
  });

  it('404 when submitting to a non-existent test', async () => {
    const res = await request(app)
      .post(`/${new mongoose.Types.ObjectId()}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: ['A'], timeSpent: 0 });

    expect(res.status).toBe(404);
  });
});

// ============================================================
// POST /:id/submit-passage — single passage submission
// ============================================================
describe('POST /:id/submit-passage — single passage submission', () => {

  it('201 returns graded result for passage 1', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: ['TRUE', 'B'], timeSpent: 600, passageNumber: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.passageNumber).toBe(1);
    expect(res.body.data.rawScore).toBe(2);
  });

  it('400 when passageNumber is 0 (out of valid range)', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: ['TRUE'], timeSpent: 0, passageNumber: 0 });

    expect(res.status).toBe(400);
  });

  it('400 when passageNumber is 4 (above valid range)', async () => {
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: ['TRUE'], timeSpent: 0, passageNumber: 4 });

    expect(res.status).toBe(400);
  });

  it('404 when passageNumber does not exist in the test', async () => {
    // Test has only passage 1; requesting passage 2 → 404
    const test = await seedTest();
    const res  = await request(app)
      .post(`/${test._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: ['TRUE'], timeSpent: 0, passageNumber: 2 });

    expect(res.status).toBe(404);
  });
});

// ============================================================
// GET /my-attempts — student's own history
// ============================================================
describe('GET /my-attempts — student history', () => {

  it('200 returns only attempts belonging to the authenticated student', async () => {
    const test = await seedTest();

    // Create one attempt for STUDENT_ID and one for a different student
    await ReadingAttempt.create({
      testId: test._id, studentId: STUDENT_ID,
      studentAnswers: ['TRUE'], rawScore: 1, bandScore: 1.5,
    });
    await ReadingAttempt.create({
      testId: test._id, studentId: new mongoose.Types.ObjectId(),
      studentAnswers: ['FALSE'], rawScore: 0, bandScore: 1.5,
    });

    const res = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1); // only the student's own attempt
    expect(res.body.data[0].studentId).toBe(STUDENT_ID.toString());
  });

  it('401 when called without a token', async () => {
    const res = await request(app).get('/my-attempts');
    expect(res.status).toBe(401);
  });
});

// ============================================================
// GET /attempts — all attempts (teacher / admin only)
// ============================================================
describe('GET /attempts — all attempts (teacher+)', () => {

  it('200 teacher can view all attempts', async () => {
    const res = await request(app)
      .get('/attempts')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403 student cannot access all attempts', async () => {
    const res = await request(app)
      .get('/attempts')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

// ============================================================
// GET /stats — aggregate statistics
// ============================================================
describe('GET /stats — attempt statistics', () => {

  it('200 returns totalAttempts and avgBandScore', async () => {
    const res = await request(app)
      .get('/stats')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalAttempts');
    expect(res.body.data).toHaveProperty('avgBandScore');
  });

  it('200 totalAttempts reflects seeded data', async () => {
    const test = await seedTest();
    await ReadingAttempt.create({
      testId: test._id, studentId: STUDENT_ID,
      studentAnswers: [], rawScore: 0, bandScore: 1.5,
    });

    const res = await request(app)
      .get('/stats')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.body.data.totalAttempts).toBe(1);
  });

  it('403 student cannot access stats', async () => {
    const res = await request(app)
      .get('/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});
