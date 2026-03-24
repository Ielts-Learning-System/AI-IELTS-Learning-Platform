const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-jwt-secret';

process.env.JWT_SECRET = TEST_SECRET;

/**
 * Generate a valid JWT token for testing
 * @param {string} userId - Mongo ObjectId string
 * @param {string} role - 'Student' | 'Teacher' | 'Admin'
 * @returns {string} Bearer-ready JWT token
 */
function generateTestToken(userId, role = 'Student') {
  return jwt.sign({ id: userId, role }, TEST_SECRET, { expiresIn: '1h' });
}

module.exports = { generateTestToken, TEST_SECRET };
