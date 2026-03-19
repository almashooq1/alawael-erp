# 📖 Operational Runbooks

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** Production Ready

---

## 📋 Table of Contents

1. Daily Operations
2. Database Management
3. Performance & Optimization
4. Backup & Recovery
5. Troubleshooting Common Issues
6. Maintenance Procedures
7. Emergency Procedures

---

## 📅 Daily Operations

### Morning Handoff (9:00 AM)

#### Checklist

```
[ ] Check system status dashboard
[ ] Review overnight incidents/alerts
[ ] Review yesterday's metrics
[ ] Check for failed backups
[ ] Verify all services healthy
[ ] Review error logs
[ ] Check disk space trend
```

#### Commands

```bash
# Check system health
curl http://localhost:5000/api/system/health | jq

# Check logs for errors
tail -50 /var/log/app/error.log

# Check monitoring
open https://monitoring.alawael.com/dashboard

# Check backup status
ls -lah /backups/daily/
```

### Hourly Checks (Automated)

```bash
# These run automatically via cron jobs:
# Disk space check (every hour)
df -h | grep -E '^/dev/'

# Database connection pool
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Cache memory usage
redis-cli INFO memory

# API error rate
curl http://localhost:5000/api/system/metrics | jq '.errors'
```

### Evening Wrap-up (5:00 PM)

#### Checklist

```
[ ] Document any incidents
[ ] Review metrics of the day
[ ] Note any performance changes
[ ] Update on-call status
[ ] Prepare daily report
[ ] Brief evening shift
```

#### Commands

```bash
# Generate daily metrics report
docker exec app npm run metrics:daily

# Verify backup scheduled for tonight
grep "backup" /etc/crontab

# Check if any deployments scheduled
cat /var/log/deploy-schedule.txt
```

### End of Day Report

```markdown
## Daily Operations Report - [DATE]

### System Uptime
- Today: 99.98%
- This week: 99.95%
- This month: 99.87%

### Traffic Summary
- Peak requests/sec: 1,250
- Average requests/sec: 380
- Total requests: 32.8M

### Error Summary
- Total errors: 2,450 (0.007%)
- Critical: 0
- High: 2
- Medium: 8

### Performance
- API p95: 380ms
- API p99: 620ms
- Database queries: avg 12ms

### Incidents
- None

### Alerts
- None critical

### Next Shift Focus
- Monitor deployment (if scheduled)
- Review [specific component]
```

---

## 🗄️ Database Management

### Database Health Check

```bash
#!/bin/bash
# Run: ./db-health-check.sh

echo "=== PostgreSQL Health Check ==="

# Check if running
psql -U postgres -c "SELECT version();"

# Check database size
psql -U postgres -c "
  SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) as size
  FROM pg_database
  WHERE datname = 'alawael'
  ORDER BY pg_database_size(datname) DESC;
"

# Check connections
psql -U postgres -c "
  SELECT 
    usename,
    count(*),
    max(EXTRACT(EPOCH FROM (now() - state_change))) as idle_seconds
  FROM pg_stat_activity
  GROUP BY usename
  ORDER BY count DESC;
"

# Check replication status
psql -U postgres -c "
  SELECT 
    slot_name,
    slot_type,
    active
  FROM pg_replication_slots;
"

# Check slow queries
psql -U postgres -c "
  SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# Check table sizes
psql -U postgres -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"
```

### Database Maintenance

#### Weekly Maintenance (Sunday 2:00 AM)

