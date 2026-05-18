process.env.JWT_SECRET = 'lesson-test-secret';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const { verifyToken, isTeacher, isAdmin } = require('../src/middlewares/auth.middleware');

describe('lesson auth middleware', () => {
  const runVerify = (authorization) => {
    const req = { headers: {} };
    if (authorization) req.headers.authorization = authorization;

    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verifyToken(req, res, next);
    return { req, res, next };
  };

  it('verifyToken accepts valid bearer token', () => {
    const token = jwt.sign({ id: 'u1', role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = runVerify(`Bearer ${token}`);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user.id).toBe('u1');
    expect(req.user.role).toBe('teacher');
  });

  it('verifyToken rejects missing token', () => {
    const { res, next } = runVerify();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('verifyToken rejects bad token', () => {
    const { res } = runVerify('Bearer bad.token');
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('isTeacher allows teacher role', () => {
    const req = { user: { role: 'teacher' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    isTeacher(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('isTeacher blocks non-teacher role', () => {
    const req = { user: { role: 'student' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    isTeacher(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('isAdmin allows admin role and blocks non-admin', () => {
    const next = jest.fn();
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    isAdmin({ user: { role: 'admin' } }, res, next);
    expect(next).toHaveBeenCalled();

    const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next2 = jest.fn();
    isAdmin({ user: { role: 'teacher' } }, res2, next2);
    expect(res2.status).toHaveBeenCalledWith(403);
    expect(next2).not.toHaveBeenCalled();
  });
});
