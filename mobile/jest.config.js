/**
 * jest.config.js — extends the jest-expo preset which already
 * defines testEnvironment, transformIgnorePatterns, setupFiles, and
 * moduleFileExtensions for an Expo 49 + React Native project.
 *
 * We only override what's project-specific:
 *   • moduleNameMapper — @/* → src/*
 *   • testMatch — scope to src/ (root __tests__/MobileApp.test.js
 *     was deleted in Phase 3)
 *   • collectCoverageFrom — src/ only
 *   • coverageThreshold — 70% per category
 *   • setupFilesAfterEnv — our Expo/AsyncStorage/etc. mocks
 */

module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx}',
    '!src/navigation/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
