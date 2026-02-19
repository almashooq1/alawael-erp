module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.cjs',
    '**/?(*.)+(spec|test).cjs',
  ],
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'middleware/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    'routes/**/*.js',
    '!node_modules/**',
    '!__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
};
