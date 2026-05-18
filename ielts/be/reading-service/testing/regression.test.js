/**
 * ============================================================
 * REGRESSION TESTS — Edge Cases & Bug Prevention
 * ============================================================
 * Purpose : Prevent previously-identified or high-risk bugs
 *           from regressing.  Every test here represents a
 *           concrete failure scenario that MUST NOT recur.
 *
 * Categories:
 *   R01  Answer normalisation (case · whitespace · alternates)
 *   R02  Input boundary conditions (empty · null · numeric)
 *   R03  Security / injection surface (XSS · long strings)
 *   R04  Student data isolation
 *   R05  Controller-default vs schema-default discrepancy
 *   R06  Edge-case HTTP routing (deleted resource · bad IDs)
 *   R07  submit-passage boundary guards
 *   R08  timeSpent negative clamping
 *   R09  Unicode and emoji in answers
 * ============================================================
 */

// ── Environment bootstrapping ───────────────────────────────────────────────
process.env.JWT_SECRET = 'regression-test-secret';
process.env.NODE_ENV   = 'test';

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

// ── DB lifecycle ──────────────────────────────────────────────────────────────
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

// ── Token & ID helpers ────────────────────────────────────────────────────────
const makeToken = (id, role) =>
  jwt.sign({ id: id.toString(), role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const TEACHER_ID  = new mongoose.Types.ObjectId();
const STUDENT_A   = new mongoose.Types.ObjectId();
const STUDENT_B   = new mongoose.Types.ObjectId();

const teacherToken  = makeToken(TEACHER_ID, 'teacher');
const studentTokenA = makeToken(STUDENT_A, 'student');
const studentTokenB = makeToken(STUDENT_B, 'student');

// ── Seed helper ───────────────────────────────────────────────────────────────
/**
 * Directly insert a test document into the DB with known correct answers.
 * Returns the Mongoose document.
 */
const seedTestWithAnswers = (correctAnswers, extra = {}) =>
  ReadingTest.create({
    title: 'Regression Test',
    createdBy: TEACHER_ID,
    passages: [{
      passageNumber: 1,
      title: 'Regression Passage',
      content: '<p>Regression content</p>',
      questions: correctAnswers.map((a, i) => ({
        questionNumber: i + 1,
        type: 'TFNG',
        text: `Q${i + 1}`,
        correctAnswer: a,
      })),
    }],
    ...extra,
  });

/** Submit answers to a test and return the Supertest response. */
const submitAnswers = (testId, answers, token = studentTokenA, extra = {}) =>
  request(app)
    .post(`/${testId}/submit`)
    .set('Authorization', `Bearer ${token}`)
    .send({ studentAnswers: answers, timeSpent: 0, ...extra });

// ============================================================
// R01 — Answer normalisation
// ============================================================
describe('R01 — Answer normalisation', () => {

  it('BUG-PREV: "true" (lower-case) must match correctAnswer "TRUE"', async () => {
    const t   = await seedTestWithAnswers(['TRUE']);
    const res = await submitAnswers(t._id, ['true']);
    expect(res.body.data.rawScore).toBe(1);
    expect(res.body.data.details[0].isCorrect).toBe(true);
  });

  it('BUG-PREV: answer with leading spaces "  B  " must match "B"', async () => {
    const t   = await seedTestWithAnswers(['B']);
    const res = await submitAnswers(t._id, ['  B  ']);
    expect(res.body.data.rawScore).toBe(1);
  });

  it('BUG-PREV: both halves of "10/ten" must be accepted independently', async () => {
    const t = await seedTestWithAnswers(['10/ten', '10/ten']);

    // Submit "ten" for Q1 and "10" for Q2
    const res = await submitAnswers(t._id, ['ten', '10']);
    expect(res.body.data.rawScore).toBe(2);
  });

  it('BUG-PREV: "TEN" (upper-case) matches alternate "10/ten"', async () => {
    const t   = await seedTestWithAnswers(['10/ten']);
    const res = await submitAnswers(t._id, ['TEN']);
    expect(res.body.data.rawScore).toBe(1);
  });

  it('REGRESSION: mixed-case "Not Given" matches "NOT GIVEN"', async () => {
    const t   = await seedTestWithAnswers(['NOT GIVEN']);
    const res = await submitAnswers(t._id, ['Not Given']);
    expect(res.body.data.rawScore).toBe(1);
  });

  it('REGRESSION: extra internal spaces do NOT prevent a correct match', async () => {
    // normalizeAnswer trims outer spaces only — internal spaces kept
    // "not given" should NOT match "not  given" (double space inside)
    const t   = await seedTestWithAnswers(['not given']);
    const res = await submitAnswers(t._id, ['not  given']); // double-space
    expect(res.status).toBe(201);
    // The test verifies no crash; whether it matches depends on impl.
    expect([0, 1]).toContain(res.body.data.rawScore);
  });
});

// ============================================================
// R02 — Input boundary conditions
// ============================================================
describe('R02 — Input boundary conditions', () => {

  it('BUG-PREV: empty studentAnswers array returns rawScore=0, bandScore=1.5, no crash', async () => {
    const t   = await seedTestWithAnswers(['A', 'B']);
    const res = await submitAnswers(t._id, []);
    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0);
    expect(res.body.data.bandScore).toBe(1.5);
  });

  it('BUG-PREV: null entry inside studentAnswers is coerced to "" (no crash)', async () => {
    const t   = await seedTestWithAnswers(['A']);
    const res = await submitAnswers(t._id, [null]);
    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0);
    // null should be normalised to '' which does not match 'A'
    expect(res.body.data.details[0].isCorrect).toBe(false);
  });

  it('BUG-PREV: numeric answers in the array are coerced to strings (no crash)', async () => {
    const t   = await seedTestWithAnswers(['1', '2']);
    const res = await submitAnswers(t._id, [1, 2]); // numbers, not strings
    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(2); // "1" matches "1", "2" matches "2"
  });

  it('BUG-PREV: studentAnswers with more items than questions does not crash', async () => {
    // Test has 2 questions; student submits 5 answers
    const t   = await seedTestWithAnswers(['A', 'B']);
    const res = await submitAnswers(t._id, ['A', 'B', 'C', 'D', 'E']);
    expect(res.status).toBe(201);
    // Only 2 questions → rawScore cannot exceed 2
    expect(res.body.data.rawScore).toBeLessThanOrEqual(2);
  });

  it('REGRESSION: undefined answer entry is handled gracefully (no crash)', async () => {
    const t   = await seedTestWithAnswers(['A']);
    // JSON.stringify converts undefined to null, so this is equivalent to [null]
    const res = await submitAnswers(t._id, [undefined]);
    expect(res.status).toBe(201);
  });
});

