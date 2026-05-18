process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const authMiddleware = require('../src/middlewares/auth.middleware');

const SECRET = 'test-jwt-secret';

describe('auth.middleware', () => {
  const run = (authorization) => {
    const req = { headers: {} };
    if (authorization !== undefined) {
      req.headers.authorization = authorization;
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authMiddleware(req, res, next);
    return { req, res, next };
  };

  it('allows valid token and sets req.user', () => {
    const id = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id, role: 'student' }, SECRET, { expiresIn: '1h' });

    const { req, res, next } = run(`Bearer ${token}`);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id, role: 'student' });
  });

  it('supports decoded userId fallback', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ userId, role: 'Teacher' }, SECRET, { expiresIn: '1h' });

    const { req, next } = run(`Bearer ${token}`);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(userId);
    expect(req.user.role).toBe('Teacher');
  });

  it('returns 401 when token missing', () => {
    const { res, next } = run(undefined);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
  });

  it('returns 401 for malformed scheme', () => {
    const { res } = run('Token abc');
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for expired token', () => {
    const token = jwt.sign({ id: 'u1', role: 'student' }, SECRET, { expiresIn: '-1s' });
    const { res } = run(`Bearer ${token}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
  });

  it('returns 401 for wrong secret', () => {
    const token = jwt.sign({ id: 'u1', role: 'student' }, 'wrong-secret', { expiresIn: '1h' });
    const { res } = run(`Bearer ${token}`);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
