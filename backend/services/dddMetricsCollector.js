'use strict';

/**
 * DDD Metrics Collector
 * ═══════════════════════════════════════════════════════════════════════
 * Platform-wide metrics collection, request performance tracking,
 * domain operation monitoring, and Prometheus-compatible output.
 *
 * Features:
 *  - Request metrics middleware (route, method, status, duration)
 *  - Domain operation metrics
 *  - Counter, gauge, histogram, timer metric types
 *  - In-memory hot path + periodic MongoDB persistence
 *  - Prometheus text format export
 *  - Metrics dashboard with aggregations
 *  - Tag-based filtering & grouping
 *
 * @module dddMetricsCollector
 */

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Metric Entry Model
   ═══════════════════════════════════════════════════════════════════════ */
const metricSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['counter', 'gauge', 'histogram', 'summary', 'timer'],
      required: true,
    },
    value: { type: Number, required: true },
    tags: { type: Map, of: String, default: {} },
    domain: String,
    branchId: { type: mongoose.Schema.Types.ObjectId },
    route: String,
    method: String,
    statusCode: Number,
    durationMs: Number,
    bucket: String, // time bucket for aggregation (e.g., '2026-04-09T14:00')
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

metricSchema.index({ name: 1, createdAt: -1 });
metricSchema.index({ name: 1, bucket: 1 });
metricSchema.index({ domain: 1, createdAt: -1 });
metricSchema.index({ route: 1, method: 1, createdAt: -1 });

