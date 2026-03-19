# OpenTelemetry Tracing Setup

## Overview

OpenTelemetry provides distributed tracing capabilities for monitoring request flows across services.

## Architecture

```
Client Request → Dashboard API → Quality Service → Backend Services
      ↓              ↓                 ↓                  ↓
   Traces ────────> OpenTelemetry Collector ────────> Jaeger/Zipkin
                                                         ↓
                                                    Grafana Tempo
```

## Components

1. **OpenTelemetry SDK**: Instrument Node.js applications
2. **OpenTelemetry Collector**: Receive, process, and export traces
3. **Jaeger**: Trace visualization and analysis
4. **Grafana Tempo**: Long-term trace storage (optional)

## Quick Setup

### 1. Start Jaeger (All-in-One)

```bash
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

Access Jaeger UI: http://localhost:16686

### 2. Install Dependencies

```bash
cd dashboard/server
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-jaeger \
  @opentelemetry/exporter-prometheus \
  @opentelemetry/instrumentation-http \
  @opentelemetry/instrumentation-express
```

### 3. Create Tracing Configuration

Create `dashboard/server/tracing.js`:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

// Configure Jaeger exporter
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  serviceName: 'alawael-dashboard'
});

// Configure Prometheus exporter for metrics
const prometheusExporter = new PrometheusExporter(
  {
    port: 9464,
    endpoint: '/metrics'
  },
  () => {
    console.log('OpenTelemetry metrics available at http://localhost:9464/metrics');
  }
);

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'alawael-dashboard',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
  }),
  traceExporter: jaegerExporter,
  metricReader: prometheusExporter,
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingPaths: ['/health', '/metrics']
    }),
    new ExpressInstrumentation()
  ]
});

// Start the SDK
sdk.start()
  .then(() => console.log('✅ OpenTelemetry tracing initialized'))
  .catch((error) => console.error('❌ Error initializing tracing:', error));

// Gracefully shut down on exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
```

### 4. Enable Tracing in Application

Update `dashboard/server/index.js` - **add at the very top**:

```javascript
// IMPORTANT: Must be first import
require('./tracing');

const express = require('express');
// ... rest of imports
```

## Manual Instrumentation

For custom spans and detailed tracing:

```javascript
const { trace, context } = require('@opentelemetry/api');

// Get tracer
const tracer = trace.getTracer('quality-service', '1.0.0');

// Create a span
async function runQualityCheck(serviceName) {
  const span = tracer.startSpan('quality.check', {
    attributes: {
      'service.name': serviceName,
      'operation': 'test-execution'
    }
  });

  try {
    // Your operation here
    const result = await executeTests(serviceName);

    span.setAttribute('test.passed', result.passed);
    span.setAttribute('test.failed', result.failed);
    span.setStatus({ code: 0 }); // OK

    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR
    throw error;
  } finally {
    span.end();
  }
}

// Nested spans for detailed tracing
async function complexOperation() {
  const parentSpan = tracer.startSpan('complex.operation');

  return context.with(trace.setSpan(context.active(), parentSpan), async () => {
    try {
      // Child span 1
      const span1 = tracer.startSpan('step.1');
      await step1();
      span1.end();

      // Child span 2
      const span2 = tracer.startSpan('step.2');
      await step2();
      span2.end();

      return result;
    } finally {
      parentSpan.end();
    }
  });
}
```

## Integrated OpenTelemetry + Jaeger in Docker Compose

Add to `monitoring/docker-compose.yml`:

```yaml
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: alawael-jaeger
    restart: unless-stopped
    ports:
      - "5775:5775/udp"
      - "6831:6831/udp"
      - "6832:6832/udp"
      - "5778:5778"
      - "16686:16686"  # Jaeger UI
      - "14250:14250"
      - "14268:14268"
      - "14269:14269"
      - "9411:9411"
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - monitoring

  otel-collector:
    image: otel/opentelemetry-collector:latest
    container_name: alawael-otel-collector
    restart: unless-stopped
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./opentelemetry/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
      - "8888:8888"   # Prometheus metrics
      - "8889:8889"   # Prometheus exporter
      - "13133:13133" # Health check
    depends_on:
      - jaeger
    networks:
      - monitoring
```

## OpenTelemetry Collector Configuration

