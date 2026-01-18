# 🔧 **Operations Runbook**

**التاريخ:** 14 يناير 2026  
**الإصدار:** 4.0.0 - Phase 6 Complete  
**الجمهور المستهدف:** Operations Team, DevOps, Support

---

## 📋 **جدول المحتويات**

```
1. Emergency Response Procedures
2. Common Operational Tasks
3. Monitoring & Alerting
4. Backup & Recovery
5. Performance Tuning
6. Security Operations
7. Incident Management
8. Escalation Procedures
9. Post-Incident Review
10. Reference Information
```

---

## 🚨 **Section 1: Emergency Response Procedures**

### 1.1 Critical Service Down

#### Symptoms

```
- Health check returning 5xx errors
- No response from application
- Users unable to access system
- Alert: "Service Down"
```

#### Immediate Actions (First 5 Minutes)

```
1. Verify the alert is real
   └─ curl http://localhost:3001/health

2. Check if service is running
   └─ pm2 status

3. Check system resources
   ├─ top
   └─ df -h

4. Check logs for errors
   └─ tail -f logs/app.log

5. Notify team via Slack/Email
```

#### Resolution Steps

```bash
# Step 1: Restart the application
pm2 restart app_production

# Step 2: Check if restart fixed it
curl http://localhost:3001/health

# Step 3: If still down, check dependencies
# Redis
redis-cli ping

# MongoDB
mongo --eval "db.runCommand({ping: 1})"

# Step 4: Check for port conflicts
netstat -tuln | grep 3001

# Step 5: Check disk space
df -h

# Step 6: Check memory
free -h

# Step 7: If all else fails, reboot server (last resort)
# sudo reboot
```

#### Post-Recovery

```
□ Verify all services are running
□ Check monitoring dashboards
□ Review logs for root cause
□ Document incident
□ Schedule post-incident review
```

---

### 1.2 Database Connection Failure

#### Symptoms

```
- Errors in logs: "MongoError: connection refused"
- API returns 500 errors
- Slow query responses
- Alert: "Database Connection Failed"
```

#### Immediate Actions

```bash
# Check MongoDB status
systemctl status mongod

# Check if MongoDB is responding
mongo --eval "db.serverStatus()"

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Check connection count
mongo --eval "db.serverStatus().connections"
```

#### Resolution Steps

```bash
# Step 1: Restart MongoDB (if down)
systemctl restart mongod

# Step 2: Check replica set status
mongo --eval "rs.status()"

# Step 3: If primary is down, force election
mongo --eval "rs.stepDown()"

# Step 4: Check for replication lag
mongo --eval "rs.printReplicationInfo()"

# Step 5: Verify connection string in .env
cat .env | grep MONGODB_URI

# Step 6: Test connection manually
mongo "mongodb://localhost:27017/almashooq"

# Step 7: Check for locked database
mongo --eval "db.currentOp()"

# Step 8: If locked, kill long-running operations
mongo --eval "db.killOp(<opid>)"
```

#### Post-Recovery

```
□ Verify replica set health
□ Check replication lag
□ Review slow query log
□ Update runbook if needed
```

---

### 1.3 Redis Cluster Failure

#### Symptoms

```
- Cache miss rate 100%
- Slow response times
- Errors: "Redis connection refused"
- Alert: "Redis Cluster Unhealthy"
```

#### Immediate Actions

```bash
# Check cluster status
redis-cli -p 7000 cluster info

# Check all nodes
for port in {7000..7005}; do
  echo "Node $port:"
  redis-cli -p $port ping
done

# Check cluster nodes
redis-cli -p 7000 cluster nodes
```

#### Resolution Steps

