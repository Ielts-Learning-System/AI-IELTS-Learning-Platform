/**
 * ============================================================
 * UNIT TESTS — Business Logic Layer
 * ============================================================
 * Scope  : Pure functions in scoreConverter.js  AND  grading
 *          logic inside reading.controller.js.
 * Method : No real DB. All Mongoose models are jest.mock()'d
 *          so tests run in milliseconds and stay deterministic.
 *
 * Why mock the controller instead of extracting helpers?
 *   `normalizeAnswer` and `isAnswerCorrect` are module-private
 *   functions. We exercise them indirectly by controlling the
 *   `correctAnswer` values that `ReadingTest.findById` returns
 *   and asserting the `rawScore` / `details` that reach
 *   `ReadingAttempt.create`.
 * ============================================================
 */

// ── Environment bootstrapping (must happen before any require) ──────────────
process.env.JWT_SECRET  = 'unit-test-secret';
process.env.NODE_ENV    = 'test';

// ── Mock all side-effectful modules BEFORE importing the controller ──────────
jest.mock('../src/models/ReadingTest');
jest.mock('../src/models/attempt.model');
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
}));

// ── Imports ──────────────────────────────────────────────────────────────────
const mongoose          = require('mongoose');
const ReadingTest       = require('../src/models/ReadingTest');
const ReadingAttempt    = require('../src/models/attempt.model');
const { convertRawToBand } = require('../src/utils/scoreConverter');
const readingController = require('../src/controllers/reading.controller');

// ── Shared test utilities ────────────────────────────────────────────────────

/**
 * Build a lightweight mock Express req/res pair.
 * `res.status` returns `res` so chained `.json()` calls work.
 */
const makeMocks = (params = {}, body = {}, user = {}) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  };
  return { req: { params, body, user }, res };
};

/**
 * Factory for a ReadingTest-like object with known correct answers.
 * @param {string[]} answers - flat array of correct answers across all passages
 */
const mockTestWithAnswers = (answers) => ({
  _id: new mongoose.Types.ObjectId(),
  passages: [{
    questions: answers.map((a, i) => ({
      questionNumber: i + 1,
      correctAnswer: a,
    })),
  }],
});

/** Wire up ReadingTest.findById and ReadingAttempt.create mocks. */
const wireSubmitMocks = (test) => {
  let captured = null;

  ReadingTest.findById.mockResolvedValue(test);

  ReadingAttempt.create.mockImplementation(async (data) => {
    captured = data;
    return { _id: new mongoose.Types.ObjectId(), ...data };
  });

  // The controller calls findById(...).populate(...) after create
  ReadingAttempt.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      testId: { title: 'Mock Test' },
    }),
  });

  return { getCapture: () => captured };
};

// Reset mocks between tests to avoid bleed-over
afterEach(() => jest.clearAllMocks());

