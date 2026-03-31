const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    req.userId = decoded.id;

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

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