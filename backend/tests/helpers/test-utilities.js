/**
 * Test Utilities and Helpers
 * Shared utility functions for testing across all phases
 * Reduces code duplication and improves test maintainability
 */

class TestDataFactory {
  /**
   * Generate audit log test data
   */
  static createAuditLogData(overrides = {}) {
    return {
      action: 'TEST_ACTION',
      user: 'test_user',
      timestamp: new Date(),
      message: 'Test audit log entry',
      status: 'success',
      details: {},
      ...overrides,
    };
  }

  /**
   * Generate metric test data
   */
  static createMetricData(name = 'test_metric', value = 50, overrides = {}) {
    return {
      name,
      value,
      unit: 'units',
      timestamp: Date.now(),
      source: 'test',
      ...overrides,
    };
  }

  /**
   * Generate cache test data
   */
  static createCacheData(overrides = {}) {
    return {
      key: `test_key_${Date.now()}`,
      value: { test: true, timestamp: new Date() },
      ttl: 3600,
      priority: 'normal',
      ...overrides,
    };
  }

  /**
   * Generate ML training data
   */
  static createMLTrainingData(features = [1, 2, 3], label = 0.5, overrides = {}) {
    return {
      features,
      label,
      timestamp: Date.now(),
      source: 'test',
      ...overrides,
    };
  }

  /**
   * Generate large dataset
   */
  static generateLargeDataset(size = 1000, generator = null) {
    const data = [];
    for (let i = 0; i < size; i++) {
      if (generator) {
        data.push(generator(i));
      } else {
        data.push({
          id: i,
          value: Math.random() * 100,
          timestamp: Date.now() - Math.random() * 1000000,
          status: ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)],
        });
      }
    }
    return data;
  }

  /**
   * Generate edge case test data
   */
  static createEdgeCaseData() {
    return {
      nullValue: null,
      undefinedValue: undefined,
      emptyString: '',
      zeroValue: 0,
      negativeValue: -1,
      largeNumber: Number.MAX_SAFE_INTEGER,
      smallNumber: Number.MIN_SAFE_INTEGER,
      infinity: Infinity,
      negativeInfinity: -Infinity,
      nan: NaN,
      emptyArray: [],
      emptyObject: {},
      unicodeString: '你好世界 🎉 مرحبا بالعالم',
      specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      veryLongString: 'x'.repeat(10000),
      circularObject: (() => {
        const obj = { a: 1 };
        obj.self = obj;
        return obj;
      })(),
    };
  }
}

class TestAssertions {
  /**
   * Assert valid audit log structure
   */
  static assertValidAuditLog(log) {
    expect(log).toBeDefined();
    expect(log._id || log.id).toBeDefined();
    expect(log.action).toBeDefined();
    expect(log.timestamp || log.createdAt).toBeDefined();
    expect(['success', 'failure', 'warning']).toContain(log.status || 'success');
  }

  /**
   * Assert valid metric structure
   */
  static assertValidMetric(metric) {
    expect(metric).toBeDefined();
    expect(metric.name).toBeDefined();
    expect(typeof metric.value).toBe('number');
    expect(metric.timestamp).toBeDefined();
  }

  /**
   * Assert valid cache entry
   */
  static assertValidCacheEntry(entry) {
    expect(entry).toBeDefined();
    expect(entry.value).toBeDefined();
    expect(entry.expiresAt || entry.ttl).toBeDefined();
  }

  /**
   * Assert valid ML model
   */
  static assertValidMLModel(model) {
    expect(model).toBeDefined();
    expect(model.trained).toBe(true);
    expect(model.weights || model.parameters).toBeDefined();
    expect(model.metadata || model.config).toBeDefined();
  }

  /**
   * Assert response structure
   */
  static assertValidResponse(response, expectedFields = []) {
    expect(response).toBeDefined();
    expect(response.success).toBeDefined();
    expect(response.timestamp || response.createdAt).toBeDefined();

    expectedFields.forEach(field => {
      expect(response[field]).toBeDefined();
    });
  }

  /**
   * Assert within performance threshold
   */
  static assertPerformanceThreshold(duration, threshold = 1000) {
    expect(duration).toBeLessThan(threshold);
  }

  /**
   * Assert no circular references
   */
  static assertNoCircularReferences(obj) {
    const seen = new WeakSet();
    const hasCircular = o => {
      if (seen.has(o)) return true;
      seen.add(o);
      for (const key in o) {
        if (typeof o[key] === 'object' && hasCircular(o[key])) {
          return true;
        }
      }
      return false;
    };
    expect(hasCircular(obj)).toBe(false);
  }
}

