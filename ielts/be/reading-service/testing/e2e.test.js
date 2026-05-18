/**
 * ============================================================
 * E2E TESTS — Complete User Journey (Black-Box)
 * ============================================================
 * Philosophy : This suite treats the service as a black box.
 *   No model imports.  No internals.  Only HTTP calls via
 *   Supertest — exactly as a real client would interact.
 *
 * Journeys covered:
 *   Journey A  Full Reading Test — teacher creates, student
 *              fetches, submits, views results, checks history.
 *
 *   Journey B  Single Passage — student works through one
 *              passage and verifies partial scoring.
 *
 *   Journey C  Pagination flow — teacher pages through a list
 *              of tests and navigates to a detail view.
 *
 * Each journey is a series of ordered `it` steps inside a
 * `describe` block.  Shared state (ids, tokens) lives in
 * closure variables set during the journey.
 * ============================================================
 */

// ── Environment bootstrapping ───────────────────────────────────────────────
process.env.JWT_SECRET = 'e2e-test-secret';
process.env.NODE_ENV   = 'test';

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
}));

// ── Dependencies ─────────────────────────────────────────────────────────────
const request   = require('supertest');
const mongoose  = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt       = require('jsonwebtoken');

const app = require('../app');

// ── DB lifecycle (shared across all journeys in this file) ───────────────────
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

// Helper: clear all collections (used inside each journey's beforeAll)
const clearCollections = async () => {
  for (const key of Object.keys(mongoose.connection.collections)) {
    await mongoose.connection.collections[key].deleteMany({});
  }
};

// ── Token helpers ─────────────────────────────────────────────────────────────
const makeToken = (id, role) =>
  jwt.sign({ id: id.toString(), role }, process.env.JWT_SECRET, { expiresIn: '1h' });

// ── Stable actor IDs ──────────────────────────────────────────────────────────
const TEACHER_ID = new mongoose.Types.ObjectId();
const STUDENT_ID = new mongoose.Types.ObjectId();
const teacherToken = makeToken(TEACHER_ID, 'teacher');
const studentToken = makeToken(STUDENT_ID, 'student');

// ============================================================
// JOURNEY A — Full Reading Test lifecycle
//
// Step 1  Teacher creates a 5-question reading test
// Step 2  Student (unauthenticated) lists all tests → sees it
// Step 3  Student fetches the test detail
// Step 4  Student submits answers (3 correct, 2 wrong)
// Step 5  Validate: rawScore = 3, bandScore = 2.0, details length = 5
// Step 6  Student fetches /my-attempts → sees the attempt
// Step 7  Teacher views /attempts → sees the same attempt
// ============================================================
describe('Journey A — Full Reading Test lifecycle', () => {
  // Each journey starts with a clean slate so previous journey's data
  // does not interfere.  Steps WITHIN a journey share DB state.
  beforeAll(async () => { await clearCollections(); });

  let testId;
  let attemptId;

  // Known correct answers we can assert against deterministically
  const CORRECT_ANSWERS = ['A', 'B', 'TRUE', 'FALSE', 'NOT GIVEN'];

  // ── Step 1 ────────────────────────────────────────────────
  it('Step 1: Teacher creates a reading test with 5 questions', async () => {
    const payload = {
      title: 'E2E Test — Cambridge IELTS 18',
      description: 'Full reading test with 5 questions',
      passages: [{
        passageNumber: 1,
        title: 'The Origin of Language',
        content: '<p>Language is one of the defining features...</p>',
        questions: CORRECT_ANSWERS.map((ans, i) => ({
          questionNumber: i + 1,
          type: i % 2 === 0 ? 'TFNG' : 'MULTIPLE_CHOICE',
          text: `Question ${i + 1}`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: ans,
        })),
      }],
    };

    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.passages[0].questions).toHaveLength(5);

    testId = res.body.data._id; // save for subsequent steps
  });

  // ── Step 2 ────────────────────────────────────────────────
  it('Step 2: Student (no token needed) lists all tests and sees the new test', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(testId);
    expect(res.body.data[0].title).toBe('E2E Test — Cambridge IELTS 18');
    // Confirm correctAnswers are NOT exposed in the list
    expect(res.body.data[0].passages[0].questions).toBeUndefined();
  });

  // ── Step 3 ────────────────────────────────────────────────
  it('Step 3: Student fetches test detail (including questions but not yet graded)', async () => {
    const res = await request(app).get(`/${testId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.passages[0].questions).toHaveLength(5);
    // correctAnswer IS exposed in the detail endpoint (used for student review post-submit)
    expect(res.body.data.passages[0].questions[0].correctAnswer).toBeDefined();
  });

  // ── Step 4 ────────────────────────────────────────────────
  it('Step 4: Student submits answers (3 correct, 2 wrong)', async () => {
    // Correct: [0]=A ✓, [1]=B ✓, [2]=TRUE ✓, [3]=WRONG ✗, [4]=WRONG ✗
    const studentAnswers = ['A', 'B', 'TRUE', 'WRONG', 'WRONG'];

    const res = await request(app)
      .post(`/${testId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers, timeSpent: 1800 });

    expect(res.status).toBe(201);

    attemptId = res.body.data._id; // save for step 6
  });

  // ── Step 5 ────────────────────────────────────────────────
  it('Step 5: Grading result — rawScore=3, bandScore=2.0, details correct', async () => {
    // Re-fetch the attempt from /my-attempts to get the full document
    const res = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const attempt = res.body.data[0];

    // Core scoring assertions
    expect(attempt.rawScore).toBe(3);
    expect(attempt.bandScore).toBe(2.0); // raw 3 → band 2.0 per bandTable

    // Details structure
    expect(attempt.details).toHaveLength(5);
    expect(attempt.details[0].isCorrect).toBe(true);   // 'A' === 'A'
    expect(attempt.details[1].isCorrect).toBe(true);   // 'B' === 'B'
    expect(attempt.details[2].isCorrect).toBe(true);   // 'TRUE' === 'TRUE'
    expect(attempt.details[3].isCorrect).toBe(false);  // 'WRONG' ≠ 'FALSE'
    expect(attempt.details[4].isCorrect).toBe(false);  // 'WRONG' ≠ 'NOT GIVEN'

    // Populated test reference
    expect(attempt.testId.title).toBe('E2E Test — Cambridge IELTS 18');

    // timeSpent is persisted
    expect(attempt.timeSpent).toBe(1800);
  });

  // ── Step 6 ────────────────────────────────────────────────
  it('Step 6: Student history shows exactly one attempt', async () => {
    const res = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(attemptId);
  });

  // ── Step 7 ────────────────────────────────────────────────
  it('Step 7: Teacher sees all attempts and finds the student submission', async () => {
    const res = await request(app)
      .get('/attempts')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].studentId).toBe(STUDENT_ID.toString());
  });
});

