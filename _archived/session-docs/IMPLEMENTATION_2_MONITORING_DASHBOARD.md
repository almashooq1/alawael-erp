# IMPLEMENTATION GUIDE 2: MONITORING DASHBOARD DEPLOYMENT
# Prometheus + Grafana Complete Setup
# ALAWAEL ERP Production System
# Date: February 28, 2026

---

## QUICK START (2 Hours)

### Step 1: Install Prometheus

```bash
# Windows Install
# Download: https://github.com/prometheus/prometheus/releases
# Extract to: C:\prometheus

# Create config file: prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'alawael-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  - job_name: 'system'
    static_configs:
      - targets: ['localhost:9100']

# Start Prometheus
cd C:\prometheus
.\prometheus.exe --config.file=prometheus.yml

# Access: http://localhost:9090
```

### Step 2: Install Grafana

```bash
# Windows Install
# Download: https://grafana.com/grafana/download?edition=oss
# Extract to: C:\grafana

# Start Grafana
cd C:\grafana\bin
.\grafana-server.exe

# Access: http://localhost:3000
# Default: admin / admin (change password!)
```

### Step 3: Configure Prometheus Data Source

```
1. In Grafana, go to Configuration > Data Sources
2. Add New > Prometheus
3. Set URL: http://localhost:9090
4. Click "Save & Test"
5. Should show "Data source is working"
```

### Step 4: Import Dashboard

```
1. Go to Dashboards > Import
2. Search for "Node Exporter" OR "Prometheus"
3. Import Dashboard ID: 1860 (Node Exporter)
4. Select Prometheus as data source
5. Click Import
```

### Step 5: Add Custom ALAWAEL Dashboard

```
1. Create new dashboard
2. Add panels:
   - Request Rate (counter)
   - Response Time (gauge)
   - Error Rate (counter)
   - CPU Usage (gauge)
   - Memory Usage (gauge)
   - Database Connections (counter)
```

---

## COMPLETE SETUP GUIDE

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           ALAWAEL BACKEND (PM2)                     │
│   ├─ /metrics endpoint (Prometheus format)          │
│   └─ Exposes: requests, response time, errors       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         PROMETHEUS (Time-Series DB)                 │
│   ├─ Scrapes /metrics every 15 seconds              │
│   ├─ Stores data with timestamps                    │
│   └─ Provides query interface                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│      GRAFANA (Visualization & Alerting)             │
│   ├─ Dashboard with real-time charts                │
│   ├─ Alert rules and notifications                  │
│   └─ Team sharing and RBAC                          │
└─────────────────────────────────────────────────────┘
```

### Step 1: Add Prometheus Metrics to Node.js

```javascript
// File: backend/src/middleware/metrics.js

const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active database connections'
});

// Middleware to track request metrics
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
const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  httpRequestDuration,
  httpRequestTotal,
  dbQueryDuration,
  activeConnections
};
```

### Step 2: Integrate Metrics Middleware

```javascript
// File: backend/src/app.js

const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

// Add metrics middleware (EARLY)
app.use(metricsMiddleware);

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// ... rest of app configuration
```

### Step 3: Install Prometheus Client Library

```bash
cd backend
npm install prom-client --save
```

### Step 4: Prometheus Configuration

```yaml
# File: prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'alawael-monitor'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093

# Load rules once and periodically evaluate them
rule_files:
  - "alert_rules.yml"

# Scrape configurations
scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node.js application
  - job_name: 'alawael-backend'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  # System metrics (Node Exporter)
  - job_name: 'system'
    static_configs:
      - targets: ['localhost:9100']

  # Database metrics (MongoDB Exporter - optional)
  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:9216']
```

### Step 5: Alert Rules

```yaml
# File: alert_rules.yml

