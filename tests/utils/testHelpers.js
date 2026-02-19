/**
 * tests/utils/testHelpers.js - Test Utility Functions
 * Provides helper functions for testing across all test files
 */

const crypto = require('crypto');

/**
 * Database Test Helpers
 */
const dbHelpers = {
  /**
   * Generate mock MongoDB ObjectId
   */
  generateObjectId: () => crypto.randomBytes(12).toString('hex'),

  /**
   * Create mock database connection
   */
  createMockDatabaseConnection: () => ({
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    isConnected: jest.fn().mockReturnValue(true),
    collection: jest.fn(name => ({
      insertOne: jest.fn().mockResolvedValue({ insertedId: dbHelpers.generateObjectId() }),
      insertMany: jest.fn().mockResolvedValue({ insertedIds: [dbHelpers.generateObjectId()] }),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    })),
  }),

  /**
   * Create mock model with common methods
   */
  createMockModel: name => ({
    name,
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    save: jest.fn(),
  }),
};

/**
 * Request/Response Test Helpers
 */
const httpHelpers = {
  /**
   * Create standard response object
   */
  createStandardResponse: (status = 'success', message = '', data = null) => ({
    status,
    message,
    data,
    timestamp: new Date(),
  }),

  /**
   * Validate standard response format
   */
  validateResponseFormat: response => {
    const requiredFields = ['status', 'message', 'data', 'timestamp'];
    const isValid = requiredFields.every(field => field in response);
    const validStatus = ['success', 'error'].includes(response.status);

    return isValid && validStatus;
  },

  /**
   * Create error response
   */
  createErrorResponse: (message, code = 'UNKNOWN_ERROR') => ({
    status: 'error',
    message,
    code,
    data: null,
    timestamp: new Date(),
  }),

  /**
   * Create success response
   */
  createSuccessResponse: (message, data = null) => ({
    status: 'success',
    message,
    data,
    timestamp: new Date(),
  }),
};

/**
 * Data Validation Helpers
 */
const validationHelpers = {
  /**
   * Validate email format
   */
  isValidEmail: email => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone format
   */
  isValidPhone: phone => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Validate date
   */
  isValidDate: date => {
    return date instanceof Date && !isNaN(date.getTime());
  },

  /**
   * Validate enum value
   */
  isValidEnum: (value, enumValues) => {
    return enumValues.includes(value);
  },

  /**
   * Validate required fields
   */
  validateRequiredFields: (obj, requiredFields) => {
    return requiredFields.every(field => field in obj && obj[field] !== null);
  },

  /**
   * Validate GPA range
   */
  isValidGPA: gpa => {
    return typeof gpa === 'number' && gpa >= 0 && gpa <= 4.0;
  },

  /**
   * Validate percentage
   */
  isValidPercentage: value => {
    return typeof value === 'number' && value >= 0 && value <= 100;
  },

  /**
   * Validate positive number
   */
  isPositiveNumber: value => {
    return typeof value === 'number' && value >= 0;
  },
};

/**
 * Test Data Generators
 */
const dataGenerators = {
  /**
   * Generate random email
   */
  generateEmail: (domain = 'test.com') => {
    return `user${Math.random().toString(36).slice(2)}@${domain}`;
  },

  /**
   * Generate random phone
   */
  generatePhone: () => {
    return `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
  },

  /**
   * Generate random ID
   */
  generateId: () => {
    return `ID${Math.random().toString(36).slice(2).toUpperCase()}`;
  },

  /**
   * Generate random GPA
   */
  generateGPA: () => {
    return Number((Math.random() * 4).toFixed(2));
  },

  /**
   * Generate random percentage
   */
  generatePercentage: () => {
    return Math.floor(Math.random() * 101);
  },

  /**
   * Generate random date within range
   */
  generateDateInRange: (startDate, endDate) => {
    const time = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    return new Date(time);
  },

  /**
   * Generate future date
   */
  generateFutureDate: (daysFromNow = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },
};

/**
 * Assertion Helpers
 */
const assertionHelpers = {
  /**
   * Assert response is successful
   */
  assertSuccess: response => {
    expect(response.status).toBe('success');
    expect(response.message).toBeDefined();
    expect(response.timestamp).toBeDefined();
  },

  /**
   * Assert response is error
   */
  assertError: (response, expectedMessage = null) => {
    expect(response.status).toBe('error');
    expect(response.data).toBeNull();
    if (expectedMessage) {
      expect(response.message).toContain(expectedMessage);
    }
  },

  /**
   * Assert HTTP status
   */
  assertHttpStatus: (response, expectedStatus) => {
    expect(response.status).toBe(expectedStatus);
  },

  /**
   * Assert data structure
   */
  assertDataStructure: (data, expectedFields) => {
    expectedFields.forEach(field => {
      expect(data).toHaveProperty(field);
    });
  },

  /**
   * Assert array length
   */
  assertArrayLength: (array, expectedLength) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toHaveLength(expectedLength);
  },

  /**
   * Assert object not empty
   */
  assertObjectNotEmpty: obj => {
    expect(Object.keys(obj).length).toBeGreaterThan(0);
  },
};

/**
 * Timing & Performance Helpers
 */
const performanceHelpers = {
  /**
   * Measure function execution time
   */
  measureTime: async fn => {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  },

  /**
   * Assert execution time under threshold
   */
  assertExecutionTime: async (fn, maxMs) => {
    const time = await performanceHelpers.measureTime(fn);
    expect(time).toBeLessThan(maxMs);
  },
};

module.exports = {
  dbHelpers,
  httpHelpers,
  validationHelpers,
  dataGenerators,
  assertionHelpers,
  performanceHelpers,
};
