// Performance Monitoring Module
// Tracks API response times, memory usage, and system health

import { Request, Response, NextFunction } from 'express';
import { logger } from '../modules/logger';
import os from 'os';

interface PerformanceMetric {
  timestamp: string;
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  // Request timing middleware
  requestTimer() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Override res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();

        // Record metric
        const metric: PerformanceMetric = {
          timestamp: new Date().toISOString(),
          endpoint: req.path,
          method: req.method,
          duration,
          statusCode: res.statusCode,
          memoryUsage: {
            rss: endMemory.rss - startMemory.rss,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            external: endMemory.external - startMemory.external,
            arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
          },
        };

        PerformanceMonitor.getInstance().addMetric(metric);

        // Log slow requests
        if (duration > 1000) {
          logger.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
        }

        return originalJson(data);
      };

      next();
    };
  }

  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getStats() {
    if (this.metrics.length === 0) {
      return { message: 'No metrics available' };
    }

    const durations = this.metrics.map(m => m.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    // Group by endpoint
    const endpointStats: Record<string, { count: number; avgDuration: number }> = {};
    this.metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { count: 0, avgDuration: 0 };
      }
      endpointStats[key].count++;
      endpointStats[key].avgDuration += m.duration;
    });

    // Calculate averages
    Object.keys(endpointStats).forEach(key => {
      endpointStats[key].avgDuration /= endpointStats[key].count;
      endpointStats[key].avgDuration = Math.round(endpointStats[key].avgDuration);
    });

    return {
      totalRequests: this.metrics.length,
      avgDuration: Math.round(avgDuration),
      maxDuration,
      minDuration,
      endpointStats,
      systemInfo: this.getSystemInfo(),
    };
  }

  getSystemInfo() {
    const memUsage = process.memoryUsage();
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      uptime: Math.round(os.uptime()),
      processMemory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      },
    };
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
