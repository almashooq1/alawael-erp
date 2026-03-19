#!/usr/bin/env node

/**
 * CI/CD Quality Check Script
 * Analyzes test results and enforces quality gates
 */

const fs = require('fs');
const path = require('path');

// Load quality rules
const rulesPath = path.join(__dirname, '../.github/quality-rules.json');
let rules = {
  minTestCoverage: 70,
  minSuccessRate: 80,
  criticalServices: ['backend', 'graphql', 'supply-chain', 'frontend'],
  allowedFailures: 2,
};

if (fs.existsSync(rulesPath)) {
  try {
    rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    console.log('📋 Loaded quality rules from quality-rules.json');
  } catch (error) {
    console.warn('⚠️  Failed to load quality rules, using defaults');
  }
}

// Service configuration
const SERVICES = [
  'backend',
  'graphql',
  'finance',
  'supply-chain',
  'frontend',
  'intelligent-agent',
  'mobile',
  'gateway',
  'whatsapp',
];

/**
 * Analyze test artifacts directory
 */
function analyzeTestArtifacts() {
  const artifactsDir = path.join(process.cwd(), 'test-artifacts');

  if (!fs.existsSync(artifactsDir)) {
    console.log('📁 No test artifacts directory found');
    return null;
  }

  const results = {
    services: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalCoverage: 0,
      serviceCount: 0,
    },
  };

  SERVICES.forEach(service => {
    const serviceDir = path.join(artifactsDir, `test-results-${service}`);

    if (fs.existsSync(serviceDir)) {
      const serviceResult = analyzeServiceResults(service, serviceDir);
      if (serviceResult) {
        results.services.push(serviceResult);
        results.summary.totalTests += serviceResult.tests;
        results.summary.passedTests += serviceResult.passed;
        results.summary.failedTests += serviceResult.failed;
        results.summary.totalCoverage += serviceResult.coverage;
        results.summary.serviceCount++;
      }
    }
  });

  // Calculate average coverage
  if (results.summary.serviceCount > 0) {
    results.summary.avgCoverage = (
      results.summary.totalCoverage / results.summary.serviceCount
    ).toFixed(2);
  } else {
    results.summary.avgCoverage = 0;
  }

  // Calculate success rate
  if (results.summary.totalTests > 0) {
    results.summary.successRate = (
      (results.summary.passedTests / results.summary.totalTests) *
      100
    ).toFixed(2);
  } else {
    results.summary.successRate = 0;
  }

  return results;
}

/**
 * Analyze individual service test results
 */
