/* eslint-disable no-unused-vars */
/**
 * @file loadTester.js
 * @description Load Testing Framework for Phase 11 System Integration
 * Provides concurrent user simulation, performance metrics, and stress testing
 * @version 1.0.0
 */

const axios = require('axios');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class LoadTester extends EventEmitter {
  constructor(baseURL = 'http://localhost:3001', options = {}) {
    super();
    this.baseURL = baseURL;
    this.options = {
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
      ...options,
    };
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: null,
      endTime: null,
    };
    this.isRunning = false;
  }

  /**
   * Single HTTP Request
   */
  async makeRequest(method = 'GET', endpoint = '/', data = null, headers = {}) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      timeout: this.options.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    try {
      const startTime = Date.now();
      const response = await axios(config);
      const duration = Date.now() - startTime;

      this.metrics.responseTimes.push(duration);
      this.metrics.successfulRequests++;

      return {
        success: true,
        status: response.status,
        duration,
        data: response.data,
      };
    } catch (error) {
      this.metrics.failedRequests++;
      this.metrics.errors.push({
        endpoint,
        error: 'حدث خطأ داخلي',
        timestamp: new Date(),
      });

      return {
        success: false,
        status: error.response?.status || 0,
        error: 'حدث خطأ داخلي',
      };
    } finally {
      this.metrics.totalRequests++;
    }
  }

  /**
   * Simulate Concurrent Users
   */
  async simulateConcurrentUsers(
    userCount = 10,
    requestsPerUser = 10,
    endpoint = '/api/dashboard/health',
    method = 'GET'
  ) {
    logger.info(`\n🔥 Starting Load Test: ${userCount} users, ${requestsPerUser} requests each`);
    logger.info(`📍 Endpoint: ${endpoint}\n`);

    this.metrics.startTime = Date.now();
    this.isRunning = true;
    this.emit('start');

    const users = [];

    // Create user tasks
    for (let i = 0; i < userCount; i++) {
      const userPromises = [];

      for (let j = 0; j < requestsPerUser; j++) {
        userPromises.push(
          this.makeRequest(method, endpoint).catch(err => ({
            success: false,
            error: err.message,
          }))
        );

        // Add delay between requests (simulate think time)
        await new Promise(resolve => {
          setTimeout(resolve, Math.random() * 100);
        });
      }

      users.push(Promise.all(userPromises));
    }

    // Execute all users concurrently
    try {
      await Promise.all(users);
      this.metrics.endTime = Date.now();
      this.isRunning = false;
      this.emit('complete', this.getMetrics());

      return this.getMetrics();
    } catch (error) {
      logger.error('❌ Load test error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stress Test - Gradually increase load
   */
  async stressTest(maxUsers = 100, endpoint = '/api/dashboard/health', requestsPerUser = 5) {
    logger.info(`\n📈 Starting Stress Test: Max ${maxUsers} users\n`);

    const results = [];
    const steps = [10, 25, 50, 75, 100];
    const targetSteps = steps.filter(s => s <= maxUsers);

    for (const userCount of targetSteps) {
      logger.info(`\n--- Step: ${userCount} users ---`);

      this.resetMetrics();
      const metrics = await this.simulateConcurrentUsers(userCount, requestsPerUser, endpoint);

      results.push({
        users: userCount,
        ...metrics,
      });

      // Display progress
      this.displayMetrics(metrics);

      // Wait between steps
      await new Promise(resolve => {
        setTimeout(resolve, 2000);
      });
    }

    return results;
  }

  /**
   * Soak Test - Sustained load for duration
   */
  async soakTest(
    userCount = 50,
    durationMinutes = 5,
    endpoint = '/api/dashboard/health',
    requestsPerUser = 10
  ) {
    logger.info(`\n⏱️  Starting Soak Test: ${userCount} users for ${durationMinutes} minutes\n`);

    this.resetMetrics();
    this.metrics.startTime = Date.now();
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.metrics.startTime) / 1000 / 60);
      logger.info(`⏳ Elapsed: ${elapsed} minutes | Requests: ${this.metrics.totalRequests}`);
    }, 30000); // Update every 30 seconds

    try {
      while (Date.now() < endTime) {
        await this.simulateConcurrentUsers(userCount, Math.ceil(requestsPerUser / 2), endpoint);
      }

      clearInterval(interval);
      this.metrics.endTime = Date.now();

      return this.getMetrics();
    } catch (error) {
      clearInterval(interval);
      throw error;
    }
  }

  /**
   * Test Specific Endpoints
   */
  async testEndpoints(endpoints = []) {
    logger.info(`\n🧪 Testing ${endpoints.length} endpoints\n`);

    const results = [];

    for (const endpoint of endpoints) {
      this.resetMetrics();

      logger.info(`Testing: ${endpoint.path} (${endpoint.method || 'GET'})`);

      const metrics = await this.simulateConcurrentUsers(
        endpoint.users || 5,
        endpoint.requests || 10,
        endpoint.path,
        endpoint.method || 'GET'
      );

      results.push({
        endpoint: endpoint.path,
        ...metrics,
      });

      this.displayMetrics(metrics);
      await new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    }

    return results;
  }

  /**
   * Get Performance Metrics
   */
  getMetrics() {
    if (this.metrics.responseTimes.length === 0) {
      return { message: 'No metrics collected' };
    }

    const times = this.metrics.responseTimes.sort((a, b) => a - b);
    const length = times.length;

    const avgTime = Math.round(times.reduce((a, b) => a + b) / length);
    const p50 = times[Math.floor(length * 0.5)];
    const p95 = times[Math.floor(length * 0.95)];
    const p99 = times[Math.floor(length * 0.99)];

    const duration = this.metrics.endTime
      ? (this.metrics.endTime - this.metrics.startTime) / 1000
      : 0;

    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        successful: this.metrics.successfulRequests,
        failed: this.metrics.failedRequests,
        successRate: `${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)}%`,
        duration: `${duration.toFixed(2)}s`,
        throughput: `${(this.metrics.totalRequests / duration).toFixed(2)} req/s`,
      },
      responseTimes: {
        min: Math.min(...times),
        max: Math.max(...times),
        avg: avgTime,
        p50,
        p95,
        p99,
      },
      errors: this.metrics.errors.length > 0 ? this.metrics.errors.slice(0, 5) : [],
    };
  }

  /**
   * Display Metrics in Console
   */
  displayMetrics(metrics = null) {
    const data = metrics || this.getMetrics();

    logger.info('\n' + '='.repeat(60));
    logger.info('📊 PERFORMANCE METRICS');
    logger.info('='.repeat(60));

    if (data.summary) {
      logger.info('\n📈 Summary:');
      logger.info(`  ✅ Total Requests: ${data.summary.totalRequests}`);
      logger.info(`  ✔️  Successful: ${data.summary.successful}`);
      logger.info(`  ❌ Failed: ${data.summary.failed}`);
      logger.info(`  📊 Success Rate: ${data.summary.successRate}`);
      logger.info(`  ⏱️  Duration: ${data.summary.duration}`);
      logger.info(`  🚀 Throughput: ${data.summary.throughput}`);
    }

    if (data.responseTimes) {
      logger.info('\n⏰ Response Times (ms):');
      logger.info(`  🔹 Min: ${data.responseTimes.min}`);
      logger.info(`  🔹 Max: ${data.responseTimes.max}`);
      logger.info(`  🔹 Avg: ${data.responseTimes.avg}`);
      logger.info(`  🔹 P50: ${data.responseTimes.p50}`);
      logger.info(`  🔹 P95: ${data.responseTimes.p95}`);
      logger.info(`  🔹 P99: ${data.responseTimes.p99}`);
    }

    if (data.errors && data.errors.length > 0) {
      logger.info('\n⚠️  Recent Errors:');
      data.errors.forEach(err => {
        logger.info(`  - ${err.endpoint}: ${err.error}`);
      });
    }

    logger.info('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Reset Metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Export Results
   */
  exportResults(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.getMetrics(), null, 2);
    } else if (format === 'csv') {
      const times = this.metrics.responseTimes;
      return ['Time (ms)'].concat(times).join('\n');
    }
    return this.getMetrics();
  }
}

module.exports = LoadTester;
