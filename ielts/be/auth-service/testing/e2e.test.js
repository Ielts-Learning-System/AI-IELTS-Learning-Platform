'use strict';
/**
 * auth-service — e2e.test.js
 * Black-box user journey tests.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'test';
jest.mock('../src/services/rabbitmq.service', () => ({ publishEvent: jest.fn() }));

const app = require('../app');

let mongod;

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Journey 1: Full student lifecycle ────────────────────────────────────────
describe('Journey: Student registers, logs in, views profile', () => {
  beforeAll(() => clearCollections());

  let token;

  it('Step 1 — registers successfully', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'journey@test.com', password: 'JourneyPass1!', name: 'Journey User' });
    expect(res.status).toBe(201);
    token = res.body.data.token;
  });

  it('Step 2 — logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'journey@test.com', password: 'JourneyPass1!' });
    expect(res.status).toBe(200);
    token = res.body.data.token;
  });

  it('Step 3 — views own profile', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('journey@test.com');
  });

  it('Step 4 — changes password', async () => {
    const res = await request(app)
      .put('/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'JourneyPass1!', newPassword: 'NewPass789!' });
    expect(res.status).toBe(200);
  });

  it('Step 5 — can log in with new password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'journey@test.com', password: 'NewPass789!' });
    expect(res.status).toBe(200);
  });

  it('Step 6 — old password rejected after change', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'journey@test.com', password: 'JourneyPass1!' });
    expect(res.status).toBe(401);
  });
});

// ─── Journey 2: Duplicate registration prevention ─────────────────────────────
describe('Journey: Duplicate registration is blocked', () => {
  beforeAll(() => clearCollections());

  it('Step 1 — first registration succeeds', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'dup@test.com', password: 'pass123' });
    expect(res.status).toBe(201);
  });

  it('Step 2 — second registration with same email fails', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'dup@test.com', password: 'other123' });
    expect(res.status).toBe(400);
  });
});

// ─── Journey 3: Token authentication boundary ────────────────────────────────
describe('Journey: Token guard protects profile endpoint', () => {
  beforeAll(() => clearCollections());

  it('No token → 401', async () => {
    const res = await request(app).get('/profile');
    expect(res.status).toBe(401);
  });

  it('Invalid token → 401', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', 'Bearer bad.token');
    expect(res.status).toBe(401);
  });
});
