/**
 * 📊 AGI Monitoring & Metrics System
 *
 * Comprehensive monitoring for AGI system performance,
 * resource usage, and health checks.
 */

import { EventEmitter } from 'events';

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Metric interface
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  requests: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
}

/**
 * Resource metrics
 */
export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryPercentage: number;
  uptime: number;
}

/**
 * Component metrics
 */
export interface ComponentMetrics {
  reasoning: {
    totalCalls: number;
    avgTime: number;
    methods: Record<string, number>;
  };
  learning: {
    totalCalls: number;
    avgTime: number;
    modes: Record<string, number>;
    memorySize: number;
  };
  decision: {
    totalCalls: number;
    avgTime: number;
    algorithms: Record<string, number>;
  };
  creativity: {
    totalCalls: number;
    avgTime: number;
    types: Record<string, number>;
  };
  planning: {
    totalCalls: number;
    avgTime: number;
    horizons: Record<string, number>;
  };
  context: {
    totalCalls: number;
    avgTime: number;
    types: Record<string, number>;
  };
}

/**
 * Health status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  components: {
    reasoning: boolean;
    learning: boolean;
    decision: boolean;
    creativity: boolean;
    planning: boolean;
    context: boolean;
  };
  metrics: {
    performance: PerformanceMetrics;
    resources: ResourceMetrics;
  };
}

/**
 * AGI Monitoring System
 */
export class AGIMonitoring extends EventEmitter {
  private metrics: Map<string, Metric[]>;
  private startTime: Date;

  // Counters
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;

  // Response times
  private responseTimes: number[] = [];
  private maxResponseTimeHistory: number = 1000;

  // Component metrics
  private componentMetrics: ComponentMetrics;

  constructor() {
    super();
    this.metrics = new Map();
    this.startTime = new Date();

    this.componentMetrics = {
      reasoning: { totalCalls: 0, avgTime: 0, methods: {} },
      learning: { totalCalls: 0, avgTime: 0, modes: {}, memorySize: 0 },
      decision: { totalCalls: 0, avgTime: 0, algorithms: {} },
      creativity: { totalCalls: 0, avgTime: 0, types: {} },
      planning: { totalCalls: 0, avgTime: 0, horizons: {} },
      context: { totalCalls: 0, avgTime: 0, types: {} }
    };
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, type: MetricType = MetricType.GAUGE, labels?: Record<string, string>) {
    const metric: Metric = {
      name,
      type,
      value,
      labels,
      timestamp: new Date()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Keep only last 1000 metrics per name
    if (metricArray.length > 1000) {
      metricArray.shift();
    }

    this.emit('metric', metric);
  }

  /**
   * Record API request
   */
  recordRequest(success: boolean, responseTime: number, endpoint: string) {
    this.totalRequests++;

    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }

    // Record response time
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }

    // Record metrics
    this.recordMetric('requests_total', this.totalRequests, MetricType.COUNTER);
    this.recordMetric('response_time', responseTime, MetricType.HISTOGRAM, { endpoint });

