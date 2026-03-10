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
        message: 'Not authorized, no token' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info from token to request
    req.user = {
      id: decoded.id,
      role: decoded.role || 'student'
    };

    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Not authorized, token failed' 
    });
  }
};

/**
 * Factory function to create authorization middleware
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'teacher', 'student')
 * @returns {Function} Middleware function
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no user' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này' 
      });
    }

    next();
  };
};

module.exports = { verifyToken, authorizeRoles };
