'use strict';
/**
 * auth-service — schema.test.js
 * Validates Mongoose model definitions: required fields, defaults, enums, validators.
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

// ─── helpers ─────────────────────────────────────────────────────────────────
const User = require('../src/models/User');

const validUser = () => ({
  email: 'alice@example.com',
  password: 'Secret123!',
  name: 'Alice Nguyen',
});

// ─── User Schema ─────────────────────────────────────────────────────────────
describe('User Schema', () => {
  describe('Required fields', () => {
    it('should save a valid user', async () => {
      const user = await User.create(validUser());
      expect(user._id).toBeDefined();
      expect(user.email).toBe('alice@example.com');
    });

    it('should reject a user without email', async () => {
      await expect(User.create({ password: 'pass123', name: 'Bob' })).rejects.toThrow(/email/i);
    });

    it('should reject a user without password', async () => {
      await expect(User.create({ email: 'bob@example.com', name: 'Bob' })).rejects.toThrow(/password/i);
    });
  });

  describe('Defaults', () => {
    it('should default role to Student', async () => {
      const user = await User.create(validUser());
      expect(user.role).toBe('Student');
    });

    it('should default plan to FREE', async () => {
      const user = await User.create(validUser());
      expect(user.plan).toBe('FREE');
    });

    it('should default isActive to true', async () => {
      const user = await User.create(validUser());
      expect(user.isActive).toBe(true);
    });

    it('should default vipValidUntil to null', async () => {
      const user = await User.create(validUser());
      expect(user.vipValidUntil).toBeNull();
    });
  });

  describe('Enum validation', () => {
    it('should accept valid role: Admin', async () => {
      const user = await User.create({ ...validUser(), email: 'admin@test.com', role: 'Admin' });
      expect(user.role).toBe('Admin');
    });

    it('should accept valid role: Teacher', async () => {
      const user = await User.create({ ...validUser(), email: 'teacher@test.com', role: 'Teacher' });
      expect(user.role).toBe('Teacher');
    });

    it('should reject invalid role', async () => {
      await expect(User.create({ ...validUser(), email: 'bad@test.com', role: 'Hacker' })).rejects.toThrow();
    });

    it('should accept plan PLUS', async () => {
      const user = await User.create({ ...validUser(), email: 'plus@test.com', plan: 'PLUS' });
      expect(user.plan).toBe('PLUS');
    });

    it('should accept plan PRO', async () => {
      const user = await User.create({ ...validUser(), email: 'pro@test.com', plan: 'PRO' });
      expect(user.plan).toBe('PRO');
    });

    it('should reject invalid plan', async () => {
      await expect(User.create({ ...validUser(), email: 'vip@test.com', plan: 'VIP' })).rejects.toThrow();
    });
  });

  describe('Email normalization', () => {
    it('should lowercase email', async () => {
      const user = await User.create({ ...validUser(), email: 'UPPER@CASE.COM' });
      expect(user.email).toBe('upper@case.com');
    });

    it('should enforce email uniqueness', async () => {
      await User.create(validUser());
      await expect(User.create(validUser())).rejects.toThrow();
    });
  });

  describe('Password hashing', () => {
    it('should hash the password on save', async () => {
      const user = await User.create(validUser());
      expect(user.password).not.toBe('Secret123!');
      expect(user.password.startsWith('$2')).toBe(true);
    });

    it('matchPassword should return true for correct password', async () => {
      const user = await User.create(validUser());
      const match = await user.matchPassword('Secret123!');
      expect(match).toBe(true);
    });

    it('matchPassword should return false for wrong password', async () => {
      const user = await User.create(validUser());
      const match = await user.matchPassword('wrongpassword');
      expect(match).toBe(false);
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt', async () => {
      const user = await User.create(validUser());
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });
});
