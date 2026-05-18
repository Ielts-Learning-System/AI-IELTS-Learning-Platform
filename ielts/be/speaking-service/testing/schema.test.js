'use strict';
/**
 * speaking-service — schema.test.js
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
  for (const k in collections) await collections[k].deleteMany({});
});

const SpeakingTest = require('../src/models/SpeakingTest');
const SpeakingSubmission = require('../src/models/SpeakingSubmission');

// ─── SpeakingTest ─────────────────────────────────────────────────────────────
describe('SpeakingTest Schema', () => {
  const validTest = () => ({
    title: 'IELTS Speaking Test — Hometown',
    part1: ['Do you work or study?', 'Where are you from?'],
    part2: 'Describe a place you enjoy visiting. You should say: where it is, what you do there, why you like it.',
    part3: ['Why do people enjoy travelling?', 'How has tourism changed in recent years?'],
  });

  it('saves a valid test', async () => {
    const t = await SpeakingTest.create(validTest());
    expect(t._id).toBeDefined();
    expect(t.title).toBe('IELTS Speaking Test — Hometown');
    expect(t.part1).toHaveLength(2);
  });

  it('rejects missing title', async () => {
    const bad = validTest();
    delete bad.title;
    await expect(SpeakingTest.create(bad)).rejects.toThrow();
  });

  it('rejects empty part1 array', async () => {
    const bad = { ...validTest(), part1: [] };
    await expect(SpeakingTest.create(bad)).rejects.toThrow();
  });

  it('rejects missing part2', async () => {
    const bad = validTest();
    delete bad.part2;
    await expect(SpeakingTest.create(bad)).rejects.toThrow();
  });

  it('rejects empty part3 array', async () => {
    const bad = { ...validTest(), part3: [] };
    await expect(SpeakingTest.create(bad)).rejects.toThrow();
  });

  it('sets timestamps', async () => {
    const t = await SpeakingTest.create(validTest());
    expect(t.createdAt).toBeInstanceOf(Date);
  });
});

// ─── SpeakingSubmission ───────────────────────────────────────────────────────
describe('SpeakingSubmission Schema', () => {
  let testId;

  beforeEach(async () => {
    const t = await SpeakingTest.create({
      title: 'Test',
      part1: ['Q1'],
      part2: 'Describe...',
      part3: ['Why?'],
    });
    testId = t._id;
  });

  it('saves a valid pending submission', async () => {
    const s = await SpeakingSubmission.create({
      studentId: new mongoose.Types.ObjectId(),
      testId,
      answers: [{ questionKey: 'p1_0', audioUrl: 'https://cdn.example.com/a.mp3' }],
    });
    expect(s._id).toBeDefined();
    expect(s.status).toBe('Pending');
  });

  it('defaults status to Pending', async () => {
    const s = await SpeakingSubmission.create({
      studentId: new mongoose.Types.ObjectId(),
    });
    expect(s.status).toBe('Pending');
  });

  it('rejects status outside enum', async () => {
    await expect(SpeakingSubmission.create({
      studentId: new mongoose.Types.ObjectId(),
      status: 'Submitted',
    })).rejects.toThrow();
  });

  it('requires studentId', async () => {
    await expect(SpeakingSubmission.create({
      testId,
      answers: [],
    })).rejects.toThrow();
  });

  it('grading criteria are constrained 0-9', async () => {
    const s = new SpeakingSubmission({
      studentId: new mongoose.Types.ObjectId(),
      status: 'Graded',
      grading: {
        FC: 10, LR: 7, GRA: 7, PR: 7, overallBand: 7.25,
        gradedBy: new mongoose.Types.ObjectId(), gradedAt: new Date(),
      },
    });
    await expect(s.save()).rejects.toThrow();
  });
});