    if (!success) {
      this.recordMetric('errors_total', this.failedRequests, MetricType.COUNTER, { endpoint });
    }
  }

  /**
   * Record component operation
   */
  recordComponentOperation(
    component: keyof ComponentMetrics,
    operation: string,
    duration: number
  ) {
    const metrics = this.componentMetrics[component];
    metrics.totalCalls++;

    // Update average time
    metrics.avgTime = (metrics.avgTime * (metrics.totalCalls - 1) + duration) / metrics.totalCalls;

    // Record operation-specific metrics
    if (component === 'reasoning') {
      const methods = (metrics as any).methods;
      methods[operation] = (methods[operation] || 0) + 1;
    } else if (component === 'learning') {
      const modes = (metrics as any).modes;
      modes[operation] = (modes[operation] || 0) + 1;
    } else if (component === 'decision') {
      const algorithms = (metrics as any).algorithms;
      algorithms[operation] = (algorithms[operation] || 0) + 1;
    } else if (component === 'creativity') {
      const types = (metrics as any).types;
      types[operation] = (types[operation] || 0) + 1;
    } else if (component === 'planning') {
      const horizons = (metrics as any).horizons;
      horizons[operation] = (horizons[operation] || 0) + 1;
    } else if (component === 'context') {
      const types = (metrics as any).types;
      types[operation] = (types[operation] || 0) + 1;
    }

    this.recordMetric(
      `${component}_operation_duration`,
      duration,
      MetricType.HISTOGRAM,
      { operation }
    );
  }

  /**
   * Update memory size for learning component
   */
  updateMemorySize(size: number) {
    this.componentMetrics.learning.memorySize = size;
    this.recordMetric('learning_memory_size', size, MetricType.GAUGE);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    const successRate = this.totalRequests > 0
      ? (this.successfulRequests / this.totalRequests) * 100
      : 100;

    const errorRate = this.totalRequests > 0
      ? (this.failedRequests / this.totalRequests) * 100
      : 0;

    const uptime = (Date.now() - this.startTime.getTime()) / 1000;
    const throughput = uptime > 0 ? this.totalRequests / uptime : 0;

    return {
      requests: this.totalRequests,
      avgResponseTime,
      successRate,
      errorRate,
      throughput
    };
  }

  /**
   * Get resource metrics
   */
  getResourceMetrics(): ResourceMetrics {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      memoryUsage: memUsage.heapUsed,
      memoryTotal: memUsage.heapTotal,
      memoryPercentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      uptime
    };
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(): ComponentMetrics {
    return { ...this.componentMetrics };
  }

  /**
   * Get health status
   */
  getHealthStatus(): HealthStatus {
    const performance = this.getPerformanceMetrics();
    const resources = this.getResourceMetrics();

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (resources.memoryPercentage > 90 || performance.errorRate > 50) {
      status = 'unhealthy';
    } else if (resources.memoryPercentage > 75 || performance.errorRate > 20) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: resources.uptime,
      version: '1.0.0',
      components: {
        reasoning: this.componentMetrics.reasoning.totalCalls > 0,
        learning: this.componentMetrics.learning.totalCalls > 0,
        decision: this.componentMetrics.decision.totalCalls > 0,
        creativity: this.componentMetrics.creativity.totalCalls > 0,
        planning: this.componentMetrics.planning.totalCalls > 0,
        context: this.componentMetrics.context.totalCalls > 0
      },
      metrics: {
        performance,
        resources
      }
    };
  }

  /**
   * Get metrics by name
   */
  getMetrics(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.responseTimes = [];

    this.componentMetrics = {
      reasoning: { totalCalls: 0, avgTime: 0, methods: {} },
      learning: { totalCalls: 0, avgTime: 0, modes: {}, memorySize: 0 },
      decision: { totalCalls: 0, avgTime: 0, algorithms: {} },
      creativity: { totalCalls: 0, avgTime: 0, types: {} },
      planning: { totalCalls: 0, avgTime: 0, horizons: {} },
      context: { totalCalls: 0, avgTime: 0, types: {} }
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    let output = '';

    // Add performance metrics
    const perf = this.getPerformanceMetrics();
    output += `# HELP agi_requests_total Total number of requests\n`;
    output += `# TYPE agi_requests_total counter\n`;
    output += `agi_requests_total ${perf.requests}\n\n`;

    output += `# HELP agi_response_time_avg Average response time in ms\n`;
    output += `# TYPE agi_response_time_avg gauge\n`;
    output += `agi_response_time_avg ${perf.avgResponseTime}\n\n`;

    output += `# HELP agi_success_rate Success rate percentage\n`;
    output += `# TYPE agi_success_rate gauge\n`;
    output += `agi_success_rate ${perf.successRate}\n\n`;

    // Add resource metrics
    const res = this.getResourceMetrics();
    output += `# HELP agi_memory_usage Memory usage in bytes\n`;
    output += `# TYPE agi_memory_usage gauge\n`;
    output += `agi_memory_usage ${res.memoryUsage}\n\n`;

    output += `# HELP agi_memory_percentage Memory usage percentage\n`;
    output += `# TYPE agi_memory_percentage gauge\n`;
    output += `agi_memory_percentage ${res.memoryPercentage}\n\n`;

    // Add component metrics
    const comp = this.getComponentMetrics();
    for (const [component, metrics] of Object.entries(comp)) {
      output += `# HELP agi_${component}_calls Total calls to ${component}\n`;
      output += `# TYPE agi_${component}_calls counter\n`;
      output += `agi_${component}_calls ${metrics.totalCalls}\n\n`;

      output += `# HELP agi_${component}_avg_time Average execution time\n`;
      output += `# TYPE agi_${component}_avg_time gauge\n`;
      output += `agi_${component}_avg_time ${metrics.avgTime}\n\n`;
    }

    return output;
  }

  /**
   * Generate monitoring report
   */
  generateReport(): string {
    const health = this.getHealthStatus();
    const comp = this.getComponentMetrics();

    let report = '='.repeat(60) + '\n';
    report += '📊 AGI MONITORING REPORT\n';
    report += '='.repeat(60) + '\n\n';

    // Health status
    const statusEmoji = health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌';
    report += `Status: ${statusEmoji} ${health.status.toUpperCase()}\n`;
    report += `Uptime: ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m\n`;
    report += `Version: ${health.version}\n\n`;

    // Performance
    report += '📈 PERFORMANCE\n';
    report += '-'.repeat(60) + '\n';
    report += `Total Requests: ${health.metrics.performance.requests}\n`;
    report += `Success Rate: ${health.metrics.performance.successRate.toFixed(2)}%\n`;
    report += `Error Rate: ${health.metrics.performance.errorRate.toFixed(2)}%\n`;
    report += `Avg Response Time: ${health.metrics.performance.avgResponseTime.toFixed(2)}ms\n`;
    report += `Throughput: ${health.metrics.performance.throughput.toFixed(2)} req/s\n\n`;

    // Resources
    report += '💾 RESOURCES\n';
    report += '-'.repeat(60) + '\n';
    report += `Memory: ${(health.metrics.resources.memoryUsage / 1024 / 1024).toFixed(2)} MB / `;
    report += `${(health.metrics.resources.memoryTotal / 1024 / 1024).toFixed(2)} MB `;
    report += `(${health.metrics.resources.memoryPercentage.toFixed(2)}%)\n`;
    report += `CPU: ${health.metrics.resources.cpuUsage.toFixed(2)}s\n\n`;

    // Components
    report += '🧠 COMPONENTS\n';
    report += '-'.repeat(60) + '\n';
    for (const [name, metrics] of Object.entries(comp)) {
      const active = metrics.totalCalls > 0 ? '✅' : '⭕';
      report += `${active} ${name.toUpperCase()}\n`;
      report += `   Calls: ${metrics.totalCalls}\n`;
      report += `   Avg Time: ${metrics.avgTime.toFixed(2)}ms\n`;

      if (name === 'learning' && 'memorySize' in metrics) {
        report += `   Memory Size: ${(metrics as any).memorySize}\n`;
      }

      report += '\n';
    }

    report += '='.repeat(60) + '\n';

    return report;
  }

  /**
   * Start monitoring interval
   */
  startMonitoring(interval: number = 60000) {
    setInterval(() => {
      const health = this.getHealthStatus();

      if (health.status === 'degraded') {
        console.warn('⚠️ AGI System is degraded');
      } else if (health.status === 'unhealthy') {
        console.error('❌ AGI System is unhealthy');
      }

      this.emit('health-check', health);
    }, interval);
  }
}

// Singleton instance
export const monitoring = new AGIMonitoring();

/**
 * Middleware for Express to track requests
 */
export function monitoringMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;
    const endpoint = req.path;

    monitoring.recordRequest(success, duration, endpoint);
  });

  next();
}

/**
 * Decorator for monitoring function execution
 */
export function monitored(
  component: keyof ComponentMetrics,
  operation: string
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        monitoring.recordComponentOperation(component, operation, duration);

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        monitoring.recordComponentOperation(component, operation, duration);
        throw error;
      }
    };

    return descriptor;
  };
}

export default monitoring;
