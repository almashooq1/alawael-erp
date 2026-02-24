# 🏥 Health Check & Monitoring Guide

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** Production Ready  

---

## 📋 Health Check Endpoints

### Core Health Endpoints

#### 1. Basic Health
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-24T10:30:00Z"
}
```

#### 2. API Health
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "timestamp": "2026-02-24T10:30:00Z"
}
```

#### 3. System Health
```
GET /api/system/health
```

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "redis": "connected",
    "fileStorage": "ok",
    "externalAPIs": "ok"
  },
  "timestamp": "2026-02-24T10:30:00Z"
}
```

---

## 📊 Metrics Endpoints

### System Metrics
```
GET /api/system/metrics
```

**Response:**
```json
{
  "cpu": {
    "usage": 45.2,
    "cores": 4,
    "threshold": 80
  },
  "memory": {
    "used": 512,
    "total": 1024,
    "percentage": 50,
    "threshold": 85
  },
  "disk": {
    "used": 50,
    "total": 100,
    "percentage": 50,
    "threshold": 90
  },
  "uptime": 86400,
  "timestamp": "2026-02-24T10:30:00Z"
}
```

### Performance Statistics
```
GET /api/system/stats
```

**Response:**
```json
{
  "requests": {
    "total": 145320,
    "perSecond": 1.68,
    "avgResponseTime": 125,
    "p95ResponseTime": 450,
    "p99ResponseTime": 1200
  },
  "errors": {
    "total": 45,
    "rate": 0.03,
    "lastHour": 5
  },
  "database": {
    "connections": 8,
    "maxConnections": 10,
    "queryTime": 45
  },
  "cache": {
    "hits": 98540,
    "misses": 2145,
    "hitRate": 97.9
  },
  "timestamp": "2026-02-24T10:30:00Z"
}
```

### Cache Statistics
```
GET /api/cache-stats
```

**Response:**
```json
{
  "redis": {
    "connected": true,
    "memory": { "used": 256, "peak": 512, "unit": "MB" },
    "keys": 1245,
    "hits": 98540,
    "misses": 2145,
    "hitRate": 97.9,
    "evictions": 0
  },
  "cacheSize": 256
}
```

---

## 🔄 Integration Test Endpoint

```
GET /api/integration-test
```

**Tests:**
- Database connectivity
- Redis connectivity
- File storage access
- External API availability
- Email service (if configured)
- SMS service (if configured)

**Response:**
```json
{
  "results": {
    "database": "✅ PASS",
    "redis": "✅ PASS",
    "fileStorage": "✅ PASS",
    "externalAPIs": "✅ PASS",
    "email": "✅ PASS",
    "sms": "✅ PASS"
  },
  "timestamp": "2026-02-24T10:30:00Z"
}
```

---

## 🔧 Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

SERVICE_URL=${1:-"http://localhost:3000"}
CRITICAL_THRESHOLD=3  # Fail if 3+ checks fail

echo "🔍 Running health checks on $SERVICE_URL"
echo ""

failed=0
success=0

# Array of health check endpoints
endpoints=(
  "/health"
  "/api/health"
  "/api/system/health"
  "/api/system/metrics"
  "/api/system/stats"
  "/api/cache-stats"
  "/api/integration-test"
)

for endpoint in "${endpoints[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL$endpoint")
  
  if [ "$response" -eq 200 ] || [ "$response" -eq 201 ]; then
    echo "✅ $endpoint ($response)"
    ((success++))
  else
    echo "❌ $endpoint ($response)"
    ((failed++))
  fi
done

echo ""
echo "Summary: $success passed, $failed failed"

if [ $failed -ge $CRITICAL_THRESHOLD ]; then
  echo "❌ CRITICAL: Too many failures"
  exit 1
elif [ $failed -gt 0 ]; then
  echo "⚠️  WARNING: Some health checks failed"
  exit 1
else
  echo "✅ All health checks passed"
  exit 0
fi
```

**Run:**
```bash
bash scripts/health-check.sh http://localhost:3000
```

---

## 📈 Monitoring Strategy

### Key Metrics to Monitor

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| **CPU Usage** | < 50% | 50-80% | > 80% |
| **Memory** | < 60% | 60-85% | > 85% |
| **Disk** | < 70% | 70-90% | > 90% |
| **API Response Time (p95)** | < 300ms | 300-500ms | > 500ms |
| **Error Rate** | < 0.1% | 0.1-1% | > 1% |
| **Database Connections** | < 8 | 8-9 | 10+ |
| **Cache Hit Rate** | > 95% | 85-95% | < 85% |

### Monitoring Checklist

Daily:
- [ ] Check CPU/Memory usage
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Check API response times
- [ ] Monitor disk space

