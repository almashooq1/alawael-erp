/**
 * 📤 Metrics Export System
 *
 * Export metrics in multiple formats
 * - Prometheus format export
 * - Grafana integration
 * - Time-series data export
 * - Custom metric definitions
 */

class MetricsExporter {
  constructor(options = {}) {
    this.metrics = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.counters = new Map();
    this.summaries = new Map();
    this.registryName = options.registryName || 'default';
    this.globalLabels = options.globalLabels || {};
  }

  /**
   * Register counter metric
   */
  createCounter(name, help = '', labels = []) {
    const counter = {
      name,
      help,
      type: 'counter',
      labels,
      value: 0,
      labelValues: new Map(),
    };
    this.counters.set(name, counter);
    return {
      inc: (value = 1, labelValues = {}) => this._incrementCounter(name, value, labelValues),
      get: () => this.counters.get(name).value,
      reset: () => {
        this.counters.get(name).value = 0;
      },
    };
  }

  /**
   * Increment counter
   */
  _incrementCounter(name, value, labelValues) {
    const counter = this.counters.get(name);
    if (counter) {
      counter.value += value;
      const key = JSON.stringify(labelValues);
      if (!counter.labelValues.has(key)) {
        counter.labelValues.set(key, 0);
      }
      counter.labelValues.set(key, counter.labelValues.get(key) + value);
    }
  }

  /**
   * Register gauge metric
   */
  createGauge(name, help = '', labels = []) {
    const gauge = {
      name,
      help,
      type: 'gauge',
      labels,
      value: 0,
      labelValues: new Map(),
    };
    this.gauges.set(name, gauge);
    return {
      set: (value, labelValues = {}) => this._setGauge(name, value, labelValues),
      inc: (value = 1, labelValues = {}) => this._incrementGauge(name, value, labelValues),
      dec: (value = 1, labelValues = {}) => this._decrementGauge(name, value, labelValues),
      get: () => this.gauges.get(name).value,
    };
  }