class MockServices {
  /**
   * Create mock audit log service
   */
  static createMockAuditService() {
    return {
      logs: [],
      createAuditLog: async function (data) {
        const log = {
          _id: `log_${Date.now()}_${Math.random()}`,
          ...data,
          createdAt: new Date(),
        };
        this.logs.push(log);
        return log;
      },
      getAuditLogs: function () {
        return this.logs;
      },
      clearLogs: function () {
        this.logs = [];
      },
    };
  }

  /**
   * Create mock monitoring service
   */
  static createMockMonitoringService() {
    return {
      metrics: [],
      recordMetric: function (name, value) {
        this.metrics.push({
          name,
          value,
          timestamp: Date.now(),
        });
      },
      getMetrics: function () {
        return this.metrics;
      },
      getMetricsByName: function (name) {
        return this.metrics.filter(m => m.name === name);
      },
      clearMetrics: function () {
        this.metrics = [];
      },
    };
  }

  /**
   * Create mock caching service
   */
  static createMockCachingService() {
    return {
      cache: new Map(),
      set: function (key, value, ttl = 3600) {
        this.cache.set(key, {
          value,
          expiresAt: Date.now() + ttl * 1000,
        });
      },
      get: function (key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
          this.cache.delete(key);
          return null;
        }
        return entry.value;
      },
      has: function (key) {
        return this.cache.has(key);
      },
      delete: function (key) {
        return this.cache.delete(key);
      },
      clear: function () {
        this.cache.clear();
      },
      size: function () {
        return this.cache.size;
      },
    };
  }

  /**
   * Create mock ML service
   */
  static createMockMLService() {
    return {
      models: {},
      trainingData: {},
      addTrainingData: function (features, label, modelName = 'default') {
        if (!this.trainingData[modelName]) {
          this.trainingData[modelName] = [];
        }
        this.trainingData[modelName].push({ features, label });
      },
      trainModel: function (modelName) {
        if (!this.trainingData[modelName] || this.trainingData[modelName].length === 0) {
          return false;
        }
        this.models[modelName] = {
          name: modelName,
          trained: true,
          dataPoints: this.trainingData[modelName].length,
          timestamp: Date.now(),
        };
        return true;
      },
      predict: function (modelName, features) {
        if (!this.models[modelName]) {
          return { success: false, error: 'Model not found' };
        }
        return {
          success: true,
          prediction: Math.random(),
          confidence: 0.8 + Math.random() * 0.2,
          modelName,
        };
      },
      getModel: function (modelName) {
        return this.models[modelName];
      },
      getModels: function () {
        return this.models;
      },
    };
  }
}

class TestHelpers {
  /**
   * Wait for a condition to be true
   */
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Wait condition timeout');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Measure execution time
   */
  static async measureTime(asyncFn) {
    const start = Date.now();
    const result = await asyncFn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryWithBackoff(asyncFn, maxRetries = 3, initialDelay = 100) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /**
   * Create test context with all services
   */
  static createTestContext() {
    return {
      audit: MockServices.createMockAuditService(),
      monitoring: MockServices.createMockMonitoringService(),
      cache: MockServices.createMockCachingService(),
      ml: MockServices.createMockMLService(),

      reset: function () {
        this.audit.clearLogs();
        this.monitoring.clearMetrics();
        this.cache.clear();
        this.ml = MockServices.createMockMLService();
      },
    };
  }

  /**
   * Generate random test ID
   */
  static generateTestId(prefix = 'test') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compare performance between operations
   */
  static async comparePerformance(op1, op2, iterations = 10) {
    const results = { op1: [], op2: [] };

    for (let i = 0; i < iterations; i++) {
      const { duration: d1 } = await this.measureTime(op1);
      const { duration: d2 } = await this.measureTime(op2);
      results.op1.push(d1);
      results.op2.push(d2);
    }

    const avg1 = results.op1.reduce((a, b) => a + b) / iterations;
    const avg2 = results.op2.reduce((a, b) => a + b) / iterations;

    return {
      op1: { times: results.op1, average: avg1 },
      op2: { times: results.op2, average: avg2 },
      faster: avg1 < avg2 ? 'op1' : 'op2',
      percentageDifference: Math.round((Math.abs(avg1 - avg2) / Math.max(avg1, avg2)) * 100),
    };
  }

  /**
   * Verify data consistency
   */
  static verifyDataConsistency(original, transformed) {
    const originalStr = JSON.stringify(original);
    const transformedStr = JSON.stringify(transformed);
    return originalStr === transformedStr;
  }
}

// Export all utilities
module.exports = {
  TestDataFactory,
  TestAssertions,
  MockServices,
  TestHelpers,
};

console.log('\n✅ Test Utilities & Helpers Module Loaded\n');
console.log('📦 Available Utilities:');
console.log('   - TestDataFactory: 7 factory methods');
console.log('   - TestAssertions: 7 assertion methods');
console.log('   - MockServices: 4 mock service builders');
console.log('   - TestHelpers: 8 helper functions\n');
