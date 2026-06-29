/**
 * webVitalsReporter.js
 * جمع وإرسال Web Vitals إلى Backend
 */

import { reportWebVitals } from './performanceMonitor';
import performanceService from '../services/performance.service';

const isEnabled = () => {
  if (typeof window === 'undefined') return false;
  return import.meta.env.REACT_APP_PERFORMANCE_MONITORING_ENABLED !== 'false';
};

const getSampleRate = () => {
  const rate = parseFloat(import.meta.env.REACT_APP_WEB_VITALS_SAMPLE_RATE || '0.1');
  return Number.isNaN(rate) ? 0.1 : rate;
};

/**
 * تحديد نوع الجهاز
 */
function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * جمع معلومات الاتصال
 */
function getConnectionInfo() {
  if (typeof navigator === 'undefined') return null;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;
  return {
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
  };
}

/**
 * جمع المقاييس الإضافية من Performance API
 */
function collectCustomMetrics() {
  if (typeof window === 'undefined' || !window.performance) return [];

  const metrics = [];

  // Navigation Timing
  const entries = performance.getEntriesByType('navigation');
  if (entries.length > 0) {
    const nav = entries[0];
    metrics.push(
      {
        name: 'custom',
        value: Math.round(nav.loadEventEnd - nav.startTime),
        metadata: { type: 'pageLoadTime' },
      },
      {
        name: 'custom',
        value: Math.round(nav.responseEnd - nav.requestStart),
        metadata: { type: 'serverResponseTime' },
      },
      {
        name: 'custom',
        value: Math.round(nav.domComplete - nav.domInteractive),
        metadata: { type: 'domRenderTime' },
      }
    );
  }

  // Paint Timing
  const paintEntries = performance.getEntriesByType('paint');
  paintEntries.forEach(entry => {
    metrics.push({
      name: 'custom',
      value: Math.round(entry.startTime),
      metadata: { type: entry.name },
    });
  });

  // Resource Count & Transfer Size
  const resourceEntries = performance.getEntriesByType('resource');
  if (resourceEntries.length > 0) {
    const transferSize = resourceEntries.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    metrics.push({
      name: 'custom',
      value: resourceEntries.length,
      metadata: { type: 'resourceCount' },
    });
    metrics.push({
      name: 'custom',
      value: Math.round(transferSize / 1024),
      metadata: { type: 'transferSizeKb' },
    });
  }

  // Long Tasks (TBT approximation)
  if (performance.getEntriesByType) {
    const longTasks = performance.getEntriesByType('longtask');
    if (longTasks.length > 0) {
      const totalBlockingTime = longTasks.reduce((sum, task) => {
        const duration = task.duration;
        return sum + (duration > 50 ? duration - 50 : 0);
      }, 0);
      metrics.push({
        name: 'TBT',
        value: Math.round(totalBlockingTime),
      });
    }
  }

  return metrics;
}

/**
 إرسال المقاييس إلى Backend
 */
async function sendMetrics(metrics) {
  if (!metrics || metrics.length === 0) return;

  try {
    const pageUrl = window.location.href;
    const pagePath = window.location.pathname;
    const sessionId = getSessionId();

    await performanceService.sendWebVitals({
      metrics,
      sessionId,
      pageUrl,
      pagePath,
    });
  } catch (err) {
    // لا نريد تعطيل التطبيق بسبب فشل إرسال المقاييس
    if (import.meta.env.DEV) {
      console.warn('[WebVitals] Failed to send metrics:', err.message);
    }
  }
}

/**
 * الحصول على معرف الجلسة
 */
function getSessionId() {
  if (typeof window === 'undefined') return null;
  let sessionId = window.__ALAWAEL_SESSION_ID__;
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    window.__ALAWAEL_SESSION_ID__ = sessionId;
  }
  return sessionId;
}

/**
 * بدء مراقبة Web Vitals
 */
export function startWebVitalsReporting() {
  if (!isEnabled()) return false;

  // Sampling
  const sampleRate = getSampleRate();
  if (Math.random() > sampleRate) return false;

  const collectedMetrics = [];
  let flushTimeout = null;

  const flushMetrics = () => {
    if (collectedMetrics.length === 0) return;
    const batch = collectedMetrics.splice(0);
    sendMetrics(batch);
  };

  const queueMetric = metric => {
    collectedMetrics.push(metric);
    if (collectedMetrics.length >= 10) {
      flushMetrics();
    } else {
      clearTimeout(flushTimeout);
      flushTimeout = setTimeout(flushMetrics, 5000);
    }
  };

  // Web Vitals الأساسية
  reportWebVitals(entry => {
    const metric = {
      name: entry.name,
      value: entry.value,
      rating: entry.rating,
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      deviceType: getDeviceType(),
      connectionType: getConnectionInfo()?.effectiveType,
      measuredAt: new Date().toISOString(),
    };
    queueMetric(metric);
  });

  // المقاييس الإضافية بعد انتهاء التحميل
  window.addEventListener('load', () => {
    setTimeout(() => {
      const customMetrics = collectCustomMetrics();
      customMetrics.forEach(m => {
        queueMetric({
          ...m,
          pageUrl: window.location.href,
          pagePath: window.location.pathname,
          deviceType: getDeviceType(),
          connectionType: getConnectionInfo()?.effectiveType,
          measuredAt: new Date().toISOString(),
        });
      });
    }, 0);
  });

  // إرسال قبل إغلاق الصفحة
  window.addEventListener('beforeunload', flushMetrics);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushMetrics();
  });

  return true;
}

export default startWebVitalsReporting;