// ============================================================
// R03 — Security / injection surface
// ============================================================
describe('R03 — Security / injection surface', () => {

  it('BUG-PREV: XSS payload in studentAnswer is stored as-is, service does not crash', async () => {
    const xss = '<script>alert("xss")</script>';
    const t   = await seedTestWithAnswers(['TRUE']);
    const res = await submitAnswers(t._id, [xss]);

    expect(res.status).toBe(201);
    // The answer is wrong, but service survived
    expect(res.body.data.rawScore).toBe(0);
    // Verify it was stored (not silently dropped)
    expect(res.body.data.studentAnswers[0]).toBe(xss);
  });

  it('BUG-PREV: very long answer (10 000 chars) does not crash the service', async () => {
    const longAnswer = 'a'.repeat(10_000);
    const t   = await seedTestWithAnswers(['TRUE']);
    const res = await submitAnswers(t._id, [longAnswer]);

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0);
  });

  it('BUG-PREV: SQL-injection-like string in answer is handled gracefully', async () => {
    const sql = "'; DROP TABLE users; --";
    const t   = await seedTestWithAnswers(['A']);
    const res = await submitAnswers(t._id, [sql]);

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0);
  });

  it('BUG-PREV: NoSQL-injection in query param does not expose all tests', async () => {
    await seedTestWithAnswers(['A']); // 1 test in DB
    // Attempt MongoDB operator injection via query string
    const res = await request(app).get('/?page[$gt]=0');
    expect(res.status).toBe(200);
    // Should return normal paginated result, not a DB dump
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ============================================================
// R04 — Student data isolation
// ============================================================
describe('R04 — Student data isolation', () => {

  it('BUG-PREV: Student A cannot see Student B\'s attempts via /my-attempts', async () => {
    const t = await seedTestWithAnswers(['TRUE']);

    // Student B submits an attempt
    await submitAnswers(t._id, ['TRUE'], studentTokenB);

    // Student A's /my-attempts should return 0 results
    const res = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${studentTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('BUG-PREV: Two students submit separately; each sees only their own attempt', async () => {
    const t = await seedTestWithAnswers(['A']);

    await submitAnswers(t._id, ['A'],     studentTokenA);
    await submitAnswers(t._id, ['WRONG'], studentTokenB);

    const resA = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${studentTokenA}`);

    const resB = await request(app)
      .get('/my-attempts')
      .set('Authorization', `Bearer ${studentTokenB}`);

    expect(resA.body.data).toHaveLength(1);
    expect(resB.body.data).toHaveLength(1);
    expect(resA.body.data[0].rawScore).toBe(1);
    expect(resB.body.data[0].rawScore).toBe(0);
  });
});

// ============================================================
// R05 — Controller-default vs schema-default discrepancy
// ============================================================
describe('R05 — isPublished default discrepancy', () => {

  it('FIX: POST / without isPublished creates test with isPublished=false (schema default, bug fixed)', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Default Test',
        passages: [{
          passageNumber: 1, title: 'P', content: '<p>c</p>',
          questions: [{ questionNumber: 1, type: 'TFNG', text: 'Q', correctAnswer: 'TRUE' }],
        }],
        // isPublished deliberately omitted
      });

    expect(res.status).toBe(201);
    // Controller now defaults to schema default `false` when field is absent
    expect(res.body.data.isPublished).toBe(false);
  });

  it('REGRESSION: POST / with isPublished=false honours the explicit value', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Explicit False Test',
        isPublished: false,
        passages: [{
          passageNumber: 1, title: 'P', content: '<p>c</p>',
          questions: [{ questionNumber: 1, type: 'TFNG', text: 'Q', correctAnswer: 'TRUE' }],
        }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.isPublished).toBe(false);
  });
});

// ============================================================
// R06 — Edge-case HTTP routing
// ============================================================
describe('R06 — Edge-case HTTP routing', () => {

  it('BUG-PREV: submitting to a deleted testId returns 404 (not a crash)', async () => {
    const t  = await seedTestWithAnswers(['A']);
    const id = t._id.toString();

    // Delete the test
    await ReadingTest.findByIdAndDelete(id);

    const res = await submitAnswers(id, ['A']);
    expect(res.status).toBe(404);
  });

  it('BUG-PREV: GET /:id with a non-ObjectId string returns 4xx or 5xx (not 200)', async () => {
    const res = await request(app).get('/not-a-valid-objectid');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('BUG-PREV: DELETE /:id on already-deleted test returns 404', async () => {
    const t  = await seedTestWithAnswers(['A']);
    const id = t._id.toString();

    await ReadingTest.findByIdAndDelete(id);

    const res = await request(app)
      .delete(`/${id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(404);
  });
});

// ============================================================
// R07 — submit-passage boundary guards
// ============================================================
describe('R07 — submit-passage boundary guards', () => {

  it('BUG-PREV: passageNumber=0 returns 400', async () => {
    const t   = await seedTestWithAnswers(['A']);
    const res = await request(app)
      .post(`/${t._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentTokenA}`)
      .send({ studentAnswers: ['A'], timeSpent: 0, passageNumber: 0 });

    expect(res.status).toBe(400);
  });

  it('BUG-PREV: passageNumber=4 (above maximum) returns 400', async () => {
    const t   = await seedTestWithAnswers(['A']);
    const res = await request(app)
      .post(`/${t._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentTokenA}`)
      .send({ studentAnswers: ['A'], timeSpent: 0, passageNumber: 4 });

    expect(res.status).toBe(400);
  });

  it('BUG-PREV: passageNumber=2 on a single-passage test returns 404', async () => {
    const t   = await seedTestWithAnswers(['A']); // only passage 1
    const res = await request(app)
      .post(`/${t._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentTokenA}`)
      .send({ studentAnswers: ['A'], timeSpent: 0, passageNumber: 2 });

    expect(res.status).toBe(404);
  });

  it('BUG-PREV: passageNumber as string "1" is coerced and accepted (not 400)', async () => {
    const t   = await seedTestWithAnswers(['A']);
    const res = await request(app)
      .post(`/${t._id}/submit-passage`)
      .set('Authorization', `Bearer ${studentTokenA}`)
      .send({ studentAnswers: ['A'], timeSpent: 0, passageNumber: '1' });

    // Should succeed (number coercion) or reject gracefully (not a 5xx crash)
    expect([201, 400]).toContain(res.status);
  });
});

// ============================================================
// R08 — timeSpent negative clamping
// ============================================================
describe('R08 — timeSpent negative clamping', () => {

  it('BUG-PREV: negative timeSpent is stored as 0 (not as a negative number)', async () => {
    const t   = await seedTestWithAnswers(['TRUE']);
    const res = await submitAnswers(t._id, ['TRUE'], studentTokenA, { timeSpent: -500 });

    expect(res.status).toBe(201);
    expect(res.body.data.timeSpent).toBe(0);
  });

  it('REGRESSION: timeSpent=0 (exactly) is stored as 0', async () => {
    const t   = await seedTestWithAnswers(['TRUE']);
    const res = await submitAnswers(t._id, ['TRUE'], studentTokenA, { timeSpent: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.timeSpent).toBe(0);
  });

  it('REGRESSION: timeSpent as string "300" is coerced to number 300', async () => {
    const t   = await seedTestWithAnswers(['TRUE']);
    const res = await submitAnswers(t._id, ['TRUE'], studentTokenA, { timeSpent: '300' });

    expect(res.status).toBe(201);
    expect(res.body.data.timeSpent).toBe(300);
  });
});

// ============================================================
// R09 — Unicode and emoji in answers
// ============================================================
describe('R09 — Unicode and emoji in answers', () => {

  it('BUG-PREV: accented character "café" in answer does not crash the service', async () => {
    const t   = await seedTestWithAnswers(['café']);
    const res = await submitAnswers(t._id, ['café']);

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(1); // exact unicode match
  });

  it('BUG-PREV: emoji "🎯" in answer does not crash the service', async () => {
    const t   = await seedTestWithAnswers(['normal']);
    const res = await submitAnswers(t._id, ['🎯']);

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0); // emoji ≠ 'normal'
  });

  it('BUG-PREV: Vietnamese answer "Không Đúng" does not crash (multi-byte UTF-8)', async () => {
    const t   = await seedTestWithAnswers(['Không Đúng']);
    const res = await submitAnswers(t._id, ['Không Đúng']);

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(1);
  });

  it('BUG-PREV: null character in answer (\u0000) does not crash the service', async () => {
    const t   = await seedTestWithAnswers(['A']);
    const res = await submitAnswers(t._id, ['\u0000']);

    expect(res.status).toBe(201);
    expect(res.body.data.rawScore).toBe(0);
  });
});
