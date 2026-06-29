/**
 * Performance Monitoring Utility
 * أداة مراقبة الأداء
 */

import logger from 'utils/logger';

/**
 * Report Web Vitals
 * يدعم web-vitals v3 و v4
 */
export const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals')
      .then(mod => {
        // web-vitals v4+ uses onXXX naming; v3 used getXXX
        const cls = mod.onCLS || mod.getCLS;
        const inp = mod.onINP || mod.getINP || mod.getFID; // INP replaced FID in v4
        const fcp = mod.onFCP || mod.getFCP;
        const lcp = mod.onLCP || mod.getLCP;
        const ttfb = mod.onTTFB || mod.getTTFB;

        if (cls) cls(onPerfEntry);
        if (inp) inp(onPerfEntry);
        if (fcp) fcp(onPerfEntry);
        if (lcp) lcp(onPerfEntry);
        if (ttfb) ttfb(onPerfEntry);
      })
      .catch(err => {
        logger.warn('Failed to load web-vitals library:', err.message);
      });
  }
};

/**
 * Log performance metrics using Navigation Timing Level 2 API
 */
export const logPerformanceMetrics = () => {
  if (typeof window === 'undefined' || !window.performance) return;

  // Use modern Navigation Timing Level 2 API (performance.timing is deprecated)
  const entries = performance.getEntriesByType('navigation');
  if (entries && entries.length > 0) {
    const nav = entries[0];
    const pageLoadTime = Math.round(nav.loadEventEnd - nav.startTime);
    const connectTime = Math.round(nav.responseEnd - nav.requestStart);
    const renderTime = Math.round(nav.domComplete - nav.domInteractive);

    logger.log(
      `⚡ Performance — Page Load: ${pageLoadTime}ms | Server Response: ${connectTime}ms | DOM Render: ${renderTime}ms`
    );
  }
};

/**
 * الحصول على تقييم المقياس (good/needs-improvement/poor)
 */
export function getMetricRating(name, value) {
  const thresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
    TBT: { good: 200, poor: 600 },
    TTI: { good: 3800, poor: 7300 },
  };

  const t = thresholds[name];
  if (!t || value === undefined || value === null) return 'unknown';

  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * الحصول على لون التقييم
 */
export function getRatingColor(rating) {
  switch (rating) {
    case 'good':
      return '#10b981'; // emerald-500
    case 'needs-improvement':
      return '#f59e0b'; // amber-500
    case 'poor':
      return '#ef4444'; // red-500
    default:
      return '#9ca3af'; // gray-400
  }
}

/**
 * الحصول على عتبات المقياس
 */
export function getMetricThresholds(name) {
  return {
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
    TBT: { good: 200, poor: 600 },
    TTI: { good: 3800, poor: 7300 },
  }[name];
}

export default {
  reportWebVitals,
  logPerformanceMetrics,
  getMetricRating,
  getRatingColor,
  getMetricThresholds,
};