// ============================================================
// JOURNEY B — Single Passage Submission
//
// Step 1  Teacher creates a test with 2 passages (3 questions each)
// Step 2  Student submits ONLY Passage 1 (2 correct)
// Step 3  Validate: passageNumber=1, rawScore=2, details length=3
// Step 4  Stats endpoint reflects the new attempt
// ============================================================
describe('Journey B — Single passage submission', () => {
  beforeAll(async () => { await clearCollections(); });

  it('Step 1: Teacher creates a test with 2 passages', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Passage Submission Test',
        passages: [
          {
            passageNumber: 1,
            title: 'Passage One',
            content: '<p>Content of passage one...</p>',
            questions: [
              { questionNumber: 1, type: 'TFNG',           text: 'Q1', correctAnswer: 'TRUE' },
              { questionNumber: 2, type: 'MULTIPLE_CHOICE', text: 'Q2', correctAnswer: 'C', options: ['A','B','C','D'] },
              { questionNumber: 3, type: 'FILL_IN_BLANK',  text: 'Q3', correctAnswer: 'photosynthesis' },
            ],
          },
          {
            passageNumber: 2,
            title: 'Passage Two',
            content: '<p>Content of passage two...</p>',
            questions: [
              { questionNumber: 4, type: 'YNNG', text: 'Q4', correctAnswer: 'YES' },
            ],
          },
        ],
      });

    expect(res.status).toBe(201);
    this.testId = res.body.data._id;
  });

  it('Step 2 & 3: Student submits passage 1 (2/3 correct) and grading is accurate', async () => {
    // Need to get testId from DB since afterEach clears between journeys
    // We use the list endpoint since testId was stored on `this` (which Jest doesn't persist cross-it)
    const listRes = await request(app).get('/');
    const testId  = listRes.body.data[0]._id;

    // Q1='TRUE' ✓, Q2='WRONG' ✗, Q3='photosynthesis' ✓
    const res = await request(app)
      .post(`/${testId}/submit-passage`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        studentAnswers: ['TRUE', 'WRONG', 'photosynthesis'],
        timeSpent: 900,
        passageNumber: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.passageNumber).toBe(1);
    expect(res.body.data.rawScore).toBe(2);
    expect(res.body.data.details).toHaveLength(3);
    expect(res.body.data.details[0].isCorrect).toBe(true);
    expect(res.body.data.details[1].isCorrect).toBe(false);
    expect(res.body.data.details[2].isCorrect).toBe(true);
  });

  it('Step 4: Stats reflect the new passage attempt', async () => {
    const res = await request(app)
      .get('/stats')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalAttempts).toBe(1);
  });
});

