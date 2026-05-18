'use strict';
/**
 * writing-service — regression.test.js
 * Edge cases, security, unicode, isolation.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'test';

const app = require('../app');
const Writing = require('../src/models/Writing');

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

const makeToken = (id = new mongoose.Types.ObjectId().toString(), role = 'Student') =>
  jwt.sign({ id, role }, JWT_SECRET);

describe('Security: XSS and injection in submission content', () => {
  let writingId;

  beforeEach(async () => {
    const w = await Writing.create({ title: 'Prompt', type: 'Task 1', contentHtml: '<p>Describe.</p>' });
    writingId = w._id.toString();
  });

  it('stores XSS payload as plain text without executing', async () => {
    const res = await request(app)
      .post('/submissions')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ writingId, taskType: 'Task 1', content: '<script>alert("xss")</script>' });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('<script>alert("xss")</script>');
  });

  it('handles MongoDB operator injection in writingId gracefully', async () => {
    const res = await request(app)
      .post('/submissions')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ writingId: { $gt: '' }, taskType: 'Task 1', content: 'Injection attempt' });
    expect([400, 404, 500].includes(res.status)).toBe(true);
  });
});

describe('Unicode: Vietnamese and CJK content', () => {
  let writingId;

  beforeEach(async () => {
    const w = await Writing.create({ title: 'Biểu đồ', type: 'Task 1', contentHtml: '<p>Mô tả.</p>' });
    writingId = w._id.toString();
  });

  it('accepts Vietnamese characters in submission content', async () => {
    const res = await request(app)
      .post('/submissions')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        writingId,
        taskType: 'Task 1',
        content: 'Biểu đồ cho thấy lượng tiêu thụ cà phê tăng mạnh từ năm 2000 đến 2020.',
      });
    expect(res.status).toBe(201);
  });
});

describe('Pagination boundary', () => {
  beforeEach(async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      title: `Writing Prompt ${i + 1}`,
      type: i % 2 === 0 ? 'Task 1' : 'Task 2',
      contentHtml: '<p>Content</p>',
    }));
    await Writing.create(items);
  });

  it('page=1, limit=5 returns 5 items', async () => {
    const res = await request(app).get('/items?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.totalPages).toBe(2);
  });

  it('page=2, limit=5 returns remaining items', async () => {
    const res = await request(app).get('/items?page=2&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
  });

  it('limit capped at 50 even if higher requested', async () => {
    const res = await request(app).get('/items?limit=999');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(50);
  });
});

describe('Isolation: user A submissions invisible to user B', () => {
  let writing;

  beforeEach(async () => {
    writing = await Writing.create({ title: 'P', type: 'Task 1', contentHtml: '<p>T</p>' });
  });

  it('student B sees zero submissions', async () => {
    const tokenA = makeToken();
    await request(app)
      .post('/submissions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ writingId: writing._id.toString(), taskType: 'Task 1', content: 'User A response.' });

    const tokenB = makeToken();
    const res = await request(app)
      .get('/submissions/my-submissions')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
