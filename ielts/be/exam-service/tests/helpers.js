const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const TEST_JWT_SECRET = 'exam-test-secret';

const makeToken = (role = 'student', id) => jwt.sign(
  {
    id: id || new mongoose.Types.ObjectId().toString(),
    role,
    email: `${role}@test.local`,
    name: role,
  },
  TEST_JWT_SECRET,
  { expiresIn: '1h' }
);

module.exports = { TEST_JWT_SECRET, makeToken };
