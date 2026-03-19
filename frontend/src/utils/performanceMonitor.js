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
 * Log performance metrics
 */
export const logPerformanceMetrics = () => {
  if (typeof window === 'undefined' || !window.performance) return;

  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;

  logger.log(
    `⚡ Performance — Page Load: ${pageLoadTime}ms | Server Response: ${connectTime}ms | DOM Render: ${renderTime}ms`
  );
};
