const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: (decoded.role || decoded.userType || 'student').toLowerCase(),
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};

const authorizeRoles = (...roles) => {
  const normalized = roles.map((role) => String(role).toLowerCase());

  return (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (!role || !normalized.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    return next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
};
