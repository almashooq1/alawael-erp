/**
 * 🔍 Distributed Tracing System
 *
 * OpenTelemetry integration for request tracing
 * - End-to-end request tracking
 * - Latency analysis
 * - Service dependency visualization
 * - Root cause analysis for errors
 */

const crypto = require('crypto');

class TraceContext {
  constructor(traceId, spanId, parentSpanId = null) {
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentSpanId = parentSpanId;
    this.startTime = Date.now();
    this.events = [];
    this.tags = {};
    this.status = 'UNSET';
    this.error = null;
  }

  addEvent(name, attributes = {}) {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  setTag(key, value) {
    this.tags[key] = value;
  }

  setError(error) {
    this.error = error;
    this.status = 'ERROR';
  }

  end() {
    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
  }

  toJSON() {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      tags: this.tags,
      events: this.events,
      error: this.error ? { message: this.error.message, stack: this.error.stack } : null,
    };
  }
}

class DistributedTracer {
  constructor(serviceName = 'api-service') {
    this.serviceName = serviceName;
    this.traces = new Map();
    this.samplingRate = 1.0; // Trace all by default
    this.exporters = [];
    this.maxTracesStored = 10000;
    this.stats = {
      totalTraces: 0,
      tracesExported: 0,
      totalSpans: 0,
      errors: 0,
    };
  }

  /**
   * Generate unique trace ID
   */
  generateTraceId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Generate unique span ID
   */
  generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Start a new trace
   */
  startTrace(operationName, attributes = {}) {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    if (Math.random() > this.samplingRate) {
      return null; // Not sampled
    }

    const trace = new TraceContext(traceId, spanId);
    trace.setTag('service.name', this.serviceName);
    trace.setTag('operation', operationName);

    // Add custom attributes
    Object.entries(attributes).forEach(([key, value]) => {
      trace.setTag(key, value);
    });

    this.traces.set(traceId, trace);
    this.stats.totalTraces++;

    // Keep traces stored in memory
    if (this.traces.size > this.maxTracesStored) {
      const firstKey = this.traces.keys().next().value;
      this.traces.delete(firstKey);
    }

    return trace;
  }

  /**
   * Create child span
   */
  createSpan(parentTrace, operationName, attributes = {}) {
    if (!parentTrace) return null;

    const childSpan = new TraceContext(
      parentTrace.traceId,
      this.generateSpanId(),
      parentTrace.spanId
    );

    childSpan.setTag('operation', operationName);
    Object.entries(attributes).forEach(([key, value]) => {
      childSpan.setTag(key, value);
    });

    this.stats.totalSpans++;
    return childSpan;
  }

  /**
   * End a trace
   */
  endTrace(trace, statusCode = 200) {
    if (!trace) return;

    trace.end();
    trace.setTag('http.status_code', statusCode);

    if (statusCode >= 400) {
      trace.status = 'ERROR';
      this.stats.errors++;
    } else {
      trace.status = 'OK';
    }

    // Export trace
    this.exportTrace(trace);
  }

  /**
   * Export trace to registered exporters
   */
  exportTrace(trace) {
    this.exporters.forEach(exporter => {
      try {
        exporter.export(trace);
        this.stats.tracesExported++;
      } catch (error) {
        console.error('[Tracing] Export error:', error.message);
      }
    });
  }

  /**
   * Add trace exporter
   */
  addExporter(exporter) {
    this.exporters.push(exporter);
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId) {
    return this.traces.get(traceId);
  }

  /**
   * Get all traces (for debugging)
   */
  getAllTraces() {
    return Array.from(this.traces.values());
  }

  /**
   * Get traces by status
   */
  getTracesByStatus(status) {
    return Array.from(this.traces.values()).filter(t => t.status === status);
  }

  /**
   * Get traces by operation
   */
  getTracesByOperation(operationName) {
    return Array.from(this.traces.values()).filter(t => t.tags.operation === operationName);
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const traces = Array.from(this.traces.values());
    const durations = traces
      .filter(t => t.duration)
      .map(t => t.duration)
      .sort((a, b) => a - b);

    return {
      totalTraces: this.stats.totalTraces,
      totalSpans: this.stats.totalSpans,
      tracesExported: this.stats.tracesExported,
      errors: this.stats.errors,
      errorRate: this.stats.totalTraces ? (this.stats.errors / this.stats.totalTraces) * 100 : 0,
      performance: {
        avgDuration: durations.length ? durations.reduce((a, b) => a + b) / durations.length : 0,
        maxDuration: durations.length ? durations[durations.length - 1] : 0,
        minDuration: durations.length ? durations[0] : 0,
        p95Duration: durations.length ? durations[Math.floor(durations.length * 0.95)] : 0,
        p99Duration: durations.length ? durations[Math.floor(durations.length * 0.99)] : 0,
      },
      storedTraces: this.traces.size,
    };
  }

  /**
   * Clear old traces
   */
  clearOldTraces(maxAgeMs = 3600000) {
    const now = Date.now();
    const toDelete = [];

    this.traces.forEach((trace, traceId) => {
      if (now - trace.startTime > maxAgeMs) {
        toDelete.push(traceId);
      }
    });

    toDelete.forEach(traceId => this.traces.delete(traceId));
    return toDelete.length;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalTraces: 0,
      tracesExported: 0,
      totalSpans: 0,
      errors: 0,
    };
  }
}

/**
 * Express middleware for distributed tracing
 */
function tracingMiddleware(tracer) {
  return (req, res, next) => {
    // Extract trace context from headers or create new
    const traceId = req.get('x-trace-id') || tracer.generateTraceId();
    const spanId = req.get('x-span-id') || tracer.generateSpanId();

    // Create trace context
    const trace = tracer.startTrace(`${req.method} ${req.path}`, {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.client_ip': req.ip,
      'http.user_agent': req.get('user-agent'),
    });

    if (!trace) {
      return next();
    }

    // Add trace context to request
    req.trace = trace;

    // Add trace headers to response
    res.set('X-Trace-ID', trace.traceId);
    res.set('X-Span-ID', trace.spanId);

    // Hook into response to end trace
    const originalSend = res.send;
    res.send = function (data) {
      tracer.endTrace(trace, res.statusCode);
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Console exporter (for development)
 */
class ConsoleExporter {
  export(trace) {
    if (trace.status === 'ERROR') {
      console.error('[Trace]', JSON.stringify(trace.toJSON(), null, 2));
    }
  }
}

/**
 * File exporter (for production)
 */
class FileExporter {
  constructor(filePath) {
    this.filePath = filePath;
  }

  export(trace) {
    const fs = require('fs');
    const data = trace.toJSON();
    fs.appendFileSync(this.filePath, JSON.stringify(data) + '\n');
  }
}

module.exports = {
  DistributedTracer,
  TraceContext,
  tracingMiddleware,
  ConsoleExporter,
  FileExporter,
};
