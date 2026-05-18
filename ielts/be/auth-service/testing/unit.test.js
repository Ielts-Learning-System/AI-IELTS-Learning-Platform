'use strict';
/**
 * auth-service — unit.test.js
 * Pure function tests: JWT generation, password matching, token parsing.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

// ─── generateToken helper (duplicated inline to avoid importing full controller) ──
const generateToken = (id, role, plan) =>
  jwt.sign({ id, role, plan: plan || 'FREE' }, JWT_SECRET, { expiresIn: '7d' });

describe('generateToken', () => {
  it('should return a valid JWT string', () => {
    const token = generateToken('user123', 'Student', 'FREE');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should embed id, role and plan in the payload', () => {
    const token = generateToken('user123', 'Admin', 'PRO');
    const payload = jwt.verify(token, JWT_SECRET);
    expect(payload.id).toBe('user123');
    expect(payload.role).toBe('Admin');
    expect(payload.plan).toBe('PRO');
  });

  it('should default plan to FREE when not provided', () => {
    const token = generateToken('user123', 'Student');
    const payload = jwt.verify(token, JWT_SECRET);
    expect(payload.plan).toBe('FREE');
  });

  it('should expire in approximately 7 days', () => {
    const token = generateToken('user123', 'Student', 'FREE');
    const payload = jwt.verify(token, JWT_SECRET);
    const sevenDays = 7 * 24 * 60 * 60;
    expect(payload.exp - payload.iat).toBe(sevenDays);
  });

  it('should fail to verify with wrong secret', () => {
    const token = generateToken('user123', 'Student', 'FREE');
    expect(() => jwt.verify(token, 'WRONG_SECRET')).toThrow();
  });
});

// ─── roundToNearestHalf utility (used in band score calculation) ────────────
const roundToNearestHalf = (value) => Math.round(value * 2) / 2;

describe('roundToNearestHalf', () => {
  it('rounds 6.2 to 6.0', () => expect(roundToNearestHalf(6.2)).toBe(6.0));
  it('rounds 6.4 to 6.5', () => expect(roundToNearestHalf(6.4)).toBe(6.5));
  it('rounds 6.6 to 6.5', () => expect(roundToNearestHalf(6.6)).toBe(6.5));
  it('rounds 6.8 to 7.0', () => expect(roundToNearestHalf(6.8)).toBe(7.0));
  it('passes through whole numbers', () => expect(roundToNearestHalf(7.0)).toBe(7.0));
  it('handles 0', () => expect(roundToNearestHalf(0)).toBe(0));
  it('handles 9', () => expect(roundToNearestHalf(9)).toBe(9.0));
});

// ─── Input validation helpers ─────────────────────────────────────────────────
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

describe('Email validation helper', () => {
  it('accepts a valid email', () => expect(validateEmail('test@example.com')).toBe(true));
  it('rejects email without @', () => expect(validateEmail('notanemail')).toBe(false));
  it('rejects empty string', () => expect(validateEmail('')).toBe(false));
  it('rejects undefined', () => expect(validateEmail(undefined)).toBe(false));
  it('accepts subdomain email', () => expect(validateEmail('user@mail.co.uk')).toBe(true));
});

// ─── Role authorization guard ─────────────────────────────────────────────────
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

describe('authorizeRoles middleware', () => {
  const makeReq = (role) => ({ user: { role } });
  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('calls next() when role is allowed', () => {
    const req = makeReq('Admin');
    const res = makeRes();
    const next = jest.fn();
    authorizeRoles('Admin', 'Teacher')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when role is not allowed', () => {
    const req = makeReq('Student');
    const res = makeRes();
    const next = jest.fn();
    authorizeRoles('Admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when req.user is undefined', () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();
    authorizeRoles('Admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
