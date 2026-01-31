#!/usr/bin/env node

/**
 * Health Check & Diagnostics Utility
 * أداة فحص الصحة والتشخيص
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');
const os = require('os');

/**
 * Health Check Interface
 */
class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.results = new Map();
  }

  /**
   * Register a health check
   */
  register(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      timeout: options.timeout || 5000,
    });
  }

  /**
   * Run all health checks
   */
  async runAll() {
    console.log('\n🏥 Health Check Report\n');
    console.log('═'.repeat(60));
    console.log('Timestamp:', new Date().toISOString());
    console.log('═'.repeat(60));
    console.log('');

    const startTime = Date.now();
    let allHealthy = true;
    let criticalHealthy = true;

    for (const [name, check] of this.checks) {
      try {
        const checkStart = Date.now();
        const result = await this.runWithTimeout(check.fn(), check.timeout);
        const duration = Date.now() - checkStart;

        this.results.set(name, {
          status: result.status,
          duration,
          message: result.message,
          details: result.details,
        });

        const statusIcon = result.status === 'UP' ? '✅' : '⚠️ ';
        const criticalLabel = check.critical ? ' [CRITICAL]' : '';

        console.log(`${statusIcon} ${name}${criticalLabel}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Time: ${duration}ms`);
        if (result.message) console.log(`   Message: ${result.message}`);
        if (result.details) {
          Object.entries(result.details).forEach(([key, value]) => {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          });
        }
        console.log('');

        if (result.status !== 'UP') {
          allHealthy = false;
          if (check.critical) {
            criticalHealthy = false;
          }
        }
      } catch (error) {
        console.log(`❌ ${name} [CRITICAL]`);
        console.log(`   Status: ERROR`);
        console.log(`   Error: ${error.message}`);
        console.log('');

        this.results.set(name, {
          status: 'DOWN',
          error: error.message,
        });

        allHealthy = false;
        if (check.critical) {
          criticalHealthy = false;
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    console.log('═'.repeat(60));
    console.log('Summary:');
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log(`  Overall Status: ${allHealthy ? '✅ HEALTHY' : '⚠️  DEGRADED'}`);
    console.log(`  Critical Services: ${criticalHealthy ? '✅ UP' : '❌ DOWN'}`);
    console.log(`  Checks Passed: ${this.results.size}/${this.checks.size}`);
    console.log('═'.repeat(60));
    console.log('');

    return {
      healthy: allHealthy,
      criticalHealthy,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      checks: Object.fromEntries(this.results),
    };
  }

  /**
   * Run check with timeout
   */
  async runWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Check timeout')), timeout)
      ),
    ]);
  }
}

/**
 * System Health Checks
 */
const checker = new HealthChecker();

// 1. System Resources
checker.register(
  'System Resources',
  async () => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(2);

    const cpus = os.cpus();
    const loadAverage = os.loadavg();
    const loadPercent = ((loadAverage[0] / cpus.length) * 100).toFixed(2);

    const status =
      memoryPercent < 90 && loadPercent < 90 ? 'UP' : 'DEGRADED';

    return {
      status,
      message: `Memory: ${memoryPercent}% | Load: ${loadPercent}%`,
      details: {
        memory: {
          total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          percent: memoryPercent + '%',
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          load1m: loadAverage[0].toFixed(2),
          load5m: loadAverage[1].toFixed(2),
          load15m: loadAverage[2].toFixed(2),
          loadPercent: loadPercent + '%',
        },
      },
    };
  },
  { critical: true }
);

// 2. Node.js Process
checker.register(
  'Node.js Process',
  async () => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    return {
      status: 'UP',
      message: `Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      details: {
        uptime: `${uptime.toFixed(2)}s`,
        memory: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        },
        pid: process.pid,
        version: process.version,
      },
    };
  },
  { critical: true }
);

// 3. Disk Space
checker.register(
  'Disk Space',
  async () => {
    // Note: In real implementation, use 'diskusage' npm package
    // For now, we'll use os.tmpdir() as approximation
    const tmpDir = os.tmpdir();

    return {
      status: 'UP',
      message: `Temp directory: ${tmpDir}`,
      details: {
        tmpdir: tmpDir,
        note: 'Full disk monitoring requires diskusage package',
      },
    };
  },
  { critical: false }
);

// 4. Environment Variables
checker.register(
  'Environment Configuration',
  async () => {
    const required = ['NODE_ENV', 'MONGODB_URI', 'REDIS_URL'];
    const missing = required.filter(v => !process.env[v]);

    const status = missing.length === 0 ? 'UP' : 'DEGRADED';

    return {
      status,
      message: `${required.length - missing.length}/${required.length} required vars set`,
      details: {
        environment: process.env.NODE_ENV || 'not-set',
        mongodbUri: process.env.MONGODB_URI ? '✓' : '✗',
        redisUrl: process.env.REDIS_URL ? '✓' : '✗',
        missingVars: missing.length > 0 ? missing : 'None',
      },
    };
  },
  { critical: false }
);

// 5. Dependencies
checker.register(
  'Dependencies',
  async () => {
    try {
      // Try to load critical modules
      const modules = ['express', 'mongoose', 'redis'];
      const unavailable = [];

      for (const mod of modules) {
        try {
          require.resolve(mod);
        } catch (e) {
          unavailable.push(mod);
        }
      }

      const status = unavailable.length === 0 ? 'UP' : 'DEGRADED';

      return {
        status,
        message: `${modules.length - unavailable.length}/${modules.length} critical modules loaded`,
        details: {
          checked: modules,
          unavailable: unavailable.length > 0 ? unavailable : 'None',
        },
      };
    } catch (error) {
      return {
        status: 'DOWN',
        message: error.message,
      };
    }
  },
  { critical: false }
);

/**
 * Run diagnostics
 */
async function runDiagnostics() {
  const result = await checker.runAll();

  // Exit with appropriate code
  process.exit(result.criticalHealthy ? 0 : 1);
}

// CLI interface
const args = process.argv.slice(2);

if (args[0] === '--json') {
  checker.runAll().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.criticalHealthy ? 0 : 1);
  });
} else {
  runDiagnostics().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { HealthChecker, checker };
