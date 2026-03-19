/**
 * Performance Monitoring Utility
 * أداة مراقبة الأداء
 */

/**
 * Measure component render time
 */
export const measureRenderTime = componentName => {
  if (typeof window === 'undefined' || !window.performance) return;

  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  const measureName = `${componentName}-render-time`;

  performance.mark(startMark);

  return () => {
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    console.log(`${componentName} render time: ${measure.duration.toFixed(2)}ms`);

    // Clean up marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  };
};

/**
 * Report Web Vitals
 */
export const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
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

  console.group('⚡ Performance Metrics');
  console.log(`Page Load Time: ${pageLoadTime}ms`);
  console.log(`Connect Time: ${connectTime}ms`);
  console.log(`Render Time: ${renderTime}ms`);
  console.groupEnd();
};

/**
 * Debounce function for performance
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Memoize expensive calculations
 */
export const memoize = fn => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

const performanceMonitor = {
  measureRenderTime,
  reportWebVitals,
  logPerformanceMetrics,
  debounce,
  throttle,
  memoize,
};

export default performanceMonitor;