groups:
  - name: alawael_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # High response time
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "P95 response time is {{ $value }}s"

      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          (100 - (avg by (instance) 
            (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (
            (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
            / node_memory_MemTotal_bytes
          ) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanize }}%"

      # Database connection issues
      - alert: LowDatabaseConnections
        expr: active_connections < 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection lost"
          description: "No active database connections"
```

### Step 6: Grafana Dashboard (JSON)

```json
{
  "dashboard": {
    "title": "ALAWAEL ERP Monitoring",
    "panels": [
      {
        "title": "Request Rate (req/sec)",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate (%)",
        "targets": [
          {
            "expr": "(sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))) * 100"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Response Time (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "active_connections"
          }
        ],
        "type": "stat"
      },
      {
        "title": "CPU Usage (%)",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes"
          }
        ],
        "type": "gauge"
      }
    ]
  }
}
```

---

## MONITORING CHECKLIST

After setup, verify:

- [ ] Prometheus scraping metrics from Node.js
- [ ] Grafana connecting to Prometheus
- [ ] Dashboard shows real-time data
- [ ] Alert rules configured and active
- [ ] Alert notifications working (Slack, email)
- [ ] Historical data retention (14 days minimum)
- [ ] Dashboard shared with operations team

---

## KEY METRICS TO MONITOR

### Application Metrics
1. **Request Rate** - Requests per second (target: 80+ for baseline)
2. **Response Time** - P50, P95, P99 (target: <50ms P95)
3. **Error Rate** - 5xx errors (target: <0.5%)
4. **Active Connections** - Database connections (target: >1)

### System Metrics
1. **CPU Usage** - Percent utilization (target: <50%)
2. **Memory Usage** - Percent of total (target: <70%)
3. **Disk I/O** - Read/write operations
4. **Network** - Bandwidth in/out

### Database Metrics (With MongoDB Exporter)
1. **Query Duration** - Average query time
2. **Connection Pool** - Active/idle connections
3. **Document Count** - Collection sizes
4. **Index Usage** - Query performance

---

## ALERTING CONFIGURATION

### Slack Integration

```bash
# Create incoming webhook in Slack
# https://api.slack.com/messaging/webhooks

# Configure Alertmanager to send to Slack
# Add to alertmanager.yml:
```

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'slack-notifications'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alawael-alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

---

## PERFORMANCE IMPACT

### Monitoring Overhead
```
Prometheus scraping:     <1% CPU per scrape
Grafana dashboard:       <2% CPU when rendering
Metrics collection:      <1% application overhead
Total impact:            ~2-3% system overhead
```

### Data Retention
```
Retention policy:        14 days (configurable)
Storage required:        ~1-2 GB per month
Query performance:       <100ms for PromQL queries
```

---

## TROUBLESHOOTING

### Prometheus Not Scraping

```bash
# Check Prometheus targets
# Navigate to: http://localhost:9090/targets
# Should show alawael-backend as "UP"

# If showing "DOWN":
# Check if /metrics endpoint is accessible:
curl http://localhost:3001/metrics

# Check Prometheus logs
tail -f prometheus.log
```

### Grafana Not Showing Data

```bash
# Verify Prometheus data source
# Configuration > Data Sources > Prometheus
# Click "Save & Test"

# Run test query
# Go to Explore > Select Prometheus
# Run: up (should return 1 if scraped successfully)
```

### Memory Usage High

```bash
# If Prometheus using too much memory:
# Reduce retention:
./prometheus --storage.tsdb.retention.time=7d

# Or reduce scrape interval:
# Edit prometheus.yml: scrape_interval: 60s (from 15s)
```

---

## MAINTENANCE

### Daily
- [ ] Check alert frequency
- [ ] Monitor CPU/memory usage
- [ ] Verify data collection active

### Weekly
- [ ] Review dashboard for anomalies
- [ ] Check disk space for metrics storage
- [ ] Verify backup of Prometheus data

### Monthly
- [ ] Review and update alert thresholds
- [ ] Archive old metrics data
- [ ] Update dashboard with new insights

---

## DEPLOYMENT TIMELINE

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | Install Prometheus | 10 min | Ready |
| 2 | Install Grafana | 10 min | Ready |
| 3 | Add metrics to Node.js | 15 min | Ready |
| 4 | Configure Prometheus | 10 min | Ready |
| 5 | Setup Grafana dashboard | 20 min | Ready |
| 6 | Configure alerts | 15 min | Ready |

**Total Time: 80 minutes (~1.5 hours)**

---

## NEXT STEPS

After monitoring is deployed:

1. ✅ Verify all metrics are collecting
2. ✅ Setup Slack alert notifications
3. ✅ Train team on dashboard usage
4. ✅ Set baseline performance metrics
5. ✅ Proceed to Phase 3: Database Replication

---

## STATUS: ✅ READY TO IMPLEMENT

All configuration templates and integration code provided. You can deploy in 1.5-2 hours with zero downtime.

**Next command to execute Monitoring setup: READY** ✅
