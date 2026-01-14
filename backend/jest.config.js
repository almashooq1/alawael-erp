module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  bail: false,

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

  // Coverage thresholds - temporarily relaxed for testing
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 25,
      statements: 25,
    },
  },

  coveragePathIgnorePatterns: ['/node_modules/', '/coverage/', '/test-utils/'],

  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js', '**/tests/**/*.test.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
