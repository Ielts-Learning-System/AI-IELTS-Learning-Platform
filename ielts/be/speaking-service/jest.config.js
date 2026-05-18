// Pin mongodb-memory-server to MongoDB 6.x binary - compatible with mongoose@8.x nested mongodb@6.x driver
process.env.MONGOMS_VERSION = '6.0.0';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/testing/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/config/db.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