// ============================================================
// SUITE 1 — convertRawToBand (pure function, zero mocking)
// ============================================================
describe('convertRawToBand(rawScore, moduleType)', () => {

  // ── IELTS band boundary table ─────────────────────────────
  describe('Band boundary values', () => {

    it.each([
      // [rawScore, expectedBand, label]
      [0,  1.5, 'score 0  → band 1.5'],
      [1,  1.5, 'score 1  → band 1.5'],
      [2,  2.0, 'score 2  → band 2.0'],
      [3,  2.0, 'score 3  → band 2.0'],
      [4,  2.5, 'score 4  → band 2.5'],
      [6,  3.0, 'score 6  → band 3.0'],
      [8,  3.5, 'score 8  → band 3.5'],
      [10, 4.0, 'score 10 → band 4.0'],
      [13, 4.5, 'score 13 → band 4.5'],
      [15, 5.0, 'score 15 → band 5.0'],
      [19, 5.5, 'score 19 → band 5.5'],
      [23, 6.0, 'score 23 → band 6.0'],
      [26, 6.0, 'score 26 → band 6.0 (upper edge)'],
      [27, 6.5, 'score 27 → band 6.5'],
      [30, 7.0, 'score 30 → band 7.0'],
      [33, 7.5, 'score 33 → band 7.5'],
      [35, 8.0, 'score 35 → band 8.0'],
      [37, 8.5, 'score 37 → band 8.5'],
      [39, 9.0, 'score 39 → band 9.0'],
      [40, 9.0, 'score 40 → band 9.0 (max)'],
    ])('%s', (raw, expected) => {
      expect(convertRawToBand(raw, 'reading')).toBe(expected);
    });
  });

  // ── Module-type guard ─────────────────────────────────────
  describe('Module type validation', () => {

    it('returns 0 for unsupported module type "writing"', () => {
      expect(convertRawToBand(30, 'writing')).toBe(0);
    });

    it('returns 0 for unsupported module type "speaking"', () => {
      expect(convertRawToBand(30, 'speaking')).toBe(0);
    });

    it('accepts "listening" as an equivalent module', () => {
      expect(convertRawToBand(30, 'listening')).toBe(7.0);
    });

    it('is case-insensitive for moduleType', () => {
      expect(convertRawToBand(30, 'READING')).toBe(7.0);
      expect(convertRawToBand(30, 'Reading')).toBe(7.0);
    });

    it('defaults to reading when moduleType is undefined', () => {
      // The function signature has default 'reading' for moduleType
      expect(convertRawToBand(30)).toBe(7.0);
    });
  });

  // ── Edge / defensive inputs ───────────────────────────────
  describe('Defensive input handling', () => {

    it('clamps negative score to 0 → band 1.5', () => {
      expect(convertRawToBand(-5, 'reading')).toBe(1.5);
    });

    it('clamps score above 40 to 40 → band 9.0', () => {
      expect(convertRawToBand(999, 'reading')).toBe(9.0);
    });

    it('floors a float score (26.9 → 26) → band 6.0', () => {
      expect(convertRawToBand(26.9, 'reading')).toBe(6.0);
    });

    it('treats NaN input as 0 → band 1.5', () => {
      expect(convertRawToBand(NaN, 'reading')).toBe(1.5);
    });

    it('coerces a numeric string "30" to 30 → band 7.0', () => {
      expect(convertRawToBand('30', 'reading')).toBe(7.0);
    });

    it('treats null rawScore as 0 → band 1.5', () => {
      expect(convertRawToBand(null, 'reading')).toBe(1.5);
    });
  });
});

