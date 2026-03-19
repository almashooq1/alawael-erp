# 📊 MONITORING & OPERATIONS GUIDE
## Production System Monitoring & Management

**Version**: 1.0
**Last Updated**: 25 February 2026
**Status**: 🟢 Ready for Production

---

## 📋 Table of Contents
1. [Monitoring Setup](#monitoring-setup)
2. [Alerting Strategy](#alerting-strategy)
3. [Dashboards](#dashboards)
4. [Daily Operations](#daily-operations)
5. [Incident Response](#incident-response)
6. [Performance Optimization](#performance-optimization)
7. [Backup & Recovery](#backup--recovery)

---

## 🔍 Monitoring Setup

### Tool Selection & Installation

#### **Option 1: Datadog (Recommended)**
```bash
# Install Datadog Agent
curl https://s3.amazonaws.com/dd-agent/scripts/install_mac_os.sh | sh

# Configure for Kubernetes
helm install datadog datadog/datadog \
  --set datadog.apiKey=<YOUR_API_KEY> \
  --set datadog.appKey=<YOUR_APP_KEY>

# Monthly Cost: ~$20-100 depending on scale
```

**Datadog Monitors to Create:**
```
1. API Latency Monitor (p95 > 200ms)
2. Error Rate Monitor (>0.1%)
3. Database Connection Pool Monitor
4. Cache Hit Rate Monitor
5. CPU/Memory Usage Monitor
6. Database Query Time Monitor
7. Authentication Failure Monitor
8. External API Integration Health
```

#### **Option 2: New Relic**
```bash
# Install New Relic APM
npm install newrelic --save

# Configure in application
require('newrelic');
const express = require('express');
```

**Monthly Cost**: ~$100-300

#### **Option 3: Open Source Stack (Prometheus + Grafana)**
```bash
# Deploy Prometheus
helm install prometheus prometheus-community/prometheus

# Deploy Grafana
helm install grafana grafana/grafana

# Cost: Mostly time for setup
```

### Application Instrumentation

#### Add Monitoring to Express Server
```javascript
// monitoring.js
const prometheus = require('prom-client');

// Default metrics
prometheus.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table']
});

const cacheHitRate = new prometheus.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type']
});

module.exports = {
  httpRequestDuration,
  dbQueryDuration,
  cacheHitRate,
  metrics: prometheus.register.metrics()
};
```

#### Middleware Integration
```javascript
// app.js
const monitoring = require('./monitoring');
const app = require('express')();

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', monitoring.metrics.contentType);
  res.end(monitoring.metrics.metrics());
});

// Request timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    monitoring.httpRequestDuration
      .labels(req.method, req.route?.path || 'unknown', res.statusCode)
      .observe(duration);
  });
  
  next();
});
```

### Logging Configuration

#### Structured JSON Logging
```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/alawael-error.log', 
      level: 'error',
      maxsize: 100000000, // 100MB
      maxFiles: 10
    }),
    new winston.transports.File({ 
      filename: '/var/log/alawael-combined.log',
      maxsize: 100000000,
      maxFiles: 30
    })
  ]
});

// Add console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

#### Log Aggregation Setup (ELK Stack)
```yaml
# docker-compose.yml for centralized logging
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:7.17.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

  filebeat:
    image: docker.elastic.co/beats/filebeat:7.17.0
    volumes:
      - /var/log/alawael-*.log:/var/log/alawael.log
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml
    command: filebeat -e -strict.perms=false

volumes:
  elasticsearch_data:
```

---

## 🚨 Alerting Strategy

### Alert Severity Levels

```
P0 (Critical - Page immediately):
├─ Service completely down
├─ Data loss detected
├─ Authentication system down
└─ Security breach detected

P1 (High - Page within 15 min):
├─ Error rate > 5%
├─ API latency p95 > 500ms
├─ Database connection pool exhausted
└─ Cache system down

P2 (Medium - Email + Slack):
├─ Error rate 1-5%
├─ API latency p95 > 200ms
├─ CPU usage > 80%
└─ SSL certificate expires in 7 days

P3 (Low - Slack only):
├─ Disk usage > 80%
├─ Log file growth unusual
├─ Performance degradation detected
└─ Minor security warnings
```

### Alert Configuration Examples

```javascript
// Critical Alerts
{
  name: 'Service Down',
  condition: 'health_check_failed',
  severity: 'P0',
  notification: ['pagerduty', 'sms', 'slack', 'email'],
  escalation_time: 0
}

{
  name: 'High Error Rate',
  condition: 'error_rate > 0.05',
  severity: 'P1',
  notification: ['pagerduty', 'slack', 'email'],
  escalation_time: 15
}

{
  name: 'High Latency',
  condition: 'api_latency_p95 > 500ms',
  severity: 'P1',
  notification: ['slack', 'email'],
  escalation_time: 15
}

{
  name: 'SSL Certificate Expiring',
  condition: 'ssl_cert_days_remaining < 7',
  severity: 'P2',
  notification: ['slack', 'email'],
  escalation_time: null
}
```

---

## 📊 Dashboards

### Golden Signals Dashboard
Monitor these 4 key metrics:

```
1. Latency
   ├─ API response time (p50, p95, p99)
   ├─ Database query time
   └─ Cache operations

2. Traffic
   ├─ Requests per second
   ├─ Active connections
   └─ Bandwidth usage

3. Errors
   ├─ Error rate (%)
   ├─ 5xx vs 4xx breakdown
   └─ Top error types

4. Saturation
   ├─ CPU utilization
   ├─ Memory usage
   ├─ Database connections
   └─ Disk I/O
```

### Business Metrics Dashboard
```
├─ Active Users (real-time)
├─ Transactions/minute
├─ Revenue (if applicable)
├─ Feature usage distribution
├─ User retention
└─ Conversion rates
```

### Infrastructure Dashboard
```
├─ Server Status (health check)
├─ Docker Container Status
├─ Database Replication Lag
├─ Cache Memory Usage
├─ Network I/O
├─ Disk Usage Trends
└─ Cost Analysis
```

### Security Dashboard
```
├─ Failed Login Attempts
├─ SQL Injection Attempts (blocked)
├─ XSS Attempts (blocked)
├─ Rate Limit Triggers
├─ Unusual Geographic Access
└─ Certificate Expiration Alert
```

---

## 📅 Daily Operations

### Morning Checklist (Every Day 9 AM)
```bash
#!/bin/bash
# daily-health-check.sh

echo "🔍 Daily Health Check - $(date)"

# Check API availability
STATUS=$(curl -s -w "%{http_code}" https://api.alawael.com/api/health -o /dev/null)
echo "API Health Check: $STATUS"

# Check database
psql --host=$DB_HOST --user=$DB_USER --dbname=$DB_NAME --command="SELECT COUNT(*) FROM users;" | grep -v COUNT | grep -v "^[[:space:]]*$"

# Check Redis
redis-cli -h $REDIS_HOST PING

# Check disk usage
df -h | grep -E "/(dev|mnt)" | awk '{print $5, $6}'

# Check error rate (from logs)
grep "ERROR" /var/log/alawael-combined.log | wc -l

# Backup verification
ls -lh /backups/latest/ | tail -5

echo "✅ Health check completed at $(date)"
```

### Weekly Tasks (Every Monday 10 AM)
- [ ] Review metrics trends
- [ ] Check security logs for anomalies
- [ ] Analyze performance bottlenecks
- [ ] Review backup success rates
- [ ] Update runbooks if needed
- [ ] Team sync on issues found

### Monthly Tasks (First Friday)
- [ ] Full system audit
- [ ] Capacity planning review
- [ ] Security compliance check
- [ ] Cost analysis & optimization
- [ ] Team retrospective
- [ ] Plans for next month

---

## 🚨 Incident Response

### Incident Classification

#### P0 Incident Response (5 minute RTO)
```
1. Alert received
   ↓
2. Page on-call engineer (automatic)
   ↓
3. Engineer acknowledges (< 1 min)
   ↓
4. Join war room (Slack + Zoom)
   ↓
5. Assess impact & decide:
   - Fix in-place
   - Rollback deployment
   - Take service offline gracefully
   ↓
6. Implement resolution (< 5 min total)
   ↓
7. Verify recovery
   ↓
8. Post-mortem (next day)
```

#### P1 Incident Response (15 minute RTO)
```
1. Slack notification sent
   ↓
2. On-call engineer checks (< 5 min)
   ↓
3. Assess severity
   ↓
4. Decide: Remediate or Escalate to P0
   ↓
5. Implement fix or escalate
   ↓
6. Brief team when resolved
```

### Incident Response Playbooks

#### **Playbook #1: High Error Rate**
```
Symptom: Error rate > 5%

Investigation:
1. curl https://api.alawael.com/api/health
2. Check error logs for patterns
3. Review recent deployments
4. Check database connectivity

Common Causes & Fixes:
├─ Database down
│  └─ Restart database RDS → Restart application
├─ Cache down
│  └─ Clear and rebuild cache
├─ Memory leak in code
│  └─ Restart affected service
└─ External API integration failure
   └─ Check integration status & retry

Escalation: If unresolved in 5 min → call Security Lead
```

#### **Playbook #2: High Latency**
```
Symptom: API response time p95 > 500ms

Investigation:
1. Check database query times (slow query log)
2. Check cache hit rates
3. Check CPU/memory usage
4. Check network I/O

Common Causes & Fixes:
├─ Expensive DB query (N+1)
│  └─ Check and optimize query
├─ Cache miss (cold cache)
│  └─ Rebuild cache from batch job
├─ Resource exhaustion
│  └─ Scale up or optimize code
└─ Network issues
   └─ Check load balancer configuration

Escalation: If unresolved in 10 min → call DevOps
```

#### **Playbook #3: Deployment Failed**
```
Symptom: Deployment stuck or rolling back

Quick Decision Tree:
Is it a critical service?
├─ YES: Rollback immediately
├─ NO: Check if critical path affected
│  ├─ YES: Rollback
│  └─ NO: Debug and fix forward

Rollback Steps:
1. Click 'Rollback' in GitHub Actions
2. Wait for health checks (2-3 min)
3. Verify previous version is working
4. Investigate failure cause
5. Plan fix for next deployment

Prevention:
- Always test in staging first
- Use canary deployments
- Monitor metrics before full rollout
```

### War Room Procedures

**When to Declare War Room**
- P0 incident in progress
- Estimated impact > 1000 users
- Revenue-impacting incident
- Security incident under investigation

**War Room Setup**
```
Channel: #alawael-incident-response
Video: [Zoom link]
Participants:
├─ Incident Commander (declares/controls)
├─ Engineering Lead
├─ DevOps Engineer
├─ Database Admin
├─ Product Manager
└─ CEO (if P0)

Roles:
├─ Incident Commander: Directs response
├─ Scribe: Documents timeline
├─ Technical Lead: Fixes issue
└─ Communications: Updates status page
```

**Communication Template**
```
INCIDENT UPDATE #[N]
Time: [HH:MM UTC]
Status: INVESTIGATING | WORKING ON FIX | RESOLVED

What happened:
[2-3 sentence impact summary]

What we're doing:
[Current actions]

Affected users:
[% of users or specific systems]

ETA for resolution:
[Estimated time]

Will update every 15 minutes.
```

---

## ⚡ Performance Optimization

### Baseline Metrics (Post-Launch)
```
Record these on Day 1:
├─ Peak requests/sec: ___
├─ Average response time: ___ms
├─ Database query time: ___ms
├─ Cache hit rate: ___%
├─ Memory usage: ___MB
├─ CPU usage: ___%
└─ Cost/month: $___
```

### Optimization Checklist

#### Database Optimization
- [ ] Run `ANALYZE` on all tables
- [ ] Check for missing indexes (slow query log)
- [ ] Monitor replication lag
- [ ] Optimize connection pooling settings
  ```javascript
  // Good pooling config
  pool: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  }
  ```
- [ ] Archive old data quarterly

#### Cache Optimization
- [ ] Monitor cache hit rates per endpoint
- [ ] Tune TTL values
  ```javascript
  // Recommended TTL by data type
  User profile: 1 hour
  Config: 24 hours
  List data: 1 hour
  Search results: 30 min
  ```
- [ ] Implement cache warming at startup
- [ ] Monitor memory usage, plan scaling

#### API Optimization
- [ ] Implement pagination for list endpoints
- [ ] Add response compression
  ```javascript
  app.use(compression());
  ```
- [ ] Implement HTTP caching headers
  ```javascript
  app.use((req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300');
    next();
  });
  ```
- [ ] Implement rate limiting properly
- [ ] Monitor and reduce payload sizes

#### Infrastructure Optimization
- [ ] Review auto-scaling policies
- [ ] Right-size instances based on usage
- [ ] Monitor costs weekly
- [ ] Use reserved instances for baseline load
- [ ] Enable multi-region if geography requires

---

## 💾 Backup & Recovery

### Backup Strategy (3-2-1 Rule)

```
3 copies of data
├─ Primary (active production)
├─ Backup 1 (same region)
└─ Backup 2 (different region)

2 different storage types
├─ RDS Automated backups (7 days)
└─ S3 for long-term storage (30 days)

1 off-site copy
└─ Cross-region backup in S3
```

### Automated Backup Procedures

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/alawael_backup_$DATE.sql.gz"

# Backup database
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Verify backup
gunzip -t $BACKUP_FILE && echo "✅ Backup validation passed"

# Upload to S3
aws s3 cp $BACKUP_FILE s3://alawael-backups/$DATE/

# Keep only last 30 days locally
find $BACKUP_DIR -name "alawael_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

### Recovery Testing

**Monthly Recovery Drill**
```
1. Take a recent backup
2. Restore to test environment
3. Run smoke tests
4. Verify data integrity
5. Calculate RTO/RPO
6. Document process
7. Update runbook if needed

Expected Times:
├─ RTO (Recovery Time Objective): < 15 minutes
└─ RPO (Recovery Point Objective): < 1 hour
```

---

## 📱 On-Call Guide

### Escalation Path
```
Level 1 (Initial):   DevOps/Backend Engineer
    ↓ (15 min no progress)
Level 2 (Escalation): Engineering Manager + Tech Lead
    ↓ (30 min no progress)
Level 3 (Major):     VP Engineering + Product Lead
```

### On-Call Handoff
**Previous week on-call**: Review any recurring issues
**System status**: Show new engineer current dashboards
**Recent incidents**: Brief on recent learnings
**Tomorrow's work**: Alert to any scheduled maintenance

### On-Call Fatigue
- Limit to 1 week per engineer
- Ensure 48 hours between rotations
- Provide quiet period after busy week
- Offer compensation for night shifts

---

## 🔐 Security Monitoring

### Security Events to Monitor
```
✅ Failed login attempts (> 10/hour)
✅ Unusual geographic access
✅ Mass export of data
✅ Database schema changes
✅ Privilege escalation attempts
✅ API rate limit violations
✅ Suspicious file uploads
✅ Certificate validation failures
```

### Automated Security Checks
```bash
#!/bin/bash
# Security scan (run daily)

# Check for new vulnerabilities
npm audit --production

# Scan code for secrets
git secrets scan

# Check SSL certificates
echo | openssl s_client -servername api.alawael.com \
  -connect api.alawael.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Review IAM permissions
aws iam get-credential-report

echo "Security scan completed"
```

---

## 📞 Useful Commands

### Diagnostics
```bash
# Check service health
curl https://api.alawael.com/api/health -v

# View recent logs
tail -f /var/log/alawael-error.log

# Check top processes
top -o %CPU | head -15

# Check disk usage
du -sh /var/log/*
du -sh /data/*

# Monitor real-time metrics
watch -n 1 'ps aux | grep node'
```

### Database
```bash
# Connect to production database
psql --host=$PROD_DB_HOST --user=$PROD_DB_USER --dbname=alawael

# Check table sizes
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables ORDER BY pg_total_relation_size DESC;

# List active connections
SELECT * FROM pg_stat_activity;

# Kill slow queries
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity WHERE query_start < now() - interval '10 minutes';
```

### Deployment
```bash
# Deploy new version
git tag v1.0.1
git push origin v1.0.1
# GitHub Actions triggers automatically

# View deployment status
kubectl rollout status deployment/alawael-backend

# Rollback if needed
kubectl rollout undo deployment/alawael-backend
```

---

## 📚 Documentation Links
- [Incident Response Policy](./INCIDENT_RESPONSE_POLICY.md)
- [Operational Runbook](./OPERATIONAL_RUNBOOK.md)
- [API Documentation](./API_DOCS.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Version**: 1.0
**Last Updated**: 25 February 2026
**Status**: 🟢 Ready for Production
**Next Review**: 28 February 2026