const DDDMetricEntry =
  mongoose.models.DDDMetricEntry || mongoose.model('DDDMetricEntry', metricSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Metric Types & In-Memory Buffers
   ═══════════════════════════════════════════════════════════════════════ */
const METRIC_TYPES = ['counter', 'gauge', 'histogram', 'summary', 'timer'];

/** In-memory counters for hot-path metrics */
const memCounters = {};
const memGauges = {};
const memHistograms = {};
const memBuffer = [];
const BUFFER_FLUSH_SIZE = 100;
const BUFFER_FLUSH_INTERVAL = 60000; // 1 minute

function getBucket() {
  const d = new Date();
  return `${d.toISOString().slice(0, 13)}:00`; // hourly bucket
}

/* ═══════════════════════════════════════════════════════════════════════
   3. Core Metric Operations
   ═══════════════════════════════════════════════════════════════════════ */
function incrementCounter(name, value = 1, tags = {}) {
  const key = `${name}:${JSON.stringify(tags)}`;
  memCounters[key] = (memCounters[key] || 0) + value;
  bufferMetric({ name, type: 'counter', value, tags });
}

function setGauge(name, value, tags = {}) {
  const key = `${name}:${JSON.stringify(tags)}`;
  memGauges[key] = value;
  bufferMetric({ name, type: 'gauge', value, tags });
}

function recordHistogram(name, value, tags = {}) {
  const key = `${name}:${JSON.stringify(tags)}`;
  if (!memHistograms[key]) memHistograms[key] = [];
  memHistograms[key].push(value);
  if (memHistograms[key].length > 1000) memHistograms[key] = memHistograms[key].slice(-500);
  bufferMetric({ name, type: 'histogram', value, tags });
}

function recordTimer(name, durationMs, tags = {}) {
  recordHistogram(name, durationMs, { ...tags, unit: 'ms' });
}

/**
 * Generic metric recording function.
 */
function recordMetric(name, value, type = 'counter', tags = {}) {
  switch (type) {
    case 'counter':
      incrementCounter(name, value, tags);
      break;
    case 'gauge':
      setGauge(name, value, tags);
      break;
    case 'histogram':
      recordHistogram(name, value, tags);
      break;
    case 'timer':
      recordTimer(name, value, tags);
      break;
    default:
      incrementCounter(name, value, tags);
  }
}

function bufferMetric(entry) {
  memBuffer.push({
    ...entry,
    bucket: getBucket(),
    createdAt: new Date(),
  });

  if (memBuffer.length >= BUFFER_FLUSH_SIZE) {
    flushBuffer();
  }
}

async function flushBuffer() {
  if (memBuffer.length === 0) return { flushed: 0 };
  const toFlush = memBuffer.splice(0, memBuffer.length);
  try {
    await DDDMetricEntry.insertMany(toFlush, { ordered: false });
    return { flushed: toFlush.length };
  } catch {
    return { flushed: 0, error: 'flush failed' };
  }
}

/* Start periodic flush */
let _flushInterval = null;
function startPeriodicFlush() {
  if (_flushInterval) return;
  _flushInterval = setInterval(() => flushBuffer(), BUFFER_FLUSH_INTERVAL);
  if (_flushInterval.unref) _flushInterval.unref();
}
startPeriodicFlush();

/* ═══════════════════════════════════════════════════════════════════════
   4. Express Metrics Middleware
   ═══════════════════════════════════════════════════════════════════════ */
function metricsMiddleware(options = {}) {
  const { prefix = 'http', ignorePaths = ['/health', '/metrics'] } = options;

  return (req, res, next) => {
    if (ignorePaths.some(p => req.path.startsWith(p))) return next();

    const start = Date.now();

    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path || 'unknown';
      const method = req.method;
      const status = res.statusCode;

      incrementCounter(`${prefix}.requests.total`, 1, { method, route, status: String(status) });
      recordTimer(`${prefix}.request.duration`, duration, { method, route });

      if (status >= 400) {
        incrementCounter(`${prefix}.errors.total`, 1, { method, route, status: String(status) });
      }

      /* Domain tag from path */
      const dddMatch = req.path.match(/\/api\/ddd-platform\/([a-z-]+)/);
      if (dddMatch) {
        incrementCounter('ddd.domain.requests', 1, { domain: dddMatch[1], method });
        recordTimer('ddd.domain.duration', duration, { domain: dddMatch[1] });
      }

      originalEnd.apply(res, args);
    };

    next();
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Prometheus Text Format
   ═══════════════════════════════════════════════════════════════════════ */
function getPrometheusOutput() {
  const lines = [];

  /* Counters */
  lines.push('# TYPE ddd_counters counter');
  for (const [key, value] of Object.entries(memCounters)) {
    const [name, tagsJson] = splitKeyTags(key);
    const labels = formatLabels(tagsJson);
    lines.push(`${sanitizeName(name)}${labels} ${value}`);
  }

  /* Gauges */
  lines.push('# TYPE ddd_gauges gauge');
  for (const [key, value] of Object.entries(memGauges)) {
    const [name, tagsJson] = splitKeyTags(key);
    const labels = formatLabels(tagsJson);
    lines.push(`${sanitizeName(name)}${labels} ${value}`);
  }

  /* Histograms (summary stats) */
  for (const [key, values] of Object.entries(memHistograms)) {
    if (values.length === 0) continue;
    const [name, tagsJson] = splitKeyTags(key);
    const labels = formatLabels(tagsJson);
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((s, v) => s + v, 0);

    lines.push(`# TYPE ${sanitizeName(name)} summary`);
    lines.push(`${sanitizeName(name)}_count${labels} ${sorted.length}`);
    lines.push(`${sanitizeName(name)}_sum${labels} ${sum}`);
    lines.push(
      `${sanitizeName(name)}{quantile="0.5"${labels ? ',' + labels.slice(1, -1) : ''}} ${sorted[Math.floor(sorted.length * 0.5)]}`
    );
    lines.push(
      `${sanitizeName(name)}{quantile="0.95"${labels ? ',' + labels.slice(1, -1) : ''}} ${sorted[Math.floor(sorted.length * 0.95)]}`
    );
    lines.push(
      `${sanitizeName(name)}{quantile="0.99"${labels ? ',' + labels.slice(1, -1) : ''}} ${sorted[Math.floor(sorted.length * 0.99)]}`
    );
  }

  return lines.join('\n');
}

function splitKeyTags(key) {
  const idx = key.indexOf(':');
  if (idx === -1) return [key, '{}'];
  return [key.slice(0, idx), key.slice(idx + 1)];
}

function formatLabels(tagsJson) {
  try {
    const tags = JSON.parse(tagsJson);
    const entries = Object.entries(tags);
    if (entries.length === 0) return '';
    return '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}';
  } catch {
    return '';
  }
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9_:]/g, '_');
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Metrics Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getMetricsDashboard() {
  /* Flush current buffer first */
  await flushBuffer();

  const now = new Date();
  const oneHourAgo = new Date(now - 3600000);

  const [totalMetrics, recentByType, topRoutes, domainMetrics] = await Promise.all([
    DDDMetricEntry.countDocuments({ isDeleted: { $ne: true } }),
    DDDMetricEntry.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: oneHourAgo } } },
      { $group: { _id: '$type', count: { $sum: 1 }, avgValue: { $avg: '$value' } } },
    ]),
    DDDMetricEntry.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          name: 'http.requests.total',
          createdAt: { $gte: oneHourAgo },
        },
      },
      {
        $group: { _id: '$route', count: { $sum: '$value' }, avgDuration: { $avg: '$durationMs' } },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    DDDMetricEntry.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          domain: { $ne: null },
          createdAt: { $gte: oneHourAgo },
        },
      },
      { $group: { _id: '$domain', requests: { $sum: 1 }, avgDuration: { $avg: '$value' } } },
      { $sort: { requests: -1 } },
    ]),
  ]);

  return {
    totalMetrics,
    inMemory: {
      counters: Object.keys(memCounters).length,
      gauges: Object.keys(memGauges).length,
      histograms: Object.keys(memHistograms).length,
      bufferSize: memBuffer.length,
    },
    lastHour: {
      byType: recentByType.reduce(
        (m, r) => ({
          ...m,
          [r._id]: { count: r.count, avgValue: Math.round(r.avgValue * 100) / 100 },
        }),
        {}
      ),
      topRoutes,
      domainMetrics,
    },
  };
}

