const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Build req.user from JWT payload — no cross-DB User lookup needed.
    req.user = { id: decoded.id, _id: decoded.id, role: decoded.role, plan: decoded.plan || 'FREE' };
    req.userId = decoded.id;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
  }

  const normalizedRole = String(req.user.role || '').toLowerCase();
  const allowed = roles.map((role) => String(role).toLowerCase());

  if (!allowed.includes(normalizedRole)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: insufficient permissions',
    });
  }

  return next();
};

module.exports = { verifyToken, authorizeRoles };