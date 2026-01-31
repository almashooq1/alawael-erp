/**
 * ============================================
 * ERROR TRACKING & AGGREGATION SYSTEM
 * نظام تتبع ومراقبة الأخطاء
 * ============================================
 */

import { EventEmitter } from 'events';
import { globalLogger } from '../utils/advanced.logger';

/**
 * Error Category
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  INTERNAL = 'internal',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown',
}

/**
 * Tracked Error
 */
export interface TrackedError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  statusCode?: number;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Error Statistics
 */
interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  byStatusCode: Record<number, number>;
  topErrors: Array<{ message: string; count: number }>;
  errorRate: number;
  averageResponseTime?: number;
}

/**
 * Error Tracker
 */
export class ErrorTracker extends EventEmitter {
  private errors: TrackedError[] = [];
  private maxErrors: number = 50000;
  private aggregationWindow: number = 3600000; // 1 hour
  private categoryMap: Record<string, ErrorCategory> = {
    ValidationError: ErrorCategory.VALIDATION,
    AuthenticationError: ErrorCategory.AUTHENTICATION,
    AuthorizationError: ErrorCategory.AUTHORIZATION,
    NotFoundError: ErrorCategory.NOT_FOUND,
    MongoError: ErrorCategory.DATABASE,
    TimeoutError: ErrorCategory.TIMEOUT,
    RateLimitError: ErrorCategory.RATE_LIMIT,
  };

  constructor(maxErrors: number = 50000) {
    super();
    this.maxErrors = maxErrors;
    this.startCleanupJob();
  }

