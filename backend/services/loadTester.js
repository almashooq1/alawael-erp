/**
 * @file loadTester.js
 * @description Load Testing Framework for Phase 11 System Integration
 * Provides concurrent user simulation, performance metrics, and stress testing
 * @version 1.0.0
 */

const axios = require('axios');
const EventEmitter = require('events');

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
        error: error.message,
        timestamp: new Date(),
      });

      return {
        success: false,
        status: error.response?.status || 0,
        error: error.message,
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
    console.log(`\n🔥 Starting Load Test: ${userCount} users, ${requestsPerUser} requests each`);
    console.log(`📍 Endpoint: ${endpoint}\n`);

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
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
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
      console.error('❌ Load test error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stress Test - Gradually increase load
   */
  async stressTest(maxUsers = 100, endpoint = '/api/dashboard/health', requestsPerUser = 5) {
    console.log(`\n📈 Starting Stress Test: Max ${maxUsers} users\n`);

    const results = [];
    const steps = [10, 25, 50, 75, 100];
    const targetSteps = steps.filter(s => s <= maxUsers);

    for (const userCount of targetSteps) {
      console.log(`\n--- Step: ${userCount} users ---`);

      this.resetMetrics();
      const metrics = await this.simulateConcurrentUsers(userCount, requestsPerUser, endpoint);

      results.push({
        users: userCount,
        ...metrics,
      });

      // Display progress
      this.displayMetrics(metrics);

      // Wait between steps
      await new Promise(resolve => setTimeout(resolve, 2000));
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
    console.log(`\n⏱️  Starting Soak Test: ${userCount} users for ${durationMinutes} minutes\n`);

    this.resetMetrics();
    this.metrics.startTime = Date.now();
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.metrics.startTime) / 1000 / 60);
      console.log(`⏳ Elapsed: ${elapsed} minutes | Requests: ${this.metrics.totalRequests}`);
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
    console.log(`\n🧪 Testing ${endpoints.length} endpoints\n`);

    const results = [];

    for (const endpoint of endpoints) {
      this.resetMetrics();

      console.log(`Testing: ${endpoint.path} (${endpoint.method || 'GET'})`);

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
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE METRICS');
    console.log('='.repeat(60));

    if (data.summary) {
      console.log('\n📈 Summary:');
      console.log(`  ✅ Total Requests: ${data.summary.totalRequests}`);
      console.log(`  ✔️  Successful: ${data.summary.successful}`);
      console.log(`  ❌ Failed: ${data.summary.failed}`);
      console.log(`  📊 Success Rate: ${data.summary.successRate}`);
      console.log(`  ⏱️  Duration: ${data.summary.duration}`);
      console.log(`  🚀 Throughput: ${data.summary.throughput}`);
    }

    if (data.responseTimes) {
      console.log('\n⏰ Response Times (ms):');
      console.log(`  🔹 Min: ${data.responseTimes.min}`);
      console.log(`  🔹 Max: ${data.responseTimes.max}`);
      console.log(`  🔹 Avg: ${data.responseTimes.avg}`);
      console.log(`  🔹 P50: ${data.responseTimes.p50}`);
      console.log(`  🔹 P95: ${data.responseTimes.p95}`);
      console.log(`  🔹 P99: ${data.responseTimes.p99}`);
    }

    if (data.errors && data.errors.length > 0) {
      console.log('\n⚠️  Recent Errors:');
      data.errors.forEach(err => {
        console.log(`  - ${err.endpoint}: ${err.error}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
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
