import { logger } from './infra/logger';

interface Metrics {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  totalTime: number;
  count: number;
}

const metrics: Metrics = { sent: 0, delivered: 0, read: 0, failed: 0, totalTime: 0, count: 0 };

export function recordSend() {
  metrics.sent++;
}

export function recordDelivered() {
  metrics.delivered++;
}

export function recordRead() {
  metrics.read++;
}

export function recordFailed() {
  metrics.failed++;
}

export function recordTime(ms: number) {
  metrics.totalTime += ms;
  metrics.count++;
}

export function getMetrics() {
  return {
    ...metrics,
    avgTime: metrics.count > 0 ? Math.round(metrics.totalTime / metrics.count) : 0,
    successRate: metrics.sent > 0 ? ((metrics.delivered + metrics.read) / metrics.sent * 100).toFixed(2) : '0',
  };
}

export function logMetrics() {
  const m = getMetrics();
  logger.info(m, 'Metrics snapshot');
}

export function startMetricsReporter(intervalMs = 60000) {
  setInterval(() => logMetrics(), intervalMs);
}

export function checkAlerts() {
  const m = getMetrics();
  if (m.sent > 0 && m.failed / m.sent > 0.1) {
    logger.warn({ failureRate: (m.failed / m.sent * 100).toFixed(2) }, 'High failure rate detected');
  }
  if (m.avgTime > 5000) {
    logger.warn({ avgTime: m.avgTime }, 'Slow send times detected');
  }
}
