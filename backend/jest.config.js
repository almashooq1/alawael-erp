/**
 * Jest Configuration - Enhanced Version
 * Best practices for comprehensive testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test match patterns — scoped to __tests__/ and tests/ only (prevents OOM from stray .test.js)
  testMatch: [
    '<rootDir>/__tests__/**/*.test.js',
    '<rootDir>/__tests__/**/*.spec.js',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^(\\.{1,2}/.*)/[Nn]otification[Ss]ervice(\\.js)?$': '$1/notificationService.js',
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
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.git/',
    '/_archived/',
    // Exclude memory-heavy stress/performance tests from regular runs
    // Run separately with: npm run test:perf
    'stress-load-testing\\.test',
    'performance-load-tests\\.test',
    'load\\.test',
    'performance-tuning\\.test',
    'performanceRoutes\\.comprehensive\\.test',
    'advanced-performance-tests\\.test',
    'phase-22-performance\\.test',
  ],
  watchPathIgnorePatterns: ['/node_modules/', '/coverage/', '/dist/'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Timeout settings
  testTimeout: 60000,

  // Verbose output
  verbose: true,

  // Maximum workers
  maxWorkers: '50%',

  // Reclaim workers that exceed 512 MB — prevents OOM during stress/endurance tests
  workerIdleMemoryLimit: '512MB',

  // Mock management
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  resetModules: false,

  // Other settings
  bail: 0,
  forceExit: true,
  detectOpenHandles: false,
  passWithNoTests: true,
};
