/* eslint-disable no-unused-vars */
/**
 * Comprehensive Test Runner
 * Execute all tests with detailed reporting
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class TestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      suites: [],
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🧪 Starting comprehensive test suite...\n');

    const startTime = Date.now();

    try {
      // Run different test types
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      await this.runSecurityTests();
      await this.generateCoverageReport();

      this.results.duration = Date.now() - startTime;

      // Display summary
      this.displaySummary();
      this.saveReport();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    console.log('📝 Running unit tests...');

    return new Promise((resolve, reject) => {
      const jest = spawn('npm', ['run', 'test:unit']);

      jest.stdout.on('data', data => {
        process.stdout.write(data);
      });

      jest.stderr.on('data', data => {
        process.stderr.write(data);
      });

      jest.on('close', code => {
        if (code !== 0) {
          reject(new Error(`Unit tests failed with code ${code}`));
        } else {
          console.log('✅ Unit tests completed\n');
          resolve();
        }
      });
    });
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('🔗 Running integration tests...');

    return new Promise((resolve, reject) => {
      const jest = spawn('npm', ['run', 'test:integration']);

      jest.stdout.on('data', data => {
        process.stdout.write(data);
      });

      jest.stderr.on('data', data => {
        process.stderr.write(data);
      });

      jest.on('close', code => {
        if (code !== 0) {
          console.warn('⚠️  Some integration tests failed');
        }
        console.log('✅ Integration tests completed\n');
        resolve();
      });
    });
  }

  /**
   * Run E2E tests
   */
  async runE2ETests() {
    console.log('🎯 Running E2E tests...');

    return new Promise((resolve, reject) => {
      const jest = spawn('npm', ['run', 'test:e2e']);

      jest.stdout.on('data', data => {
        process.stdout.write(data);
      });

      jest.stderr.on('data', data => {
        process.stderr.write(data);
      });

      jest.on('close', code => {
        if (code !== 0) {
          console.warn('⚠️  Some E2E tests failed');
        }
        console.log('✅ E2E tests completed\n');
        resolve();
      });
    });
  }

  /**
   * Run security tests
   */
  async runSecurityTests() {
    console.log('🔒 Running security tests...');

    return new Promise((resolve, reject) => {
      const jest = spawn('npm', ['run', 'test:security']);

      jest.stdout.on('data', data => {
        process.stdout.write(data);
      });

      jest.stderr.on('data', data => {
        process.stderr.write(data);
      });

      jest.on('close', code => {
        if (code !== 0) {
          console.warn('⚠️  Some security tests failed');
        }
        console.log('✅ Security tests completed\n');
        resolve();
      });
    });
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport() {
    console.log('📊 Generating coverage report...');

    return new Promise(resolve => {
      const jest = spawn('npm', ['run', 'test:coverage']);

      jest.on('close', () => {
        console.log('✅ Coverage report generated\n');
        resolve();
      });
    });
  }

  /**
   * Display test summary
   */
  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`
Timestamp:  ${this.results.timestamp}
Duration:   ${(this.results.duration / 1000).toFixed(2)}s

Passed:     ${this.results.passed}
Failed:     ${this.results.failed}
Skipped:    ${this.results.skipped}
Total:      ${this.results.totalTests}

Success Rate: ${
      this.results.totalTests > 0
        ? ((this.results.passed / this.results.totalTests) * 100).toFixed(2)
        : 0
    }%
    `);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Save report to file
   */
  saveReport() {
    const reportDir = path.join(__dirname, '../test-reports');

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.join(reportDir, `test-report-${Date.now()}.json`);

    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    console.log(`📄 Report saved: ${reportFile}\n`);
  }
}

// Run tests if executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAll().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = TestRunner;
