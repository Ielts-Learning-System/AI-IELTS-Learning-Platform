module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/testing/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
