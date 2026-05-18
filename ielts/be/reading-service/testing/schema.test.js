/**
 * ============================================================
 * SCHEMA TESTS — Data Layer Validation
 * ============================================================
 * Scope  : Mongoose models ReadingTest (+ embedded passageSchema,
 *          questionSchema) and ReadingAttempt.
 * Method : Drive documents through model.save() / model.create()
 *          directly — zero HTTP layer involvement.
 * Goal   : Catch schema contract regressions before they surface
 *          as cryptic 500 errors in production.
 *
 * Setup  : Each test file owns its MongoMemoryServer so it can
 *          run in parallel isolation via Jest workers.
 * ============================================================
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Models under test
const ReadingTest   = require('../src/models/ReadingTest');
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

// Wipe every collection between tests so assertions are isolated
afterEach(async () => {
  for (const key of Object.keys(mongoose.connection.collections)) {
    await mongoose.connection.collections[key].deleteMany({});
  }
});

// ── Test-data factories ─────────────────────────────────────────────────────

/** Minimal valid question document */
const validQuestion = (overrides = {}) => ({
  questionNumber: 1,
  type: 'MULTIPLE_CHOICE',
  text: 'What is the main idea of the passage?',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'B',
  ...overrides,
});

/** Minimal valid passage document (contains one question) */
const validPassage = (overrides = {}) => ({
  passageNumber: 1,
  title: 'Passage 1: The History of Paper',
  content: '<p>Paper was invented in China...</p>',
  questions: [validQuestion()],
  ...overrides,
});

/** Minimal valid ReadingTest top-level document */
const validTestData = (overrides = {}) => ({
  title: 'Cambridge IELTS 18 - Test 1',
  passages: [validPassage()],
  createdBy: new mongoose.Types.ObjectId(),
  ...overrides,
});

/** Minimal valid ReadingAttempt document */
const validAttemptData = (testId, studentId, overrides = {}) => ({
  testId,
  studentId,
  studentAnswers: ['B'],
  rawScore: 1,
  bandScore: 1.5,
  timeSpent: 120,
  details: [{
    questionIndex: 1,
    studentAnswer: 'B',
    correctAnswer: 'B',
    isCorrect: true,
  }],
  ...overrides,
});

