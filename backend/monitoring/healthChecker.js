/**
 * 🏥 System Health Visualization
 *
 * Visual health status and monitoring
 * - Health check system
 * - Status page generation
 * - Component health tracking
 * - Visual indicators and alerts
 */

class HealthChecker {
  constructor(options = {}) {
    this.checks = new Map();
    this.checkResults = [];
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.maxResults = options.maxResults || 1000;
    this.thresholds = options.thresholds || {
      memoryWarning: 70,
      memoryCritical: 90,
      cpuWarning: 60,
      cpuCritical: 85,
      responseTimeWarning: 1000,
      responseTimeCritical: 5000,
    };
    this.autoStart = options.autoStart !== false;
    this.isRunning = false;
    this.checkingInterval = null;

    if (this.autoStart) {
      this.start();
    }
  }

  /**
   * Register health check
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      name,
      checkFn,
      critical: options.critical !== false,
      timeout: options.timeout || 5000,
      lastResult: null,
      lastCheck: null,
    });
  }

  /**
   * Unregister health check
   */
  unregisterCheck(name) {
    this.checks.delete(name);
  }

  /**
   * Run single health check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) return null;

    const startTime = Date.now();
    let result = {
      name,
      status: 'unknown',
      message: '',
      duration: 0,
      timestamp: Date.now(),
    };

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Check timeout')), check.timeout)
      );

      const checkPromise = Promise.resolve(check.checkFn());
      const checkResult = await Promise.race([checkPromise, timeoutPromise]);

      result.duration = Date.now() - startTime;
      result.status = checkResult.status || 'healthy';
      result.message = checkResult.message || '';
      result.data = checkResult.data || {};

      // Evaluate severity
      if (result.status === 'critical' && check.critical) {
        result.severity = 'critical';
      } else if (result.status === 'warning') {
        result.severity = 'warning';
      } else {
        result.severity = 'info';
      }
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.status = 'unhealthy';
      result.message = error.message;
      result.severity = check.critical ? 'critical' : 'warning';
    }

    check.lastResult = result;
    check.lastCheck = Date.now();

    return result;
  }

  /**
   * Run all checks
   */
  async runAllChecks() {
    const results = [];

    for (const [name] of this.checks) {
      try {
        const result = await this.runCheck(name);
        if (result) results.push(result);
      } catch (error) {
        console.error(`[HealthChecker] Error running check ${name}:`, error);
      }
    }

    const summary = {
      timestamp: Date.now(),
      totalChecks: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      warning: results.filter(r => r.status === 'warning').length,
      critical: results.filter(r => r.status === 'critical').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      results,
    };

    this.checkResults.push(summary);
    if (this.checkResults.length > this.maxResults) {
      this.checkResults.shift();
    }

    return summary;
  }

  /**
   * Start periodic checks
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run immediately
    this.runAllChecks();

    // Then run at interval
    this.checkingInterval = setInterval(() => {
      this.runAllChecks();
    }, this.checkInterval);
  }

  /**
   * Stop periodic checks
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.checkingInterval) {
      clearInterval(this.checkingInterval);
      this.checkingInterval = null;
    }
  }

  /**
   * Get current health status
   */
  getStatus() {
    if (this.checkResults.length === 0) {
      return {
        status: 'unknown',
        message: 'No health check results available',
      };
    }

    const latest = this.checkResults[this.checkResults.length - 1];

    let overallStatus = 'healthy';
    if (latest.critical > 0) overallStatus = 'critical';
    else if (latest.warning > 0) overallStatus = 'warning';

    return {
      status: overallStatus,
      timestamp: latest.timestamp,
      summary: {
        total: latest.totalChecks,
        healthy: latest.healthy,
        warning: latest.warning,
        critical: latest.critical,
        unhealthy: latest.unhealthy,
      },
      checks: latest.results.map(r => ({
        name: r.name,
        status: r.status,
        severity: r.severity,
        duration: r.duration,
        message: r.message,
      })),
    };
  }

  /**
   * Get health status page (HTML)
   */
  getStatusPageHTML() {
    const status = this.getStatus();
    const statusColor = {
      healthy: '#4CAF50',
      warning: '#FF9800',
      critical: '#F44336',
      unknown: '#9E9E9E',
    };

    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>System Health Status</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    .header { border-bottom: 2px solid #ddd; padding-bottom: 20px; }
    .status-badge {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      font-size: 18px;
    }
    .check-item {
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid;
      background: #f9f9f9;
    }
    .check-item.healthy { border-left-color: #4CAF50; }
    .check-item.warning { border-left-color: #FF9800; }
    .check-item.critical { border-left-color: #F44336; }
    .check-title { font-weight: bold; margin-bottom: 5px; }
    .check-detail { font-size: 12px; color: #666; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
    .summary-item { background: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; }
    .summary-number { font-size: 24px; font-weight: bold; }
    .summary-label { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>System Health Status</h1>
      <div class="status-badge" style="background: ${statusColor[status.status]}">
        ${status.status.toUpperCase()}
      </div>
      <p>Last updated: ${new Date(status.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="summary-number">${status.summary.healthy}</div>
        <div class="summary-label">Healthy</div>
      </div>
      <div class="summary-item">
        <div class="summary-number">${status.summary.warning}</div>
        <div class="summary-label">Warning</div>
      </div>
      <div class="summary-item">
        <div class="summary-number">${status.summary.critical}</div>
        <div class="summary-label">Critical</div>
      </div>
      <div class="summary-item">
        <div class="summary-number">${status.summary.total}</div>
        <div class="summary-label">Total</div>
      </div>
    </div>

    <h2>Component Status</h2>
`;

    for (const check of status.checks) {
      html += `
    <div class="check-item ${check.status}">
      <div class="check-title">${check.name}</div>
      <div class="check-detail">
        Status: <strong>${check.status}</strong> | 
        Duration: ${check.duration}ms | 
        Message: ${check.message}
      </div>
    </div>
`;
    }

    html += `
  </div>
</body>
</html>
`;
    return html;
  }

  /**
   * Get health status as JSON
   */
  getStatusJSON() {
    return this.getStatus();
  }

  /**
   * Get historical health data
   */
  getHistory(limit = 100) {
    return this.checkResults.slice(-limit).map(result => ({
      timestamp: result.timestamp,
      summary: {
        healthy: result.healthy,
        warning: result.warning,
        critical: result.critical,
        unhealthy: result.unhealthy,
      },
    }));
  }

  /**
   * Get health metrics summary
   */
  getMetrics() {
    if (this.checkResults.length === 0) return null;

    const results = this.checkResults;
    const successfulChecks = results.filter(r => r.critical === 0 && r.unhealthy === 0).length;
    const uptime = (successfulChecks / results.length) * 100;

    return {
      totalChecks: results.length,
      successfulChecks,
      uptime: uptime.toFixed(2) + '%',
      avgCheckTime:
        Math.round(
          results.reduce((sum, r) => sum + (r.results[0]?.duration || 0), 0) / results.length
        ) + 'ms',
      lastCheck: results[results.length - 1].timestamp,
    };
  }

  /**
   * Clear results
   */
  clear() {
    this.checkResults = [];
  }
}

module.exports = { HealthChecker };
