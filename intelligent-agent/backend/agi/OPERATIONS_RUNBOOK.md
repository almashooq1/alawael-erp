# 🛠️ Operations Runbook

دليل العمليات وإدارة النظام

**Last Updated**: January 30, 2026

---

## 🎯 Quick Reference

### Daily Operations

```
6:00 AM   → System startup
          → Health check
          → Monitor dashboards

12:00 PM  → Mid-day review
          → Check error rates
          → Verify backups

6:00 PM   → Performance review
          → Database maintenance
          → Prepare reports

11:00 PM  → Backup verification
          → System status check
          → Logs review
```

---

## 🚀 Startup Procedures

### Cold Start (After Shutdown)

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Verify all services
docker-compose ps

# 3. Check database
psql -h localhost -U postgres -d rehab_agi -c "SELECT version();"

# 4. Warm cache
curl http://localhost:5001/api/agi/warmup

# 5. Verify APIs
curl http://localhost:5001/api/agi/health

# Expected: All green ✅
```

### Graceful Restart

```bash
# 1. Drain connections
curl -X POST http://localhost:5001/api/ops/drain

# 2. Wait for in-flight requests
sleep 5

# 3. Restart service
docker-compose restart agi-server

# 4. Verify startup
curl http://localhost:5001/api/agi/health

# 5. Resume traffic
# Automatic after health checks pass
```

---

## 📊 Health Monitoring

### Status Checks

```bash
# Application Health
curl http://localhost:5001/api/agi/health

# Database Connection
curl http://localhost:5001/api/ops/health/db

# Redis Connection
curl http://localhost:5001/api/ops/health/redis

# All Systems
curl http://localhost:5001/api/ops/health/full
```

### Expected Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T10:00:00Z",
  "services": {
    "api": "up",
    "database": "connected",
    "redis": "connected",
    "monitoring": "active"
  }
}
```

---

## 🗑️ Maintenance Tasks

### Daily

```bash
# 1. Clean old logs (7 days)
find /var/log/rehab-agi -mtime +7 -delete

# 2. Verify backups
ls -lh /backups/rehab-agi-*.sql.gz | tail -5

# 3. Check disk space
df -h /data

# 4. Verify database
psql -h localhost -U postgres -d rehab_agi \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
      FROM pg_tables
      WHERE schemaname='public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10;"

# 5. Verify replication lag
psql -h localhost -U postgres -d rehab_agi \
  -c "SELECT slot_name, slot_type, restart_lsn FROM pg_replication_slots;"
```

### Weekly

```bash
# 1. Full backup
./backup.sh full

# 2. Optimize tables
psql -h localhost -U postgres -d rehab_agi \
  -c "VACUUM ANALYZE;"

# 3. Update statistics
psql -h localhost -U postgres -d rehab_agi \
  -c "ANALYZE;"

# 4. Check index usage
psql -h localhost -U postgres -d rehab_agi \
  -c "SELECT schemaname, tablename, indexname, idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0;"

# 5. Security audit
grep "ERROR" /var/log/rehab-agi/app.log | tail -20
```

### Monthly

```bash
# 1. Full database backup
./backup.sh full
tar -czf rehab-agi-backup-$(date +%Y%m%d).tar.gz /data/rehab-agi

# 2. Reindex tables
psql -h localhost -U postgres -d rehab_agi \
  -c "REINDEX DATABASE rehab_agi;"

# 3. Update database statistics
ANALYZE;

# 4. Check for unused indexes
psql -h localhost -U postgres -d rehab_agi \
  -c "SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;"

# 5. Performance review
pg_stat_statements top 20 queries

# 6. Security scan
./scripts/security-scan.sh

# 7. Capacity planning
df -h /data
du -sh /data/*
```

---

## 🔄 Backup & Recovery

### Automated Backup

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/backups/rehab-agi"
DB_HOST="localhost"
DB_NAME="rehab_agi"
DB_USER="postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# Full backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  | gzip > $BACKUP_DIR/full_$DATE.sql.gz

