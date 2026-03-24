module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/config/db.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
