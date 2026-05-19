// Pin mongodb-memory-server to MongoDB 7.x binary.
// MongoDB 7.0 is compatible with mongoose@9.x and supports Ubuntu 22.04 + 24.04
// (the GitHub Actions ubuntu-latest runner).  MongoDB 6.0 has no Ubuntu 24.04
// binary and causes CI to hang while attempting an impossible download.
process.env.MONGOMS_VERSION = '7.0.14';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/testing/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/config/db.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
