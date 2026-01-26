# ═══════════════════════════════════════════════════════

# MONITORING & OBSERVABILITY GUIDE

# دليل المراقبة والرصد

# Version: 2.0.0

# Date: January 22, 2026

# ═══════════════════════════════════════════════════════

## 📋 Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack](#monitoring-stack)
3. [Health Monitoring](#health-monitoring)
4. [Performance Monitoring](#performance-monitoring)
5. [Log Management](#log-management)
6. [Alert Configuration](#alert-configuration)
7. [Dashboards](#dashboards)
8. [Metrics & KPIs](#metrics--kpis)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## 📖 Overview

This guide provides comprehensive instructions for monitoring and observing the
Alawael ERP System, ensuring optimal performance, availability, and reliability.

### Monitoring Objectives

- **Availability**: 99.9% uptime
- **Performance**: API response time < 200ms
- **Error Rate**: < 0.1%
- **Resource Usage**: CPU < 70%, Memory < 80%

### Key Components

```
┌─────────────────────────────────────────────────┐
│           MONITORING ARCHITECTURE               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Application Layer                              │
│  ├─ Health Checks                               │
│  ├─ Performance Metrics                         │
│  └─ Error Tracking                              │
│                                                 │
│  Infrastructure Layer                           │
│  ├─ System Resources                            │
│  ├─ Network Metrics                             │
│  └─ Database Performance                        │
│                                                 │
│  Logging Layer                                  │
│  ├─ Application Logs                            │
│  ├─ Access Logs                                 │
│  └─ Error Logs                                  │
│                                                 │
│  Alerting Layer                                 │
│  ├─ Email Alerts                                │
│  ├─ SMS Notifications                           │
│  └─ Slack Integration                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Monitoring Stack

### Technology Stack

| Component         | Technology     | Purpose                            |
| ----------------- | -------------- | ---------------------------------- |
| **Metrics**       | Prometheus     | Time-series metrics database       |
| **Visualization** | Grafana        | Dashboard and alerting             |
| **Logs**          | Elasticsearch  | Log aggregation and search         |
| **Log Viewer**    | Kibana         | Log visualization                  |
| **APM**           | Custom Service | Application performance monitoring |
| **Uptime**        | UptimeRobot    | External uptime monitoring         |
| **Alerts**        | AlertService   | Multi-channel notifications        |

### Installation

```bash
# Docker Compose (Included in docker-compose.prod.yml)
docker-compose -f docker-compose.prod.yml up -d prometheus grafana elasticsearch kibana

# Verify services
docker ps | grep -E "prometheus|grafana|elasticsearch|kibana"
```

---

## ❤️ Health Monitoring

### Health Check Service

The `HealthCheck.js` service provides comprehensive health monitoring.

#### Basic Health Check

```javascript
// backend/services/HealthCheck.js
const healthService = require('./services/HealthCheck');

// Run full health check
const health = await healthService.runFullHealthCheck();

console.log('System Status:', health.status);
console.log('Components:', health.checks);
```

#### Health Check Endpoint

```bash
# API Health Check
curl http://localhost:3001/api/health

# Response
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-22T10:30:00Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 25,
      "message": "Connected"
    },
    "redis": {
      "status": "healthy",
      "latency": 5,
      "message": "Connected"
    },
    "system": {
      "status": "healthy",
      "memory": "45%",
      "cpu": "25%"
    }
  }
}
```

#### Automated Health Monitoring

```javascript
// Setup automatic health checks (every 5 minutes)
const healthService = require('./services/HealthCheck');

healthService.setupAutoHealthCheck(5);

// Health checks run automatically
// Results stored in database
// Alerts sent on failures
```

### Component-Specific Health Checks

#### Database Health

```javascript
const dbHealth = await healthService.checkDatabaseHealth();

console.log('MongoDB Status:', dbHealth.status);
console.log('Connection State:', dbHealth.connected);
console.log('Latency:', dbHealth.latency, 'ms');
console.log('Collections:', dbHealth.collections);
```

#### Redis Health

```javascript
const redisHealth = await healthService.checkRedisHealth();

console.log('Redis Status:', redisHealth.status);
console.log('Connected:', redisHealth.connected);
console.log('Memory Used:', redisHealth.memoryUsed);
```

#### System Resources

```javascript
const systemHealth = await healthService.checkSystemResources();

console.log('CPU Usage:', systemHealth.cpuUsage, '%');
console.log('Memory Usage:', systemHealth.memoryUsage, '%');
console.log('Free Memory:', systemHealth.freeMemory, 'GB');
console.log('Uptime:', systemHealth.uptime, 'seconds');
```

---

## 📊 Performance Monitoring

### Application Performance

#### API Response Times

```javascript
// Monitor API endpoint performance
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
    }

    // Send to monitoring
    metrics.recordApiResponseTime(req.route, duration);
  });

  next();
});
```

#### Database Query Performance

```javascript
// Monitor slow queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  const start = Date.now();

  // Log query execution
  console.log(`Query: ${collectionName}.${method}`, query);

  // Alert on slow queries
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`Slow query detected: ${duration}ms`);
  }
});
```

### Prometheus Metrics

#### Custom Metrics

```javascript
// backend/lib/prometheus-metrics.js
const client = require('prom-client');

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['collection', 'operation'],
});