  /**
   * Track error
   */
  trackError(
    error: Error | string,
    options?: {
      category?: ErrorCategory;
      context?: Record<string, any>;
      userId?: string;
      requestId?: string;
      statusCode?: number;
    }
  ): string {
    const id = this.generateId();
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const trackedError: TrackedError = {
      id,
      timestamp: new Date(),
      category: options?.category || this.categorizeError(error),
      message,
      stack,
      context: options?.context,
      userId: options?.userId,
      requestId: options?.requestId,
      statusCode: options?.statusCode,
      resolved: false,
    };

    this.errors.push(trackedError);

    // Emit event for real-time monitoring
    this.emit('error', trackedError);

    // Log based on category
    this.logError(trackedError);

    // Rotate if needed
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors / 2);
    }

    return id;
  }

  /**
   * Mark error as resolved
   */
  resolveError(id: string): boolean {
    const error = this.errors.find(e => e.id === id);

    if (error) {
      error.resolved = true;
      error.resolvedAt = new Date();
      globalLogger.info(`Error resolved: ${id}`, 'ErrorTracker');
      return true;
    }

    return false;
  }

  /**
   * Get error by ID
   */
  getError(id: string): TrackedError | undefined {
    return this.errors.find(e => e.id === id);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): TrackedError[] {
    return this.errors.filter(e => e.category === category);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 100): TrackedError[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get errors for user
   */
  getErrorsForUser(userId: string): TrackedError[] {
    return this.errors.filter(e => e.userId === userId);
  }

  /**
   * Get errors for request
   */
  getErrorsForRequest(requestId: string): TrackedError[] {
    return this.errors.filter(e => e.requestId === requestId);
  }

  /**
   * Get statistics
   */
  getStats(): ErrorStats {
    const stats: ErrorStats = {
      total: this.errors.length,
      byCategory: {} as Record<ErrorCategory, number>,
      byStatusCode: {} as Record<number, number>,
      topErrors: [],
      errorRate: 0,
    };

    // Count by category
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });

    const messageCount: Record<string, number> = {};

    this.errors.forEach(error => {
      // Category stats
      stats.byCategory[error.category]++;

      // Status code stats
      if (error.statusCode) {
        stats.byStatusCode[error.statusCode] = (stats.byStatusCode[error.statusCode] || 0) + 1;
      }

      // Message frequency
      messageCount[error.message] = (messageCount[error.message] || 0) + 1;
    });

    // Top errors
    stats.topErrors = Object.entries(messageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    // Error rate (errors per minute in last hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentErrors = this.errors.filter(e => e.timestamp >= oneHourAgo);
    stats.errorRate = recentErrors.length / 60;

    return stats;
  }

  /**
   * Get aggregated errors
   */
  getAggregatedErrors(windowMs?: number): Array<{
    timestamp: Date;
    count: number;
    byCategory: Record<ErrorCategory, number>;
  }> {
    const window = windowMs || this.aggregationWindow;
    const now = Date.now();
    const buckets: Map<number, { count: number; byCategory: Record<ErrorCategory, number> }> =
      new Map();

    this.errors.forEach(error => {
      const bucketTime = Math.floor(error.timestamp.getTime() / window) * window;

      if (!buckets.has(bucketTime)) {
        const categoryStats: Record<ErrorCategory, number> = {} as any;
        Object.values(ErrorCategory).forEach(cat => {
          categoryStats[cat] = 0;
        });

        buckets.set(bucketTime, {
          count: 0,
          byCategory: categoryStats,
        });
      }

      const bucket = buckets.get(bucketTime)!;
      bucket.count++;
      bucket.byCategory[error.category]++;
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, data]) => ({
        timestamp: new Date(time),
        count: data.count,
        byCategory: data.byCategory,
      }));
  }

  /**
   * Get error trends
   */
  getTrends(windowMs?: number): {
    increasing: boolean;
    percentChange: number;
    previousPeriod: number;
    currentPeriod: number;
  } {
    const window = windowMs || this.aggregationWindow;
    const now = Date.now();

    const currentErrors = this.errors.filter(e => e.timestamp.getTime() > now - window);

    const previousErrors = this.errors.filter(
      e => e.timestamp.getTime() > now - window * 2 && e.timestamp.getTime() <= now - window
    );

    const previousCount = previousErrors.length;
    const currentCount = currentErrors.length;

    const percentChange =
      previousCount === 0
        ? currentCount > 0
          ? 100
          : 0
        : ((currentCount - previousCount) / previousCount) * 100;

    return {
      increasing: currentCount > previousCount,
      percentChange,
      previousPeriod: previousCount,
      currentPeriod: currentCount,
    };
  }

  /**
   * Categorize error
   */
  private categorizeError(error: Error | string): ErrorCategory {
    const message = error instanceof Error ? error.message : String(error);

    for (const [keyword, category] of Object.entries(this.categoryMap)) {
      if (message.includes(keyword)) {
        return category;
      }
    }

    if (message.toLowerCase().includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    }

    if (message.toLowerCase().includes('not found')) {
      return ErrorCategory.NOT_FOUND;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Log error
   */
  private logError(error: TrackedError) {
    const logFn = error.category === ErrorCategory.INTERNAL ? 'error' : 'warn';

    globalLogger[logFn as 'error' | 'warn'](`${error.category}: ${error.message}`, 'ErrorTracker', {
      errorId: error.id,
      userId: error.userId,
      requestId: error.requestId,
      statusCode: error.statusCode,
      context: error.context,
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup job (remove old errors)
   */
  private startCleanupJob() {
    setInterval(
      () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const initialLength = this.errors.length;

        this.errors = this.errors.filter(e => {
          if (!e.resolved || e.timestamp >= twoWeeksAgo) {
            return true;
          }
          return false;
        });

        if (this.errors.length < initialLength) {
          globalLogger.debug(
            `Cleaned up ${initialLength - this.errors.length} resolved errors`,
            'ErrorTracker'
          );
        }
      },
      60 * 60 * 1000
    ); // Every hour
  }

  /**
   * Export errors as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  /**
   * Export errors as CSV
   */
  exportCSV(): string {
    const headers = [
      'ID',
      'Timestamp',
      'Category',
      'Message',
      'Status Code',
      'User ID',
      'Request ID',
      'Resolved',
    ];

    const rows = this.errors.map(e => [
      e.id,
      e.timestamp.toISOString(),
      e.category,
      `"${e.message.replace(/"/g, '""')}"`,
      e.statusCode || '',
      e.userId || '',
      e.requestId || '',
      e.resolved ? 'Yes' : 'No',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
  }
}

/**
 * Global error tracker instance
 */
export const globalErrorTracker = new ErrorTracker();

export default ErrorTracker;
