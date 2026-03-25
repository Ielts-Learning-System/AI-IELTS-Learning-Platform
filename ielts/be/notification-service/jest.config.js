module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
  ],
  setupFilesAfterSetup: ['<rootDir>/tests/setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/db.js',
    '!src/config/rabbitmq.js',
  ],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
