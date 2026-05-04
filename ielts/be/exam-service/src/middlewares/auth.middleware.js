const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Fallback: allow token via query param for SSE connections (EventSource cannot set headers)
    if (!token && req.query && req.query.token) {
      token = String(req.query.token);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: String(decoded.role || decoded.userType || 'student').toLowerCase(),
      email: decoded.email,
      name: decoded.name,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no user context',
    });
  }

  const allowed = roles.map((r) => String(r).toLowerCase());
  if (!allowed.includes(String(req.user.role).toLowerCase())) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: insufficient role',
    });
  }

  return next();
};

module.exports = { verifyToken, authorizeRoles };
