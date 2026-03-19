/**
 * Quality Service - Execute quality checks and parse results
 */

const { exec } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');
const slackService = require('../integrations/slack');

// Broadcast function will be set by websocket module
let broadcastToService = null;

const QUALITY_CLI_PATH = process.env.QUALITY_CLI_PATH || '../../quality';
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

// Service definitions (matches Phase 4A configuration)
const SERVICES = [
  { name: 'backend', path: 'backend', hasTests: true, framework: 'jest' },
  { name: 'graphql', path: 'graphql', hasTests: false, framework: 'jest' },
  { name: 'finance', path: 'finance-module/backend', hasTests: false, framework: 'jest' },
  {
    name: 'supply-chain',
    path: 'supply-chain-management/backend',
    hasTests: true,
    framework: 'jest',
  },
  {
    name: 'frontend',
    path: 'supply-chain-management/frontend',
    hasTests: false,
    framework: 'jest',
  },
  { name: 'intelligent-agent', path: 'intelligent-agent', hasTests: false, framework: 'vitest' },
  { name: 'mobile', path: 'mobile', hasTests: false, framework: 'jest' },
  { name: 'gateway', path: 'gateway', hasTests: false, framework: 'jest' },
  { name: 'whatsapp', path: 'whatsapp', hasTests: false, framework: 'jest' },
];

// Store running jobs
const jobs = new Map();

/**
 * Get status of all services
 */
async function getAllServicesStatus() {
  const statuses = await Promise.all(
    SERVICES.map(async service => {
      const latest = await database.getLatestRun(service.name);

      return {
        name: service.name,
        path: service.path,
        status: latest ? latest.status : 'unknown',
        tests: latest ? latest.tests_passed : null,
        total: latest ? latest.tests_total : null,
        coverage: latest ? latest.coverage : null,
        time: latest ? latest.duration_ms : null,
        lastRun: latest ? latest.timestamp : null,
        hasTests: service.hasTests,
        framework: service.framework,
      };
    })
  );

  return statuses;
}

/**
 * Get detailed information for a service
 */
async function getServiceDetails(serviceName) {
  const service = SERVICES.find(s => s.name === serviceName);
  if (!service) {
    throw new Error(`Service not found: ${serviceName}`);
  }

  const latest = await database.getLatestRun(serviceName);
  const history = await database.getServiceHistory(serviceName, 10);

  return {
    name: service.name,
    path: service.path,
    hasTests: service.hasTests,
    framework: service.framework,
    latest: latest || null,
    history: history || [],
  };
}

/**
 * Run quality check for a service
 */
async function runQualityCheck(serviceName) {
  const service = SERVICES.find(s => s.name === serviceName);
  if (!service) {
    throw new Error(`Service not found: ${serviceName}`);
  }

  const jobId = uuidv4();
  const job = {
    id: jobId,
    service: serviceName,
    status: 'running',
    startTime: Date.now(),
    output: '',
  };

  jobs.set(jobId, job);

  // Run the quality check asynchronously
  runQualityCheckAsync(jobId, service);

  return jobId;
}

/**
 * Run quality check asynchronously
 */
function runQualityCheckAsync(jobId, service) {
  const job = jobs.get(jobId);
  const startTime = Date.now();

  // Broadcast job started
  broadcastToService(service.name, {
    type: 'test_started',
    service: service.name,
    jobId: jobId,
    timestamp: new Date().toISOString(),
  });

  // Execute quality command
  const cmd = `cd "${path.join(WORKSPACE_ROOT, service.path)}" && npm run quality:ci`;

  exec(cmd, { shell: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    const duration = Date.now() - startTime;
    const output = stdout + stderr;

    // Parse test results
    const results = parseTestOutput(output, service.framework);

    // Update job
    job.status = error ? 'failed' : 'passed';
    job.endTime = Date.now();
    job.duration = duration;
    job.output = output;
    job.results = results;
    job.error = error ? 'حدث خطأ داخلي' : null;

    // Save to database
    database.saveTestRun({
      service: service.name,
      status: job.status,
      tests_passed: results.passed,
      tests_failed: results.failed,
      tests_total: results.total,
      coverage: results.coverage,
      duration_ms: duration,
      output: output,
      error: job.error,
    });

    // Broadcast completion
    broadcastToService(service.name, {
      type: 'test_complete',
      service: service.name,
      jobId: jobId,
      status: job.status,
      results: results,
      duration: duration,
      timestamp: new Date().toISOString(),
    });

    // Send Slack notification
    if (job.status === 'failed') {
      slackService.notifyTestFailure(service.name, {
        status: 'Failed',
        totalTests: results.total,
        failedTests: results.failed,
        error: job.error || `${results.failed} test(s) failed`,
        dashboardUrl: process.env.DASHBOARD_PUBLIC_URL || 'http://localhost:3002',
      });
    } else if (job.status === 'passed' && results.total > 0) {
      slackService.notifyTestSuccess(service.name, {
        totalTests: results.total,
        duration: (duration / 1000).toFixed(2),
      });
    }

    // Remove job after 5 minutes
    setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
  });
}

