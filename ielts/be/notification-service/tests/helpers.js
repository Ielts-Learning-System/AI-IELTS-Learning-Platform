const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const TEST_JWT_SECRET = 'test-jwt-secret';

/**
 * Generate a valid JWT token for testing.
 */
function generateTestToken(userId, role = 'student') {
  return jwt.sign(
    { id: userId || new mongoose.Types.ObjectId().toString(), role },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = { generateTestToken, TEST_JWT_SECRET };