```bash
#!/bin/bash
# Run: ./db-maintenance-weekly.sh

echo "=== PostgreSQL Weekly Maintenance ==="

# Vacuum analyze
psql -U postgres -d alawael -c "VACUUM ANALYZE;"
echo "✓ Vacuum analyze complete"

# Reindex (non-blocking)
psql -U postgres -d alawael -c "
  REINDEX INDEX CONCURRENTLY idx_name;
"
echo "✓ Reindex complete"

# Update statistics
psql -U postgres -d alawael -c "ANALYZE;"
echo "✓ Statistics updated"

# Check bloat
psql -U postgres -d alawael -c "
  SELECT 
    schemaname,
    tablename,
    ROUND(100.0 * (OCTET_LENGTH(t.heap_blks_read) + 
                   OCTET_LENGTH(t.heap_blks_hit)) / 
          NULLIF(t.heap_blks_read + t.heap_blks_hit, 0)) AS ratio
  FROM pg_statio_user_tables t
  WHERE (t.heap_blks_read + t.heap_blks_hit) > 0
  ORDER BY ratio DESC;
"
```

#### Monthly Maintenance (First Sunday)

```bash
#!/bin/bash
# Run: ./db-maintenance-monthly.sh

echo "=== PostgreSQL Monthly Maintenance ==="

# Full reindex
psql -U postgres -d alawael -c "REINDEX DATABASE CONCURRENTLY alawael;"
echo "✓ Full reindex complete"

# Cluster maintenance
psql -U postgres -d alawael -c "
  CLUSTER alawael USING idx_main;
"
echo "✓ Clustering complete"

# Analyze all
psql -U postgres -d alawael -c "ANALYZE;"
echo "✓ Full analysis complete"

# Remove old logs
find /var/lib/postgresql/logs -mtime +30 -delete
echo "✓ Old logs cleaned"

# Backup statistics
pg_dump -U postgres -d alawael --statistics-only -f /backups/stats.sql
echo "✓ Statistics backed up"
```

### Database Growth Monitoring

```bash
#!/bin/bash
# Run daily: ./db-growth-monitor.sh

DATE=$(date +%Y-%m-%d)
LOGFILE="/var/log/db-growth.log"

# Get current size
SIZE=$(psql -U postgres -t -c "
  SELECT pg_size_pretty(pg_database_size('alawael'))
" | tr -d ' ')

# Log it
echo "$DATE: $SIZE" >> $LOGFILE

# Check if growth rate concerning
YESTERDAY=$(tail -2 $LOGFILE | head -1 | awk '{print $2}')
TODAY=$(tail -1 $LOGFILE | awk '{print $2}')

if [ "$TODAY" > "$YESTERDAY" ]; then
  GROWTH=$(( $(echo $TODAY | sed 's/[A-Z]*//g') - 
             $(echo $YESTERDAY | sed 's/[A-Z]*//g') ))
  echo "Growth: $GROWTH (acceptable if < 2GB/day)"
fi
```

---

## ⚡ Performance & Optimization

### Daily Performance Review

```bash
#!/bin/bash
# Run: ./perf-review.sh

echo "=== Performance Metrics Review ==="

# Get latest metrics
curl -s http://localhost:5000/api/system/metrics | jq '{
  uptime: .uptime,
  cpu_usage: .cpu.usage,
  memory_usage: .memory.used,
  requests_sec: .requests.per_second,
  error_rate: .error_rate,
  db_queries: .database.queries_sec,
  cache_hit_rate: .cache.hit_rate
}' | column -t

# Check for slow endpoints
echo -e "\n=== Top 5 Slow Endpoints ==="
curl -s http://localhost:5000/api/system/metrics | jq '.endpoints | sort_by(-.avg_time) | .[0:5] | .[] | "\(.name): \(.avg_time)ms"'

# Check error distribution
echo -e "\n=== Top 5 Errors ==="
curl -s http://localhost:5000/api/system/metrics | jq '.errors | sort_by(-.count) | .[0:5] | .[] | "\(.type): \(.count)"'
```

### Query Optimization

#### Finding Slow Queries

```bash
#!/bin/bash
# Enable query logging
psql -U postgres -d alawael -c "
  ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 second
  SELECT pg_reload_conf();
"

# Check slow queries
tail -100 /var/log/postgresql/postgresql.log | grep "duration: " | grep -v "0\."
```

