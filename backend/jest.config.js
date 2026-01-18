module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  bail: false,
  maxWorkers: 1,

  // Coverage configuration
  collectCoverageFrom: [
    'api/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    'server.js',
    'start.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.config.js',
  ],

  // Coverage thresholds - adjusted to current coverage levels
  coverageThreshold: {
    global: {
      // Thresholds set to current coverage to prevent regression
      branches: 17,
      functions: 17,
      lines: 35,
      statements: 35,
    },
  },

  coveragePathIgnorePatterns: ['/node_modules/', '/coverage/', '/test-utils/'],

  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js', '**/tests/**/*.test.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
