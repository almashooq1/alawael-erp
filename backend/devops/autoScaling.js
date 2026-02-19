/**
 * 📈 Auto-Scaling Configuration
 *
 * Dynamic scaling based on metrics
 * - Horizontal pod autoscaling
 * - EC2 auto-scaling groups
 * - Lambda scaling
 * - Custom metrics scaling
 */

class AutoScalingManager {
  constructor(options = {}) {
    this.policies = new Map();
    this.metrics = new Map();
    this.scalingHistory = [];
    this.minReplicas = options.minReplicas || 2;
    this.maxReplicas = options.maxReplicas || 10;
    this.targetMetric = options.targetMetric || 'cpu';
    this.targetValue = options.targetValue || 70;
    this.scaleUpThreshold = options.scaleUpThreshold || 80;
    this.scaleDownThreshold = options.scaleDownThreshold || 20;
    this.cooldownPeriod = options.cooldownPeriod || 300000; // 5 minutes
    this.lastScaleTime = 0;
    this.currentReplicas = this.minReplicas;
  }

  /**
   * Register scaling policy
   */
  registerPolicy(name, policy) {
    this.policies.set(name, {
      name,
      metricName: policy.metricName,
      targetValue: policy.targetValue,
      scaleUpThreshold: policy.scaleUpThreshold || 80,
      scaleDownThreshold: policy.scaleDownThreshold || 20,
      cooldownPeriod: policy.cooldownPeriod || 300000,
      enabled: policy.enabled !== false,
      createdAt: Date.now(),
    });
  }

  /**
   * Record metric value
   */
  recordMetric(metricName, value, timestamp = Date.now()) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metricData = this.metrics.get(metricName);
    metricData.push({ value, timestamp });

