/**
 * Jest Setup File with MongoDB Optimization
 * ملف إعداد Jest - Setup with MongoDB Memory Server initialization
 * Phase 11: MongoDB Performance Optimization
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Test environment
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SMART_TEST_MODE = 'true'; // Skip automated DB seeding

jest.setTimeout(120000); // Global 2-minute timeout for integration tests

// Initialize MongoDB Memory Server with optimized settings
let mongoMemoryServer = null;

beforeAll(async () => {
  try {
    // Create MongoDB Memory Server with optimized configuration
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        oplogSize: 512,
        storageEngine: 'wiredTiger',
        nojournal: true,
      },
      binary: {
        version: '5.0.0',
      },
    });

    const mongoUri = mongoMemoryServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    // Connect Mongoose with optimized settings
    await mongoose.connect(mongoUri, {
      maxPoolSize: 15,           // Increased from default 10
      minPoolSize: 5,            // Maintain minimum connections
      waitQueueTimeoutMS: 20000, // Increased from 10000ms (Phase 11 optimization)
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      retryWrites: false,        // Disable for in-memory server
    });

    console.log('✅ MongoDB Memory Server started with optimized configuration');
    console.log('✅ Connection pool: max=15, min=5, timeout=20s');
  } catch (error) {
    console.error('❌ Failed to start MongoDB Memory Server:', error);
    process.exit(1);
  }

  // Wait for app module to fully initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('✅ Jest setup initialized for test environment');
});

afterAll(async () => {
  try {
    // Disconnect Mongoose
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ Mongoose connection closed');
    }

    // Stop MongoDB Memory Server
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      console.log('✅ MongoDB Memory Server stopped');
    }
  } catch (error) {
    console.error('❌ Error during teardown:', error);
  }

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
