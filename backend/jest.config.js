/**
 * Jest Configuration for ERP-Branch Integration Tests
 * Comprehensive testing framework setup
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/*.test.js',
    '!**/node_modules/**'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.js',
    'services/**/*.js',
    '!node_modules/**',
    '!vendor/**',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Timeouts
  testTimeout: 30000,

  // Reporter options
  reporters: ['default'],

  // Verbose output
  verbose: true,

  // Watch mode settings
  watchPathIgnorePatterns: [
    'node_modules',
    'coverage',
    'logs'
  ],

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@integration/(.*)$': '<rootDir>/integration/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // ModuleFileExtensions
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Silent console during tests
  silent: false,

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Maximum workers for parallel testing
  maxWorkers: '50%',

  // Bail on first test failure
  bail: false,

  // Notify on completion
  notify: false,

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Force exit
  forceExit: false,

  // Detect open handles
  detectOpenHandles: false,

  // Pass with no tests
  passWithNoTests: false
};