function analyzeServiceResults(service, serviceDir) {
  const result = {
    service,
    tests: 0,
    passed: 0,
    failed: 0,
    coverage: 0,
    status: 'unknown',
  };

  // Look for coverage summary
  const coverageSummaryPath = path.join(serviceDir, 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coverageSummaryPath)) {
    try {
      const coverageData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
      const total = coverageData.total;
      if (total) {
        result.coverage = parseFloat(total.lines?.pct || 0);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to parse coverage for ${service}`);
    }
  }

  // Look for test results (Jest format)
  const testResultsPath = path.join(serviceDir, 'test-results.json');
  if (fs.existsSync(testResultsPath)) {
    try {
      const testData = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
      result.tests = testData.numTotalTests || 0;
      result.passed = testData.numPassedTests || 0;
      result.failed = testData.numFailedTests || 0;
    } catch (error) {
      console.warn(`⚠️  Failed to parse test results for ${service}`);
    }
  }

  // Determine status
  if (result.tests > 0) {
    result.status = result.failed === 0 ? 'passed' : 'failed';
  }

  return result.tests > 0 ? result : null;
}

/**
 * Enforce quality gates based on rules
 */
function enforceQualityGates(results) {
  const gates = [];
  let passed = true;

  // Gate 1: Minimum test coverage
  if (results.summary.avgCoverage < rules.minTestCoverage) {
    gates.push({
      name: 'Test Coverage',
      status: 'failed',
      message: `Coverage ${results.summary.avgCoverage}% is below minimum ${rules.minTestCoverage}%`,
      severity: 'error',
    });
    passed = false;
  } else {
    gates.push({
      name: 'Test Coverage',
      status: 'passed',
      message: `Coverage ${results.summary.avgCoverage}% meets minimum ${rules.minTestCoverage}%`,
      severity: 'success',
    });
  }

  // Gate 2: Minimum success rate
  if (results.summary.successRate < rules.minSuccessRate) {
    gates.push({
      name: 'Success Rate',
      status: 'failed',
      message: `Success rate ${results.summary.successRate}% is below minimum ${rules.minSuccessRate}%`,
      severity: 'error',
    });
    passed = false;
  } else {
    gates.push({
      name: 'Success Rate',
      status: 'passed',
      message: `Success rate ${results.summary.successRate}% meets minimum ${rules.minSuccessRate}%`,
      severity: 'success',
    });
  }

  // Gate 3: Critical services must pass
  const failedCritical = results.services.filter(
    s => rules.criticalServices.includes(s.service) && s.status === 'failed'
  );

  if (failedCritical.length > 0) {
    gates.push({
      name: 'Critical Services',
      status: 'failed',
      message: `Critical service(s) failed: ${failedCritical.map(s => s.service).join(', ')}`,
      severity: 'error',
    });
    passed = false;
  } else {
    gates.push({
      name: 'Critical Services',
      status: 'passed',
      message: 'All critical services passed',
      severity: 'success',
    });
  }

  // Gate 4: Maximum allowed failures
  const failedCount = results.services.filter(s => s.status === 'failed').length;
  if (failedCount > rules.allowedFailures) {
    gates.push({
      name: 'Failure Threshold',
      status: 'failed',
      message: `${failedCount} services failed, maximum allowed is ${rules.allowedFailures}`,
      severity: 'error',
    });
    passed = false;
  } else {
    gates.push({
      name: 'Failure Threshold',
      status: 'passed',
      message: `${failedCount} failed services within allowed limit of ${rules.allowedFailures}`,
      severity: 'success',
    });
  }

  return { gates, passed };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(results, gateResults) {
  let report = '';

  // Summary section
  report += `## 📊 Test Results Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Tests | ${results.summary.totalTests} |\n`;
  report += `| Passed Tests | ${results.summary.passedTests} ✅ |\n`;
  report += `| Failed Tests | ${results.summary.failedTests} ❌ |\n`;
  report += `| Success Rate | ${results.summary.successRate}% |\n`;
  report += `| Avg Coverage | ${results.summary.avgCoverage}% |\n`;
  report += `| Services Tested | ${results.summary.serviceCount} |\n\n`;

  // Quality gates section
  report += `## 🚦 Quality Gates\n\n`;
  gateResults.gates.forEach(gate => {
    const icon = gate.status === 'passed' ? '✅' : '❌';
    report += `${icon} **${gate.name}**: ${gate.message}\n\n`;
  });

  // Services details section
  report += `## 📦 Services Details\n\n`;
  report += `| Service | Tests | Passed | Failed | Coverage | Status |\n`;
  report += `|---------|-------|--------|--------|----------|--------|\n`;

  results.services.forEach(service => {
    const statusIcon =
      service.status === 'passed' ? '✅' : service.status === 'failed' ? '❌' : '⚠️';
    report += `| ${service.service} | ${service.tests} | ${service.passed} | ${service.failed} | ${service.coverage}% | ${statusIcon} |\n`;
  });

  report += `\n---\n\n`;
  report += `**Overall Result**: ${gateResults.passed ? '✅ PASSED' : '❌ FAILED'}\n`;

  return report;
}

/**
 * Send results to dashboard
 */
async function sendToDashboard(results) {
  const dashboardUrl = process.env.DASHBOARD_URL;

  if (!dashboardUrl) {
    console.log('ℹ️  No DASHBOARD_URL configured, skipping dashboard update');
    return;
  }

  try {
    // This would typically use axios or fetch
    console.log(`📤 Would send results to dashboard at ${dashboardUrl}`);
    console.log('   (Install axios for actual implementation)');
  } catch (error) {
    console.error('❌ Failed to send results to dashboard:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting CI/CD Quality Check\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Analyze test results
  console.log('📊 Analyzing test artifacts...\n');
  const results = analyzeTestArtifacts();

  if (!results || results.summary.serviceCount === 0) {
    console.warn('⚠️  No test results found!');

    // Create minimal report
    const minimalResult = {
      passed: false,
      gates: [{ name: 'Tests Found', status: 'failed', message: 'No test results found' }],
    };

    fs.writeFileSync('quality-gate-result.json', JSON.stringify(minimalResult, null, 2));
    fs.writeFileSync('quality-report.md', '## ⚠️ No Test Results Found');

    process.exit(1);
  }

  console.log(`✅ Found results for ${results.summary.serviceCount} services\n`);

  // Enforce quality gates
  console.log('🚦 Enforcing quality gates...\n');
  const gateResults = enforceQualityGates(results);

  // Display results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  gateResults.gates.forEach(gate => {
    const icon = gate.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${gate.name}: ${gate.message}`);
  });
  console.log('');

  // Generate report
  const report = generateMarkdownReport(results, gateResults);
  fs.writeFileSync('quality-report.md', report);
  console.log('📝 Quality report saved to quality-report.md\n');

  // Save gate result
  const gateResult = {
    passed: gateResults.passed,
    timestamp: new Date().toISOString(),
    summary: results.summary,
    gates: gateResults.gates,
  };
  fs.writeFileSync('quality-gate-result.json', JSON.stringify(gateResult, null, 2));

  // Send to dashboard
  await sendToDashboard(results);

  // Exit with appropriate code
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  if (gateResults.passed) {
    console.log('✅ Quality Gate PASSED\n');
    process.exit(0);
  } else {
    console.log('❌ Quality Gate FAILED\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeTestArtifacts, enforceQualityGates, generateMarkdownReport };
