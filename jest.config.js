/**
 * Jest Configuration for Traffic Accident Reporting System
 * نظام تقارير الحوادث المرورية - إعدادات Jest
 */

module.exports = {
  // ========================================
  // ENVIRONMENT & SETUP
  // ========================================
  testEnvironment: 'node',
  testTimeout: 10000,
  verbose: true,

  // ========================================
  // PATHS & COVERAGE
  // ========================================
  rootDir: './',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'backend/**/*.js',
    'frontend/src/**/*.js',
    'frontend/src/**/*.jsx',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],

  // ========================================
  // COVERAGE THRESHOLDS
  // ========================================
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  // ========================================
  // SETUP & TEARDOWN
  // ========================================
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // ========================================
  // MODULE RESOLUTION
  // ========================================
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@services/(.*)$': '<rootDir>/backend/services/$1',
    '^@models/(.*)$': '<rootDir>/backend/models/$1',
    '^@controllers/(.*)$': '<rootDir>/backend/controllers/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },

  // ========================================
  // TRANSFORM & PREPROCESSING
  // ========================================
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },

  // ========================================
  // REPORTERS
  // ========================================
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage/junit',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathAsClassName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html',
        filename: 'jest-results.html',
        pageTitle: 'Traffic Accident Reporting - Test Results'
      }
    ]
  ],

  // ========================================
  // IGNORE PATTERNS
  // ========================================
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // ========================================
  // WATCH MODE PLUGINS
  // ========================================
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.git/',
    '/coverage/'
  ],

  // ========================================
  // ADDITIONAL OPTIONS
  // ========================================
  bail: 0,
  maxWorkers: '50%',
  detectOpenHandles: true,
  forceExit: false,
  passWithNoTests: false
};
