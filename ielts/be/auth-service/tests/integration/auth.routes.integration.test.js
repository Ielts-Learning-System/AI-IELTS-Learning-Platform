const request = require('supertest');
const mongoose = require('mongoose');

// Set env before importing app
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const app = require('../../app');
const User = require('../../src/models/User');
const { generateTestToken } = require('../helpers');
require('../setup');

describe('Auth Routes — Integration', () => {
  // ============================================================
  // POST /register
  // ============================================================
  describe('POST /register', () => {
    it('should register a new student successfully', async () => {
      const res = await request(app)
        .post('/register')
        .send({ email: 'student@test.com', password: 'Pass1234', name: 'Test Student' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('student@test.com');
      expect(res.body.data.role).toBe('Student');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.subscriptionPlan).toBe('Free');
    });

    it('should always force role to Student even if Admin is sent', async () => {
      const res = await request(app)
        .post('/register')
        .send({ email: 'hacker@test.com', password: 'Pass1234', name: 'Hacker', role: 'Admin' });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('Student');
    });

    it('should return 400 if email already exists', async () => {
      await User.create({ email: 'dup@test.com', password: 'Pass1234', name: 'First' });

      const res = await request(app)
        .post('/register')
        .send({ email: 'dup@test.com', password: 'Pass1234', name: 'Second' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/register')
        .send({ password: 'Pass1234' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/register')
        .send({ email: 'nopass@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });
  });

  // ============================================================
  // POST /login
  // ============================================================
  describe('POST /login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/register')
        .send({ email: 'login@test.com', password: 'Pass1234', name: 'Login User' });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'login@test.com', password: 'Pass1234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.email).toBe('login@test.com');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'login@test.com', password: 'WrongPass' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'ghost@test.com', password: 'Pass1234' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should return 400 if email or password missing', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'login@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });
  });

  // ============================================================
  // GET /profile
  // ============================================================
  describe('GET /profile', () => {
    it('should return profile for authenticated user', async () => {
      // Register to get a real user
      const regRes = await request(app)
        .post('/register')
        .send({ email: 'profile@test.com', password: 'Pass1234', name: 'Profile User' });

      const token = regRes.body.data.token;

      const res = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('profile@test.com');
      expect(res.body.data.password).toBeUndefined(); // password excluded
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/profile');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // PUT /update-role/:id (Admin only via auth routes)
  // ============================================================
  describe('PUT /update-role/:id', () => {
    let adminToken;
    let studentId;

    beforeEach(async () => {
      // Create admin directly in DB
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Pass1234',
        name: 'Admin',
        role: 'Admin',
      });
      adminToken = generateTestToken(admin._id.toString(), 'Admin');

      // Create student
      const student = await User.create({
        email: 'student@test.com',
        password: 'Pass1234',
        name: 'Student',
        role: 'Student',
      });
      studentId = student._id.toString();
    });

    it('should allow admin to update user role', async () => {
      const res = await request(app)
        .put(`/update-role/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'Teacher' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('Teacher');
    });

    it('should return 400 for invalid role value', async () => {
      const res = await request(app)
        .put(`/update-role/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'SuperUser' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid role/i);
    });

    it('should return 403 for non-admin user', async () => {
      const student = await User.findById(studentId);
      const studentToken = generateTestToken(student._id.toString(), 'Student');

      const res = await request(app)
        .put(`/update-role/${studentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ newRole: 'Admin' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .put(`/update-role/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'Teacher' });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // GET /api/users (Admin/Teacher)
  // ============================================================
  describe('GET /api/users', () => {
    let adminToken;

    beforeEach(async () => {
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Pass1234',
        name: 'Admin',
        role: 'Admin',
      });
      adminToken = generateTestToken(admin._id.toString(), 'Admin');

      await User.create({
        email: 'teacher1@test.com',
        password: 'Pass1234',
        name: 'Teacher 1',
        role: 'Teacher',
      });
      await User.create({
        email: 'student1@test.com',
        password: 'Pass1234',
        name: 'Student 1',
        role: 'Student',
      });
    });

    it('should return all users for admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should filter users by role query param', async () => {
      const res = await request(app)
        .get('/api/users?role=Teacher')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].role).toBe('Teacher');
    });

    it('should return 403 for Student role', async () => {
      const student = await User.findOne({ role: 'Student' });
      const studentToken = generateTestToken(student._id.toString(), 'Student');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // PUT /api/users/:id/status (Admin only — toggle)
  // ============================================================
  describe('PUT /api/users/:id/status', () => {
    let adminToken;
    let studentId;

    beforeEach(async () => {
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Pass1234',
        name: 'Admin',
        role: 'Admin',
      });
      adminToken = generateTestToken(admin._id.toString(), 'Admin');

      const student = await User.create({
        email: 'student@test.com',
        password: 'Pass1234',
        name: 'Student',
        role: 'Student',
      });
      studentId = student._id.toString();
    });

    it('should block a user', async () => {
      const res = await request(app)
        .put(`/api/users/${studentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.message).toMatch(/blocked/i);
    });

    it('should unblock a user', async () => {
      await User.findByIdAndUpdate(studentId, { isActive: false });

      const res = await request(app)
        .put(`/api/users/${studentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.message).toMatch(/unblocked/i);
    });

    it('should return 400 if isActive is not boolean', async () => {
      const res = await request(app)
        .put(`/api/users/${studentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: 'yes' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/boolean/i);
    });
  });

  // ============================================================
  // POST /api/users/lookup
  // ============================================================
  describe('POST /api/users/lookup', () => {
    let adminToken;
    let userId1;

    beforeEach(async () => {
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Pass1234',
        name: 'Admin',
        role: 'Admin',
      });
      adminToken = generateTestToken(admin._id.toString(), 'Admin');

      const u1 = await User.create({
        email: 'u1@test.com',
        password: 'Pass1234',
        name: 'User 1',
        role: 'Student',
      });
      userId1 = u1._id.toString();
    });

    it('should return users matching provided ids', async () => {
      const res = await request(app)
        .post('/api/users/lookup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [userId1] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe('u1@test.com');
    });

    it('should return empty array for empty ids', async () => {
      const res = await request(app)
        .post('/api/users/lookup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [] });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 400 if ids is not an array', async () => {
      const res = await request(app)
        .post('/api/users/lookup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: 'not-array' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/array/i);
    });
  });
});
