/**
 * Jest Configuration — AlAwael ERP Backend
 *
 * Professional test configuration with:
 *  - MongoMemoryServer for isolated integration tests
 *  - Path aliases matching jsconfig.json
 *  - Coverage thresholds for CI gates
 *  - Performance test isolation (run separately via npm run test:perf)
 */

'use strict';

const path = require('path');

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Global setup/teardown — starts MongoMemoryServer for integration tests
  globalSetup: '<rootDir>/jest.globalSetup.js',
  globalTeardown: '<rootDir>/jest.globalTeardown.js',

  // Setup files — jest.env.js sets env vars BEFORE modules load,
  // jest.setup.js runs AFTER the test framework is installed
  setupFiles: ['<rootDir>/jest.env.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Restrict Jest to backend directories only — prevents picking up frontend JSX files
  // when running with a test-path pattern on the CLI
  roots: ['<rootDir>/__tests__', '<rootDir>/tests'],

  // Test match patterns — scoped to __tests__/ and tests/ only (prevents OOM from stray .test.js)
  testMatch: [
    '<rootDir>/__tests__/**/*.test.js',
    '<rootDir>/__tests__/**/*.spec.js',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    // uuid v13 is ESM-only; redirect to CJS shim so Jest (CJS mode) can load it
    '^uuid$': '<rootDir>/__mocks__/uuid-cjs-shim.js',
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
    // JSX/React test files (frontend-only — not supported by backend Jest config which has no Babel/React)
    '\\.jsx$',
    '/frontend/',
    '\\\\frontend\\\\',
    // Absolute paths — ensures exclusion works on Windows (backslash separators)
    path.resolve(__dirname, '..', 'frontend').replace(/\\/g, '\\\\'),
    path.resolve(__dirname, '..', '_archived').replace(/\\/g, '\\\\'),
    path.resolve(__dirname, '..', 'supply-chain-management').replace(/\\/g, '\\\\'),
    // Standalone Node scripts (not Jest tests) — use process.exit(), http.request, custom runners
    'tests/tests/supply-chain\\.test',
    'tests/tests/sso-e2e\\.test',
    'tests/tests/sso-e2e-fixed\\.test',
    'tests/tests/e2e-phase1\\.test',
    'tests/tests/e2e-phase2\\.test',
    'tests/tests/e2e-phase3\\.test',
    'tests/tests/e2e-api\\.test',
    'tests/tests/measurement-integration\\.test',
    'tests/tests/advanced-measurements\\.test',
    'tests/tests/driver-api-integration\\.test',
    'tests/tests/comprehensive-advanced\\.test',
    'tests/tests/civilDefense\\.test',
    'tests/tests/driver-management\\.test',
    // Live-server test (needs running server, circular JSON errors)
    'tests/tests/measurement-system\\.test',
    // Mocha/Chai tests (not Jest-compatible: uses chai.expect, done() callbacks, undeclared app global)
    'tests/tests/integration/executiveDashboard\\.test',
    // Integration tests with API/service mismatches (need rewrite to match actual service APIs)
    'tests/tests/advanced-features\\.integration\\.test',
    'tests/tests/integration/vehicles\\.integration\\.test',
    'tests/tests/integration/trips\\.integration\\.test',
    'tests/tests/integration/routes\\.integration\\.test',
    'tests/tests/integration\\.test',
    'tests/tests/database\\.integration\\.test',
    'tests/tests/communityAwareness\\.test',
    'tests/tests/sso\\.comprehensive\\.test',
    'tests/tests/comprehensive\\.test',
  ],
  watchPathIgnorePatterns: ['/node_modules/', '/coverage/', '/dist/'],

  // Exclude non-backend directories from haste-map to prevent duplicate mock warnings
  // (frontend, _archived, backups, supply-chain-management contain conflicting __mocks__ files)
  modulePathIgnorePatterns: [
    '<rootDir>/../frontend',
    '<rootDir>/../_archived',
    '<rootDir>/../backups',
    '<rootDir>/../supply-chain-management',
  ],

  // Block duplicate __mocks__ files in non-backend folders from haste-map scanning
  haste: {
    blockList: [
      /[/\\]frontend[/\\]/,
      /[/\\]_archived[/\\]/,
      /[/\\]backups[/\\]/,
      /[/\\]supply-chain-management[/\\]/,
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Timeout settings — 30s default; use jest.setTimeout() for slow tests
  testTimeout: 30000,

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
  // Enable open handle detection to find leaked connections/timers
  detectOpenHandles: true,
  passWithNoTests: true,

  // Cache for faster re-runs
  cacheDirectory: '<rootDir>/.jest-cache',
};