#### Optimizing a Query

```bash
#!/bin/bash
# Example: Optimize slow user search query

# First: See current plan
psql -U postgres -d alawael -c "
  EXPLAIN ANALYZE SELECT * FROM users 
  WHERE email LIKE '%test%' AND status = 'active'
  LIMIT 100;
"

# Identify missing indexes
# Result: Seq Scan on users (too slow!)

# Add index
psql -U postgres -d alawael -c "
  CREATE INDEX idx_users_email_status 
  ON users(email, status);
"

# Verify optimization
psql -U postgres -d alawael -c "
  EXPLAIN ANALYZE SELECT * FROM users 
  WHERE email LIKE '%test%' AND status = 'active'
  LIMIT 100;
"

# Result: Index Scan (much faster!)
```

### Cache Optimization

#### Monitor Cache Hit Rate

```bash
#!/bin/bash
# Run: ./cache-monitor.sh

echo "=== Redis Cache Monitor ==="

redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|evicted_keys"

# Calculate hit rate
HITS=$(redis-cli INFO stats | grep keyspace_hits | awk -F: '{print $2}')
MISSES=$(redis-cli INFO stats | grep keyspace_misses | awk -F: '{print $2}')
TOTAL=$((HITS + MISSES))
HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)

echo "Hit Rate: $HIT_RATE%"

if (( $(echo "$HIT_RATE < 80" | bc -l) )); then
  echo "⚠️ Hit rate low! Review cache strategy."
fi
```

#### Warming Cache

```bash
#!/bin/bash
# Run after deployment or restart: ./cache-warmup.sh

echo "=== Warming Cache ==="

# Pre-load frequent queries
redis-cli EVAL "
  local keys = redis.call('keys', 'user:*')
  return #keys
" 0

# Pre-load session data
curl -s http://localhost:5000/api/cache/warmup | jq '.'

echo "✓ Cache warmed"
```

---

## 💾 Backup & Recovery

### Daily Backup Verification

```bash
#!/bin/bash
# Run: ./verify-backups.sh

echo "=== Backup Verification ==="

# Check latest backup
LATEST_BACKUP=$(ls -t /backups/daily/*.sql.gz | head -1)
TIMESTAMP=$(stat -f %Sm -t %Y-%m-%d /backups/daily/*.sql.gz | head -1)

echo "Latest backup: $LATEST_BACKUP ($TIMESTAMP)"

# Verify backup size (should be > 1GB)
SIZE=$(du -h $LATEST_BACKUP | cut -f1)
echo "Backup size: $SIZE"

if [ $(du $LATEST_BACKUP | cut -f1) -lt 1000000 ]; then
  echo "⚠️ WARNING: Backup size suspiciously small!"
fi

# Test restore (optional, on non-prod)
echo "Testing backup integrity..."
gzip -t $LATEST_BACKUP && echo "✓ Backup integrity verified" || echo "✗ Backup corrupted!"

# Check for all expected tables
TABLES=$(zcat $LATEST_BACKUP | grep "CREATE TABLE" | wc -l)
echo "Tables in backup: $TABLES"

if [ $TABLES -lt 30 ]; then
  echo "⚠️ WARNING: Fewer tables than expected!"
fi
```

### Restore Procedure

#### Restore from Full Backup

