/**
 * Performance Monitoring Utility
 * أداة مراقبة الأداء
 */

import logger from 'utils/logger';

/**
 * Report Web Vitals
 */
export const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(mod => {
      // web-vitals v4+ uses onXXX naming; v3 used getXXX
      const cls = mod.onCLS || mod.getCLS;
      const inp = mod.onINP || mod.getFID; // INP replaced FID in v4
      const fcp = mod.onFCP || mod.getFCP;
      const lcp = mod.onLCP || mod.getLCP;
      const ttfb = mod.onTTFB || mod.getTTFB;
      if (cls) cls(onPerfEntry);
      if (inp) inp(onPerfEntry);
      if (fcp) fcp(onPerfEntry);
      if (lcp) lcp(onPerfEntry);
      if (ttfb) ttfb(onPerfEntry);
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
