/**
 * Real-time Monitoring Service
 * خدمة المراقبة الفورية
 */

class RealtimeMonitoringService {
  constructor() {
    this.metrics = {};
    this.alerts = [];
    this.connections = new Set();
  }

  addConnection(clientId) {
    this.connections.add(clientId);
    return { clientId, status: 'connected' };
  }

  removeConnection(clientId) {
    this.connections.delete(clientId);
    return { clientId, status: 'disconnected' };
  }

  recordMetric(metricName, value) {
    if (!this.metrics[metricName]) {
      this.metrics[metricName] = [];
    }
    this.metrics[metricName].push({
      timestamp: Date.now(),
      value,
    });
    return { metric: metricName, recorded: true };
  }

  getMetrics(metricName) {
    if (metricName) {
      return this.metrics[metricName] || [];
    }
    // Return all metrics as an array
    const allMetrics = [];
    for (const key in this.metrics) {
      allMetrics.push(...this.metrics[key]);
    }
    return allMetrics;
  }

  createAlert(severity, message) {
    const alert = {
      id: Math.random().toString(36).substr(2, 9),
      severity,
      message,
      timestamp: Date.now(),
    };
    this.alerts.push(alert);
    return alert;
  }

  getAlerts() {
    return this.alerts;
  }

  broadcastMetric(metricName, value) {
    const metric = { metric: metricName, value, timestamp: Date.now() };
    return {
      broadcast: true,
      recipients: this.connections.size,
      metric,
    };
  }
}

module.exports = RealtimeMonitoringService;
