# 📊 Monitoring and Observability Setup Guide

**Purpose:** Complete guide for setting up monitoring, logging, and alerting  
**Date:** January 21, 2026

---

## 🎯 Overview

**Monitoring Stack:**

- Prometheus (Metrics collection)
- Grafana (Visualization)
- Loki (Log aggregation)
- AlertManager (Alert routing)
- Node Exporter (Server metrics)

**Alternative Options:**

- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog (All-in-one SaaS)
- New Relic (APM)
- Sentry (Error tracking)

---

## 📈 Prometheus Setup

### 1. Install Prometheus

**Docker Compose:**

```yaml
# Add to docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped

volumes:
  prometheus-data:
```

**Kubernetes:**

```bash
# Using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

### 2. Configure Prometheus

**prometheus.yml:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  # Backend API metrics
  - job_name: 'erp-backend'
    static_configs:
      - targets: ['backend:3005']
    metrics_path: '/metrics'

  # Frontend metrics
  - job_name: 'erp-frontend'
    static_configs:
      - targets: ['frontend:80']

  # MongoDB metrics
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb_exporter:9216']

  # Node metrics
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Docker metrics
  - job_name: 'docker'
    static_configs:
      - targets: ['cadvisor:8080']
```

### 3. Add Metrics to Backend

**Install prom-client:**

```bash
cd backend
npm install prom-client express-prom-bundle
```

**Update backend/server.js:**

```javascript
const promBundle = require('express-prom-bundle');
const client = require('prom-client');

// Initialize Prometheus metrics
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project: 'erp-system' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 1000,
    },
  },
});

app.use(metricsMiddleware);

// Custom metrics
const register = new client.Registry();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(activeConnections);
register.registerMetric(dbQueryDuration);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 📊 Grafana Setup

### 1. Install Grafana

**Docker Compose:**

```yaml
# Add to docker-compose.yml
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

volumes:
  grafana-data:
```

**Kubernetes:**

```bash
# Grafana is included in kube-prometheus-stack
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# Get admin password
kubectl get secret prometheus-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 --decode
```

### 2. Configure Data Source

**grafana/datasources/prometheus.yml:**

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

### 3. Import Dashboards

**Create Dashboard (grafana/dashboards/erp-dashboard.json):**

```json
{
  "dashboard": {
    "title": "ERP System Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
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
        "title": "Active Connections",
        "targets": [
          {
            "expr": "active_connections"
          }
        ]
      }
    ]
  }
}
```

**Import Community Dashboards:**

- Node Exporter Full: Dashboard ID 1860
- MongoDB: Dashboard ID 2583
- Docker: Dashboard ID 11600
- Nginx: Dashboard ID 12708

---

## 📝 Loki (Log Aggregation)

### 1. Install Loki

**Docker Compose:**

```yaml
# Add to docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - '3100:3100'
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped

volumes:
  loki-data:
```

### 2. Configure Loki

**loki-config.yml:**

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

### 3. Configure Promtail

**promtail-config.yml:**

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker containers
  - job_name: docker
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*.log

  # Backend logs
  - job_name: backend
    static_configs:
      - targets:
          - localhost
        labels:
          job: backend
          __path__: /var/log/backend/*.log

  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/syslog
```

### 4. Add Loki to Grafana

**Add data source:**

1. Grafana → Configuration → Data Sources
2. Add data source → Loki
3. URL: http://loki:3100
4. Save & Test

**Query logs:**

```logql
# All logs from backend
{job="backend"}

# Error logs
{job="backend"} |= "error"

# Last 5 minutes
{job="backend"} [5m]

# Filter by level
{job="backend"} | json | level="error"
```

---

## 🚨 AlertManager Setup

### 1. Configure AlertManager

**alertmanager.yml:**

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourcompany.com'
  smtp_auth_username: 'alerts@yourcompany.com'
  smtp_auth_password: 'your-password'

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@yourcompany.com'

  - name: 'critical'
    email_configs:
      - to: 'oncall@yourcompany.com'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts-critical'
        title: 'Critical Alert'

  - name: 'warning'
    email_configs:
      - to: 'team@yourcompany.com'
