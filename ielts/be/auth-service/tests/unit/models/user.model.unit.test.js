process.env.JWT_SECRET = 'test-jwt-secret';

const mongoose = require('mongoose');
const User = require('../../../src/models/User');
require('../../setup');

describe('User Model — Unit', () => {
  it('should create a user with default values', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'plaintext123',
      name: 'Test',
    });

    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('Student');
    expect(user.isActive).toBe(true);
    expect(user.plan).toBe('FREE');
    expect(user.subscriptionPlan).toBe('Free');
    expect(user.vipValidUntil).toBeNull();
  });

  it('should hash the password before saving', async () => {
    const user = await User.create({
      email: 'hash@example.com',
      password: 'plaintext123',
      name: 'Hash Test',
    });

    expect(user.password).not.toBe('plaintext123');
    expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
  });

  it('should match the correct password', async () => {
    const user = await User.create({
      email: 'match@example.com',
      password: 'Secret99',
      name: 'Match',
    });

    const isMatch = await user.matchPassword('Secret99');
    expect(isMatch).toBe(true);

    const isWrong = await user.matchPassword('WrongPass');
    expect(isWrong).toBe(false);
  });

  it('should enforce unique email constraint', async () => {
    await User.create({ email: 'unique@example.com', password: 'Pass1234' });

    await expect(
      User.create({ email: 'unique@example.com', password: 'Another1' })
    ).rejects.toThrow();
  });

  it('should reject invalid role enum', async () => {
    await expect(
      User.create({ email: 'bad@example.com', password: 'Pass1234', role: 'SuperAdmin' })
    ).rejects.toThrow(/`SuperAdmin` is not a valid enum/);
  });

  it('should reject invalid subscriptionPlan enum', async () => {
    await expect(
      User.create({
        email: 'bad2@example.com',
        password: 'Pass1234',
        subscriptionPlan: 'INVALID',
      })
    ).rejects.toThrow();
  });

  it('should lowercase the email', async () => {
    const user = await User.create({
      email: 'UPPER@EXAMPLE.COM',
      password: 'Pass1234',
      name: 'Upper',
    });

    expect(user.email).toBe('upper@example.com');
  });

  it('should not re-hash password if not modified', async () => {
    const user = await User.create({
      email: 're@example.com',
      password: 'Pass1234',
      name: 'Rehash',
    });

    const originalHash = user.password;
    user.name = 'Updated Name';
    await user.save();

    expect(user.password).toBe(originalHash);
  });
});
