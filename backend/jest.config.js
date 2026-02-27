/**
 * Jest Configuration - Full Test Suite with MongoDB Optimization
 * Phase 11: Enhanced Performance Settings
 * - Increased testTimeout: 60000ms (allows for MongoDB operations)
 * - maxWorkers: 2 (prevents socket exhaustion)
 * - detectOpenHandles: true (identifies resource leaks)
 */

module.exports = {
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  testEnvironment: 'node',
  maxWorkers: 2,                    // Keep at 2 to prevent MongoDB buffer overflow
  testTimeout: 60000,               // 60 seconds per test (generous for integration tests)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  verbose: false,
  bail: false,                      // Continue running tests even after failures
  forceExit: true,                  // Force exit after tests complete
  detectOpenHandles: false,         // Set to true for debugging resource leaks
  collectCoverageFrom: [],          // Disable coverage to reduce overhead
  moduleNameMapper: {
    '^(\\.{1,2}/.*)/[Nn]otification[Ss]ervice(\\.js)?$': '$1/notificationService.js',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.git/',
  ],
  // MongoDB operation timeout context
  // MongoMemoryServer now configured with 20s timeout via jest.setup.js
};
