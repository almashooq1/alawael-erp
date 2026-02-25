module.exports = {
  displayName: 'alawael-backend',
  testEnvironment: 'node',
  rootDir: './',
  testMatch: [
    '<rootDir>/**/__tests__/**/*.test.js',
    '<rootDir>/**/?(*.)+(spec|test).js'
  ],
  moduleFileExtensions: ['js', 'json', 'node'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.git/',
    '/coverage/',
    '/migrations/',
    '/logs/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  globals: {
    NODE_ENV: 'test'
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  verbose: true,
  bail: false,
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'api/**/*.js',
    '!api/**/*.test.js',
    '!api/**/*.spec.js',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  // Skip slow operations in CI
  slowTestThreshold: 30,
  // Handle async operations
  detectOpenHandles: false,
  forceExit: true
};