// ============================================================
// JOURNEY C — Multiple tests, pagination & detail navigation
//
// Step 1  Teacher creates 3 tests with distinct titles
// Step 2  Student browses page 1 (limit=2) → sees 2 results
// Step 3  Student browses page 2 (limit=2) → sees 1 result
// Step 4  Student navigates to the detail of a specific test
// ============================================================
describe('Journey C — Pagination and navigation', () => {
  beforeAll(async () => { await clearCollections(); });

  const TITLES = [
    'IELTS Academic Test A',
    'IELTS Academic Test B',
    'IELTS Academic Test C',
  ];

  const minimalPassage = (n) => ({
    passageNumber: n,
    title: `Passage ${n}`,
    content: '<p>Content</p>',
    questions: [{
      questionNumber: 1, type: 'TFNG', text: 'Q1', correctAnswer: 'TRUE',
    }],
  });

  it('Step 1: Teacher creates 3 tests', async () => {
    for (const title of TITLES) {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ title, passages: [minimalPassage(1)] });

      expect(res.status).toBe(201);
    }
  });

  it('Step 2: Page 1 with limit=2 returns 2 tests', async () => {
    const res = await request(app).get('/?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.pages).toBe(2);
  });

  it('Step 3: Page 2 with limit=2 returns the remaining 1 test', async () => {
    const res = await request(app).get('/?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('Step 4: Student navigates to detail of a test from the list', async () => {
    const listRes = await request(app).get('/?page=1&limit=1');
    const testId  = listRes.body.data[0]._id;

    const detailRes = await request(app).get(`/${testId}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data._id).toBe(testId);
    expect(TITLES).toContain(detailRes.body.data.title);
  });
});

// ============================================================
// JOURNEY D — Band Score verification (multiple submissions)
//
// Verify the complete band conversion table via real HTTP
// by submitting known correct-answer counts.
// ============================================================
describe('Journey D — Band score table verification via HTTP', () => {
  beforeAll(async () => { await clearCollections(); });

  /**
   * Creates a test with `totalQuestions` TFNG questions all answerable with 'TRUE',
   * submits exactly `correctCount` correct answers, and asserts `expectedBand`.
   */
  const verifyBand = async (correctCount, totalQuestions, expectedBand) => {
    const questions = Array.from({ length: totalQuestions }, (_, i) => ({
      questionNumber: i + 1,
      type: 'TFNG',
      text: `Question ${i + 1}`,
      correctAnswer: 'TRUE',
    }));

    const createRes = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: `Band ${expectedBand} test`,
        passages: [{ passageNumber: 1, title: 'P1', content: '<p>x</p>', questions }],
      });

    const testId = createRes.body.data._id;

    // Build answers: first `correctCount` are correct, rest are wrong
    const answers = Array.from({ length: totalQuestions }, (_, i) =>
      i < correctCount ? 'TRUE' : 'WRONG'
    );

    const submitRes = await request(app)
      .post(`/${testId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentAnswers: answers, timeSpent: 0 });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.rawScore).toBe(correctCount);
    expect(submitRes.body.data.bandScore).toBe(expectedBand);

    // Clean up to avoid interfering with the next iteration
    const ReadingTest    = require('../src/models/ReadingTest');
    const ReadingAttempt = require('../src/models/attempt.model');
    await ReadingTest.deleteMany({});
    await ReadingAttempt.deleteMany({});
  };

  it.each([
    [0,  1,  1.5, 'score  0 → band 1.5'],
    [2,  5,  2.0, 'score  2 → band 2.0'],
    [10, 15, 4.0, 'score 10 → band 4.0'],
    [23, 30, 6.0, 'score 23 → band 6.0'],
    [30, 35, 7.0, 'score 30 → band 7.0'],
    [39, 40, 9.0, 'score 39 → band 9.0'],
    [40, 40, 9.0, 'score 40 → band 9.0'],
  ])('%s', async (correct, total, band) => {
    await verifyBand(correct, total, band);
  });
});