# Incremental (WAL archiving)
cp /var/lib/postgresql/pg_wal/* $BACKUP_DIR/wal/$DATE/

# Verify backup
if [ -f $BACKUP_DIR/full_$DATE.sql.gz ]; then
  echo "Backup successful: $BACKUP_DIR/full_$DATE.sql.gz"
else
  echo "Backup failed!"
  exit 1
fi

# Cleanup old backups (older than 30 days)
find $BACKUP_DIR -name "full_*.sql.gz" -mtime +30 -delete
```

### Recovery Procedure

```bash
# 1. Stop application
docker-compose down

# 2. Restore database
gunzip -c /backups/rehab-agi/full_20260130.sql.gz | \
  psql -h localhost -U postgres -d rehab_agi

# 3. Verify data integrity
psql -h localhost -U postgres -d rehab_agi \
  -c "SELECT COUNT(*) as total_records FROM information_schema.tables
      WHERE table_schema='public';"

# 4. Restart application
docker-compose up -d

# 5. Verify recovery
curl http://localhost:5001/api/agi/health
```

---

## 🚨 Incident Response

### Outage - Application Down

```
Step 1: Detect (Alert triggers)
├─ Time: < 1 minute
└─ Action: Notify on-call engineer

Step 2: Initial Response (< 5 min)
├─ Check service status
├─ Review recent changes
├─ Check error logs
└─ Attempt restart

Step 3: Mitigation (< 15 min)
├─ Failover to backup if available
├─ Rollback recent changes
├─ Restore from backup
└─ Update status page

Step 4: Recovery (< 1 hour)
├─ Return to normal operation
├─ Verify all systems
├─ Document root cause
└─ Schedule post-mortem

Step 5: Post-Incident (< 24 hours)
├─ Root cause analysis
├─ Implement prevention
├─ Update runbooks
└─ Team debrief
```

### High CPU/Memory Usage

```bash
# 1. Identify culprit
top -b -n 1 | head -20
ps aux | grep node | head -5

# 2. Check metrics
curl http://localhost:9090/api/v1/query?query=node_cpu_seconds_total

# 3. If memory leak
docker-compose restart agi-server

# 4. If persistent
killall node
docker-compose down
docker-compose up -d

# 5. Investigation
docker logs agi-server | tail -100
```

### Database Issues

```bash
# 1. Check connections
psql -h localhost -U postgres \
  -c "SELECT datname, count(*) as connections FROM pg_stat_activity GROUP BY datname;"

# 2. Kill long queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE duration > interval '5 minutes';

# 3. Check disk space
df -h /data

# 4. If out of disk
# Archive old data
# Cleanup logs
# Increase disk space

# 5. Restart database
docker-compose restart postgres
```

---

## 📋 Runbook Checklist

### Pre-Deployment

- [ ] Backup created and verified
- [ ] Health checks passing
- [ ] Security scan completed
- [ ] Performance baseline established
- [ ] Team notified
- [ ] Rollback plan ready

### During Deployment

- [ ] Monitor error rates (should stay < 0.1%)
- [ ] Monitor response times (should stay < 200ms)
- [ ] Monitor database replication lag
- [ ] Monitor memory usage
- [ ] Check customer reports

### Post-Deployment

- [ ] Verify all APIs responding
- [ ] Check database integrity
- [ ] Review error logs
- [ ] Verify backups completed
- [ ] Update documentation
- [ ] Team debrief

---

## 📞 Escalation

### On-Call Escalation Path

```
Automated Alerts (Slack/Email)
        ↓
On-Call Engineer (Page if critical)
        ↓
Team Lead (30 min no progress)
        ↓
Engineering Manager (Continued escalation)
        ↓
Director (Critical business impact)
```

### Contact Information

```
On-Call Engineer:  +1-XXX-XXX-XXXX
Team Lead:         +1-XXX-XXX-XXXX
Manager:           +1-XXX-XXX-XXXX
Director:          +1-XXX-XXX-XXXX

Emergency:         911 (for infrastructure provider)
```

---

## 📊 Weekly Report Template

```markdown
# Weekly Operations Report

**Week of**: January 27 - February 2, 2026

## Uptime

- Availability: 99.95%
- Planned downtime: 0 minutes
- Unplanned downtime: 2 minutes

## Incidents

- Total: 1
- Resolved: 1
- MTTR (Mean Time To Resolution): 2 minutes

## Performance

- Avg Response Time: 145ms (target: 200ms) ✓
- Error Rate: 0.08% (target: < 0.1%) ✓
- Cache Hit Rate: 84% (target: > 80%) ✓

## Maintenance

- Backups: ✓ All successful
- Database: ✓ Optimized
- Logs: ✓ Rotated
- Security: ✓ Audit passed

## Upcoming

- Scheduled maintenance: None
- Expected deployments: 2
- Planned upgrades: Database minor update

## Notes

- All systems performing normally
- No major issues to report
```

---

**Last Updated**: January 30, 2026 **Version**: 1.0.0