Create `monitoring/opentelemetry/otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  prometheus:
    endpoint: "0.0.0.0:8889"

  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger, logging]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, logging]
```

## Grafana Integration

### Add Jaeger Data Source in Grafana

1. Open Grafana → Configuration → Data Sources
2. Add data source → Jaeger
3. Configure:
   - **URL**: http://jaeger:16686
   - **Access**: Server (default)
4. Save & Test

### Create Trace Dashboard

1. Create new dashboard
2. Add panel → Visualization: Trace
3. Query: Select service and operation
4. View distributed traces with timing information

## Common Trace Patterns

### HTTP Requests

```javascript
app.use((req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('http.route', req.route?.path || req.path);
    span.setAttribute('http.user_agent', req.get('user-agent'));
  }
  next();
});
```

### Database Queries

```javascript
const span = tracer.startSpan('db.query', {
  attributes: {
    'db.system': 'sqlite',
    'db.statement': query
  }
});

try {
  const result = await database.query(query);
  span.setAttribute('db.rows', result.length);
  return result;
} finally {
  span.end();
}
```

### External API Calls

```javascript
const span = tracer.startSpan('http.client.request', {
  attributes: {
    'http.method': 'POST',
    'http.url': apiUrl,
    'peer.service': 'external-api'
  }
});

try {
  const response = await axios.post(apiUrl, data);
  span.setAttribute('http.status_code', response.status);
  return response.data;
} catch (error) {
  span.recordException(error);
  throw error;
} finally {
  span.end();
}
```

## Trace Analysis

### Key Metrics to Monitor

1. **Latency Distribution**: P50, P95, P99
2. **Error Rate**: Failed spans / Total spans
3. **Throughput**: Requests per second
4. **Service Dependencies**: Service call graph
5. **Slow Traces**: Traces exceeding threshold

### Using Jaeger UI

**Find Slow Requests:**
1. Select service
2. Set min duration filter
3. Analyze trace waterfall
4. Identify bottlenecks

**Error Analysis:**
1. Filter by tag: error=true
2. View error messages
3. Check stack traces
4. Correlate with logs

**Service Map:**
1. View → Dependencies
2. Analyze service relationships
3. Identify critical paths

## Best Practices

### 1. Sampling Strategy

```javascript
// Production: Sample 10% of traces
const sampler = new TraceIdRatioBasedSampler(0.1);

// Development: Sample all traces
const sampler = new AlwaysOnSampler();
```

### 2. Add Context

```javascript
span.setAttributes({
  'user.id': userId,
  'organization.id': orgId,
  'request.id': requestId,
  'environment': process.env.NODE_ENV
});
```

### 3. Span Naming

Use consistent, hierarchical span names:
- ✅ `quality.check.execute`
- ✅ `api.service.get`
- ❌ `function1`
- ❌ `processData`

### 4. Error Handling

Always record exceptions:
```javascript
catch (error) {
  span.recordException(error);
  span.setStatus({ code: 2, message: error.message });
  throw error;
}
```

## Troubleshooting

### Traces Not Appearing

**Check:**
1. Jaeger is running: `docker ps | grep jaeger`
2. Exporter endpoint is correct
3. Application is instrumented
4. Network connectivity
5. Jaeger logs: `docker logs alawael-jaeger`

### High Memory Usage

**Solutions:**
1. Reduce sampling rate
2. Increase batch size
3. Configure memory limiter
4. Limit trace retention

### Missing Spans

**Causes:**
1. Async operations not propagated
2. Context lost between services
3. Manual instrumentation errors
4. Network issues

**Fix:** Use context propagation:
```javascript
const activeContext = context.active();
setTimeout(() => {
  context.with(activeContext, () => {
    // Your async operation
  });
}, 1000);
```

## Performance Impact

- **CPU overhead**: ~1-3%
- **Memory overhead**: ~50-100 MB
- **Latency overhead**: ~0.1-1 ms per span

## Additional Resources

- [OpenTelemetry Node.js Docs](https://opentelemetry.io/docs/instrumentation/js/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Distributed Tracing Best Practices](https://opentelemetry.io/docs/concepts/observability-primer/)

---

**Last Updated:** March 2, 2026
**Maintainer:** ALAWAEL ERP Team
