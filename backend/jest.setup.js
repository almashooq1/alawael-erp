/**
 * Jest Setup File
 * ملف إعداد Jest - Setup with MongoDB Memory Server initialization
 */

// Test environment
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SMART_TEST_MODE = 'true'; // Skip automated DB seeding

jest.setTimeout(120000); // Global 2-minute timeout for integration tests

// Initialize MongoDB Memory Server before tests
let mongoMemoryServer = null;

beforeAll(async () => {
  // Wait for app module to fully initialize
  // The server.js module exports app after async setup, so we give it time
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('✅ Jest setup initialized for test environment');
});

afterAll(async () => {
  // Give async operations time to complete before shutdown
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('✅ Jest teardown complete');
});

// Reduce console output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Custom matchers
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () => `expected ${received} to be a valid date`,
    };
  },

  toBeValidNationalId(received) {
    const pass = /^\d{10}$/.test(received);
    return {
      pass,
      message: () => `expected ${received} to be Saudi National ID`,
    };
  },

  toBeValidViolationCode(received) {
    const validCodes = [
      '101',
      '102',
      '103',
      '201',
      '202',
      '203',
      '204',
      '205',
      '301',
      '302',
      '303',
      '304',
      '401',
      '402',
      '403',
      '404',
      '405',
      '406',
      '407',
      '408',
    ];
    const pass = validCodes.includes(String(received));
    return {
      pass,
      message: () => `expected ${received} to be valid code`,
    };
  },

  toHaveComplianceScore(received) {
    const pass = typeof received.score === 'number' && received.score >= 0 && received.score <= 100;
    return {
      pass,
      message: () => `expected score 0-100`,
    };
  },
});
