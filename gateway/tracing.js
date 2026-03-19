/**
 * Professional Request Tracing Middleware — نظام تتبع الطلبات
 *
 * Implements distributed tracing with correlation IDs across all services.
 * Compatible with OpenTelemetry trace format.
 *
 * @module gateway/tracing
 */

const logger = require('./logger');

// ─── Trace ID Generation ─────────────────────────────────────────────────────
const generateTraceId = () => {
  const hex = n => {
    const bytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  };
  return hex(16); // 32-char hex string
};

const generateSpanId = () => {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

// ─── Active Traces Storage ───────────────────────────────────────────────────
const activeTraces = new Map();
const MAX_TRACES = 10_000;
const TRACE_TTL_MS = 5 * 60_000; // 5 minutes

// Cleanup old traces periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, trace] of activeTraces) {
    if (now - trace.startTime > TRACE_TTL_MS) {
      activeTraces.delete(id);
    }
  }
}, 60_000);

// ─── Tracing Middleware ──────────────────────────────────────────────────────

/**
 * Express middleware that adds distributed tracing headers.
 * Propagates trace context to downstream services.
 */
const tracingMiddleware = (req, res, next) => {
  // Extract or create trace context
  const traceId = req.headers['x-trace-id'] || req.headers['traceparent']?.split('-')?.[1] || generateTraceId();
  const parentSpanId = req.headers['x-span-id'] || null;
  const spanId = generateSpanId();

  // Attach to request
  req.traceId = traceId;
  req.spanId = spanId;
  req.parentSpanId = parentSpanId;

  // Set response headers
  res.setHeader('X-Trace-Id', traceId);
  res.setHeader('X-Span-Id', spanId);
  // W3C Trace Context format
  res.setHeader('traceparent', `00-${traceId}-${spanId}-01`);

  // Create trace record
  const traceRecord = {
    traceId,
    spanId,
    parentSpanId,
    service: 'api-gateway',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    startTime: Date.now(),
    endTime: null,
    duration: null,
    statusCode: null,
    error: null,
    spans: [],
  };

  if (activeTraces.size < MAX_TRACES) {
    activeTraces.set(traceId, traceRecord);
  }

  // Intercept response to record completion
  const originalEnd = res.end;
  res.end = function (...args) {
    traceRecord.endTime = Date.now();
    traceRecord.duration = traceRecord.endTime - traceRecord.startTime;
    traceRecord.statusCode = res.statusCode;

    // Log trace summary
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`[TRACE] ${req.method} ${req.path}`, {
      traceId,
      spanId,
      statusCode: res.statusCode,
      durationMs: traceRecord.duration,
      service: traceRecord.service,
    });

    return originalEnd.apply(this, args);
  };

  next();
};

// ─── Trace Propagation Headers ───────────────────────────────────────────────

/**
 * Generate headers to propagate trace context to downstream services.
 * Use when making HTTP calls from the gateway to backend services.
 */
const propagateTraceHeaders = req => ({
  'X-Trace-Id': req.traceId,
  'X-Span-Id': req.spanId,
  'X-Parent-Span-Id': req.parentSpanId,
  traceparent: `00-${req.traceId}-${req.spanId}-01`,
  'X-Forwarded-For': req.ip,
  'X-Request-Id': req.requestId || req.traceId,
});

// ─── Trace Query API ─────────────────────────────────────────────────────────

/**
 * Get a trace by ID.
 */
const getTrace = traceId => activeTraces.get(traceId) || null;

/**
 * Get recent traces with optional filters.
 */
const getRecentTraces = ({ limit = 50, method, path, minDuration, statusCode } = {}) => {
  let traces = [...activeTraces.values()].filter(t => t.endTime !== null);

  if (method) traces = traces.filter(t => t.method === method);
  if (path) traces = traces.filter(t => t.path.includes(path));
  if (minDuration) traces = traces.filter(t => t.duration >= minDuration);
  if (statusCode) traces = traces.filter(t => t.statusCode === statusCode);

  return traces
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit)
    .map(({ spans, ...t }) => t); // Exclude spans for lightweight response
};

/**
 * Get trace statistics.
 */
const getTraceStats = () => {
  const completed = [...activeTraces.values()].filter(t => t.endTime !== null);
  if (completed.length === 0) return { count: 0 };

  const durations = completed.map(t => t.duration);
  const statusCodes = {};
  completed.forEach(t => {
    const code = String(t.statusCode);
    statusCodes[code] = (statusCodes[code] || 0) + 1;
  });

  return {
    count: completed.length,
    active: activeTraces.size - completed.length,
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p95Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] || 0,
    p99Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)] || 0,
    maxDuration: Math.max(...durations),
    statusCodes,
  };
};

module.exports = {
  tracingMiddleware,
  propagateTraceHeaders,
  getTrace,
  getRecentTraces,
  getTraceStats,
  generateTraceId,
  generateSpanId,
};
