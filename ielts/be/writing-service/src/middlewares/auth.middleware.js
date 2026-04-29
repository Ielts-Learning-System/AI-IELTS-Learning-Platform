const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
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
      role: decoded.role || decoded.userType || 'student',
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};

const isTeacher = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();

  if (role === 'teacher') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: teacher access required',
  });
};

const isTeacherOrAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();

  if (role === 'teacher' || role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: teacher/admin access required',
  });
};

module.exports = {
  verifyToken,
  isTeacher,
  isTeacherOrAdmin,
};