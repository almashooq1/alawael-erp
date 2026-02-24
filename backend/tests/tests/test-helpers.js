/**
 * Test Helpers and Utilities
 * Provides utilities for proper test cleanup and resource management
 */

// Track all active resources
const resources = {
  timers: new Set(),
  intervals: new Set(),
  connections: new Set(),
  servers: new Set(),
  promises: new Set()
};

/**
 * Track a timeout and ensure it gets cleaned up
 */
function trackTimeout(callback, delay, ...args) {
  const timeoutId = setTimeout(callback, delay, ...args);
  resources.timers.add(timeoutId);
  return timeoutId;
}

/**
 * Track an interval and ensure it gets cleaned up
 */
function trackInterval(callback, delay, ...args) {
  const intervalId = setInterval(callback, delay, ...args);
  resources.intervals.add(intervalId);
  return intervalId;
}

/**
 * Clear a timeout and remove from tracking
 */
function clearTrackedTimeout(timeoutId) {
  clearTimeout(timeoutId);
  resources.timers.delete(timeoutId);
}

/**
 * Clear an interval and remove from tracking
 */
function clearTrackedInterval(intervalId) {
  clearInterval(intervalId);
  resources.intervals.delete(intervalId);
}

/**
 * Track a promise for cleanup
 */
function trackPromise(promise) {
  resources.promises.add(promise);
  return promise.finally(() => {
    resources.promises.delete(promise);
  });
}

/**
 * Create a promise with timeout
 */
function createTimeoutPromise(delay) {
  return new Promise(resolve => {
    const timeoutId = trackTimeout(() => {
      resolve();
      resources.timers.delete(timeoutId);
    }, delay);
  });
}

/**
 * Wait for a condition with timeout
 */
async function waitFor(condition, options = {}) {
  const {
    timeout = 5000,
    interval = 100,
    message = 'Condition not met within timeout'
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await createTimeoutPromise(interval);
  }

  throw new Error(message);
}

/**
 * Cleanup all tracked resources
 */
async function cleanupResources() {
  // Clear all timeouts
  for (const timeoutId of resources.timers) {
    try {
      clearTimeout(timeoutId);
    } catch (_error) {
      // Ignore errors
    }
  }
  resources.timers.clear();

  // Clear all intervals
  for (const intervalId of resources.intervals) {
    try {
      clearInterval(intervalId);
    } catch (_error) {
      // Ignore errors
    }
  }
  resources.intervals.clear();

  // Wait for promises to settle
  try {
    await Promise.allSettled(Array.from(resources.promises));
  } catch (_error) {
    // Ignore errors
  }
  resources.promises.clear();

  // Close connections
  for (const connection of resources.connections) {
    try {
      if (typeof connection.close === 'function') {
        await connection.close();
      } else if (typeof connection.destroy === 'function') {
        await connection.destroy();
      }
    } catch (_error) {
      // Ignore errors
    }
  }
  resources.connections.clear();

  // Close servers
  for (const server of resources.servers) {
    try {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      // Ignore errors
    }
  }
  resources.servers.clear();
}

/**
 * Create a test timeout wrapper
 */
function withTimeout(testFn, customTimeout = 30000) {
  return async function() {
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = trackTimeout(() => {
        reject(new Error(`Test timeout after ${customTimeout}ms`));
      }, customTimeout);
    });

    try {
      await Promise.race([testFn(), timeoutPromise]);
    } finally {
      await cleanupResources();
    }
  };
}

/**
 * Mock factory for creating reusable mocks
 */
class MockFactory {
  constructor() {
    this.mocks = new Map();
  }

  create(name, implementation = {}) {
    const mock = jest.fn(implementation);
    this.mocks.set(name, mock);
    return mock;
  }

  get(name) {
    return this.mocks.get(name);
  }

  reset(name) {
    const mock = this.mocks.get(name);
    if (mock) {
      mock.mockReset();
    }
  }

  resetAll() {
    for (const mock of this.mocks.values()) {
      mock.mockReset();
    }
  }

  clearAll() {
    this.mocks.clear();
  }
}

/**
 * HTTP Request Helper
 */
class HTTPHelper {
  static async request(app, method, path, options = {}) {
    let req = require('supertest')(app)[method.toLowerCase()](path);

    if (options.headers) {
      req = req.set(options.headers);
    }

    if (options.body) {
      req = req.send(options.body);
    }

    if (options.query) {
      req = req.query(options.query);
    }

    return req;
  }

  static async get(app, path, options = {}) {
    return this.request(app, 'GET', path, options);
  }

  static async post(app, path, body, options = {}) {
    return this.request(app, 'POST', path, { ...options, body });
  }

  static async put(app, path, body, options = {}) {
    return this.request(app, 'PUT', path, { ...options, body });
  }

  static async delete(app, path, options = {}) {
    return this.request(app, 'DELETE', path, options);
  }
}

/**
 * Database Helper
 */
class DatabaseHelper {
  static async connectAndClear(uri, dbName) {
    const mongoose = require('mongoose');
    await mongoose.connect(uri, {
      dbName: dbName || 'test_db'
    });
  }

  static async clearDatabase() {
    const mongoose = require('mongoose');
    const collections = mongoose.connection.collections;

    for (const collection of Object.values(collections)) {
      await collection.deleteMany({});
    }
  }

  static async disconnect() {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

// Export functions and classes
module.exports = {
  trackTimeout,
  trackInterval,
  clearTrackedTimeout,
  clearTrackedInterval,
  trackPromise,
  createTimeoutPromise,
  waitFor,
  cleanupResources,
  withTimeout,
  MockFactory,
  HTTPHelper,
  DatabaseHelper,
  getResources: () => ({ ...resources })
};
