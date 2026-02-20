/**
 * Jest Test Setup File
 * Initialize test environment and global configuration
 */

// =============================================
// ENVIRONMENT SETUP
// =============================================

// Set test environment
process.env.NODE_ENV = 'test';

// Configure environment variables for tests
process.env.BRANCH_API_URL = process.env.BRANCH_API_URL || 'http://localhost:5000/api/v2';
process.env.BRANCH_API_KEY = process.env.BRANCH_API_KEY || 'test-api-key-123';
process.env.SYNC_INTERVAL = process.env.SYNC_INTERVAL || '60000';
process.env.ENABLE_CONTINUOUS_SYNC = process.env.ENABLE_CONTINUOUS_SYNC || 'false';

// =============================================
// GLOBAL TEST TIMEOUT
// =============================================

jest.setTimeout(30000);

// =============================================
// GLOBAL FETCH MOCK
// =============================================

global.fetch = jest.fn();

// Default fetch mock implementation
global.fetch.mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({})
  })
);

// =============================================
// GLOBAL ERROR HANDLING
// =============================================

// Suppress console errors in tests (comment out to see errors)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only suppress specific patterns
console.error = (...args) => {
  const message = args[0]?.toString?.() || '';

  // Allow test-related errors
  if (message.includes('Error') || message.includes('Test')) {
    originalConsoleError(...args);
  }
  // Suppress specific known warnings
  else if (message.includes('ExperimentalWarning')) {
    // Suppress experimental warnings
  }
  // Log everything else
  else {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  const message = args[0]?.toString?.() || '';

  // Log all warnings
  originalConsoleWarn(...args);
};

// =============================================
// GLOBAL TEST UTILITIES
// =============================================

/**
 * Create a mock successful response
 */
global.mockSuccessResponse = (data = {}, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => ({ success: true, ...data })
});

/**
 * Create a mock error response
 */
global.mockErrorResponse = (error = 'Error', status = 500) => ({
  ok: false,
  status,
  json: async () => ({ success: false, error })
});

/**
 * Create a mock timeout
 */
global.mockTimeout = () =>
  Promise.reject(new Error('Timeout'));

/**
 * Reset all mocks
 */
global.resetMocks = () => {
  jest.clearAllMocks();
};

// =============================================
// GLOBAL TEST MATCHERS
// =============================================

expect.extend({
  /**
   * Custom matcher for checking if response is in valid ERP format
   */
  toBeValidERPResponse(received) {
    const pass =
      received &&
      typeof received === 'object' &&
      'success' in received &&
      'timestamp' in received;

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to be valid ERP format`
          : `Expected response to be valid ERP format with 'success' and 'timestamp' properties`
    };
  },

  /**
   * Custom matcher for checking if value is within range
   */
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${floor} - ${ceiling}`
          : `Expected ${received} to be within range ${floor} - ${ceiling}`
    };
  },

  /**
   * Custom matcher for branch status validation
   */
  toBeValidBranchStatus(received) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'CLOSED', 'SUSPENDED', 'PLANNED'];
    const pass = validStatuses.includes(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected status not to be valid`
          : `Expected status to be one of: ${validStatuses.join(', ')}, but got: ${received}`
    };
  }
});

// =============================================
// ASSERTION HELPERS
// =============================================

/**
 * Assert response structure
 */
global.assertResponseStructure = (response, expectedFields = []) => {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('timestamp');

  expectedFields.forEach(field => {
    expect(response).toHaveProperty(field);
  });
};

/**
 * Assert error structure
 */
global.assertErrorStructure = (response) => {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('error');
  expect(response).toHaveProperty('timestamp');
};

/**
 * Assert performance within SLA
 */
global.assertPerformanceSLA = (duration, slaMs, operation = 'Operation') => {
  expect(duration).toBeLessThan(slaMs);
  console.log(`✓ ${operation} completed in ${duration}ms (SLA: ${slaMs}ms)`);
};

// =============================================
// MEMORY AND CLEANUP
// =============================================

// Track registered cleanup functions
const cleanupFunctions = [];

/**
 * Register cleanup function
 */
global.registerCleanup = (fn) => {
  cleanupFunctions.push(fn);
};

// Run cleanup after each test
afterEach(() => {
  cleanupFunctions.forEach(fn => {
    try {
      fn();
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });

  cleanupFunctions.length = 0;
  jest.clearAllMocks();
});

// =============================================
// PERFORMANCE MONITORING
// =============================================

let testStartTime;

beforeEach(() => {
  testStartTime = performance.now();
});

afterEach(() => {
  const testDuration = performance.now() - testStartTime;
  const testName = expect.getState().currentTestName;

  if (testDuration > 1000) {
    console.warn(`⚠️ Slow test "${testName}": ${testDuration.toFixed(2)}ms`);
  }
});

// =============================================
// LOGGING
// =============================================

// Log test suite information
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 Jest Test Suite Initialized');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Branch API: ${process.env.BRANCH_API_URL}`);
console.log('Timeout: 30000ms');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// =============================================
// ERROR TRACKING
// =============================================

// Track uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Track unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// =============================================
// CLEANUP ON EXIT
// =============================================

// Ensure proper cleanup on process exit
afterAll(async () => {
  // Clear all timeouts
  jest.clearAllTimers();

  // Clear all intervals
  jest.clearAllTimers();

  // Reset mocks
  jest.resetAllMocks();

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✓ Test suite cleanup completed');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});
