'use strict';
/**
 * writing-service — schema.test.js
 * Mongoose model validation tests.
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

const Writing = require('../src/models/Writing');
const WritingSubmission = require('../src/models/writingSubmission.model');

// ─── Writing (prompt) schema ──────────────────────────────────────────────────
describe('Writing Schema', () => {
  const validWriting = () => ({
    title: 'Describe the bar chart showing coffee consumption',
    type: 'Task 1',
    contentHtml: '<p>The bar chart illustrates...</p>',
  });

  it('saves a valid Task 1 prompt', async () => {
    const w = await Writing.create(validWriting());
    expect(w._id).toBeDefined();
    expect(w.type).toBe('Task 1');
  });

  it('saves a valid Task 2 prompt', async () => {
    const w = await Writing.create({
      title: 'Some people believe technology makes us more isolated.',
      type: 'Task 2',
      contentHtml: '<p>Discuss both views.</p>',
    });
    expect(w.type).toBe('Task 2');
  });

  it('rejects missing title', async () => {
    await expect(Writing.create({ type: 'Task 1', contentHtml: '<p>...</p>' })).rejects.toThrow();
  });

  it('rejects missing type', async () => {
    await expect(Writing.create({ title: 'Test', contentHtml: '<p>...</p>' })).rejects.toThrow();
  });

  it('rejects invalid type enum', async () => {
    await expect(Writing.create({ title: 'Test', type: 'Task 3', contentHtml: '<p>...</p>' })).rejects.toThrow();
  });

  it('rejects missing contentHtml', async () => {
    await expect(Writing.create({ title: 'Test', type: 'Task 1' })).rejects.toThrow();
  });

  it('defaults isSample to false', async () => {
    const w = await Writing.create(validWriting());
    expect(w.isSample).toBe(false);
  });

  it('defaults timeLimit to 20 for Task 1', async () => {
    const w = await Writing.create(validWriting());
    expect(w.timeLimit).toBe(20);
  });

  it('defaults timeLimit to 40 for Task 2', async () => {
    const w = await Writing.create({
      title: 'Essay topic',
      type: 'Task 2',
      contentHtml: '<p>Write an essay.</p>',
    });
    expect(w.timeLimit).toBe(40);
  });

  it('sets timestamps', async () => {
    const w = await Writing.create(validWriting());
    expect(w.createdAt).toBeInstanceOf(Date);
    expect(w.updatedAt).toBeInstanceOf(Date);
  });
});

// ─── WritingSubmission schema ─────────────────────────────────────────────────
describe('WritingSubmission Schema', () => {
  let writingId;

  beforeEach(async () => {
    const w = await Writing.create({
      title: 'Bar chart',
      type: 'Task 1',
      contentHtml: '<p>Describe the chart.</p>',
    });
    writingId = w._id;
  });

  const validSubmission = (wId) => ({
    studentId: new mongoose.Types.ObjectId(),
    writingId: wId,
    taskType: 'Task 1',
    content: 'The bar chart shows that coffee consumption increased significantly over the past decade.',
    wordCount: 18,
  });

  it('saves a valid submission', async () => {
    const s = await WritingSubmission.create(validSubmission(writingId));
    expect(s._id).toBeDefined();
    expect(s.status).toBe('Pending');
  });

  it('rejects missing studentId', async () => {
    await expect(WritingSubmission.create({
      writingId,
      taskType: 'Task 1',
      content: 'Content',
      wordCount: 1,
    })).rejects.toThrow();
  });

  it('rejects invalid taskType', async () => {
    await expect(WritingSubmission.create({
      ...validSubmission(writingId),
      taskType: 'Task 3',
    })).rejects.toThrow();
  });

  it('defaults status to Pending', async () => {
    const s = await WritingSubmission.create(validSubmission(writingId));
    expect(s.status).toBe('Pending');
  });

  it('accepts Graded status', async () => {
    const s = await WritingSubmission.create({ ...validSubmission(writingId), status: 'Graded' });
    expect(s.status).toBe('Graded');
  });

  it('rejects grading criteria out of band score range', async () => {
    const sub = new WritingSubmission({
      ...validSubmission(writingId),
      status: 'Graded',
      grading: {
        criteria: { TR: 10, CC: 7, LR: 7, GRA: 7 }, // TR > 9 — invalid
        overallBand: 7.5,
        gradedBy: new mongoose.Types.ObjectId(),
        gradedAt: new Date(),
      },
    });
    await expect(sub.save()).rejects.toThrow();
  });
});
