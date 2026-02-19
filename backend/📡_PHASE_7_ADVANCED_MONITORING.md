# Phase 7: Advanced Monitoring Setup

**Date**: February 2, 2026  
**Objective**: Production-grade monitoring & observability  
**Stack**: Prometheus, Grafana, ELK, Sentry

---

## 📡 Monitoring Architecture

### Components

```
Application Metrics
    ↓
Prometheus (Metrics Collection)
    ↓
Grafana (Visualization)
    ↓
Alertmanager (Alerts)

Logs
    ↓
ELK Stack (Elasticsearch, Logstash, Kibana)
    ↓
Log Analysis & Dashboards

Errors
    ↓
Sentry (Error Tracking)
    ↓
Alert & Remediation
```

---

## 📊 Prometheus Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:27017']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alert_rules.yml'
```

### Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: 'High error rate detected'

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: 'High API latency detected'

      - alert: LowMemory
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
        for: 5m
        annotations:
          summary: 'Low memory available'

      - alert: HighCPU
        expr: rate(node_cpu_seconds_total[5m]) > 0.8
        for: 5m
        annotations:
          summary: 'High CPU usage'

      - alert: DatabaseDown
        expr: up{job="mongodb"} == 0
        for: 1m
        annotations:
          summary: 'MongoDB is down'
```

---

## 🔧 Express Metrics Integration

### Install Dependencies

```bash
npm install prom-client
```

### Add Metrics Middleware

```javascript
// backend/middleware/metrics.middleware.js
const promClient = require('prom-client');

// Define metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

// Middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
  });

  next();
};

// Metrics endpoint
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  dbQueryDuration,
  httpRequestTotal,
  httpRequestDuration,
};
```

### Register Middleware in Server

```javascript
// backend/server.js
const {
  metricsMiddleware,
  metricsEndpoint,
} = require('./middleware/metrics.middleware');

app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);
```

---

## 📊 Grafana Dashboards

### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "AlAwael ERP - Production Dashboard",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "API Latency (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)"
          }
        ]
      },
      {
        "title": "Active Database Connections",
        "targets": [
          {
            "expr": "mongodb_connections_active"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes"
          }
        ]
      },
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "rate(node_cpu_seconds_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## 🪵 ELK Stack Setup

### docker-compose Addition

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
  ports:
    - '9200:9200'

logstash:
  image: docker.elastic.co/logstash/logstash:8.0.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  ports:
    - '5000:5000'
  depends_on:
    - elasticsearch

kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  ports:
    - '5601:5601'
  depends_on:
    - elasticsearch
```

### Logstash Configuration

```conf
# logstash.conf
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [type] == "nodejs" {
    mutate {
      add_field => { "[@metadata][index_name]" => "logs-%{+YYYY.MM.dd}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index_name]}"
  }
}
```

---

## 🚨 Sentry Error Tracking

### Install Sentry SDK

```bash
npm install @sentry/node @sentry/tracing
```

### Sentry Configuration

```javascript
// backend/config/sentry.js
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

const initSentry = app => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({
        app: true,
        request: true,
        transaction: true,
      }),
    ],
  });

  // Must be first middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Error handler must be after all routes
  app.use(Sentry.Handlers.errorHandler());

  return app;
};

module.exports = initSentry;
```

### Sentry Alerts

```javascript
// backend/utils/errorReporter.js
const Sentry = require('@sentry/node');

const reportError = (error, context = {}) => {
  Sentry.captureException(error, {
    contexts: {
      app: context,
    },
    level: error.severity || 'error',
  });
};

const reportMessage = (message, level = 'info') => {
  Sentry.captureMessage(message, level);
};

module.exports = {
  reportError,
  reportMessage,
};
```

---

## 📊 Monitoring Metrics

### Key Metrics to Track

```
Application Metrics:
- Request rate (requests/sec)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- Active users
- Database query time
- Cache hit ratio

Infrastructure Metrics:
- CPU usage
- Memory usage
- Disk I/O
- Network bandwidth
- Container health

Business Metrics:
- Transactions processed
- Users online
- Revenue/hour
- API calls made
```

---

## 🎯 Alert Thresholds

```
Critical:
- Error rate > 10%
- Response time p95 > 5s
- Database down
- Memory < 5%
- CPU > 90%

Warning:
- Error rate > 5%
- Response time p95 > 2s
- Memory < 10%
- CPU > 70%

Info:
- Unusual traffic pattern
- New error type detected
- Performance degradation
```

---

## 📋 Monitoring Checklist

- [ ] Install Prometheus
- [ ] Configure Prometheus scraping
- [ ] Set up Grafana dashboards
- [ ] Install Sentry
- [ ] Configure error tracking
- [ ] Set up ELK stack
- [ ] Create alert rules
- [ ] Configure alerting channels
- [ ] Create runbooks
- [ ] Test monitoring

---

## 🎓 Best Practices

1. **Monitor What Matters**: Focus on business metrics
2. **Alert Smart**: Not too many false positives
3. **Dashboards**: Real-time visibility
4. **Alerting**: Actionable alerts only
5. **Documentation**: Runbooks for every alert

---

**Phase 7 Status**: READY TO EXECUTE  
**Estimated Duration**: 75 minutes  
**Next Phase**: Code Refactoring & Quality