    // Keep only last 1000 data points
    if (metricData.length > 1000) {
      metricData.shift();
    }
  }

  /**
   * Calculate scaling decision
   */
  calculateScalingDecision(currentMetrics) {
    const now = Date.now();

    // Check cooldown period
    if (now - this.lastScaleTime < this.cooldownPeriod) {
      return {
        action: 'none',
        reason: 'Cooldown period active',
        currentReplicas: this.currentReplicas,
      };
    }

    // Get average metric value (last 5 minutes)
    const avgMetric = this.getAverageMetric(this.targetMetric, 5 * 60 * 1000);

    let action = 'none';
    let targetReplicas = this.currentReplicas;
    let reason = '';

    if (avgMetric > this.scaleUpThreshold) {
      // Scale up
      targetReplicas = Math.min(Math.ceil(this.currentReplicas * 1.5), this.maxReplicas);
      action = 'scale_up';
      reason = `Average ${this.targetMetric}: ${avgMetric.toFixed(2)}% > threshold: ${this.scaleUpThreshold}%`;
    } else if (avgMetric < this.scaleDownThreshold && this.currentReplicas > this.minReplicas) {
      // Scale down
      targetReplicas = Math.max(Math.floor(this.currentReplicas * 0.75), this.minReplicas);
      action = 'scale_down';
      reason = `Average ${this.targetMetric}: ${avgMetric.toFixed(2)}% < threshold: ${this.scaleDownThreshold}%`;
    }

    if (action !== 'none') {
      this.lastScaleTime = now;
      this.currentReplicas = targetReplicas;

      // Record scaling event
      this.recordScalingEvent({
        timestamp: now,
        action,
        fromReplicas: this.currentReplicas,
        toReplicas: targetReplicas,
        metric: this.targetMetric,
        value: avgMetric,
        reason,
      });
    }

    return {
      action,
      targetReplicas,
      reason,
      currentReplicas: this.currentReplicas,
      avgMetric: avgMetric.toFixed(2),
    };
  }

  /**
   * Get average metric value for time window
   */
  getAverageMetric(metricName, timeWindowMs) {
    const metricData = this.metrics.get(metricName) || [];
    const now = Date.now();
    const threshold = now - timeWindowMs;

    const relevantData = metricData.filter(d => d.timestamp >= threshold);
    if (relevantData.length === 0) return 0;

    const sum = relevantData.reduce((acc, d) => acc + d.value, 0);
    return sum / relevantData.length;
  }

  /**
   * Get percentile metric value
   */
  getPercentileMetric(metricName, percentile, timeWindowMs) {
    const metricData = this.metrics.get(metricName) || [];
    const now = Date.now();
    const threshold = now - timeWindowMs;

    const relevantData = metricData
      .filter(d => d.timestamp >= threshold)
      .map(d => d.value)
      .sort((a, b) => a - b);

    if (relevantData.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * relevantData.length) - 1;
    return relevantData[Math.max(0, index)];
  }

  /**
   * Record scaling event
   */
  recordScalingEvent(event) {
    this.scalingHistory.push(event);

    // Keep only last 1000 events
    if (this.scalingHistory.length > 1000) {
      this.scalingHistory.shift();
    }
  }

  /**
   * Get scaling recommendations
   */
  getScalingRecommendations() {
    const recommendations = [];

    // Check for consistent high load
    const p95Cpu = this.getPercentileMetric('cpu', 95, 60 * 60 * 1000); // 1 hour
    if (p95Cpu > 85) {
      recommendations.push({
        type: 'scale_up',
        reason: 'Consistently high CPU utilization',
        severity: 'high',
        metric: 'cpu',
        value: p95Cpu.toFixed(2),
      });
    }

    // Check for wasted resources
    const avgMemory = this.getAverageMetric('memory', 24 * 60 * 60 * 1000); // 24 hours
    if (avgMemory < 30 && this.currentReplicas > this.minReplicas) {
      recommendations.push({
        type: 'scale_down',
        reason: 'Low average memory utilization',
        severity: 'low',
        metric: 'memory',
        value: avgMemory.toFixed(2),
      });
    }

    return recommendations;
  }

  /**
   * Predict future replicas needed
   */
  predictFutureLoad(minutes = 30) {
    const historicalData = this.scalingHistory.slice(-288); // Last 24 hours (5-min intervals)

    if (historicalData.length < 5) {
      return {
        predictedReplicas: this.currentReplicas,
        confidence: 0,
        reason: 'Insufficient historical data',
      };
    }

    // Simple linear regression
    const n = historicalData.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = historicalData.map(e => e.toReplicas);

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean), 0);
    const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Predict for next interval
    const futureX = n + minutes / 5;
    let predictedReplicas = slope * futureX + intercept;
    predictedReplicas = Math.max(
      this.minReplicas,
      Math.min(this.maxReplicas, Math.round(predictedReplicas))
    );

    // Calculate R-squared for confidence
    const ssRes = yValues.reduce((sum, y, i) => {
      const predicted = slope * xValues[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);

    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return {
      predictedReplicas,
      confidence: Math.max(0, Math.min(1, rSquared)), // 0-1
      slope,
      reason: `Based on ${n} historical data points`,
    };
  }

  /**
   * Get scaling history
   */
  getScalingHistory(limit = 100) {
    return this.scalingHistory.slice(-limit);
  }

  /**
   * Get scaling metrics summary
   */
  getMetricsSummary() {
    const metrics = {};

    for (const [metricName, _] of this.metrics) {
      const avgValue = this.getAverageMetric(metricName, 60 * 60 * 1000); // Last hour
      const p95Value = this.getPercentileMetric(metricName, 95, 60 * 60 * 1000);
      const p99Value = this.getPercentileMetric(metricName, 99, 60 * 60 * 1000);

      metrics[metricName] = {
        average: avgValue.toFixed(2),
        p95: p95Value.toFixed(2),
        p99: p99Value.toFixed(2),
      };
    }

    return metrics;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      currentReplicas: this.currentReplicas,
      minReplicas: this.minReplicas,
      maxReplicas: this.maxReplicas,
      targetMetric: this.targetMetric,
      targetValue: this.targetValue,
      metrics: this.getMetricsSummary(),
      recommendation: this.getScalingRecommendations(),
      prediction: this.predictFutureLoad(30),
    };
  }

  /**
   * Evaluate metrics and apply scaling
   */
  evaluate(metrics) {
    if (!metrics) return;

    try {
      const cpuUsage = metrics.cpu?.usage?.[0] || 0;
      const memoryPercent = (metrics.memory?.heapUsed / metrics.memory?.heapTotal) * 100 || 0;

      const recommendation = this.getScalingRecommendations();

      if (recommendation === 'scale_up' && this.currentReplicas < this.maxReplicas) {
        this.currentReplicas++;
        console.log(`[AutoScaling] Scaled up to ${this.currentReplicas} replicas`);
      } else if (recommendation === 'scale_down' && this.currentReplicas > this.minReplicas) {
        this.currentReplicas--;
        console.log(`[AutoScaling] Scaled down to ${this.currentReplicas} replicas`);
      }
    } catch (error) {
      console.error('[AutoScaling] Evaluation error:', error.message);
    }
  }
}

module.exports = { AutoScalingManager };