const activeUsers = new client.Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
});

// Record metrics
httpRequestDuration.labels('GET', '/api/users', '200').observe(150);
dbQueryDuration.labels('users', 'find').observe(25);
activeUsers.set(42);
```

#### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'alawael-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## 📝 Log Management

### Log Levels

| Level     | Usage         | Example                    |
| --------- | ------------- | -------------------------- |
| **ERROR** | System errors | Database connection failed |
| **WARN**  | Warnings      | API rate limit exceeded    |
| **INFO**  | General info  | User logged in             |
| **DEBUG** | Debug info    | Query executed in 25ms     |

### Application Logging

```javascript
// backend/lib/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Usage
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.error('Database error', { error: error.message, stack: error.stack });
```

### Log Rotation

```bash
# /etc/logrotate.d/alawael
/opt/alawael/logs/*.log {
  daily
  rotate 30
  compress
  delaycompress
  notifempty
  create 0644 alawael alawael
  sharedscripts
  postrotate
    docker-compose -f /opt/alawael/docker-compose.prod.yml restart backend
  endscript
}
```

### Elasticsearch Integration

```javascript
// backend/lib/elasticsearch-logger.js
const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({ node: 'http://elasticsearch:9200' });

async function logToElasticsearch(level, message, metadata) {
  await esClient.index({
    index: 'alawael-logs',
    body: {
      '@timestamp': new Date(),
      level,
      message,
      ...metadata,
    },
  });
}

// Usage
logToElasticsearch('info', 'User action', {
  userId: '123',
  action: 'login',
  ip: '192.168.1.1',
});
```

### Viewing Logs

```bash
# Docker logs
docker logs alawael-backend --tail 100 -f

# Application logs
tail -f /opt/alawael/logs/combined.log

# Nginx access logs
tail -f /var/log/nginx/alawael-access.log

# Nginx error logs
tail -f /var/log/nginx/alawael-error.log

# MongoDB logs
docker logs alawael-mongodb --tail 100
```

---

## 🔔 Alert Configuration

### Alert Service

The `AlertService.js` provides multi-channel alerting.

#### Alert Rules

```javascript
// backend/services/AlertService.js
const alertRules = {
  database: {
    severity: 'critical',
    channels: ['email', 'sms'],
    conditions: {
      connectionFailed: true,
      latency: { threshold: 500, operator: 'gt' },
    },
  },
  memory: {
    severity: 'high',
    channels: ['email', 'dashboard'],
    conditions: {
      usage: { threshold: 80, operator: 'gt' },
    },
  },
  security: {
    severity: 'critical',
    channels: ['email', 'sms'],
    conditions: {
      authFailures: { threshold: 5, window: '5m' },
    },
  },
};
```

#### Creating Alerts

```javascript
const alertService = require('./services/AlertService');

// Create critical alert
await alertService.createAlert({
  type: 'DATABASE_DOWN',
  severity: 'critical',
  component: 'mongodb',
  message: 'MongoDB connection lost',
  details: {
    error: 'Connection timeout',
    timestamp: new Date(),
    attempts: 3,
  },
});
```

#### Alert Channels

##### Email Alerts

```javascript
// Email alert configuration
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

// Send email alert
await alertService.sendEmailAlert(alert);
```

##### SMS Alerts

```javascript
// Twilio SMS configuration
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE,
};

// Send SMS alert
await alertService.sendSmsAlert(alert);
```

##### Slack Integration

```javascript
// Slack webhook configuration
const slackConfig = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: '#alerts',
  username: 'Alawael Monitor',
};

// Send Slack notification
await alertService.sendSlackAlert(alert);
```

### Alert Management

```javascript
// Get active alerts
const activeAlerts = await alertService.getAlertHistory({
  status: 'active',
});

// Acknowledge alert
await alertService.acknowledgeAlert(alertId, {
  acknowledgedBy: 'admin@alawael.com',
  note: 'Investigating the issue',
});

// Resolve alert
await alertService.resolveAlert(alertId, {
  resolvedBy: 'admin@alawael.com',
  resolution: 'Database connection restored',
});

// Get alert statistics
const stats = await alertService.getAlertStatistics();
console.log('Total Alerts:', stats.total);
console.log('Active Alerts:', stats.active);
console.log('By Severity:', stats.bySeverity);
```

---

## 📈 Dashboards

### Grafana Setup

#### Access Grafana

```
URL: http://server-ip:3000
Username: admin
Password: (from .env.production)
```

#### Main Dashboard Panels

1. **System Overview**
   - Uptime
   - Total Requests
   - Active Users
   - Error Rate

2. **Performance Metrics**
   - API Response Times (p50, p95, p99)
   - Database Query Times
   - Cache Hit Rate

3. **Resource Usage**
   - CPU Usage
   - Memory Usage
   - Disk I/O
   - Network Traffic

4. **Application Metrics**
   - Requests per second
   - Error rate by endpoint
   - Authentication success/failure
   - Active sessions

5. **Database Metrics**
   - Connections
   - Query performance
   - Collection sizes
   - Index usage

#### Dashboard Configuration

```json
// grafana-dashboard.json
{
  "dashboard": {
    "title": "Alawael ERP - System Overview",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_ms_bucket)"
          }
        ]
      },
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ]
      }
    ]
  }
}
```

### Kibana Dashboards

#### Log Analysis Dashboard

```
URL: http://server-ip:5601
```

**Key Visualizations:**

- Log volume over time
- Error distribution
- Top error messages
- User activity timeline

#### Creating Log Searches

```
# Kibana Query Examples

# All errors
level: "error"

# Slow requests
http.response_time: >1000

# Failed authentications
type: "AUTH_FAILED"

# Specific user activity
user.id: "123"
```

---

## 📊 Metrics & KPIs

### System KPIs

| KPI                         | Target  | Warning | Critical |
| --------------------------- | ------- | ------- | -------- |
| **Uptime**                  | 99.9%   | < 99.5% | < 99%    |
| **API Response Time (p95)** | < 200ms | > 500ms | > 1000ms |
| **Error Rate**              | < 0.1%  | > 0.5%  | > 1%     |
| **CPU Usage**               | < 70%   | > 80%   | > 90%    |
| **Memory Usage**            | < 80%   | > 85%   | > 90%    |
| **Database Latency**        | < 50ms  | > 200ms | > 500ms  |

### Business KPIs

| KPI                          | Description                  | Target        |
| ---------------------------- | ---------------------------- | ------------- |
| **Active Users**             | Daily active users           | > 100         |
| **Transaction Success Rate** | % of successful transactions | > 99%         |
| **Page Load Time**           | Frontend page load           | < 2s          |
| **API Calls per Day**        | Total API requests           | Monitor trend |

### Monitoring Dashboard

```javascript
// Get system metrics
app.get('/api/metrics', async (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    timestamp: new Date(),
    system: {
      cpu: await getCpuUsage(),
      memory: process.memoryUsage(),
      loadAverage: os.loadavg(),
    },
    application: {
      activeUsers: await getActiveUserCount(),
      requestsPerMinute: await getRequestRate(),
      errorRate: await getErrorRate(),
    },
    database: {
      connections: await getDbConnectionCount(),
      queryLatency: await getAvgQueryLatency(),
      collectionSizes: await getCollectionSizes(),
    },
  };

  res.json(metrics);
});
```

---

## 🔧 Troubleshooting

### High CPU Usage

**Symptoms:**

- Slow response times
- Server unresponsive

**Investigation:**

```bash
# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Find CPU-intensive processes
docker stats

# Check application CPU usage
node --prof app.js
```

**Solutions:**

- Optimize slow database queries
- Implement caching
- Scale horizontally (add more instances)

### High Memory Usage

**Symptoms:**

- Out of memory errors
- Application crashes

**Investigation:**

```bash
# Check memory usage
free -h

# Docker container memory
docker stats

# Node.js heap usage
node --inspect app.js
```

**Solutions:**

- Fix memory leaks
- Increase container memory limits
- Optimize data structures
- Implement garbage collection tuning

### Slow Database Queries

**Symptoms:**

- High API response times
- Database timeouts

**Investigation:**

```javascript
// Enable MongoDB slow query logging
db.setProfilingLevel(1, { slowms: 100 });

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

**Solutions:**

- Add indexes
- Optimize queries
- Implement caching
- Consider sharding

---

## ✨ Best Practices

### 1. Proactive Monitoring

- Monitor before problems occur
- Set up predictive alerts
- Regular health checks
- Capacity planning

### 2. Alert Fatigue Prevention

- Set appropriate thresholds
- Reduce false positives
- Group related alerts
- Implement escalation policies

### 3. Log Management

- Structured logging
- Log retention policies
- Regular log analysis
- Secure sensitive data

### 4. Dashboard Design

- Clear and actionable
- Real-time updates
- Mobile-friendly
- Role-based access

### 5. Documentation

- Keep runbooks updated
- Document alert procedures
- Maintain incident logs
- Share knowledge

---

## 📞 Monitoring Contacts

### On-Call Schedule

- **Primary**: DevOps Team
- **Secondary**: Backend Team
- **Escalation**: CTO

### Alert Response Times

- **Critical**: 15 minutes
- **High**: 1 hour
- **Medium**: 4 hours
- **Low**: 24 hours

---

## 📖 Additional Resources

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Documentation](https://grafana.com/docs/)
- [ELK Stack Guide](https://www.elastic.co/guide/)
- [Node.js Performance Tips](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Document Version**: 2.0.0  
**Last Updated**: January 22, 2026  
**Maintained by**: DevOps Team