Weekly:
- [ ] Review performance trends
- [ ] Check security logs
- [ ] Verify data integrity
- [ ] Review user feedback
- [ ] Update capacity plan

Monthly:
- [ ] Analyze usage patterns
- [ ] Review incidents
- [ ] Plan for growth
- [ ] Test backup restoration
- [ ] Security audit

---

## 🚨 Alert Configuration

### Datadog Alerts Example

```python
# alerts.py
from datadog import initialize, api

options = {
    'api_key': os.environ['DATADOG_API_KEY'],
    'app_key': os.environ['DATADOG_APP_KEY']
}

initialize(**options)

# CPU Alert
cpu_alert = {
    "name": "High CPU Usage - Production",
    "type": "metric alert",
    "query": "avg:system.cpu{env:production} > 80",
    "message": "High CPU detected in production. @pagerduty",
    "thresholds": {"critical": 80, "warning": 60}
}

# Memory Alert
memory_alert = {
    "name": "High Memory Usage - Production",
    "type": "metric alert",
    "query": "avg:system.memory{env:production} > 85",
    "message": "High memory detected in production. @pagerduty",
    "thresholds": {"critical": 85, "warning": 70}
}

api.Monitor.create(**cpu_alert)
api.Monitor.create(**memory_alert)
```

### Prometheus AlertRules Example

```yaml
# alertrules.yml
groups:
  - name: alawael_alerts
    rules:
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) > 0.8
        annotations:
          summary: High CPU usage detected

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 0.85 * node_memory_MemTotal
        annotations:
          summary: High memory usage detected

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        annotations:
          summary: Error rate above 1%
```

---

## 📊 Dashboard Setup

### Prometheus + Grafana

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'alawael-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/system/metrics'
```

#### Grafana Dashboard Queries

**CPU Usage:**
```
rate(process_cpu_seconds_total[5m])
```

**Memory Usage:**
```
process_resident_memory_bytes / 1024 / 1024
```

**Request Rate:**
```
rate(http_requests_total[5m])
```

**Error Rate:**
```
rate(http_requests_total{status=~"5.."}[5m])
```

---

## 🔔 Notification Channels

```javascript
// config/notifications.js

module.exports = {
  channels: {
    slack: {
      enabled: true,
      webhook: process.env.SLACK_WEBHOOK,
      channel: '#alerts'
    },
    email: {
      enabled: true,
      recipients: ['ops@alawael.com'],
      subject: 'ALAWAEL Alert'
    },
    pagerduty: {
      enabled: true,
      integrationKey: process.env.PAGERDUTY_KEY,
      severity: 'critical'
    },
    sms: {
      enabled: true,
      numbers: ['+1234567890'],
      providers: 'twilio'
    }
  }
};
```

---

## 🔍 Log Aggregation

### ELK Stack Setup

```yml
# docker-compose for ELK
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"
```

### Useful Kibana Queries

```
# Find errors
level:ERROR

# Find slow queries
query_time:>1000

# Find specific user activity
user_id:"user123"

# Find specific endpoint
path:"/api/users"
```

---

## 📱 Mobile Monitoring

### React Native Health Check

```javascript
// Mobile app health check
const checkHealth = async () => {
  try {
    const response = await fetch('http://api.alawael.com/api/health');
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('✅ Backend healthy');
      return true;
    } else {
      console.log('⚠️  Backend degraded');
      return false;
    }
  } catch (error) {
    console.error('❌ Backend unreachable:', error);
    return false;
  }
};
```

---

## 🎯 SLA Targets

| Service | Availability | Response Time (p95) | Support |
|---------|--------------|---------------------|---------|
| **API** | 99.9% | < 500ms | 24/7 |
| **Frontend** | 99.5% | < 2s | Business hours |
| **Database** | 99.99% | < 100ms | 24/7 |
| **Cache** | 99% | < 50ms | 24/7 |

---

## 🆘 Troubleshooting

**Health check failing?**
```bash
# Check backend logs
docker-compose logs backend | grep ERROR

# Verify services running
docker-compose ps

# Test database
docker-compose exec mongo mongosh --eval "db.admin.ping()"

# Test Redis
docker-compose exec redis redis-cli ping
```

**High memory usage?**
```bash
# Check top processes
docker stats

# Clear cache
curl -X POST http://localhost:3000/api/system/optimize

# Restart service
docker-compose restart backend
```

**Slow response time?**
```bash
# Check database queries
docker-compose exec mongo mongostat

# Check cache hit rate
curl http://localhost:3000/api/cache-stats | jq '.redis.hitRate'

# Enable query profiling
db.setProfilingLevel(1)
```

---

## 📚 Related Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md)
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
- [README.md](../README.md)

---

**Last Updated:** February 24, 2026  
**Maintained By:** DevOps Team