/**
 * Parse test output based on framework
 */
function parseTestOutput(output, framework) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    coverage: null,
  };

  if (framework === 'jest') {
    // Parse Jest output
    const testMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      results.passed = parseInt(testMatch[1]);
      results.total = parseInt(testMatch[2]);
      results.failed = results.total - results.passed;
    }

    // Parse coverage
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      results.coverage = parseFloat(coverageMatch[1]);
    }
  } else if (framework === 'vitest') {
    // Parse Vitest output
    const testMatch = output.match(/Test Files\s+(\d+)\s+passed/);
    if (testMatch) {
      results.passed = parseInt(testMatch[1]);
      results.total = results.passed; // Approximate
    }
  }

  return results;
}

/**
 * Get job status
 */
function getJobStatus(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Calculate system health
 */
function calculateSystemHealth(services) {
  const withTests = services.filter(s => s.hasTests);
  const passing = withTests.filter(s => s.status === 'pass');

  if (withTests.length === 0) return 'unknown';
  if (passing.length === withTests.length) return 'healthy';
  if (passing.length >= withTests.length * 0.8) return 'warning';
  return 'critical';
}

/**
 * Generate and send daily summary to Slack
 */
async function sendDailySummary() {
  try {
    // Get all services status
    const services = await getAllServicesStatus();

    // Calculate summary
    const totalServices = services.length;
    const passedServices = services.filter(s => s.status === 'pass').length;
    const failedServices = services.filter(s => s.status === 'fail').length;

    let totalTests = 0;
    let passedTests = 0;

    const servicesData = services.map(s => {
      if (s.results) {
        totalTests += s.results.total || 0;
        passedTests += s.results.passed || 0;
      }

      return {
        name: s.name,
        status: s.status === 'pass' ? 'passed' : 'failed',
        passed: s.results?.passed || 0,
        total: s.results?.total || 0,
      };
    });

    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;

    // Get yesterday's data for trend
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayData = await database.getAllTrendData();

    let trend = 'stable';
    let trendText = 'Stable';

    if (yesterdayData && yesterdayData.length > 0) {
      const lastSuccess = yesterdayData[yesterdayData.length - 1]?.success_rate || 0;
      if (successRate > lastSuccess + 5) {
        trend = 'up';
        trendText = 'Improving';
      } else if (successRate < lastSuccess - 5) {
        trend = 'down';
        trendText = 'Declining';
      }
    }

    // Send to Slack
    await slackService.sendDailySummary({
      totalTests,
      passedTests: passedTests,
      successRate,
      totalServices,
      failedServices,
      services: servicesData,
      trend,
      trendText,
      dashboardUrl: process.env.DASHBOARD_PUBLIC_URL || 'http://localhost:3002',
    });

    console.log('✅ Daily summary sent to Slack');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send daily summary:', error);
    return { success: false, error: 'حدث خطأ داخلي' };
  }
}

module.exports = {
  getAllServicesStatus,
  getServiceDetails,
  runQualityCheck,
  getJobStatus,
  calculateSystemHealth,
  sendDailySummary,
  setBroadcastFunction: fn => (broadcastToService = fn),
  SERVICES,
};