```

### 2. Define Alert Rules

**alert-rules.yml:**

```yaml
groups:
  - name: erp_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }}% for {{ $labels.instance }}'

      # High response time
      - alert: HighResponseTime
        expr:
          histogram_quantile(0.95,
          rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High response time'
          description: '95th percentile response time is {{ $value }}s'

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service is down'
          description:
            '{{ $labels.instance }} has been down for more than 1 minute'

      # High CPU usage
      - alert: HighCPUUsage
        expr:
          100 - (avg by(instance)
          (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High CPU usage'
          description: 'CPU usage is {{ $value }}% on {{ $labels.instance }}'

      # High memory usage
      - alert: HighMemoryUsage
        expr:
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) /
          node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is {{ $value }}% on {{ $labels.instance }}'

      # Low disk space
      - alert: LowDiskSpace
        expr:
          (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Low disk space'
          description:
            'Only {{ $value }}% disk space remaining on {{ $labels.instance }}'

      # MongoDB down
      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'MongoDB is down'
          description: 'MongoDB has been down for more than 1 minute'

      # High database connections
      - alert: HighDatabaseConnections
        expr: mongodb_connections_current > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High database connections'
          description: '{{ $value }} active database connections'
```

---

## 🔔 Additional Monitoring Tools

### 1. Sentry (Error Tracking)

**Install:**

```bash
npm install @sentry/node @sentry/tracing
```

**Configure (backend/server.js):**

```javascript
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

Sentry.init({
  dsn: 'your-sentry-dsn',
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

### 2. Uptime Monitoring

**Options:**

- UptimeRobot (https://uptimerobot.com)
- Pingdom (https://www.pingdom.com)
- StatusCake (https://www.statuscake.com)
- Self-hosted: Uptime Kuma

**Configure Uptime Kuma:**

```bash
docker run -d -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:latest
```

### 3. Application Performance Monitoring (APM)

**New Relic:**

```bash
npm install newrelic

# Create newrelic.js
# Require at top of server.js:
require('newrelic');
```

**Datadog:**

```bash
npm install dd-trace

# Initialize:
const tracer = require('dd-trace').init({
  service: 'erp-backend',
  env: 'production'
});
```

---

## 📊 Key Metrics to Monitor

### Application Metrics

- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (errors/second, %)
- Active connections
- WebSocket connections
- Database query time

### Infrastructure Metrics

- CPU usage (%)
- Memory usage (%)
- Disk space (%)
- Network I/O
- Container restarts
- Pod health

### Database Metrics

- Query performance
- Active connections
- Lock waits
- Replication lag
- Cache hit ratio
- Storage size

### Business Metrics

- Active users
- Login rate
- Transaction volume
- API usage per endpoint
- Feature usage
- User errors

---

## 🎯 Monitoring Best Practices

1. **Set Meaningful Alerts**
   - Alert on symptoms, not causes
   - Avoid alert fatigue
   - Define clear thresholds
   - Test alert rules

2. **Create Dashboards**
   - Overview dashboard for quick health check
   - Detailed dashboards per service
   - Business metrics dashboard
   - SLA/SLO tracking dashboard

3. **Implement Logging Best Practices**
   - Structured logging (JSON)
   - Consistent log levels
   - Include request IDs
   - Log contextual information

4. **Regular Reviews**
   - Review metrics weekly
   - Adjust thresholds as needed
   - Update dashboards
   - Review alert effectiveness

5. **Documentation**
   - Document what each metric means
   - Create runbooks for common alerts
   - Document alert thresholds
   - Keep contact list updated

---

## 🚀 Quick Start Commands

**Start monitoring stack:**

```bash
docker-compose up -d prometheus grafana loki promtail

# Access Grafana
open http://localhost:3000
# Login: admin / admin123

# Access Prometheus
open http://localhost:9090
```

**View metrics:**

```bash
# Backend metrics
curl http://localhost:3005/metrics

# Prometheus targets
curl http://localhost:9090/api/v1/targets
```

**Query logs:**

```bash
# Using LogCLI
logcli query '{job="backend"}'
logcli query '{job="backend"} |= "error"'
```

---

**Last Updated:** January 21, 2026  
**Status:** Complete Monitoring Setup Guide