  /**
   * Set gauge value
   */
  _setGauge(name, value, labelValues) {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.value = value;
      const key = JSON.stringify(labelValues);
      gauge.labelValues.set(key, value);
    }
  }

  /**
   * Increment gauge
   */
  _incrementGauge(name, value, labelValues) {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.value += value;
      const key = JSON.stringify(labelValues);
      gauge.labelValues.set(key, (gauge.labelValues.get(key) || 0) + value);
    }
  }

  /**
   * Decrement gauge
   */
  _decrementGauge(name, value, labelValues) {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.value -= value;
      const key = JSON.stringify(labelValues);
      gauge.labelValues.set(key, (gauge.labelValues.get(key) || 0) - value);
    }
  }

  /**
   * Register histogram metric
   */
  createHistogram(name, help = '', labels = [], buckets = [0.001, 0.01, 0.1, 1, 5, 10]) {
    const histogram = {
      name,
      help,
      type: 'histogram',
      labels,
      buckets,
      values: [],
      bucketCounts: new Map(buckets.map(b => [b, 0])),
      sum: 0,
      count: 0,
      labelValues: new Map(),
    };
    this.histograms.set(name, histogram);
    return {
      observe: (value, labelValues = {}) => this._observeHistogram(name, value, labelValues),
      get: () => this._getHistogramStats(name),
    };
  }

  /**
   * Observe histogram value
   */
  _observeHistogram(name, value, labelValues) {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.values.push(value);
      histogram.sum += value;
      histogram.count += 1;

      // Update bucket counts
      for (const bucket of histogram.buckets) {
        if (value <= bucket) {
          histogram.bucketCounts.set(bucket, histogram.bucketCounts.get(bucket) + 1);
        }
      }

      const key = JSON.stringify(labelValues);
      if (!histogram.labelValues.has(key)) {
        histogram.labelValues.set(key, { values: [], sum: 0, count: 0 });
      }
      const entry = histogram.labelValues.get(key);
      entry.values.push(value);
      entry.sum += value;
      entry.count += 1;
    }
  }

  /**
   * Get histogram statistics
   */
  _getHistogramStats(name) {
    const histogram = this.histograms.get(name);
    if (!histogram || histogram.values.length === 0) {
      return { count: 0, sum: 0 };
    }

    const sorted = [...histogram.values].sort((a, b) => a - b);
    return {
      count: histogram.count,
      sum: histogram.sum,
      mean: histogram.sum / histogram.count,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Register summary metric
   */
  createSummary(name, help = '', labels = []) {
    const summary = {
      name,
      help,
      type: 'summary',
      labels,
      values: [],
      sum: 0,
      count: 0,
    };
    this.summaries.set(name, summary);
    return {
      observe: value => this._observeSummary(name, value),
      get: () => this._getSummaryStats(name),
    };
  }

  /**
   * Observe summary value
   */
  _observeSummary(name, value) {
    const summary = this.summaries.get(name);
    if (summary) {
      summary.values.push(value);
      summary.sum += value;
      summary.count += 1;

      // Keep only last 1000 values
      if (summary.values.length > 1000) {
        summary.values.shift();
      }
    }
  }

  /**
   * Get summary statistics
   */
  _getSummaryStats(name) {
    const summary = this.summaries.get(name);
    if (!summary || summary.values.length === 0) {
      return { count: 0, sum: 0 };
    }

    const sorted = [...summary.values].sort((a, b) => a - b);
    return {
      count: summary.count,
      sum: summary.sum,
      mean: summary.sum / summary.count,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Export to Prometheus format
   */
  toPrometheusFormat() {
    let output = `# HELP registry_${this.registryName}\n`;
    output += `# TYPE registry_${this.registryName} gauge\n\n`;

    // Export counters
    for (const [name, counter] of this.counters) {
      output += `# HELP ${name} ${counter.help}\n`;
      output += `# TYPE ${name} counter\n`;
      output += this._formatMetric(name, counter.value, {}) + '\n';

      for (const [labelKey, labelValue] of counter.labelValues) {
        output += this._formatMetric(name, labelValue, JSON.parse(labelKey)) + '\n';
      }
    }

    // Export gauges
    for (const [name, gauge] of this.gauges) {
      output += `# HELP ${name} ${gauge.help}\n`;
      output += `# TYPE ${name} gauge\n`;
      output += this._formatMetric(name, gauge.value, {}) + '\n';

      for (const [labelKey, labelValue] of gauge.labelValues) {
        output += this._formatMetric(name, labelValue, JSON.parse(labelKey)) + '\n';
      }
    }

    // Export histograms
    for (const [name, histogram] of this.histograms) {
      output += `# HELP ${name} ${histogram.help}\n`;
      output += `# TYPE ${name} histogram\n`;

      for (const bucket of histogram.buckets) {
        const labels = { ...this.globalLabels, le: bucket };
        output +=
          this._formatMetric(`${name}_bucket`, histogram.bucketCounts.get(bucket), labels) + '\n';
      }
      output += this._formatMetric(`${name}_sum`, histogram.sum, this.globalLabels) + '\n';
      output += this._formatMetric(`${name}_count`, histogram.count, this.globalLabels) + '\n\n';
    }

    // Export summaries
    for (const [name, summary] of this.summaries) {
      output += `# HELP ${name} ${summary.help}\n`;
      output += `# TYPE ${name} summary\n`;
      output += this._formatMetric(`${name}_sum`, summary.sum, this.globalLabels) + '\n';
      output += this._formatMetric(`${name}_count`, summary.count, this.globalLabels) + '\n\n';
    }

    return output;
  }

  /**
   * Format metric for Prometheus
   */
  _formatMetric(name, value, labels) {
    const labelStr = this._formatLabels({ ...this.globalLabels, ...labels });
    return `${name}${labelStr} ${value}`;
  }

  /**
   * Format labels for Prometheus
   */
  _formatLabels(labels) {
    const entries = Object.entries(labels).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '';
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  /**
   * Export all metrics as JSON
   */
  toJSON() {
    return {
      registry: this.registryName,
      timestamp: Date.now(),
      counters: Array.from(this.counters.entries()).map(([name, counter]) => ({
        name,
        type: 'counter',
        value: counter.value,
        help: counter.help,
      })),
      gauges: Array.from(this.gauges.entries()).map(([name, gauge]) => ({
        name,
        type: 'gauge',
        value: gauge.value,
        help: gauge.help,
      })),
      histograms: Array.from(this.histograms.entries()).map(([name, histogram]) => ({
        name,
        type: 'histogram',
        stats: this._getHistogramStats(name),
        help: histogram.help,
      })),
      summaries: Array.from(this.summaries.entries()).map(([name, summary]) => ({
        name,
        type: 'summary',
        stats: this._getSummaryStats(name),
        help: summary.help,
      })),
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const os = require('os');
    const cpus = os.cpus();
    const memUsage = process.memoryUsage();

    return {
      timestamp: Date.now(),
      cpu: {
        count: cpus.length,
        usage: cpus.map(cpu => Object.values(cpu.times).reduce((a, b) => a + b)),
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      uptime: process.uptime(),
      metrics: Array.from(this.metrics.values()),
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
  }
}

module.exports = { MetricsExporter };
