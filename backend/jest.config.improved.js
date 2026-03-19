/* eslint-disable no-unused-vars */
/**
 * Jest Configuration - Enhanced Version
 * Best practices for comprehensive testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.improved.js'],

  // Roots and modules
  roots: ['<rootDir>'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/*.test.js',
    '**/*.spec.js',
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@helpers/(.*)$': '<rootDir>/helpers/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/config/database.js',
    '!**/config/inMemoryDB.js',
    '!**/jest.*.js',
    '!**/test-*.js',
    '!**/scripts/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 55,
      lines: 60,
      statements: 60,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json', 'json-summary'],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Transform files
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/', '/archive/', '/backups/'],

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json'],

  // Timeout settings
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Maximum workers for parallel execution
  maxWorkers: '50%',

  // Display name
  displayName: 'Backend Tests',

  // Notification on completion
  notify: false,

  // Care about unstable tests
  bail: 0,

  // Expand variable in test results
  expandResultsSnapshots: true,

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Force exit
  forceExit: false,

  // Detect open handles
  detectOpenHandles: true,

  // Clear mocks automatically
  clearMocks: true,

  // Restore mocks automatically
  restoreMocks: true,

  // Reset mocks automatically
  resetMocks: true,

  // Reset module registry between tests
  resetModules: true,

  // Pretty print
  prettierFormat: true,
};