```bash
#!/bin/bash
# !!! RUN ON TEST SERVER FIRST !!!
# Run: ./restore-database.sh <backup_file>

BACKUP_FILE=${1:-/backups/daily/latest.sql.gz}

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "=== Restoring Database from $BACKUP_FILE ==="

# Stop application
docker stop app
echo "✓ Application stopped"

# Create new database
psql -U postgres -c "DROP DATABASE IF EXISTS alawael_restore;"
psql -U postgres -c "CREATE DATABASE alawael_restore;"
echo "✓ Database created"

# Restore backup
echo "Restoring (this may take several minutes)..."
gunzip -c $BACKUP_FILE | psql -U postgres -d alawael_restore

# Verify
TABLES=$(psql -U postgres -d alawael_restore -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tail -1)
echo "✓ Restored $TABLES tables"

# Test connectivity
psql -U postgres -d alawael_restore -c "SELECT COUNT(*) FROM users;" 
echo "✓ Database verification complete"

# Swap databases (if verified)
read -p "Restore successful. Swap databases? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  psql -U postgres -c "DROP DATABASE alawael;"
  psql -U postgres -c "ALTER DATABASE alawael_restore RENAME TO alawael;"
  echo "✓ Database swapped"
  
  # Restart application
  docker start app
  echo "✓ Application restarted"
fi
```

#### Point-in-Time Recovery

```bash
#!/bin/bash
# Restore to specific timestamp
# Run: ./restore-to-time.sh "2026-02-24 15:30:00"

TARGET_TIME=$1
BACKUP_DATE=$(date -d "$TARGET_TIME" +%Y-%m-%d)
BACKUP_FILE="/backups/daily/backup-$BACKUP_DATE.sql.gz"

echo "=== Point-in-Time Recovery to $TARGET_TIME ==="

if [ ! -f "$BACKUP_FILE" ]; then
  echo "No backup for $BACKUP_DATE found"
  exit 1
fi

# Restore from backup
./restore-database.sh $BACKUP_FILE

# Note: WAL-based PITR requires PostgreSQL WAL archiving
# configured. If not configured, restore to nearest backup.
```

---

## 🔧 Troubleshooting Common Issues

### Issue: Application Memory Leak

```bash
#!/bin/bash
# Detect and resolve memory leak

echo "=== Memory Leak Investigation ==="

# Monitor memory usage
while true; do
  FREE=$(free | grep Mem | awk '{print $7}')
  USED=$(free | grep Mem | awk '{print $3}')
  PERCENT=$(echo "scale=2; $USED * 100 / ($USED + $FREE)" | bc)
  echo "$(date): Memory used: $PERCENT%"
  sleep 60
done &
MONITOR_PID=$!

# Run application for 1 hour
echo "Monitoring for 1 hour..."
sleep 3600

kill $MONITOR_PID

# If memory consistently growing > 50MB/hour:
if [ /* memory growing */ ]; then
  echo "Memory leak detected!"
  
  # Generate heap dump
  docker exec app npm run debug:heapdump
  
  # Analyze
  node --inspect-brk ./node_modules/.bin/clinic.js doctor
fi
```

### Issue: Database Connection Pool Exhaustion

```bash
#!/bin/bash
# Resolve connection pool issues

echo "=== Connection Pool Investigation ==="

# Check current connections
psql -U postgres -c "
  SELECT 
    datname,
    usename,
    application_name,
    state,
    COUNT(*) as count
  FROM pg_stat_activity
  GROUP BY datname, usename, application_name, state
  ORDER BY count DESC;
"

# Kill idle connections
psql -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'alawael'
    AND pid <> pg_backend_pid()
    AND state = 'idle'
    AND query_start < NOW() - INTERVAL '30 minutes';
"

# Increase pool size in app config
# connection_pool: max: 50 -> 75

# Restart application
docker restart app
```

### Issue: High CPU Usage

```bash
#!/bin/bash
# Diagnose and fix high CPU

echo "=== CPU Usage Investigation ==="

# See what's using CPU
top -b -n 1 | head -20

# Get process details
ps aux | grep -E "app|node|postgres" | grep -v grep

# If app process:
# 1. Check for infinite loops
docker logs app | tail -100 | grep -i "loop\|recurs"

# 2. Check for expensive queries
psql -U postgres -c "
  SELECT query, calls, total_time 
  FROM pg_stat_statements 
  ORDER BY total_time DESC LIMIT 10;
"

# 3. If query expensive:
#    - Add index
#    - Optimize query
#    - Increase timeout

# 4. If no query issue:
#    - Check event loop
#    - Review code changes
#    - Check dependencies

# Temporary fix: Restart
docker restart app
```