```bash
# Step 1: Identify failed nodes
redis-cli -p 7000 cluster nodes | grep fail

# Step 2: Restart failed node
redis-server --port <failed-port> \
  --cluster-enabled yes \
  --cluster-config-file nodes-<port>.conf

# Step 3: If node won't rejoin, reset it
redis-cli -p <port> cluster reset hard

# Step 4: Rebalance cluster (if needed)
redis-cli --cluster rebalance 127.0.0.1:7000

# Step 5: Check for split brain
redis-cli -p 7000 cluster info | grep cluster_state

# Step 6: If split brain, force manual failover
redis-cli -p <replica-port> cluster failover

# Step 7: Verify cluster health
redis-cli -p 7000 cluster check 127.0.0.1:7000
```

#### Post-Recovery

```
□ Verify all 6 nodes are healthy
□ Check replication status
□ Monitor performance for 30 minutes
□ Review cluster logs
```

---

### 1.4 High CPU Usage

#### Symptoms

```
- CPU usage > 90%
- Slow response times
- Server becoming unresponsive
- Alert: "High CPU Usage"
```

#### Immediate Actions

```bash
# Check top processes
top

# Check Node.js processes
ps aux | grep node

# Check CPU per core
mpstat -P ALL 1

# Check load average
uptime
```

#### Resolution Steps

```bash
# Step 1: Identify the culprit
top -o %CPU

# Step 2: Check if it's the app
pm2 monit

# Step 3: Get process details
ps -p <PID> -o %cpu,%mem,cmd

# Step 4: Check for runaway queries
mongo --eval "db.currentOp({'secs_running': {$gt: 1}})"

# Step 5: Enable Node.js profiling
pm2 restart app_production --node-args="--prof"

# Step 6: If critical, scale horizontally (add instance)
pm2 scale app_production +1

# Step 7: If emergency, restart app
pm2 restart app_production

# Step 8: Generate CPU profile
node --prof-process isolate-*.log > processed.txt
```

#### Post-Recovery

```
□ Analyze CPU profile
□ Identify bottleneck
□ Optimize code if needed
□ Consider vertical scaling
□ Update capacity plan
```

---

### 1.5 Memory Leak

#### Symptoms

```
- Memory usage continuously increasing
- OOM errors in logs
- Application crashes
- Alert: "High Memory Usage"
```

#### Immediate Actions

```bash
# Check memory usage
free -h

# Check Node.js heap
node --expose-gc --max-old-space-size=4096

# Check process memory
ps aux | grep node | awk '{print $6}'

# Check for memory leaks
pm2 monit
```

#### Resolution Steps

```bash
# Step 1: Take heap snapshot (before restart)
kill -USR2 <node-pid>

# Step 2: Restart application
pm2 restart app_production

# Step 3: Monitor memory after restart
watch -n 5 'free -h'

# Step 4: Enable GC logging
pm2 restart app_production \
  --node-args="--trace-gc --trace-gc-verbose"

# Step 5: Analyze heap dump
node --inspect heapdump-*.heapsnapshot

# Step 6: Check for event listener leaks
# In code, add:
# process.on('warning', console.warn)

# Step 7: Increase memory limit temporarily
pm2 restart app_production \
  --node-args="--max-old-space-size=8192"
```

#### Post-Recovery

```
□ Analyze heap snapshot
□ Identify leak source
□ Fix code
□ Deploy patch
□ Monitor for 24 hours
```

---

## ⚙️ **Section 2: Common Operational Tasks**

### 2.1 Deploying New Version

#### Pre-Deployment Checklist

```
□ All tests passing (961/961)
□ Security scan completed
□ Database migrations ready
□ Rollback plan prepared
□ Team notified
□ Maintenance window scheduled
□ Backups completed
```

#### Deployment Steps

```bash
# Step 1: Create backup
mongodump --out=/backups/$(date +%Y%m%d-%H%M%S)

# Step 2: Pull latest code
git pull origin main

# Step 3: Install dependencies
npm install --production

# Step 4: Run database migrations (if any)
npm run migrate

# Step 5: Build frontend
cd frontend
npm run build
cd ..

# Step 6: Run tests
npm test

# Step 7: Restart with zero downtime
pm2 reload app_production

# Step 8: Verify deployment
curl http://localhost:3001/health
curl http://localhost:3001/api/version

# Step 9: Check logs for errors
pm2 logs --lines 50

# Step 10: Monitor for 15 minutes
watch -n 10 'curl -s http://localhost:3001/health'
```

