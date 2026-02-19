/**
 * Jest Configuration - Full Test Suite
 * Runs all tests with optimizations for large test suites
 */

module.exports = {
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  testEnvironment: 'node',
  maxWorkers: 2,
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  verbose: false,
};
