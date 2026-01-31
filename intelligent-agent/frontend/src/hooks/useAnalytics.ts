import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// ANALYTICS & EVENT TRACKING SYSTEM
// Comprehensive user interaction and performance tracking
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'score' | 'count';
  timestamp: number;
}

export interface UserInteraction {
  type: 'click' | 'scroll' | 'navigation' | 'form' | 'gesture';
  target: string;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

// ----------------------------------------------------------------------------
// Analytics Manager Class
// ----------------------------------------------------------------------------
class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private interactions: UserInteraction[] = [];
  private sessionId: string;
  private userId?: string;
  private maxStorageSize = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceObserver();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Track custom events
  trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);
    this.pruneStorage();

    // Send to analytics service (placeholder)
    if (typeof window !== 'undefined') {
      console.log('[Analytics] Event:', fullEvent);
      // window.gtag?.('event', event.action, { ...event });
    }
  }

  // Track performance metrics
  trackPerformance(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);
    this.pruneStorage();

    console.log('[Analytics] Performance:', fullMetric);
  }

  // Track user interactions
  trackInteraction(interaction: Omit<UserInteraction, 'timestamp'>): void {
    const fullInteraction: UserInteraction = {
      ...interaction,
      timestamp: Date.now(),
    };

    this.interactions.push(fullInteraction);
    this.pruneStorage();

    console.log('[Analytics] Interaction:', fullInteraction);
  }

  // Track page view
  trackPageView(path: string, title?: string): void {
    this.trackEvent({
      category: 'navigation',
      action: 'page_view',
      label: path,
      metadata: { title, path },
    });
  }

  // Track errors
  trackError(error: Error, context?: string): void {
    this.trackEvent({
      category: 'error',
      action: 'exception',
      label: error.message,
      metadata: {
        stack: error.stack,
        context,
        name: error.name,
      },
    });
  }

  // Track timing (e.g., API calls, operations)
  trackTiming(category: string, variable: string, time: number, label?: string): void {
    this.trackPerformance({
      name: `${category}_${variable}`,
      value: time,
      unit: 'ms',
    });

    this.trackEvent({
      category: 'timing',
      action: variable,
      label,
      value: time,
    });
  }

  // Setup automatic performance observer
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackPerformance({
              name: 'page_load_time',
              value: navEntry.loadEventEnd - navEntry.fetchStart,
              unit: 'ms',
            });
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.trackPerformance({
            name: `resource_${resourceEntry.initiatorType}`,
            value: resourceEntry.duration,
            unit: 'ms',
          });
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.trackPerformance({
          name: 'largest_contentful_paint',
          value: lastEntry.startTime,
          unit: 'ms',
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('[Analytics] Performance observer setup failed:', error);
    }
  }

  // Prune old data to prevent memory issues
  private pruneStorage(): void {
    if (this.events.length > this.maxStorageSize) {
      this.events = this.events.slice(-this.maxStorageSize);
    }
    if (this.metrics.length > this.maxStorageSize) {
      this.metrics = this.metrics.slice(-this.maxStorageSize);
    }
    if (this.interactions.length > this.maxStorageSize) {
      this.interactions = this.interactions.slice(-this.maxStorageSize);
    }
  }

  // Get analytics data
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getInteractions(): UserInteraction[] {
    return [...this.interactions];
  }

  // Set user ID for tracking
  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Get session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventCount: this.events.length,
      metricCount: this.metrics.length,
      interactionCount: this.interactions.length,
    };
  }

  // Clear all data
  clear(): void {
    this.events = [];
    this.metrics = [];
    this.interactions = [];
  }
}

// Singleton instance
const analyticsManager = new AnalyticsManager();

// ----------------------------------------------------------------------------
// React Hook: useAnalytics
// ----------------------------------------------------------------------------
export const useAnalytics = () => {
  return {
    trackEvent: useCallback((event: Omit<AnalyticsEvent, 'timestamp'>) => {
      analyticsManager.trackEvent(event);
    }, []),

    trackPageView: useCallback((path: string, title?: string) => {
      analyticsManager.trackPageView(path, title);
    }, []),

    trackClick: useCallback((target: string, metadata?: Record<string, any>) => {
      analyticsManager.trackInteraction({
        type: 'click',
        target,
        metadata,
      });
    }, []),

    trackError: useCallback((error: Error, context?: string) => {
      analyticsManager.trackError(error, context);
    }, []),

    trackTiming: useCallback((category: string, variable: string, time: number, label?: string) => {
      analyticsManager.trackTiming(category, variable, time, label);
    }, []),

    trackPerformance: useCallback((metric: Omit<PerformanceMetric, 'timestamp'>) => {
      analyticsManager.trackPerformance(metric);
    }, []),

    setUserId: useCallback((userId: string) => {
      analyticsManager.setUserId(userId);
    }, []),

    getSessionInfo: useCallback(() => {
      return analyticsManager.getSessionInfo();
    }, []),
  };
};

// ----------------------------------------------------------------------------
// React Hook: usePageTracking
// Automatic page view tracking
// ----------------------------------------------------------------------------
export const usePageTracking = (path: string, title?: string) => {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(path, title);
  }, [path, title, trackPageView]);
};

// ----------------------------------------------------------------------------
// React Hook: useClickTracking
// Automatic click tracking on element
// ----------------------------------------------------------------------------
export const useClickTracking = (elementName: string) => {
  const { trackClick } = useAnalytics();

  return useCallback(
    (event: React.MouseEvent) => {
      const target = event.currentTarget as HTMLElement;
      trackClick(elementName, {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
      });
    },
    [elementName, trackClick]
  );
};

// ----------------------------------------------------------------------------
// React Hook: useTimingTracker
// Track execution time of operations
// ----------------------------------------------------------------------------
export const useTimingTracker = () => {
  const { trackTiming } = useAnalytics();
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const end = useCallback(
    (category: string, variable: string, label?: string) => {
      const duration = performance.now() - startTimeRef.current;
      trackTiming(category, variable, duration, label);
      return duration;
    },
    [trackTiming]
  );

  return { start, end };
};

// ----------------------------------------------------------------------------
// React Hook: useErrorTracking
// Automatic error boundary tracking
// ----------------------------------------------------------------------------
export const useErrorTracking = () => {
  const { trackError } = useAnalytics();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(event.error, 'global_error_handler');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason), 'unhandled_promise_rejection');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);
};

// ----------------------------------------------------------------------------
// Utility: Track form submissions
// ----------------------------------------------------------------------------
export const trackFormSubmit = (formName: string, success: boolean, metadata?: Record<string, any>) => {
  analyticsManager.trackEvent({
    category: 'form',
    action: success ? 'submit_success' : 'submit_error',
    label: formName,
    value: success ? 1 : 0,
    metadata,
  });
};

// ----------------------------------------------------------------------------
// Utility: Track API calls
// ----------------------------------------------------------------------------
export const trackApiCall = (
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
) => {
  analyticsManager.trackTiming('api', method, duration, endpoint);
  analyticsManager.trackEvent({
    category: 'api',
    action: method,
    label: endpoint,
    value: statusCode,
    metadata: { duration, statusCode },
  });
};

// ----------------------------------------------------------------------------
// Export analytics manager for direct access
// ----------------------------------------------------------------------------
export default analyticsManager;
