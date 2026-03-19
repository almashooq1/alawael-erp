/**
 * Jest Setup File - Enhanced Version
 * Global test configuration and utilities
 */

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Disable console output during tests (optional)
// global.console = {
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
//   info: jest.fn(),
//   debug: jest.fn(),
// };

// Extend Jest matchers
expect.extend({
  // Custom matcher for checking if value is a valid MongoDB ID
  toBeValidMongoId(received) {
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    const pass = mongoIdRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid MongoDB ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid MongoDB ID`,
        pass: false,
      };
    }
  },

  // Custom matcher for checking if value is a valid email
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  // Custom matcher for checking if object has properties
  toHaveProperties(received, expected) {
    const pass = expected.every(prop => prop in received);

    if (pass) {
      return {
        message: () => `expected object not to have properties: ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      const missing = expected.filter(prop => !(prop in received));
      return {
        message: () => `expected object to have properties: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Global test timeout
jest.setTimeout(30000);

// Mock timers (if needed in specific tests)
// jest.useFakeTimers();

// Suppress specific warnings
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllTimers();
});

// Restore console after tests
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Generate random ID
  randomId: () => Math.random().toString(36).substring(2, 11),

  // Generate mock user
  mockUser: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Generate mock employee
  mockEmployee: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Employee',
    email: 'employee@example.com',
    department: 'IT',
    position: 'Developer',
    salary: 5000,
    createdAt: new Date(),
    ...overrides,
  }),

  // Generate mock response
  mockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn().mockReturnValue(null),
      on: jest.fn().mockReturnThis(),
    };
    return res;
  },

  // Generate mock request
  mockRequest: (overrides = {}) => {
    const req = {
      method: 'GET',
      url: '/',
      headers: {},
      params: {},
      query: {},
      body: {},
      user: global.testUtils.mockUser(),
      ...overrides,
    };
    return req;
  },

  // Generate mock context
  mockContext: (overrides = {}) => ({
    requestId: Math.random().toString(36).substring(2, 11),
    userId: '507f1f77bcf86cd799439011',
    role: 'user',
    timestamp: new Date().toISOString(),
    ...overrides,
  }),

  // Wait for condition
  waitFor: async (condition, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Wait condition not met within timeout');
  },
};

// Add performance monitoring
global.testPerformance = {
  measurements: {},

  start: label => {
    global.testPerformance.measurements[label] = Date.now();
  },

  end: label => {
    if (!global.testPerformance.measurements[label]) {
      throw new Error(`No measurement started for ${label}`);
    }
    const duration = Date.now() - global.testPerformance.measurements[label];
    delete global.testPerformance.measurements[label];
    return duration;
  },

  measure: (label, fn) => {
    global.testPerformance.start(label);
    const result = fn();
    const duration = global.testPerformance.end(label);
    console.log(`⏱️ ${label}: ${duration}ms`);
    return result;
  },
};