#### Rollback Procedure (If Needed)

```bash
# Step 1: Revert code
git revert HEAD
# OR
git checkout <previous-commit-hash>

# Step 2: Reinstall dependencies
npm install --production

# Step 3: Rollback migrations (if any)
npm run migrate:rollback

# Step 4: Restart app
pm2 reload app_production

# Step 5: Verify rollback
curl http://localhost:3001/health

# Step 6: Restore database (if needed)
mongorestore /backups/<backup-date>/
```

---

### 2.2 Scaling Operations

#### Vertical Scaling (Increase Resources)

```bash
# Step 1: Check current resources
free -h
df -h
nproc

# Step 2: Stop application
pm2 stop app_production

# Step 3: Resize server (cloud provider console)
# AWS: Change instance type
# Azure: Change VM size
# GCP: Change machine type

# Step 4: Start application
pm2 start app_production

# Step 5: Adjust Node.js memory limit
pm2 delete app_production
pm2 start app_production.js \
  --name app_production \
  --node-args="--max-old-space-size=8192"

# Step 6: Verify
pm2 info app_production
```

#### Horizontal Scaling (Add Instances)

```bash
# Step 1: Scale to multiple instances
pm2 scale app_production 4

# Step 2: Enable cluster mode
pm2 start app_production.js -i max

# Step 3: Configure load balancer
# Nginx configuration:
upstream backend {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    server localhost:3004;
}

# Step 4: Reload nginx
nginx -s reload

# Step 5: Verify all instances
pm2 list
```

---

### 2.3 Cache Management

#### Clear All Caches

```bash
# Clear Redis cache
redis-cli -p 7000 FLUSHALL

# Clear application cache
curl -X POST http://localhost:3001/api/performance/cache/clear

# Clear CDN cache (Cloudflare)
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Verify cache cleared
redis-cli -p 7000 INFO stats | grep keyspace
```

#### Clear Specific Cache Key

```bash
# Clear specific Redis key
redis-cli -p 7000 DEL "cache:vehicles:*"

# Clear specific route cache
curl -X POST http://localhost:3001/api/performance/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "vehicles"}'

# Verify
redis-cli -p 7000 KEYS "cache:vehicles:*"
```

#### Cache Warming

```bash
# Warm up common endpoints
endpoints=(
  "/api/vehicles"
  "/api/students"
  "/api/sessions"
  "/api/appointments"
)

for endpoint in "${endpoints[@]}"; do
  echo "Warming: $endpoint"
  curl -s http://localhost:3001$endpoint > /dev/null
done

# Verify cache population
curl http://localhost:3001/api/performance/cache
```

---

### 2.4 Database Maintenance

#### Daily Backup

```bash
# Create backup
mongodump \
  --uri="mongodb://localhost:27017/almashooq" \
  --out=/backups/$(date +%Y%m%d)

# Compress backup
tar -czf /backups/$(date +%Y%m%d).tar.gz \
  /backups/$(date +%Y%m%d)

# Remove old backups (keep 7 days)
find /backups -name "*.tar.gz" -mtime +7 -delete

# Verify backup
mongorestore --dryRun --uri="mongodb://localhost:27017/test" \
  /backups/$(date +%Y%m%d)
```

#### Optimize Database

```bash
# Compact collections
mongo almashooq --eval "db.runCommand({compact: 'vehicles'})"

# Rebuild indexes
mongo almashooq --eval "db.vehicles.reIndex()"

# Check index usage
mongo almashooq --eval "db.vehicles.aggregate([
  { \$indexStats: {} }
])"

# Remove unused indexes
mongo almashooq --eval "db.vehicles.dropIndex('unused_index')"
```

