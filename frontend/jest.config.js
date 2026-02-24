module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest'],
  },
  transformIgnorePatterns: ['node_modules/(?!(axios|@testing-library)/)'],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx}',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/__tests__/**/*.js',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^.+/utils/api(\\.js)?$': '<rootDir>/src/utils/api.js',
    '^.+/services/api(\\.js)?$': '<rootDir>/src/utils/api.js',
    '^.+/components/services/api(\\.js)?$': '<rootDir>/src/utils/api.js',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/index.js', '!src/reportWebVitals.js'],
};
