const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const TEST_JWT_SECRET = 'lesson-test-secret';

const makeToken = (role = 'student', id) => jwt.sign(
  {
    id: id || new mongoose.Types.ObjectId().toString(),
    role,
  },
  TEST_JWT_SECRET,
  { expiresIn: '1h' }
);

module.exports = { TEST_JWT_SECRET, makeToken };