// ============================================================
// SUITE 1 — ReadingTest top-level schema
// ============================================================
describe('ReadingTest Schema', () => {

  // ── Required fields ──────────────────────────────────────
  describe('Required field validation', () => {

    it('saves successfully when all required fields are present', async () => {
      const saved = await new ReadingTest(validTestData()).save();
      expect(saved._id).toBeDefined();
      expect(saved.title).toBe('Cambridge IELTS 18 - Test 1');
    });

    it('throws ValidationError when `title` is missing', async () => {
      const doc = new ReadingTest(validTestData({ title: undefined }));
      await expect(doc.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('throws ValidationError when `createdBy` is missing', async () => {
      const doc = new ReadingTest(validTestData({ createdBy: undefined }));
      await expect(doc.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  // ── Default values ────────────────────────────────────────
  describe('Default values', () => {

    it('defaults `isPublished` to false when not supplied', async () => {
      const saved = await new ReadingTest(validTestData()).save();
      expect(saved.isPublished).toBe(false);
    });

    it('auto-generates `createdAt` and `updatedAt` timestamps', async () => {
      const saved = await new ReadingTest(validTestData()).save();
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('allows an empty `passages` array without error', async () => {
      const saved = await new ReadingTest(validTestData({ passages: [] })).save();
      expect(saved.passages).toEqual([]);
    });
  });

  // ── Data-type coercion / acceptance ──────────────────────
  describe('Data type handling', () => {

    it('accepts `isPublished: true` explicitly set', async () => {
      const saved = await new ReadingTest(validTestData({ isPublished: true })).save();
      expect(saved.isPublished).toBe(true);
    });

    it('coerces a string ObjectId for `createdBy` to ObjectId type', async () => {
      const id = new mongoose.Types.ObjectId();
      const saved = await new ReadingTest(validTestData({ createdBy: id.toString() })).save();
      expect(saved.createdBy.toString()).toBe(id.toString());
    });

    it('treats an empty string `description` as valid', async () => {
      const saved = await new ReadingTest(validTestData({ description: '' })).save();
      expect(saved.description).toBe('');
    });
  });
});

// ============================================================
// SUITE 2 — passageSchema (embedded subdocument)
// ============================================================
describe('passageSchema (embedded inside ReadingTest.passages)', () => {

  it('saves a passage with all required fields intact', async () => {
    const saved = await new ReadingTest(validTestData()).save();
    const passage = saved.passages[0];
    expect(passage.passageNumber).toBe(1);
    expect(passage.title).toBe('Passage 1: The History of Paper');
    expect(passage.content).toContain('Paper was invented');
  });

  it('throws ValidationError when passage `title` is missing', async () => {
    const data = validTestData();
    delete data.passages[0].title;
    await expect(new ReadingTest(data).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('throws ValidationError when passage `content` is missing', async () => {
    const data = validTestData();
    delete data.passages[0].content;
    await expect(new ReadingTest(data).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('throws ValidationError when passage `passageNumber` is missing', async () => {
    const data = validTestData();
    delete data.passages[0].passageNumber;
    await expect(new ReadingTest(data).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('does NOT require the optional `image` field', async () => {
    // image is not in validPassage() — confirm it is truly optional
    const saved = await new ReadingTest(validTestData()).save();
    expect(saved.passages[0].image).toBeUndefined();
  });

  it('accepts very long HTML content in the `content` field', async () => {
    const longHtml = '<p>' + 'x'.repeat(50_000) + '</p>';
    const data = validTestData({ passages: [validPassage({ content: longHtml })] });
    const saved = await new ReadingTest(data).save();
    expect(saved.passages[0].content.length).toBeGreaterThan(50_000);
  });
});

// ============================================================
// SUITE 3 — questionSchema (doubly-embedded subdocument)
// ============================================================
describe('questionSchema (embedded inside passageSchema.questions)', () => {

  it('saves a question with all required fields intact', async () => {
    const saved = await new ReadingTest(validTestData()).save();
    const q = saved.passages[0].questions[0];
    expect(q.questionNumber).toBe(1);
    expect(q.type).toBe('MULTIPLE_CHOICE');
    expect(q.text).toBeDefined();
    expect(q.correctAnswer).toBe('B');
  });

  it('rejects an unknown `type` value not in the enum', async () => {
    const data = validTestData();
    data.passages[0].questions[0].type = 'INVALID_TYPE';
    await expect(new ReadingTest(data).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it.each([
    ['MULTIPLE_CHOICE'],
    ['FILL_IN_BLANK'],
    ['MATCHING'],
    ['TFNG'],
    ['YNNG'],
  ])('accepts valid enum type: %s', async (type) => {
    const data = validTestData();
    data.passages[0].questions[0].type = type;
    const saved = await new ReadingTest(data).save();
    expect(saved.passages[0].questions[0].type).toBe(type);
  });

  it('throws ValidationError when `questionNumber` is missing', async () => {
    const data = validTestData();
    delete data.passages[0].questions[0].questionNumber;
    await expect(new ReadingTest(data).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('throws ValidationError when `text` is missing', async () => {
    const data = validTestData();
    delete data.passages[0].questions[0].text;
    await expect(new ReadingTest(data).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('throws ValidationError when `correctAnswer` is missing', async () => {
    const data = validTestData();
    delete data.passages[0].questions[0].correctAnswer;
    await expect(new ReadingTest(data).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('does NOT require the optional `explanation` field', async () => {
    const saved = await new ReadingTest(validTestData()).save();
    expect(saved.passages[0].questions[0].explanation).toBeUndefined();
  });

  it('allows an empty `options` array (e.g. for FILL_IN_BLANK)', async () => {
    const data = validTestData();
    data.passages[0].questions[0].options = [];
    const saved = await new ReadingTest(data).save();
    expect(saved.passages[0].questions[0].options).toEqual([]);
  });
});

// ============================================================
// SUITE 4 — ReadingAttempt schema
// ============================================================
describe('ReadingAttempt Schema', () => {
  let testId;
  let studentId;

  // Create a real ReadingTest document so testId is a valid ObjectId reference
  beforeEach(async () => {
    const test = await new ReadingTest(validTestData()).save();
    testId = test._id;
    studentId = new mongoose.Types.ObjectId();
  });

  // ── Required fields ──────────────────────────────────────
  describe('Required field validation', () => {

    it('saves successfully when all required fields are present', async () => {
      const saved = await ReadingAttempt.create(validAttemptData(testId, studentId));
      expect(saved._id).toBeDefined();
      expect(saved.rawScore).toBe(1);
      expect(saved.bandScore).toBe(1.5);
    });

    it('throws ValidationError when `testId` is missing', async () => {
      const data = validAttemptData(testId, studentId, { testId: undefined });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('throws ValidationError when `studentId` is missing', async () => {
      const data = validAttemptData(testId, studentId, { studentId: undefined });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('throws ValidationError when `rawScore` is missing', async () => {
      const data = validAttemptData(testId, studentId, { rawScore: undefined });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('throws ValidationError when `bandScore` is missing', async () => {
      const data = validAttemptData(testId, studentId, { bandScore: undefined });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  // ── Default values ────────────────────────────────────────
  describe('Default values', () => {

    it('defaults `timeSpent` to 0 when not provided', async () => {
      const data = validAttemptData(testId, studentId);
      delete data.timeSpent;
      const saved = await ReadingAttempt.create(data);
      expect(saved.timeSpent).toBe(0);
    });

    it('defaults `passageNumber` to null (full-test submission)', async () => {
      const saved = await ReadingAttempt.create(validAttemptData(testId, studentId));
      expect(saved.passageNumber).toBeNull();
    });

    it('defaults `details` to an empty array when omitted', async () => {
      const data = validAttemptData(testId, studentId);
      delete data.details;
      const saved = await ReadingAttempt.create(data);
      expect(saved.details).toEqual([]);
    });
  });

  // ── Numeric constraints ───────────────────────────────────
  describe('Numeric constraint validation', () => {

    it('rejects `rawScore` below the minimum of 0', async () => {
      const data = validAttemptData(testId, studentId, { rawScore: -1 });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects `bandScore` above the maximum of 9', async () => {
      const data = validAttemptData(testId, studentId, { bandScore: 9.5 });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects `bandScore` below the minimum of 0', async () => {
      const data = validAttemptData(testId, studentId, { bandScore: -0.5 });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects `timeSpent` below the minimum of 0', async () => {
      const data = validAttemptData(testId, studentId, { timeSpent: -10 });
      await expect(ReadingAttempt.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('accepts bandScore of exactly 9 (boundary value)', async () => {
      const saved = await ReadingAttempt.create(
        validAttemptData(testId, studentId, { rawScore: 40, bandScore: 9 })
      );
      expect(saved.bandScore).toBe(9);
    });

    it('accepts bandScore of exactly 0 (boundary value)', async () => {
      const saved = await ReadingAttempt.create(
        validAttemptData(testId, studentId, { bandScore: 0 })
      );
      expect(saved.bandScore).toBe(0);
    });
  });

  // ── AttemptDetail embedded subdocument ────────────────────
  describe('AttemptDetail embedded subdocument', () => {

    it('saves detail entries with all required fields', async () => {
      const saved = await ReadingAttempt.create(validAttemptData(testId, studentId));
      expect(saved.details[0].questionIndex).toBe(1);
      expect(saved.details[0].isCorrect).toBe(true);
      expect(saved.details[0].correctAnswer).toBe('B');
    });

    it('defaults `studentAnswer` to an empty string in details', async () => {
      const data = validAttemptData(testId, studentId, {
        details: [{ questionIndex: 1, correctAnswer: 'A', isCorrect: false }],
      });
      const saved = await ReadingAttempt.create(data);
      expect(saved.details[0].studentAnswer).toBe('');
    });
  });
});