#### Monitor Replication

```bash
# Check replica set status
mongo --eval "rs.status()"

# Check replication lag
mongo --eval "rs.printSecondaryReplicationInfo()"

# Force sync (if lagging)
mongo --eval "db.adminCommand({resync: 1})"
```

---

### 2.5 Log Management

#### View Logs

```bash
# Application logs
pm2 logs app_production --lines 100

# Error logs only
pm2 logs app_production --err --lines 50

# Follow logs in real-time
tail -f logs/app.log

# Search logs
grep "ERROR" logs/app.log

# Filter by date
awk '/2026-01-14/' logs/app.log
```

#### Rotate Logs

```bash
# Manual log rotation
pm2 flush

# Configure automatic rotation (pm2-logrotate)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true

# Verify configuration
pm2 conf pm2-logrotate
```

#### Archive Old Logs

```bash
# Compress old logs
gzip logs/app-$(date -d "yesterday" +%Y%m%d).log

# Move to archive
mv logs/*.gz /archive/logs/

# Remove very old logs (> 90 days)
find /archive/logs -name "*.gz" -mtime +90 -delete
```

---

## 📊 **Section 3: Monitoring & Alerting**

### 3.1 Health Checks

#### Manual Health Check

```bash
# Application health
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}

# Detailed health check
curl http://localhost:3001/api/performance/metrics

# Database health
mongo --eval "db.serverStatus().ok"

# Redis health
redis-cli -p 7000 ping

# All services check script
#!/bin/bash
services=(
  "http://localhost:3001/health"
  "redis://localhost:7000"
  "mongodb://localhost:27017"
)

for service in "${services[@]}"; do
  echo "Checking: $service"
  # Add specific check for each
done
```

#### Automated Health Checks

```bash
# Setup cron job for health checks
crontab -e

# Add this line (check every 5 minutes)
*/5 * * * * /opt/scripts/health_check.sh

# health_check.sh content:
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ $response != "200" ]; then
  echo "Health check failed: $response" | \
    mail -s "Alert: Service Down" ops@company.com
fi
```

---

### 3.2 Performance Monitoring

#### Real-time Metrics

```bash
# CPU and Memory
pm2 monit

# Request rate
watch -n 1 'curl -s http://localhost:3001/api/performance/metrics | \
  jq ".requestsPerSecond"'

# Cache hit rate
watch -n 5 'redis-cli -p 7000 INFO stats | grep keyspace_hits'

# Database operations
watch -n 5 'mongo --quiet --eval "db.serverStatus().opcounters"'
```

#### Performance Dashboard

```bash
# Access performance API
curl http://localhost:3001/api/performance/metrics

# Key metrics to monitor:
{
  "responseTime": "15ms",
  "throughput": "50000 req/s",
  "cacheHitRate": "87%",
  "errorRate": "0.01%",
  "uptime": "99.99%"
}
```

---

### 3.3 Alert Configuration

#### Critical Alerts (Immediate Response)

```yaml
Service Down:
  Condition: Health check fails for 2 minutes
  Action: Page on-call engineer
  Channels: PagerDuty, SMS, Phone

High Error Rate:
  Condition: Error rate > 1% for 5 minutes
  Action: Alert ops team
  Channels: Slack, Email

Database Failure:
  Condition: MongoDB connection fails
  Action: Page on-call DBA
  Channels: PagerDuty, SMS
```

#### Warning Alerts (Next Business Day)

```yaml
High Memory Usage:
  Condition: Memory > 80% for 30 minutes
  Action: Email ops team
  Channels: Email

Slow Response Time:
  Condition: P95 > 100ms for 15 minutes
  Action: Slack notification
  Channels: Slack

Low Cache Hit Rate:
  Condition: Hit rate < 70% for 1 hour
  Action: Email on-call
  Channels: Email
```

---

## 💾 **Section 4: Backup & Recovery**

