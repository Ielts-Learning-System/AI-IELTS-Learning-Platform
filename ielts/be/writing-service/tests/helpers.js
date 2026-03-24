const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-jwt-secret';
process.env.JWT_SECRET = TEST_SECRET;

function generateTestToken(userId, role = 'Student') {
  return jwt.sign({ id: userId, role }, TEST_SECRET, { expiresIn: '1h' });
}

module.exports = { generateTestToken, TEST_SECRET };
