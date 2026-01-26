// Jest setup: ensure test env and bypass heavy middleware
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.USE_MOCK_DB = 'true';
// increase default jest timeout for slow hooks
jest.setTimeout(30000);

// Optional: silence noisy logs during tests
const noop = () => {};
if (process.env.NODE_ENV === 'test') {
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}
/**
 * Jest Setup File
 * ملف إعداد Jest
 */

// Set test environment variables FIRST
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/vehicle-management-test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

// In-memory database reset after every test to avoid cross-suite contamination
const db = require('./config/inMemoryDB');
const EMPTY_DB = {
  users: [],
  employees: [],
  attendances: [],
  leaves: [],
  performance: [],
};

afterEach(() => {
  db.write(EMPTY_DB);
});

// Use real timers to avoid breaking async callbacks that call `done()`
jest.useRealTimers();

// Suppress console during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
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
      message: () => `expected ${received} to be a valid Saudi National ID (10 digits)`,
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
      message: () => `expected ${received} to be a valid violation code`,
    };
  },

  toHaveComplianceScore(received) {
    const pass = typeof received.score === 'number' && received.score >= 0 && received.score <= 100;
    return {
      pass,
      message: () =>
        `expected ${JSON.stringify(received)} to have a valid compliance score (0-100)`,
    };
  },
});

// Mock database
// jest.mock('../db/connection', () => ({
//   connect: jest.fn(),
//   disconnect: jest.fn(),
// }));

// Clean up after all tests
afterAll(async () => {
  // nothing special to clean here
});
