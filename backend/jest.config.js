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
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js', '<rootDir>/tests/jest.setup.js'],

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
  testTimeout: 60000,

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
    '/dist/',
    '<rootDir>/services/qiwa.test.js',
    '<rootDir>/tests/advanced-measurements.test.js',
    '<rootDir>/tests/civilDefense.test.js',
    '<rootDir>/tests/comprehensive-advanced.test.js',
    '<rootDir>/tests/comprehensive.test.js',
    '<rootDir>/tests/advanced-features.integration.test.js',
    '<rootDir>/tests/driver-api-integration.test.js',
    '<rootDir>/tests/driver-management.test.js',
    '<rootDir>/tests/measurement-integration.test.js',
    '<rootDir>/tests/sso-e2e.test.js',
    '<rootDir>/tests/sso-e2e-fixed.test.js',
    '<rootDir>/tests/supply-chain.test.js',
    '<rootDir>/tests/mfa.service.test.js',
    '<rootDir>/tests/e2e-phase1.test.js',
    '<rootDir>/tests/e2e-phase2.test.js',
    '<rootDir>/tests/e2e-phase3.test.js',
    '<rootDir>/tests/e2e-api.test.js',
    '<rootDir>/tests/database.integration.test.js',
    '<rootDir>/tests/measurement-system.test.js',
    '<rootDir>/tests/integration.test.js',
    '<rootDir>/tests/integration/executiveDashboard.test.js',
    '<rootDir>/__tests__/integration.test.js',
    '<rootDir>/__tests__/trafficAccidents.test.js',
    '<rootDir>/__tests__/security-services.test.js',
    '<rootDir>/__tests__/analytics-services.test.js',
    '<rootDir>/__tests__/integration/newFeatures.integration.test.js',
    '<rootDir>/tests/unit/integrationHub.test.js'
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