### 4.1 Backup Procedures

#### Full System Backup

```bash
#!/bin/bash
# full_backup.sh

BACKUP_DIR="/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Database backup
mongodump --out=$BACKUP_DIR/database

# Redis backup
redis-cli -p 7000 BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis-dump.rdb

# Application code
tar -czf $BACKUP_DIR/app-code.tar.gz \
  --exclude='node_modules' \
  --exclude='logs' \
  /opt/app/

# Configuration files
cp -r /opt/app/.env $BACKUP_DIR/
cp -r /etc/nginx/sites-available $BACKUP_DIR/nginx-config

# Compress entire backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

#### Automated Backup Schedule

```bash
# Add to crontab
crontab -e

# Daily full backup at 2 AM
0 2 * * * /opt/scripts/full_backup.sh

# Hourly incremental (Redis only)
0 * * * * redis-cli -p 7000 BGSAVE

# Sync to remote storage (S3/Azure)
30 3 * * * aws s3 sync /backups/ s3://company-backups/
```

---

### 4.2 Recovery Procedures

#### Restore Database

```bash
# Step 1: Stop application
pm2 stop app_production

# Step 2: Restore from backup
mongorestore --drop /backups/20260114/database/

# Step 3: Verify restore
mongo almashooq --eval "db.vehicles.count()"

# Step 4: Start application
pm2 start app_production

# Step 5: Verify functionality
curl http://localhost:3001/api/vehicles
```

#### Disaster Recovery (Full System)

```bash
# Step 1: Provision new server
# (Cloud provider console)

# Step 2: Install dependencies
apt-get update
apt-get install -y nodejs mongodb redis-server nginx

# Step 3: Extract backup
tar -xzf /backups/20260114.tar.gz -C /tmp/

# Step 4: Restore database
mongorestore --drop /tmp/20260114/database/

# Step 5: Restore Redis
cp /tmp/20260114/redis-dump.rdb /var/lib/redis/
systemctl restart redis

# Step 6: Deploy application
cd /opt/app
tar -xzf /tmp/20260114/app-code.tar.gz
npm install --production

