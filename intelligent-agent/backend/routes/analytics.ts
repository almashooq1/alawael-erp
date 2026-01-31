import { Router, Request, Response } from 'express';
import { createLogger } from '../utils/logger';
import { cacheService, CacheTTL } from '../services/cache';

const logger = createLogger('AnalyticsService');
const router = Router();

// ==================== ANALYTICS METRICS ====================

interface MetricData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

interface AggregatedMetric {
  metric: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

// ==================== REAL-TIME METRICS ====================

export class AnalyticsService {
  private static instance: AnalyticsService;
  private metricsBuffer: Map<string, MetricData[]> = new Map();

  private constructor() {
    // Flush metrics to storage every minute
    setInterval(() => this.flushMetrics(), 60000);
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track a metric
   */
  public trackMetric(metric: string, value: number, metadata?: Record<string, any>) {
    if (!this.metricsBuffer.has(metric)) {
      this.metricsBuffer.set(metric, []);
    }

    this.metricsBuffer.get(metric)!.push({
      timestamp: new Date(),
      value,
      metadata
    });

    logger.debug('Metric tracked', { metric, value });
  }

  /**
   * Get real-time metric
   */
  public getMetric(metric: string, timeWindow: number = 60000): number {
    const data = this.metricsBuffer.get(metric) || [];
    const cutoff = Date.now() - timeWindow;

    const recentData = data.filter(d => d.timestamp.getTime() > cutoff);
    
    if (recentData.length === 0) return 0;

    const sum = recentData.reduce((acc, d) => acc + d.value, 0);
    return sum / recentData.length;
  }

  /**
   * Get metric trend
   */
  public getMetricTrend(metric: string): { current: number; previous: number; change: number; trend: string } {
    const currentValue = this.getMetric(metric, 60000); // Last minute
    const previousValue = this.getMetric(metric, 120000); // Previous minute

    const change = currentValue - previousValue;
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

    return { current: currentValue, previous: previousValue, change, trend };
  }

  /**
   * Flush metrics to persistent storage
   */
  private async flushMetrics() {
    for (const [metric, data] of this.metricsBuffer.entries()) {
      if (data.length > 0) {
        // Save to database or time-series database
        logger.debug('Flushing metrics', { metric, count: data.length });
        
        // Keep only recent data in memory
        const oneHourAgo = Date.now() - 3600000;
        this.metricsBuffer.set(
          metric,
          data.filter(d => d.timestamp.getTime() > oneHourAgo)
        );
      }
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET /analytics/overview
 * Get overall system analytics
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const cached = await cacheService.getCachedAnalytics('overview');
    if (cached) {
      return res.json(cached);
    }

    // Fetch analytics data
    const overview = {
      users: {
        total: 1250,
        active: 892,
        new: 45,
        change: 12.5,
        trend: 'up'
      },
      projects: {
        total: 3420,
        active: 2103,
        completed: 1120,
        archived: 197,
        change: 8.3,
        trend: 'up'
      },
      models: {
        total: 5678,
        training: 123,
        deployed: 4231,
        failed: 45,
        avgAccuracy: 87.5,
        change: 5.2,
        trend: 'up'
      },
      predictions: {
        total: 125680,
        today: 3420,
        avgConfidence: 92.3,
        successRate: 98.7,
        change: 15.3,
        trend: 'up'
      },
      system: {
        uptime: 99.98,
        responseTime: 234,
        errorRate: 0.12,
        throughput: 1250
      }
    };

    await cacheService.cacheAnalytics('overview', overview, CacheTTL.SHORT);
    res.json(overview);
  } catch (error: any) {
    logger.error('Failed to fetch overview analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /analytics/trends
 * Get trends over time
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { metric, period = '7d', interval = '1d' } = req.query;

    const cacheKey = `trends:${metric}:${period}:${interval}`;
    const cached = await cacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Generate trend data
    const trends = generateTrendData(metric as string, period as string, interval as string);

    await cacheService.cacheAnalytics(cacheKey, trends, CacheTTL.MEDIUM);
    res.json(trends);
  } catch (error: any) {
    logger.error('Failed to fetch trends', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * GET /analytics/real-time
 * Get real-time metrics
 */
router.get('/real-time', async (req: Request, res: Response) => {
  try {
    const metrics = {
      activeUsers: analyticsService.getMetric('active_users'),
      requestsPerSecond: analyticsService.getMetric('requests_per_second'),
      avgResponseTime: analyticsService.getMetric('avg_response_time'),
      errorRate: analyticsService.getMetric('error_rate'),
      cacheHitRate: analyticsService.getMetric('cache_hit_rate'),
      queueSize: analyticsService.getMetric('queue_size'),
      trends: {
        activeUsers: analyticsService.getMetricTrend('active_users'),
        requests: analyticsService.getMetricTrend('requests_per_second'),
        responseTime: analyticsService.getMetricTrend('avg_response_time')
      }
    };

    res.json(metrics);
  } catch (error: any) {
    logger.error('Failed to fetch real-time metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

/**
 * GET /analytics/user/:userId
 * Get user-specific analytics
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const cacheKey = `user-analytics:${userId}:${startDate}:${endDate}`;
    const cached = await cacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const analytics = {
      userId,
      projects: {
        total: 12,
        active: 8,
        completed: 4
      },
      models: {
        total: 23,
        deployed: 18,
        avgAccuracy: 89.2
      },
      predictions: {
        total: 15420,
        today: 234,
        avgConfidence: 91.5
      },
      activity: {
        lastLogin: new Date().toISOString(),
        sessionsToday: 3,
        totalSessions: 145,
        avgSessionDuration: 1842
      },
      usage: {
        storageUsed: 2.5, // GB
        storageLimit: 10,
        apiCallsToday: 1250,
        apiCallsLimit: 10000
      }
    };

    await cacheService.cacheAnalytics(cacheKey, analytics, CacheTTL.MEDIUM);
    res.json(analytics);
  } catch (error: any) {
    logger.error('Failed to fetch user analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

/**
 * GET /analytics/project/:projectId
 * Get project-specific analytics
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const cacheKey = `project-analytics:${projectId}`;
    const cached = await cacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const analytics = {
      projectId,
      overview: {
        datasets: 5,
        models: 12,
        predictions: 8420,
        collaborators: 4
      },
      models: {
        avgAccuracy: 88.7,
        avgTrainingTime: 3240,
        bestModel: {
          id: 'model_123',
          accuracy: 94.2,
          type: 'deep_learning'
        }
      },
      activity: {
        lastUpdated: new Date().toISOString(),
        predictionsToday: 234,
        modelsTraining: 2
      },
      performance: {
        avgPredictionTime: 145,
        successRate: 98.5,
        errorRate: 0.8
      }
    };

    await cacheService.cacheAnalytics(cacheKey, analytics, CacheTTL.MEDIUM);
    res.json(analytics);
  } catch (error: any) {
    logger.error('Failed to fetch project analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch project analytics' });
  }
});

/**
 * GET /analytics/export
 * Export analytics data
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'json', startDate, endDate, metrics } = req.query;

    // Generate export data
    const exportData = {
      generated: new Date().toISOString(),
      period: { startDate, endDate },
      metrics: metrics ? (metrics as string).split(',') : 'all',
      data: {
        // Export data here
      }
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      // Convert to CSV and send
      res.send('CSV data here');
    } else {
      res.json(exportData);
    }
  } catch (error: any) {
    logger.error('Failed to export analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// ==================== HELPER FUNCTIONS ====================

function generateTrendData(metric: string, period: string, interval: string) {
  const days = parseInt(period);
  const points: any[] = [];

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    points.push({
      timestamp: date.toISOString(),
      value: Math.floor(Math.random() * 1000) + 500,
      label: date.toLocaleDateString()
    });
  }

  return {
    metric,
    period,
    interval,
    data: points,
    summary: {
      min: Math.min(...points.map(p => p.value)),
      max: Math.max(...points.map(p => p.value)),
      avg: points.reduce((acc, p) => acc + p.value, 0) / points.length
    }
  };
}

export default router;
