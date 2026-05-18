'use strict';
/**
 * listening-service — schema.test.js
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

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

const ListeningTest = require('../src/models/ListeningTest');
const ListeningAttempt = require('../src/models/attempt.model');

// ─── ListeningTest ────────────────────────────────────────────────────────────
describe('ListeningTest Schema', () => {
  const validTest = () => ({
    title: 'IELTS Listening Practice Test 1',
    description: 'Academic module practice',
    parts: [
      {
        partNumber: 1,
        title: 'Part 1: Conversation',
        audioUrl: 'https://cdn.example.com/audio/part1.mp3',
        questions: [
          { questionText: 'What is the caller\'s name?', type: 'fill_blank', correctAnswer: 'Johnson' },
        ],
      },
    ],
  });

  it('saves a valid test', async () => {
    const t = await ListeningTest.create(validTest());
    expect(t._id).toBeDefined();
    expect(t.title).toBe('IELTS Listening Practice Test 1');
  });

  it('rejects missing title', async () => {
    const bad = validTest();
    delete bad.title;
    await expect(ListeningTest.create(bad)).rejects.toThrow();
  });

  it('rejects invalid question type', async () => {
    const bad = validTest();
    bad.parts[0].questions[0].type = 'essay';
    await expect(ListeningTest.create(bad)).rejects.toThrow();
  });

  it('accepts all valid question types', async () => {
    const types = ['multiple_choice', 'fill_blank', 'map_labeling', 'matching'];
    for (const type of types) {
      const t = await ListeningTest.create({
        title: `Test ${type}`,
        parts: [
          {
            partNumber: 1,
            title: 'Part 1',
            audioUrl: 'https://cdn.example.com/audio.mp3',
            questions: [{ questionText: 'Q?', type, correctAnswer: 'A' }],
          },
        ],
      });
      expect(t._id).toBeDefined();
    }
  });

  it('requires audioUrl per part', async () => {
    const bad = validTest();
    delete bad.parts[0].audioUrl;
    await expect(ListeningTest.create(bad)).rejects.toThrow();
  });

  it('sets timestamps', async () => {
    const t = await ListeningTest.create(validTest());
    expect(t.createdAt).toBeInstanceOf(Date);
  });
});

// ─── ListeningAttempt ────────────────────────────────────────────────────────
describe('ListeningAttempt Schema', () => {
  let testId;

  beforeEach(async () => {
    const t = await ListeningTest.create({
      title: 'Practice Test',
      parts: [],
    });
    testId = t._id;
  });

  const validAttempt = (tId) => ({
    testId: tId,
    studentId: new mongoose.Types.ObjectId(),
    studentAnswers: ['Johnson', 'B', 'London'],
    rawScore: 30,
    bandScore: 7.0,
  });

  it('saves a valid attempt', async () => {
    const a = await ListeningAttempt.create(validAttempt(testId));
    expect(a._id).toBeDefined();
    expect(a.rawScore).toBe(30);
    expect(a.bandScore).toBe(7.0);
  });

  it('rejects missing testId', async () => {
    await expect(ListeningAttempt.create({
      studentId: new mongoose.Types.ObjectId(),
      rawScore: 20,
      bandScore: 5.5,
    })).rejects.toThrow();
  });

  it('rejects bandScore > 9', async () => {
    await expect(ListeningAttempt.create({
      ...validAttempt(testId),
      bandScore: 10,
    })).rejects.toThrow();
  });

  it('accepts partNumber 1-4', async () => {
    const a = await ListeningAttempt.create({ ...validAttempt(testId), partNumber: 2 });
    expect(a.partNumber).toBe(2);
  });

  it('defaults partNumber to null (full test)', async () => {
    const a = await ListeningAttempt.create(validAttempt(testId));
    expect(a.partNumber).toBeNull();
  });
});
