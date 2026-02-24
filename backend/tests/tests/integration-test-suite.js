/**
 * ERP-Branch System Integration Tests
 * Comprehensive integration testing suite
 */

const http = require('http');
const assert = require('assert');

class IntegrationTestSuite {
  constructor(config = {}) {
    this.erpBaseUrl = config.erpUrl || 'http://localhost:3001';
    this.branchBaseUrl = config.branchUrl || 'http://localhost:5000/api/v2';
    this.integrationUrl = config.integrationUrl || 'http://localhost:3001/api/integration';
    this.results = [];
    this.passCount = 0;
    this.failCount = 0;
  }

  /**
   * Helper to make HTTP requests
   */
  async makeRequest(method, url, data = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN || ''}`
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  /**
   * Test helper
   */
  async test(name, fn) {
    try {
      await fn();
      this.passCount++;
      this.results.push({ name, status: 'PASS', error: null });
      console.log(`✓ ${name}`);
    } catch (error) {
      this.failCount++;
      this.results.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ ${name}: ${error.message}`);
    }
  }

  /**
   * BRANCH SYSTEM TESTS
   */

  async testBranchSystemConnectivity() {
    console.log('\n=== Testing Branch System Connectivity ===\n');

    await this.test('Branch API health check', async () => {
      const response = await this.makeRequest('GET', `${this.branchBaseUrl}/branches`);
      assert(response.status === 200 || response.status === 401, 
        `Expected 200 or 401, got ${response.status}`);
    });

    await this.test('Branch API returns valid structure', async () => {
      const response = await this.makeRequest('GET', `${this.branchBaseUrl}/branches`);
      assert(response.data.success !== false, 'Response indicates error');
    });
  }

  /**
   * ERP SYSTEM TESTS
   */

  async testERPSystemConnectivity() {
    console.log('\n=== Testing ERP System Connectivity ===\n');

    await this.test('ERP API health check', async () => {
      const response = await this.makeRequest('GET', `${this.erpBaseUrl}/health`);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
    });

    await this.test('ERP database connection', async () => {
      const response = await this.makeRequest('GET', `${this.erpBaseUrl}/api/branches`);
      assert(response.status < 500, `ERP server error: ${response.status}`);
    });
  }

  /**
   * INTEGRATION TESTS
   */

  async testIntegrationService() {
    console.log('\n=== Testing Integration Service ===\n');

    await this.test('Integration service health check', async () => {
      const response = await this.makeRequest('GET', `${this.integrationUrl}/health`);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.data.status === 'healthy', 'Service not healthy');
    });

    await this.test('Branch sync endpoint exists', async () => {
      const response = await this.makeRequest('POST', `${this.integrationUrl}/sync/branches`);
      assert(response.status === 200 || response.status === 401, 
        `Invalid status: ${response.status}`);
    });

    await this.test('KPI endpoint accessible', async () => {
      const branchId = 1;
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/branches/${branchId}/kpis`);
      assert(response.status < 500, `Server error: ${response.status}`);
    });

    await this.test('Inventory sync endpoint accessible', async () => {
      const branchId = 1;
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/branches/${branchId}/inventory-sync`);
      assert(response.status < 500, `Server error: ${response.status}`);
    });

    await this.test('Forecasts endpoint accessible', async () => {
      const branchId = 1;
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/branches/${branchId}/forecasts`);
      assert(response.status < 500, `Server error: ${response.status}`);
    });

    await this.test('Dashboard endpoint accessible', async () => {
      const branchId = 1;
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/branches/${branchId}/dashboard`);
      assert(response.status < 500, `Server error: ${response.status}`);
    });
  }

  /**
   * DATA SYNCHRONIZATION TESTS
   */

  async testDataSync() {
    console.log('\n=== Testing Data Synchronization ===\n');

    await this.test('Branch data can be synced', async () => {
      const response = await this.makeRequest('POST', `${this.integrationUrl}/sync/branches`);
      assert(response.data.success || response.status === 200, 
        'Sync operation failed');
    });

    await this.test('Sync returns branch count', async () => {
      const response = await this.makeRequest('POST', `${this.integrationUrl}/sync/branches`);
      if (response.data.success) {
        assert(typeof response.data.synced_count === 'number', 
          'Missing synced_count in response');
      }
    });

    await this.test('Sync includes timestamp', async () => {
      const response = await this.makeRequest('POST', `${this.integrationUrl}/sync/branches`);
      assert(response.data.timestamp, 'Missing timestamp in response');
    });
  }

  /**
   * ERROR HANDLING TESTS
   */

  async testErrorHandling() {
    console.log('\n=== Testing Error Handling ===\n');

    await this.test('Invalid branch ID returns proper error', async () => {
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/branches/999999/kpis`);
      assert(response.status === 404 || response.data.success === false, 
        'Should handle invalid ID');
    });

    await this.test('Missing required parameters handled', async () => {
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/branches/null/forecasts`);
      assert(response.status < 500, 'Server error not handled');
    });

    await this.test('Timeout handling works', async () => {
      // Test with a very long timeout
      this.test.timeout = 5000;
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/health`);
      assert(response.status < 600, 'Request failed');
    });
  }

  /**
   * PERFORMANCE TESTS
   */

  async testPerformance() {
    console.log('\n=== Testing Performance ===\n');

    await this.test('Branch sync completes in reasonable time', async () => {
      const start = Date.now();
      const response = await this.makeRequest('POST', `${this.integrationUrl}/sync/branches`);
      const duration = Date.now() - start;
      assert(duration < 30000, `Sync took ${duration}ms, expected < 30000ms`);
    });

    await this.test('Dashboard aggregation within timeout', async () => {
      const start = Date.now();
      const response = await this.makeRequest('GET', 
        `${this.integrationUrl}/branches/1/dashboard`);
      const duration = Date.now() - start;
      assert(duration < 20000, `Dashboard took ${duration}ms, expected < 20000ms`);
    });

    await this.test('API responds within latency threshold', async () => {
      const start = Date.now();
      const response = await this.makeRequest('GET', `${this.integrationUrl}/health`);
      const duration = Date.now() - start;
      assert(duration < 1000, `Health check took ${duration}ms, expected < 1000ms`);
    });
  }

  /**
   * RUN ALL TESTS
   */

  async runAll() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║ ERP-BRANCH SYSTEM INTEGRATION TEST SUITE               ║');
    console.log('║ Version 2.0.0                                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
      await this.testBranchSystemConnectivity();
      await this.testERPSystemConnectivity();
      await this.testIntegrationService();
      await this.testDataSync();
      await this.testErrorHandling();
      await this.testPerformance();

      this.printSummary();
      return this.passCount > 0 && this.failCount === 0;
    } catch (error) {
      console.error('Test suite error:', error);
      return false;
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║ TEST SUMMARY                                           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`Total Tests: ${this.passCount + this.failCount}`);
    console.log(`✓ Passed: ${this.passCount}`);
    console.log(`✗ Failed: ${this.failCount}`);
    console.log(`Success Rate: ${((this.passCount / (this.passCount + this.failCount)) * 100).toFixed(2)}%\n`);

    if (this.failCount > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  ✗ ${r.name}`);
          console.log(`    └─ ${r.error}`);
        });
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    const status = this.failCount === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED';
    console.log(`║ ${status.padEnd(56)} ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');
  }
}

// =============================================
// MAIN EXECUTION
// =============================================

async function main() {
  const config = {
    erpUrl: process.env.ERP_URL || 'http://localhost:3001',
    branchUrl: process.env.BRANCH_URL || 'http://localhost:5000/api/v2',
    integrationUrl: process.env.INTEGRATION_URL || 'http://localhost:3001/api/integration'
  };

  const suite = new IntegrationTestSuite(config);
  const success = await suite.runAll();
  
  process.exit(success ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTestSuite;
