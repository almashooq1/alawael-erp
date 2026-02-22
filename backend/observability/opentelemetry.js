/**
 * OpenTelemetry Integration - نظام التتبع الموزع
 * Professional APM Integration for Alawael ERP
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

// Configuration
const config = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'alawael-erp-backend',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Exporter endpoints
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  
  // Sampling
  traceSampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '1.0'),
  
  // Export intervals
  metricExportInterval: parseInt(process.env.METRIC_EXPORT_INTERVAL || '60000'),
};

// Create Resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'alawael-erp',
  [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'local',
});

// Trace Exporters
const createTraceExporters = () => {
  const exporters = [];
  
  // OTLP Exporter (for backends like Jaeger, Tempo, etc.)
  if (process.env.OTEL_EXPORTER_OTLP_ENABLED !== 'false') {
    exporters.push(
      new OTLPTraceExporter({
        url: config.otlpEndpoint,
        headers: {
          'api-key': process.env.OTEL_API_KEY || '',
        },
      })
    );
  }
  
  // Jaeger Exporter
  if (process.env.JAEGER_ENABLED === 'true') {
    exporters.push(
      new JaegerExporter({
        endpoint: config.jaegerEndpoint,
      })
    );
  }
  
  return exporters;
};

// Metric Readers
const createMetricReaders = () => {
  const readers = [];
  
  // Prometheus Exporter (pull-based)
  readers.push(
    new PrometheusExporter({
      port: config.prometheusPort,
      endpoint: '/metrics',
    })
  );
  
  // OTLP Metric Exporter (push-based)
  if (process.env.OTEL_METRICS_EXPORT_ENABLED === 'true') {
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: config.otlpEndpoint,
        }),
        exportIntervalMillis: config.metricExportInterval,
      })
    );
  }
  
  return readers;
};

// Custom Span Processor with filtering
class FilteringSpanProcessor extends BatchSpanProcessor {
  constructor(exporter, config = {}) {
    super(exporter, config);
    this.excludedRoutes = new Set([
      '/health',
      '/metrics',
      '/favicon.ico',
      '/robots.txt',
    ]);
  }
  
  onStart(span, parentContext) {
    // Add custom attributes to all spans
    span.setAttribute('service.version', config.serviceVersion);
    span.setAttribute('environment', config.environment);
    
    // Add user context if available
    const userId = parentContext?.userId;
    if (userId) {
      span.setAttribute('user.id', userId);
    }
    
    super.onStart(span, parentContext);
  }
  
  onEnd(span) {
    // Filter out health check spans
    const httpRoute = span.attributes['http.route'];
    if (httpRoute && this.excludedRoutes.has(httpRoute)) {
      return;
    }
    
    super.onEnd(span);
  }
}

// Initialize OpenTelemetry SDK
let sdk = null;

const initializeOpenTelemetry = async () => {
  if (sdk) {
    return sdk;
  }
  
  try {
    const traceExporters = createTraceExporters();
    const metricReaders = createMetricReaders();
    
    // Create span processors for each exporter
    const spanProcessors = traceExporters.map(
      (exporter) => new FilteringSpanProcessor(exporter, {
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
        maxQueueSize: 2048,
      })
    );
    
    sdk = new NodeSDK({
      resource,
      spanProcessors,
      metricReader: metricReaders[0], // Use Prometheus as primary
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable instrumentations we don't need
          '@opentelemetry/instrumentation-dns': { enabled: false },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-mongodb': { enabled: true },
          '@opentelemetry/instrumentation-mongoose': { enabled: true },
          '@opentelemetry/instrumentation-redis-4': { enabled: true },
          '@opentelemetry/instrumentation-ioredis': { enabled: true },
          '@opentelemetry/instrumentation-grpc': { enabled: true },
        }),
      ],
    });
    
    await sdk.start();
    
    console.log('✅ OpenTelemetry initialized successfully');
    console.log(`📊 Metrics available at: http://localhost:${config.prometheusPort}/metrics`);
    
    return sdk;
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry:', error);
    throw error;
  }
};

// Graceful shutdown
const shutdownOpenTelemetry = async () => {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.log('✅ OpenTelemetry shutdown complete');
    } catch (error) {
      console.error('❌ Error during OpenTelemetry shutdown:', error);
    }
  }
};

// Get tracer for custom instrumentation
const getTracer = (name = config.serviceName, version = config.serviceVersion) => {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name, version);
};

// Get meter for custom metrics
const getMeter = (name = config.serviceName, version = config.serviceVersion) => {
  const { metrics } = require('@opentelemetry/api');
  return metrics.getMeter(name, version);
};

// Custom metrics for Alawael ERP
const createCustomMetrics = () => {
  const meter = getMeter();
  
  return {
    // API Request Duration
    apiRequestDuration: meter.createHistogram('alawael_api_request_duration', {
      description: 'Duration of API requests in milliseconds',
      unit: 'ms',
    }),
    
    // API Request Counter
    apiRequestCounter: meter.createCounter('alawael_api_requests_total', {
      description: 'Total number of API requests',
    }),
    
    // Active Users
    activeUsers: meter.createUpDownCounter('alawael_active_users', {
      description: 'Number of active users',
    }),
    
    // Database Query Duration
    dbQueryDuration: meter.createHistogram('alawael_db_query_duration', {
      description: 'Duration of database queries in milliseconds',
      unit: 'ms',
    }),
    
    // Cache Hit Rate
    cacheHits: meter.createCounter('alawael_cache_hits_total', {
      description: 'Total cache hits',
    }),
    
    cacheMisses: meter.createCounter('alawael_cache_misses_total', {
      description: 'Total cache misses',
    }),
    
    // Business Metrics
    ordersTotal: meter.createCounter('alawael_orders_total', {
      description: 'Total number of orders',
    }),
    
    revenueTotal: meter.createCounter('alawael_revenue_total', {
      description: 'Total revenue in SAR',
    }),
    
    // Error Counter
    errorCounter: meter.createCounter('alawael_errors_total', {
      description: 'Total number of errors',
    }),
  };
};

// Express middleware for automatic tracing
const tracingMiddleware = (req, res, next) => {
  const tracer = getTracer();
  const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.route?.path || req.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.user_agent': req.get('user-agent'),
      'http.request_content_length': req.get('content-length'),
    },
  });
  
  // Store span in request for later use
  req.span = span;
  
  // Add response listener
  res.on('finish', () => {
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.response_content_length': res.get('content-length'),
    });
    
    if (res.statusCode >= 400) {
      span.setStatus({ code: 2, message: `HTTP ${res.statusCode}` });
    } else {
      span.setStatus({ code: 1 });
    }
    
    span.end();
  });
  
  next();
};

module.exports = {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  getTracer,
  getMeter,
  createCustomMetrics,
  tracingMiddleware,
  config,
};