---

## 🛠️ Maintenance Procedures

### Weekly Maintenance Checklist

```
Monday 9:00 AM:
[ ] Review usage metrics
[ ] Check disk space trends
[ ] Verify backup success
[ ] Review security logs
[ ] Check for failed jobs

Wednesday 2:00 PM:
[ ] Database maintenance (vacuum, analyze)
[ ] Review slow queries
[ ] Update dependencies (staging)
[ ] Review alerts/monitoring
[ ] Update runbooks

Friday 4:00 PM:
[ ] Full system health check
[ ] Test disaster recovery
[ ] Review capacity planning
[ ] Team sync on issues
[ ] Plan next week
```

### Monthly Maintenance Checklist

```
First of Month:
[ ] Monthly health report
[ ] Database optimization
[ ] Security audit
[ ] Performance review
[ ] Capacity planning review

Mid-month:
[ ] Dependency updates (test & prod)
[ ] Documentation review
[ ] Process improvements
[ ] Team training

End of Month:
[ ] Cost analysis
[ ] SLA review
[ ] Incident retrospectives
[ ] Budget forecast
```

### Quarterly Maintenance

```
Q1/Q2/Q3/Q4:
[ ] Full disaster recovery test
[ ] Complete security audit
[ ] Architecture review
[ ] Capacity planning for next quarter
[ ] Team retrospective
[ ] Strategic planning
```

---

## 🚨 Emergency Procedures

### Rapid Database Failover

```bash
#!/bin/bash
# If primary database is down

echo "=== Emergency Database Failover ==="

# Step 1: Verify primary is down
psql -h primary.db -U postgres -c "SELECT 1;" 2>&1 | grep -q "refused"

if [ $? -eq 0 ]; then
  echo "✓ Primary confirmed down"
  
  # Step 2: Stop replication
  psql -h replica.db -U postgres -c "SELECT pg_wal_replay_pause();"
  echo "✓ Replication paused"
  
  # Step 3: Promote replica
  pg_ctl promote -D /var/lib/postgresql/14/replica
  echo "✓ Replica promoted to primary"
  
  # Step 4: Update connection strings
  # Edit app config to point to new primary
  sed -i 's/primary.db/replica.db/g' /app/config.yaml
  echo "✓ Connection strings updated"
  
  # Step 5: Restart app
  docker restart app
  echo "✓ Application restarted"
  
  # Step 6: Verify
  curl http://localhost:5000/api/health | jq '.'
fi
```

### Emergency Cache Clear

```bash
#!/bin/bash
# If cache is corrupted

echo "=== Emergency Cache Clear ==="

# Back up cache keys
redis-cli BGSAVE
echo "✓ Cache backed up"

# Clear cache
redis-cli FLUSHDB
echo "✓ Cache cleared"

# Warm critical data
curl -s http://localhost:5000/api/cache/warmup
echo "✓ Cache warmed with critical data"

# Monitor for issues
curl http://localhost:5000/api/system/metrics | jq '.cache.hit_rate'
```

### Emergency Service Restart

```bash
#!/bin/bash
# Restart all services gracefully

echo "=== Emergency Service Restart ==="

# Step 1: Drain connections
echo "Draining connections..."
docker exec app npm run graceful-shutdown

# Step 2: Save state
echo "Saving application state..."
dump_app_state

# Step 3: Restart services
echo "Restarting services..."
docker restart app
docker restart postgres
docker restart redis

# Step 4: Verify
echo "Verifying services..."
docker exec app npm run health-check

echo "✓ Services restarted and verified"
```

---

**Status:** Production Ready  
**Last Updated:** February 24, 2026