# Step 7: Restore configuration
cp /tmp/20260114/.env /opt/app/
cp -r /tmp/20260114/nginx-config/* /etc/nginx/sites-available/

# Step 8: Start services
pm2 start app_production
systemctl restart nginx

# Step 9: Verify
curl http://localhost:3001/health
```

---

## 🔍 **Section 5: Performance Tuning**

### 5.1 Application Tuning

#### Node.js Optimization

```bash
# Increase heap size
pm2 delete app_production
pm2 start app_production.js \
  --node-args="--max-old-space-size=8192 --max-semi-space-size=128"

# Enable production optimizations
NODE_ENV=production pm2 restart app_production

# Adjust garbage collection
pm2 restart app_production \
  --node-args="--gc-interval=100 --max-old-space-size=8192"
```

#### Cluster Mode Tuning

```javascript
// app_production.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', worker => {
    console.log(`Worker ${worker.id} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Worker processes
  require('./server');
}
```

---

### 5.2 Database Tuning

#### MongoDB Configuration

```yaml
# /etc/mongod.conf

storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

net:
  maxIncomingConnections: 200

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

#### Index Optimization

```javascript
// Check slow queries
db.system.profile
  .find({
    millis: { $gt: 100 },
  })
  .sort({ millis: -1 })
  .limit(10);

// Add missing indexes
db.vehicles.createIndex({ type: 1, status: 1 });
db.students.createIndex({ email: 1 }, { unique: true });

// Remove unused indexes
db.vehicles.dropIndex('old_unused_index');
```

---

### 5.3 Redis Tuning

#### Redis Configuration

```conf
# /etc/redis/redis.conf

maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

tcp-backlog 511
timeout 300
tcp-keepalive 300

maxclients 10000
```

#### Cluster Optimization

```bash
# Rebalance cluster
redis-cli --cluster rebalance 127.0.0.1:7000

# Check memory usage per node
for port in {7000..7005}; do
  echo "Node $port:"
  redis-cli -p $port INFO memory | grep used_memory_human
done

# Optimize memory (if needed)
redis-cli -p 7000 MEMORY PURGE
```

---

## 🔒 **Section 6: Security Operations**

### 6.1 Security Monitoring

#### Check for Intrusions

```bash
# Check failed login attempts
grep "Failed" /var/log/auth.log

# Check for unusual connections
netstat -antp | grep ESTABLISHED

# Check running processes
ps aux | grep -v "\[" | sort -rk 3,3 | head -n 10

# Check open ports
nmap localhost
```

#### Security Audit

```bash
# Run security scan
npm audit

# Fix vulnerabilities
npm audit fix

# Check SSL certificate
openssl s_client -connect yourdomain.com:443

# Check for malware
clamscan -r /opt/app/
```

---

### 6.2 Access Control

#### Review User Access

```bash
# List users with sudo access
grep -Po '^sudo.+:\K.*$' /etc/group

# List SSH keys
cat ~/.ssh/authorized_keys

# Review MongoDB users
mongo admin --eval "db.system.users.find()"

# Review Redis ACLs
redis-cli -p 7000 ACL LIST
```

#### Update Credentials

```bash
# Rotate API keys (in .env)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Update MongoDB password
mongo admin --eval "db.changeUserPassword('admin', 'newpassword')"

# Update Redis password
redis-cli CONFIG SET requirepass "newpassword"

# Restart services
pm2 restart app_production
```

---

## 🎯 **Section 7: Incident Management**

### 7.1 Incident Response Process

#### Step 1: Detection & Acknowledgment (0-5 min)

```
□ Alert received
□ Acknowledge alert in PagerDuty/Slack
□ Open incident ticket
□ Notify team lead
□ Start incident timer
```

#### Step 2: Initial Assessment (5-15 min)

```
□ Verify the issue is real
□ Determine severity (P0/P1/P2/P3)
□ Check system status
□ Review recent changes
□ Identify impacted services
```

#### Step 3: Containment (15-30 min)

```
□ Isolate affected components
□ Prevent cascading failures
□ Implement temporary workaround if possible
□ Update status page
□ Communicate to stakeholders
```

#### Step 4: Investigation (Ongoing)

```
□ Collect logs and metrics
□ Reproduce the issue
□ Identify root cause
□ Develop fix plan
□ Test fix in staging
```

#### Step 5: Resolution (Variable)

```
□ Implement fix
□ Verify fix works
□ Monitor for stability
□ Gradually restore traffic
□ Update status page: Resolved
```

#### Step 6: Post-Incident (Next 24h)

```
□ Document incident timeline
□ Conduct post-mortem meeting
□ Identify action items
□ Update runbooks
□ Share learnings with team
```

---

### 7.2 Severity Levels

#### P0: Critical (15 min SLA)

```
Impact: Complete service outage
Examples:
- All users cannot access system
- Data loss occurring
- Security breach detected

Response:
- Page on-call immediately
- All hands on deck
- Executives notified
```

#### P1: High (1 hour SLA)

```
Impact: Major functionality degraded
Examples:
- Key features not working
- Performance severely degraded
- Database replication failing

Response:
- Alert on-call team
- Team lead involved
- Status updates every 30 min
```

#### P2: Medium (4 hours SLA)

```
Impact: Minor functionality affected
Examples:
- Non-critical feature broken
- Slow response times
- Cache not working

Response:
- Notify team via Slack
- Work during business hours
- Status updates every 2 hours
```

#### P3: Low (Next business day)

```
Impact: Minimal impact
Examples:
- Cosmetic issues
- Minor performance degradation
- Non-urgent improvements

Response:
- Create ticket
- Plan fix in next sprint
- No immediate action required
```

---

## 📞 **Section 8: Escalation Procedures**

### 8.1 Escalation Matrix

```
Level 1: Operations Team
├─ First responders
├─ Handle P2/P3 incidents
├─ Escalate if > 30 minutes
└─ Contact: ops@company.com

Level 2: Senior DevOps
├─ Handle P1 incidents
├─ Complex technical issues
├─ Escalate if > 1 hour
└─ Contact: devops-lead@company.com

Level 3: Engineering Lead
├─ Handle P0 incidents
├─ Architectural decisions
├─ Escalate to CTO if needed
└─ Contact: eng-lead@company.com

Level 4: Executive
├─ Major business impact
├─ Customer escalations
├─ Media inquiries
└─ Contact: cto@company.com
```

---

### 8.2 Contact Information

```yaml
On-Call Rotation:
  Primary: ops-primary@company.com
  Secondary: ops-secondary@company.com
  Manager: ops-manager@company.com

Vendor Support:
  MongoDB: support@mongodb.com
  Redis Labs: support@redis.com
  Cloudflare: enterprise@cloudflare.com
  AWS: aws-support (TAM)

External Services:
  DNS Provider: support@dns-provider.com
  SSL Provider: support@letsencrypt.org
  Monitoring: support@datadog.com
```

---

## 📝 **Section 9: Post-Incident Review**

### 9.1 Post-Mortem Template

```markdown
# Incident Post-Mortem

## Incident Summary

- Date: YYYY-MM-DD
- Duration: X hours Y minutes
- Severity: PX
- Impact: Brief description

## Timeline

- HH:MM - Incident detected
- HH:MM - Team notified
- HH:MM - Root cause identified
- HH:MM - Fix implemented
- HH:MM - Incident resolved

## Root Cause

Detailed explanation of what caused the incident

## Impact

- Users affected: X
- Revenue impact: $X
- Reputation impact: Description

## Resolution

What was done to resolve the incident

## Lessons Learned

### What went well

- Item 1
- Item 2

### What could be improved

- Item 1
- Item 2

## Action Items

- [ ] Item 1 (Owner, Due Date)
- [ ] Item 2 (Owner, Due Date)

## Prevention

Steps to prevent this from happening again
```

---

## 📚 **Section 10: Reference Information**

### 10.1 Quick Reference Commands

```bash
# Health Checks
curl http://localhost:3001/health
redis-cli ping
mongo --eval "db.serverStatus().ok"

# Restart Services
pm2 restart app_production
systemctl restart redis
systemctl restart mongod

# View Logs
pm2 logs --lines 100
tail -f /var/log/syslog
journalctl -f

# System Resources
top
free -h
df -h
netstat -tuln

# Performance
curl http://localhost:3001/api/performance/metrics
redis-cli --stat
mongostat

# Cache
redis-cli -p 7000 INFO stats
curl http://localhost:3001/api/performance/cache
```

---

### 10.2 Configuration Files

```
Application:
- /opt/app/.env
- /opt/app/app_production.js
- /opt/app/ecosystem.config.js

Services:
- /etc/mongod.conf
- /etc/redis/redis.conf
- /etc/nginx/nginx.conf

Logs:
- /opt/app/logs/
- /var/log/mongodb/
- /var/log/redis/
- /var/log/nginx/

Backups:
- /backups/
- s3://company-backups/
```

---

### 10.3 Important URLs

```
Production:
- App: https://yourdomain.com
- API: https://api.yourdomain.com
- Admin: https://admin.yourdomain.com

Monitoring:
- Datadog: https://app.datadoghq.com
- PagerDuty: https://company.pagerduty.com
- Status Page: https://status.yourdomain.com

Documentation:
- Internal Wiki: https://wiki.company.com
- API Docs: http://localhost:3001/api-docs
- Runbooks: /opt/docs/runbooks/
```

---

**تم إنشاء هذا Runbook بواسطة Operations Team**  
**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ Ready for Production Use 🚀
