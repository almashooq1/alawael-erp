/**
 * performance.metrics.js
 * مقاييس الأداء باستخدام OpenTelemetry Meter الموجود
 */

const logger = require('../utils/logger');

let meter = null;
const metricCache = {};

/**
 * الحصول على meter من OpenTelemetry (lazy)
 */
function getMeter() {
  if (meter) return meter;

  try {
    const { getMeter: otelGetMeter } = require('./opentelemetry');
    meter = otelGetMeter('alawael-performance');
  } catch (err) {
    logger.debug('OpenTelemetry meter not available for performance metrics:', err.message);
    return null;
  }

  return meter;
}

function getHistogram(name, description, unit = 'ms') {
  if (!getMeter()) return null;
  if (!metricCache[name]) {
    metricCache[name] = meter.createHistogram(name, { description, unit });
  }
  return metricCache[name];
}

function getCounter(name, description) {
  if (!getMeter()) return null;
  if (!metricCache[name]) {
    metricCache[name] = meter.createCounter(name, { description });
  }
  return metricCache[name];
}

function recordHttpRequest({ method, route, statusCode, durationMs }) {
  try {
    const histogram = getHistogram(
      'alawael_http_request_duration',
      'Duration of HTTP requests in milliseconds'
    );
    const counter = getCounter('alawael_http_request_total', 'Total number of HTTP requests');

    const labels = { method, route, status_code: statusCode.toString() };
    if (histogram) histogram.record(durationMs, labels);
    if (counter) counter.add(1, labels);
  } catch (err) {
    logger.debug('recordHttpRequest failed:', err.message);
  }
}

function recordWebVital({ name, rating, deviceType }) {
  try {
    const counter = getCounter(
      'alawael_web_vitals_total',
      'Total number of web vital measurements'
    );
    if (counter) {
      counter.add(1, {
        name,
        rating: rating || 'unknown',
        device_type: deviceType || 'unknown',
      });
    }
  } catch (err) {
    logger.debug('recordWebVital failed:', err.message);
  }
}

function recordLighthouseScore({ url, strategy, category, score }) {
  try {
    const counter = getCounter('alawael_lighthouse_score_total', 'Lighthouse score observations');
    if (counter) {
      counter.add(score, { url, strategy, category });
    }
  } catch (err) {
    logger.debug('recordLighthouseScore failed:', err.message);
  }
}

function recordPageSpeedScore({ url, strategy, category, score }) {
  try {
    const counter = getCounter('alawael_pagespeed_score_total', 'PageSpeed score observations');
    if (counter) {
      counter.add(score, { url, strategy, category });
    }
  } catch (err) {
    logger.debug('recordPageSpeedScore failed:', err.message);
  }
}

function recordPerformanceAlert({ type, severity }) {
  try {
    const counter = getCounter(
      'alawael_performance_alert_total',
      'Total number of performance alerts'
    );
    if (counter) {
      counter.add(1, { type, severity });
    }
  } catch (err) {
    logger.debug('recordPerformanceAlert failed:', err.message);
  }
}

module.exports = {
  recordHttpRequest,
  recordWebVital,
  recordLighthouseScore,
  recordPageSpeedScore,
  recordPerformanceAlert,
};