async function queryMetrics(name, options = {}) {
  const query = { name, isDeleted: { $ne: true } };
  if (options.from) query.createdAt = { $gte: new Date(options.from) };
  if (options.to) query.createdAt = { ...query.createdAt, $lte: new Date(options.to) };
  if (options.domain) query.domain = options.domain;

  const limit = Math.min(parseInt(options.limit, 10) || 100, 1000);
  return DDDMetricEntry.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createMetricsRouter() {
  const router = Router();

  /* Prometheus endpoint */
  router.get('/metrics/prometheus', (_req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(getPrometheusOutput());
  });

  /* Dashboard */
  router.get('/metrics/dashboard', async (_req, res) => {
    try {
      const dashboard = await getMetricsDashboard();
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Record metric */
  router.post('/metrics/record', async (req, res) => {
    try {
      const { name, value, type, tags } = req.body;
      recordMetric(name, value, type, tags);
      res.json({ success: true, message: 'Metric recorded' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Query metrics */
  router.get('/metrics/query', async (req, res) => {
    try {
      const metrics = await queryMetrics(req.query.name, req.query);
      res.json({ success: true, count: metrics.length, metrics });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Flush buffer */
  router.post('/metrics/flush', async (_req, res) => {
    try {
      const result = await flushBuffer();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* In-memory state */
  router.get('/metrics/memory', (_req, res) => {
    res.json({
      success: true,
      counters: Object.keys(memCounters).length,
      gauges: Object.keys(memGauges).length,
      histograms: Object.keys(memHistograms).length,
      bufferSize: memBuffer.length,
    });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDMetricEntry,
  METRIC_TYPES,
  incrementCounter,
  setGauge,
  recordHistogram,
  recordTimer,
  recordMetric,
  flushBuffer,
  metricsMiddleware,
  getPrometheusOutput,
  getMetricsDashboard,
  queryMetrics,
  createMetricsRouter,
};
