# 📊 Monitoring & Observability Guide

دليل مراقبة وملاحظة النظام

**Last Updated**: January 30, 2026

---

## 🎯 Monitoring Overview

### Three Pillars of Observability

```
Metrics          Logs          Traces
├─ Counters      ├─ Debug      ├─ Request flow
├─ Gauges        ├─ Info       ├─ Performance
└─ Histograms    ├─ Warn       └─ Dependencies
                 └─ Error
```

---

## 📈 Metrics Monitoring

### Key Metrics

```
Application Metrics:
├─ Request Rate         (requests/sec)
├─ Response Time        (ms)
├─ Error Rate           (%)
├─ Active Users         (count)
└─ API Call Duration    (ms)

System Metrics:
├─ CPU Usage            (%)
├─ Memory Usage         (MB)
├─ Disk Space           (GB)
├─ Network I/O          (MB/sec)
└─ File Descriptors     (count)

Database Metrics:
├─ Query Count          (queries/sec)
├─ Query Duration       (ms)
├─ Connection Pool      (connections)
├─ Slow Queries         (count)
└─ Cache Hit Rate       (%)
```

### Prometheus Setup

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'rehab-agi'
    static_configs:
      - targets: ['localhost:5001']
    metrics_path: '/api/agi/metrics'
```

---

## 📝 Logging Strategy

### Log Levels

```
DEBUG   - Detailed diagnostic information
INFO    - General informational messages
WARN    - Warning conditions
ERROR   - Error conditions (action required)
FATAL   - Fatal errors (service crash)
```

### Example Logging

```typescript
logger.info('Beneficiary analysis started', {
  beneficiaryId: 'BEN-001',
  timestamp: new Date(),
  userId: 'USER-123',
});

logger.error('Database connection failed', {
  error: error.message,
  code: error.code,
  timestamp: new Date(),
});
```

### Log Aggregation

```
Application Logs
    ↓
Log Collector (Fluentd/Logstash)
    ↓
Elasticsearch
    ↓
Kibana (Visualization)
```

---

## 🔍 Tracing

### Distributed Tracing Setup

```
Client Request
  ├─ API Gateway
  ├─ Authentication Service
  ├─ Business Logic
  ├─ Database Query
  └─ Response

Each step traced with:
- Duration
- Status
- Errors
- Dependencies
```

### Jaeger Configuration

```yaml
# jaeger.yml
jaeger:
  endpoint: http://localhost:14268/api/traces
  sampler:
    type: const
    param: 1
```

---

## 🎛️ Grafana Dashboards

### Dashboard Setup

```
1. Connect Prometheus as data source
2. Create panels for key metrics
3. Set up alerts
4. Create automated reports
5. Share with team
```

### Key Dashboards

```
1. System Overview
   ├─ CPU, Memory, Disk
   ├─ Network I/O
   └─ Service Health

2. Application Performance
   ├─ Request Rate
   ├─ Response Time
   ├─ Error Rate
   └─ Throughput

3. Database Performance
   ├─ Query Count
   ├─ Query Duration
   ├─ Connection Pool
   └─ Cache Hit Rate

4. Business Metrics
   ├─ Active Users
   ├─ Transactions
   ├─ Revenue
   └─ KPIs
```

---

## ⚠️ Alerting

### Alert Rules

```yaml
groups:
  - name: rehab-agi
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_requests_total{status=~"5.."}[5m])) /
           sum(rate(http_requests_total[5m]))) > 0.05
        annotations:
          summary: 'Error rate above 5%'

      # High Response Time
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])) > 0.5
        annotations:
          summary: 'P95 response time > 500ms'

      # Database Slow
      - alert: DatabaseSlow
        expr: |
          rate(db_query_duration_seconds_sum[5m]) /
          rate(db_query_duration_seconds_count[5m]) > 0.1
        annotations:
          summary: 'Average query time > 100ms'
```

---

## 🔔 Notification Channels

### Email Alerts

```
Alert → Alertmanager → Email Service → User
```

### Slack Integration

```bash
# Configure webhook
SLACK_WEBHOOK=https://hooks.slack.com/services/...

