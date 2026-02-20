module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(axios)/)'],
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/index.js', '!src/reportWebVitals.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx}',
  ],
  moduleDirectories: ['node_modules', 'src'],
  testTimeout: 15000,
  // Performance optimizations
  maxWorkers: '50%',
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};
