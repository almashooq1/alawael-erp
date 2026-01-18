"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSend = recordSend;
exports.recordDelivered = recordDelivered;
exports.recordRead = recordRead;
exports.recordFailed = recordFailed;
exports.recordTime = recordTime;
exports.getMetrics = getMetrics;
exports.logMetrics = logMetrics;
exports.startMetricsReporter = startMetricsReporter;
exports.checkAlerts = checkAlerts;
const logger_1 = require("./infra/logger");
const metrics = { sent: 0, delivered: 0, read: 0, failed: 0, totalTime: 0, count: 0 };
function recordSend() {
    metrics.sent++;
}
function recordDelivered() {
    metrics.delivered++;
}
function recordRead() {
    metrics.read++;
}
function recordFailed() {
    metrics.failed++;
}
function recordTime(ms) {
    metrics.totalTime += ms;
    metrics.count++;
}
function getMetrics() {
    return {
        ...metrics,
        avgTime: metrics.count > 0 ? Math.round(metrics.totalTime / metrics.count) : 0,
        successRate: metrics.sent > 0 ? ((metrics.delivered + metrics.read) / metrics.sent * 100).toFixed(2) : '0',
    };
}
function logMetrics() {
    const m = getMetrics();
    logger_1.logger.info(m, 'Metrics snapshot');
}
function startMetricsReporter(intervalMs = 60000) {
    setInterval(() => logMetrics(), intervalMs);
}
function checkAlerts() {
    const m = getMetrics();
    if (m.sent > 0 && m.failed / m.sent > 0.1) {
        logger_1.logger.warn({ failureRate: (m.failed / m.sent * 100).toFixed(2) }, 'High failure rate detected');
    }
    if (m.avgTime > 5000) {
        logger_1.logger.warn({ avgTime: m.avgTime }, 'Slow send times detected');
    }
}
