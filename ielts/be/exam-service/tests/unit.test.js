process.env.JWT_SECRET = 'exam-test-secret';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const { verifyToken, authorizeRoles } = require('../src/middlewares/auth.middleware');

describe('exam auth middleware', () => {
  const runVerify = ({ authHeader, queryToken }) => {
    const req = { headers: {}, query: {} };
    if (authHeader !== undefined) req.headers.authorization = authHeader;
    if (queryToken !== undefined) req.query.token = queryToken;

    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verifyToken(req, res, next);
    return { req, res, next };
  };

  it('accepts valid bearer token', () => {
    const token = jwt.sign({ id: 'u1', role: 'Teacher' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = runVerify({ authHeader: `Bearer ${token}` });

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user.id).toBe('u1');
    expect(req.user.role).toBe('teacher');
  });

  it('accepts token from query for SSE', () => {
    const token = jwt.sign({ id: 'u2', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { req, next } = runVerify({ queryToken: token });

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('u2');
    expect(req.user.role).toBe('admin');
  });

  it('returns 401 when no token', () => {
    const { res, next } = runVerify({});
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized, no token' });
  });

  it('returns 401 on invalid token', () => {
    const { res } = runVerify({ authHeader: 'Bearer bad.token' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized, token failed' });
  });

  it('authorizeRoles allows matching role', () => {
    const req = { user: { role: 'teacher' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authorizeRoles('teacher', 'admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('authorizeRoles blocks insufficient role', () => {
    const req = { user: { role: 'student' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authorizeRoles('teacher', 'admin')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
