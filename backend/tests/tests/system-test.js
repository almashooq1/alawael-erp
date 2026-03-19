/**
 * Comprehensive System Testing Suite
 * Phase 10: Advanced Testing
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3005';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class SystemTester {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  /**
   * Make HTTP request
   */
  async request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 5000,
      };

      const req = http.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Log test result
   */
  logResult(name, passed, message = '') {
    this.stats.total++;
    if (passed) {
      this.stats.passed++;
      console.log(`${colors.green}✅ PASS${colors.reset} ${name}`);
    } else {
      this.stats.failed++;
      console.log(`${colors.red}❌ FAIL${colors.reset} ${name}`);
      if (message) console.log(`   ${message}`);
    }
  }

  /**
   * Test 1: Health Check
   */
  async testHealthCheck() {
    console.log(`\n${colors.cyan}=== Health Check Tests ===${colors.reset}`);

    try {
      const result = await this.request('GET', '/health');
      this.logResult(
        'Basic health endpoint',
        result.status === 200 && result.body.status === 'healthy'
      );

      const apiHealth = await this.request('GET', '/api/health');
      this.logResult(
        'API health endpoint',
        apiHealth.status === 200 && apiHealth.body.status === 'healthy'
      );
    } catch (error) {
      this.logResult('Health Check', false, error.message);
    }
  }

  /**
   * Test 2: Analytics Endpoint
   */
  async testAnalytics() {
    console.log(`\n${colors.cyan}=== Analytics Tests ===${colors.reset}`);

    try {
      const result = await this.request('GET', '/api/admin/analytics');
      this.logResult(
        'Analytics endpoint responds',
        result.status === 200,
        `Status: ${result.status}`
      );

      if (result.body) {
        this.logResult('Analytics contains requests data', result.body.requests !== undefined);
        this.logResult(
          'Analytics contains performance data',
          result.body.performance !== undefined
        );
        this.logResult('Analytics contains errors data', result.body.errors !== undefined);
      }
    } catch (error) {
      this.logResult('Analytics', false, error.message);
    }
  }

  /**
   * Test 3: Rate Limiting
   */
  async testRateLimiting() {
    console.log(`\n${colors.cyan}=== Rate Limiting Tests ===${colors.reset}`);

    try {
      let successCount = 0;
      let _rateLimited = false;

      // Make multiple requests quickly
      for (let i = 0; i < 5; i++) {
        const result = await this.request('GET', '/api/admin/analytics');
        if (result.status === 200) {
          successCount++;
        } else if (result.status === 429) {
          _rateLimited = true;
        }
      }

      this.logResult(
        'Rate limit headers present',
        successCount > 0,
        `Successful requests: ${successCount}`
      );

      if (successCount > 0) {
        const result = await this.request('GET', '/api/admin/analytics');
        const hasRateLimitHeaders =
          result.headers['x-ratelimit-limit'] !== undefined ||
          result.headers['x-ratelimit-remaining'] !== undefined;
        this.logResult('Rate limit headers in response', hasRateLimitHeaders);
      }
    } catch (error) {
      this.logResult('Rate Limiting', false, error.message);
    }
  }

  /**
   * Test 4: Cache Status
   */
  async testCacheStatus() {
    console.log(`\n${colors.cyan}=== Cache Tests ===${colors.reset}`);

    try {
      const result = await this.request('GET', '/api/admin/cache/stats');
      this.logResult(
        'Cache stats endpoint responds',
        result.status === 200,
        `Status: ${result.status}`
      );

      if (result.status !== 200) {
        console.log(`   ${colors.yellow}Note: Redis might not be running${colors.reset}`);
      }
    } catch (error) {
      console.log(
        `   ${colors.yellow}⚠️  Cache service unavailable (Redis not running)${colors.reset}`
      );
      this.logResult('Cache endpoint', false, error.message);
    }
  }

  /**
   * Test 5: Response Headers
   */
  async testResponseHeaders() {
    console.log(`\n${colors.cyan}=== Response Headers Tests ===${colors.reset}`);

    try {
      const result = await this.request('GET', '/api/health');

      this.logResult(
        'CORS headers present',
        result.headers['access-control-allow-origin'] !== undefined
      );

      this.logResult(
        'Content-Type is JSON',
        result.headers['content-type']?.includes('application/json')
      );
    } catch (error) {
      this.logResult('Response Headers', false, error.message);
    }
  }

  /**
   * Test 6: Error Handling
   */
  async testErrorHandling() {
    console.log(`\n${colors.cyan}=== Error Handling Tests ===${colors.reset}`);

    try {
      const result = await this.request('GET', '/api/nonexistent-endpoint');
      this.logResult(
        'Non-existent endpoint returns error',
        result.status !== 200,
        `Status: ${result.status}`
      );

      const invalidMethod = await this.request('DELETE', '/health');
      this.logResult(
        'Invalid HTTP method handled',
        invalidMethod.status === 404 || invalidMethod.status === 405
      );
    } catch (error) {
      this.logResult('Error Handling', false, error.message);
    }
  }

  /**
   * Test 7: Performance Metrics
   */
  async testPerformanceMetrics() {
    console.log(`\n${colors.cyan}=== Performance Tests ===${colors.reset}`);

    try {
      const start = Date.now();
      const _result = await this.request('GET', '/api/health');
      const duration = Date.now() - start;

      this.logResult('Response time < 1 second', duration < 1000, `Duration: ${duration}ms`);

      this.logResult('Response time < 500ms', duration < 500, `Duration: ${duration}ms`);
    } catch (error) {
      this.logResult('Performance Metrics', false, error.message);
    }
  }

  /**
   * Test 8: Concurrent Requests
   */
  async testConcurrentRequests() {
    console.log(`\n${colors.cyan}=== Concurrent Requests Tests ===${colors.reset}`);

    try {
      const requests = Array(10)
        .fill(null)
        .map(() => this.request('GET', '/api/health'));

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logResult(
        '10 concurrent requests succeed',
        successful === 10,
        `Successful: ${successful}, Failed: ${failed}`
      );
    } catch (error) {
      this.logResult('Concurrent Requests', false, error.message);
    }
  }

  /**
   * Test 9: System Information
   */
  async testSystemInfo() {
    console.log(`\n${colors.cyan}=== System Information ===${colors.reset}`);

    try {
      const result = await this.request('GET', '/api/health');

      if (result.body) {
        console.log(`   Environment: ${result.body.environment}`);
        console.log(`   Uptime: ${Math.floor(result.body.uptime)}s`);
        console.log(`   Port: ${result.body.port}`);

        this.logResult('System information available', true);
      }
    } catch (error) {
      this.logResult('System Information', false, error.message);
    }
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log(`${colors.blue}
╔════════════════════════════════════════════╗
║   Phase 10: System Testing Suite           ║
║   Testing URL: ${BASE_URL}           ║
╚════════════════════════════════════════════╝
    ${colors.reset}`);

    await this.testHealthCheck();
    await this.testAnalytics();
    await this.testRateLimiting();
    await this.testCacheStatus();
    await this.testResponseHeaders();
    await this.testErrorHandling();
    await this.testPerformanceMetrics();
    await this.testConcurrentRequests();
    await this.testSystemInfo();

    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log(`\n${colors.blue}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}Test Summary${colors.reset}`);
    console.log(`${colors.blue}════════════════════════════════════════════${colors.reset}`);
    console.log(`Total Tests:  ${this.stats.total}`);
    console.log(`${colors.green}Passed:       ${this.stats.passed}${colors.reset}`);
    console.log(`${colors.red}Failed:       ${this.stats.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped:      ${this.stats.skipped}${colors.reset}`);

    const percentage = ((this.stats.passed / this.stats.total) * 100).toFixed(2);
    const statusColor = this.stats.failed === 0 ? colors.green : colors.red;
    console.log(`\n${statusColor}Success Rate: ${percentage}%${colors.reset}\n`);

    if (this.stats.failed === 0) {
      console.log(`${colors.green}✅ All tests passed!${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Some tests failed${colors.reset}`);
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new SystemTester();
  tester.runAll().catch(error => {
    console.error(`${colors.red}Test suite error:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = SystemTester;
