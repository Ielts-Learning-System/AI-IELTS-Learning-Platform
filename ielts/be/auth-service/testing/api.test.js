'use strict';
/**
 * auth-service — api.test.js
 * Supertest HTTP integration tests against in-memory MongoDB.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'test';
// Stub RabbitMQ so publishEvent is a no-op
jest.mock('../src/services/rabbitmq.service', () => ({ publishEvent: jest.fn() }));

const app = require('../app');
const User = require('../src/models/User');

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

const makeToken = (id, role = 'Student', plan = 'FREE') =>
  jwt.sign({ id, role, plan }, JWT_SECRET);

// ─── POST /register ───────────────────────────────────────────────────────────
describe('POST /register', () => {
  it('201 - registers a new user and returns token', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'alice@test.com', password: 'Secret123!', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.role).toBe('Student');
    expect(res.body.data.plan).toBe('FREE');
  });

  it('400 - missing email', async () => {
    const res = await request(app)
      .post('/register')
      .send({ password: 'Secret123!' });
    expect(res.status).toBe(400);
  });

  it('400 - missing password', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'bob@test.com' });
    expect(res.status).toBe(400);
  });

  it('400 - duplicate email', async () => {
    await request(app).post('/register').send({ email: 'dup@test.com', password: 'pass123' });
    const res = await request(app).post('/register').send({ email: 'dup@test.com', password: 'pass123' });
    expect(res.status).toBe(400);
  });

  it('forces role to Student even if Admin provided in body', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'hacker@test.com', password: 'pass123', role: 'Admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('Student');
  });
});

// ─── POST /login ──────────────────────────────────────────────────────────────
describe('POST /login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/register')
      .send({ email: 'login@test.com', password: 'Correct123!', name: 'LoginUser' });
  });

  it('200 - returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'login@test.com', password: 'Correct123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('401 - wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'login@test.com', password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  it('401 - non-existent email', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'nobody@test.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('400 - missing email', async () => {
    const res = await request(app).post('/login').send({ password: 'Correct123!' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /profile ─────────────────────────────────────────────────────────────
describe('GET /profile', () => {
  let token;
  let userId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'profile@test.com', password: 'Pass123!', name: 'Profile User' });
    token = res.body.data.token;
    userId = res.body.data._id;
  });

  it('200 - returns user profile', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('profile@test.com');
    expect(res.body.data.password).toBeUndefined();
  });

  it('401 - no token', async () => {
    const res = await request(app).get('/profile');
    expect(res.status).toBe(401);
  });

  it('401 - invalid token', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /change-password ─────────────────────────────────────────────────────
describe('PUT /change-password', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'chgpwd@test.com', password: 'OldPass123!', name: 'ChgPwd' });
    token = res.body.data.token;
  });

  it('200 - changes password successfully', async () => {
    const res = await request(app)
      .put('/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' });
    expect(res.status).toBe(200);
  });

  it('400 - wrong current password', async () => {
    const res = await request(app)
      .put('/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongOld!', newPassword: 'NewPass456!' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('200 - service is alive', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