// ============================================================
// SUITE 2 — Grading logic via submitTest controller (mocked DB)
// ============================================================
describe('submitTest — grading logic (mocked DB)', () => {

  // ── rawScore calculation ──────────────────────────────────
  describe('rawScore calculation', () => {

    it('gives rawScore 0 when all answers are wrong', async () => {
      const test = mockTestWithAnswers(['A', 'B', 'C']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: ['X', 'X', 'X'], timeSpent: 60 },
        { id: new mongoose.Types.ObjectId().toString(), role: 'student' }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(0);
      expect(getCapture().bandScore).toBe(1.5); // 0 raw → band 1.5
    });

    it('gives rawScore equal to total questions when all answers are correct', async () => {
      const answers = ['A', 'TRUE', 'B', 'NOT GIVEN', 'C'];
      const test = mockTestWithAnswers(answers);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: [...answers], timeSpent: 300 },
        { id: new mongoose.Types.ObjectId().toString(), role: 'student' }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(5);
    });

    it('counts 3 correct out of 5 and maps to band 2.0', async () => {
      const test = mockTestWithAnswers(['A', 'B', 'TRUE', 'FALSE', 'C']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        // answers[3] and answers[4] are wrong
        { studentAnswers: ['A', 'B', 'TRUE', 'WRONG', 'WRONG'], timeSpent: 200 },
        { id: new mongoose.Types.ObjectId().toString(), role: 'student' }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(3);
      expect(getCapture().bandScore).toBe(2.0);
    });

    it('treats an empty studentAnswers array as rawScore 0', async () => {
      const test = mockTestWithAnswers(['A', 'B']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: [], timeSpent: 0 },
        { id: new mongoose.Types.ObjectId().toString(), role: 'student' }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(0);
    });
  });

  // ── isAnswerCorrect — case / whitespace / alternate forms ─
  describe('isAnswerCorrect — tested through submitTest', () => {

    it('is case-insensitive: "true" matches correctAnswer "TRUE"', async () => {
      const test = mockTestWithAnswers(['TRUE']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: ['true'], timeSpent: 10 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(1);
      expect(getCapture().details[0].isCorrect).toBe(true);
    });

    it('trims leading/trailing whitespace before comparison', async () => {
      const test = mockTestWithAnswers(['B']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: ['  B  '], timeSpent: 10 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(1);
    });

    it('accepts alternate answers separated by "/" (e.g. "10/ten")', async () => {
      const test = mockTestWithAnswers(['10/ten']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: ['ten'], timeSpent: 10 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(1);
    });

    it('accepts the numeric half of an alternate answer "10/ten"', async () => {
      const test = mockTestWithAnswers(['10/ten']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: ['10'], timeSpent: 10 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(1);
    });

    it('coerces a null answer entry in the array to empty string (no crash)', async () => {
      const test = mockTestWithAnswers(['A']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        // null inside the array — should be coerced to ''
        { studentAnswers: [null], timeSpent: 0 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().rawScore).toBe(0);
      expect(getCapture().studentAnswers[0]).toBe('');
    });
  });

  // ── details array structure ───────────────────────────────
  describe('details array structure', () => {

    it('produces one detail entry per question in the test', async () => {
      const test = mockTestWithAnswers(['A', 'B', 'C']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: ['A', 'X', 'X'], timeSpent: 30 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().details).toHaveLength(3);
    });

    it('records questionIndex starting at 1 (not 0)', async () => {
      const test = mockTestWithAnswers(['A']);
      const { getCapture } = wireSubmitMocks(test);
      const { req, res } = makeMocks(
        { id: test._id.toString() },
        { studentAnswers: ['A'], timeSpent: 10 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(getCapture().details[0].questionIndex).toBe(1);
    });
  });

  // ── Input validation guards (before DB is hit) ────────────
  describe('Input validation guards', () => {

    it('returns 400 when studentAnswers is not an array', async () => {
      ReadingTest.findById.mockResolvedValue(mockTestWithAnswers(['A']));
      const { req, res } = makeMocks(
        { id: new mongoose.Types.ObjectId().toString() },
        { studentAnswers: 'not-an-array', timeSpent: 0 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when test does not exist', async () => {
      ReadingTest.findById.mockResolvedValue(null);
      const { req, res } = makeMocks(
        { id: new mongoose.Types.ObjectId().toString() },
        { studentAnswers: ['A'], timeSpent: 0 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 and does not crash when DB throws', async () => {
      ReadingTest.findById.mockRejectedValue(new Error('DB connection lost'));
      const { req, res } = makeMocks(
        { id: new mongoose.Types.ObjectId().toString() },
        { studentAnswers: ['A'], timeSpent: 0 },
        { id: new mongoose.Types.ObjectId().toString() }
      );

      await readingController.submitTest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

// ============================================================
// SUITE 3 — getAllTests controller (mocked aggregation)
// ============================================================
describe('getAllTests — pagination logic (mocked DB)', () => {

  it('calls aggregate with $skip / $limit derived from query params', async () => {
    ReadingTest.aggregate.mockResolvedValue([]);
    ReadingTest.countDocuments.mockResolvedValue(0);

    const { req, res } = makeMocks({}, {}, {});
    req.query = { page: '2', limit: '5' };

    await readingController.getAllTests(req, res);

    // Verify the aggregate pipeline was called
    expect(ReadingTest.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = ReadingTest.aggregate.mock.calls[0][0];

    const skipStage  = pipeline.find((s) => s.$skip  !== undefined);
    const limitStage = pipeline.find((s) => s.$limit !== undefined);

    expect(skipStage.$skip).toBe(5);   // (page-1)*limit = 1*5
    expect(limitStage.$limit).toBe(5);
  });

  it('defaults to page=1 / limit=10 when query params are absent', async () => {
    ReadingTest.aggregate.mockResolvedValue([]);
    ReadingTest.countDocuments.mockResolvedValue(0);

    const { req, res } = makeMocks({}, {}, {});
    req.query = {};

    await readingController.getAllTests(req, res);

    const pipeline = ReadingTest.aggregate.mock.calls[0][0];
    expect(pipeline.find((s) => s.$skip  !== undefined).$skip).toBe(0);
    expect(pipeline.find((s) => s.$limit !== undefined).$limit).toBe(10);
  });
});