# Receive notifications
Channel: #rehab-agi-alerts
Format: Emoji + Alert Details
```

### SMS Alerts (Critical)

```
CRITICAL Alert → SMS Gateway → User
Response time: < 1 minute
```

---

## 📊 Custom Metrics

### Application Metrics

```typescript
// Initialize Prometheus client
const prometheus = require('prom-client');

// Counter: Total requests
const requestCount = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
});

// Gauge: Active connections
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

// Histogram: Response time
const responseTime = new prometheus.Histogram({
  name: 'http_response_duration_seconds',
  help: 'HTTP response duration',
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Usage
requestCount.inc();
activeConnections.set(42);
responseTime.observe(0.3);
```

---

## 📈 Performance Monitoring

### API Performance

```
Metrics:
├─ Endpoint Response Time (per endpoint)
├─ Error Rate (by status code)
├─ Throughput (requests/second)
├─ Concurrency (active requests)
└─ Tail Latency (p99)

Targets:
├─ GET  /api/rehab-agi/health          < 10ms
├─ POST /api/rehab-agi/analyze         < 200ms
├─ POST /api/rehab-agi/recommend       < 300ms
├─ POST /api/rehab-agi/report          < 500ms
└─ Others                              < 200ms
```

### Database Performance

```
Metrics:
├─ Query Count (queries/sec)
├─ Query Duration (min/avg/max)
├─ Slow Queries (> 100ms)
├─ Connection Pool Usage (%)
├─ Cache Hit Rate (%)
└─ Index Efficiency

Optimization:
├─ Add indexes on slow queries
├─ Enable query caching
├─ Optimize joins
├─ Partition large tables
└─ Regular maintenance
```

---

## 🔍 Troubleshooting

### High CPU Usage

```
1. Check slow queries
   → SELECT * FROM pg_stat_statements
     ORDER BY mean_time DESC LIMIT 10;

2. Check process list
   → top -p $(pgrep -f "node server.js")

3. Profile with Node.js profiler
   → node --prof server.js
   → node --prof-process isolate-*.log > profile.txt
```

### High Memory Usage

```
1. Check heap
   → node --inspect server.js
   → Open chrome://inspect

2. Find memory leaks
   → npm install clinic
   → clinic doctor -- npm start

3. Monitor GC
   → node --expose-gc server.js
```

### Database Issues

```
1. Check connections
   → SELECT count(*) FROM pg_stat_activity;

2. Find long transactions
   → SELECT pid, query FROM pg_stat_activity
     WHERE state = 'active';

3. Check locks
   → SELECT * FROM pg_locks;
```

---

## 📋 Monitoring Checklist

### Daily

- [ ] Check error rates
- [ ] Verify system health
- [ ] Review critical alerts
- [ ] Check disk space
- [ ] Verify backups

### Weekly

- [ ] Performance analysis
- [ ] Security review
- [ ] Database maintenance
- [ ] Log analysis
- [ ] Capacity planning

### Monthly

- [ ] Trend analysis
- [ ] Capacity forecasting
- [ ] Optimization opportunities
- [ ] Documentation update
- [ ] Team review

---

## 🎯 SLA Targets

```
Availability:       99.9%   (43 min downtime/month)
Response Time:      < 200ms (average)
Error Rate:         < 0.1%
Database Response:  < 100ms (average)
Cache Hit Rate:     > 80%
```

---

## 📞 On-Call Procedures

### Escalation Path

```
Level 1: System Alerts
  ↓
Level 2: On-Call Engineer (SMS Alert)
  ↓
Level 3: Team Lead (Email + Call)
  ↓
Level 4: Manager (Critical Only)
```

### Incident Response

```
1. Acknowledge alert (< 5 min)
2. Assess impact (< 5 min)
3. Take action (< 15 min)
4. Communicate status (continuous)
5. Post-mortem (next business day)
```

---

## 📚 Monitoring Tools Stack

| Tool          | Purpose             | Status      |
| ------------- | ------------------- | ----------- |
| Prometheus    | Metrics collection  | ✅ Ready    |
| Grafana       | Visualization       | ✅ Ready    |
| Alertmanager  | Alerting            | ✅ Ready    |
| Elasticsearch | Log storage         | ⏳ Optional |
| Kibana        | Log visualization   | ⏳ Optional |
| Jaeger        | Distributed tracing | ⏳ Optional |

---

**Last Updated**: January 30, 2026
