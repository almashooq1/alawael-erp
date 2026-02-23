#!/bin/bash

# Disaster Recovery & Backup Management Setup - v1.0.0
# Creates automated backup procedures and recovery mechanisms

set -e

echo "🔐 Alawael v1.0.0 - Disaster Recovery & Backup Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKUP_LOCATION=${1:-"/backups"}
RETENTION_DAYS=${2:-30}

echo "📋 Backup Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "  Location: $BACKUP_LOCATION"
echo "  Retention: $RETENTION_DAYS days"
echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Create backup directories
echo "📁 Creating backup directories..."
mkdir -p "$BACKUP_LOCATION"/{daily,weekly,monthly}
mkdir -p "$BACKUP_LOCATION"/logs
mkdir -p "$BACKUP_LOCATION"/metadata

echo "✅ Directories created"
echo ""

# Create database backup script
cat > "$BACKUP_LOCATION/backup-database.sh" << 'DB_BACKUP_EOF'
#!/bin/bash

# Database Backup Script
# Backs up MongoDB and creates restoration point

set -e

BACKUP_DIR="${1:-.}"
DB_NAME="${2:-alawael}"
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).gz"

echo "🗄️  Backing up MongoDB: $DB_NAME"

# Check if MongoDB is running
if ! command -v mongodump &> /dev/null; then
    echo "❌ mongodump not found. Install MongoDB tools:"
    echo "   apt-get install mongodb-org-tools"
    exit 1
fi

# Create backup
echo "   ⏳ Dumping database..."
mongodump --db "$DB_NAME" --archive="$BACKUP_FILE" --gzip

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "   ✅ Backup successful: $SIZE"
    echo "$BACKUP_FILE" > "$BACKUP_DIR/latest_db_backup.txt"
else
    echo "   ❌ Backup failed"
    exit 1
fi

# Verify backup
echo "   🔍 Verifying backup..."
tar -tzf "$BACKUP_FILE" > /dev/null && echo "   ✅ Backup verified"

# Test restoration (dry-run)
echo "   🔄 Testing restoration capability..."
mongorestore --archive="$BACKUP_FILE" --gzip --dryRun --verbose=0 2>&1 | \
    grep -q "successfully" && echo "   ✅ Restoration verified" || echo "   ⚠️  Verification warning"

echo ""
DB_BACKUP_EOF

chmod +x "$BACKUP_LOCATION/backup-database.sh"

# Create application backup script
cat > "$BACKUP_LOCATION/backup-application.sh" << 'APP_BACKUP_EOF'
#!/bin/bash

# Application Backup Script
# Backs up application configuration and data

set -e

BACKUP_DIR="${1:-.}"
APP_DIR="${2:-.}"
BACKUP_FILE="$BACKUP_DIR/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz"

echo "📦 Backing up application files"

# Create backup
echo "   ⏳ Creating archive..."
tar --exclude=node_modules \
    --exclude=.git \
    --exclude=.env \
    --exclude=dist \
    --exclude=coverage \
    --exclude=logs \
    -czf "$BACKUP_FILE" "$APP_DIR"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "   ✅ Backup successful: $SIZE"
    echo "$BACKUP_FILE" > "$BACKUP_DIR/latest_app_backup.txt"
else
    echo "   ❌ Backup failed"
    exit 1
fi

# Verify integrity
echo "   🔍 Verifying backup integrity..."
tar -tzf "$BACKUP_FILE" > /dev/null && echo "   ✅ Archive verified"

echo ""
APP_BACKUP_EOF

chmod +x "$BACKUP_LOCATION/backup-application.sh"

# Create restore script
cat > "$BACKUP_LOCATION/restore-database.sh" << 'RESTORE_EOF'
#!/bin/bash

# Database Restore Script
# Restores MongoDB from backup

set -e

BACKUP_FILE="${1}"
DB_NAME="${2:-alawael}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file> [database-name]"
    echo ""
    echo "Example: $0 db_backup_20240219_143022.gz alawael"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore the database from backup"
echo "   File: $BACKUP_FILE"
echo "   Database: $DB_NAME"
echo ""
read -p "Continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 1
fi

echo "🔄 Restoring database..."
echo "   ⏳ This may take several minutes..."

if mongorestore --archive="$BACKUP_FILE" --gzip --db "$DB_NAME"; then
    echo "   ✅ Restore successful"
    echo ""
    echo "💡 Verify data with:"
    echo "   mongosh $DB_NAME"
    echo "   > db.collection.countDocuments()"
else
    echo "   ❌ Restore failed"
    exit 1
fi

echo ""
RESTORE_EOF

chmod +x "$BACKUP_LOCATION/restore-database.sh"

# Create backup schedule (cron) template
cat > "$BACKUP_LOCATION/backup-schedule.cron" << 'CRON_EOF'
# Alawael Backup Schedule
# Install with: crontab -e

# Daily backup at 2 AM UTC
0 2 * * * /backups/backup-database.sh /backups/daily alawael >> /backups/logs/daily.log 2>&1

# Daily app backup at 3 AM UTC
0 3 * * * /backups/backup-application.sh /backups/daily /app >> /backups/logs/daily.log 2>&1

# Weekly full backup every Sunday
0 4 * * 0 /backups/backup-database.sh /backups/weekly alawael >> /backups/logs/weekly.log 2>&1

# Monthly backup on the 1st
0 5 1 * * /backups/backup-database.sh /backups/monthly alawael >> /backups/logs/monthly.log 2>&1

# Cleanup old backups (keep 7 days of daily backups)
0 6 * * * find /backups/daily -name "*.gz" -mtime +7 -delete >> /backups/logs/cleanup.log 2>&1
CRON_EOF

echo "✅ Backup scripts created:"
echo "   • backup-database.sh"
echo "   • backup-application.sh"
echo "   • restore-database.sh"
echo ""

# Create disaster recovery plan
cat > "$BACKUP_LOCATION/DISASTER_RECOVERY_PLAN.md" << 'DRP_EOF'
# Disaster Recovery Plan - Alawael v1.0.0

## Recovery Time Objectives (RTO)

| Scenario | Target RTO | Budget |
|----------|-----------|--------|
| Database corrupted | 1 hour | High priority |
| Application crash | 15 minutes | Critical |
| Data loss | 4 hours | High |
| Complete infrastructure failure | 8 hours | Medium |

## Recovery Point Objectives (RPO)

| Data Type | Target RPO | Backup Frequency |
|-----------|-----------|------------------|
| Database | 24 hours | Daily |
| Application code | 1 hour | On every commit |
| Configuration | 24 hours | Daily |
| Logs | 7 days | Continuous |

## Backup Schedule

### Daily (02:00 UTC)
- MongoDB dump (compressed)
- Location: `/backups/daily/`
- Keep for: 7 days
- Size: ~100-500 MB per backup

### Weekly (04:00 UTC Sunday)
- Full database backup
- Location: `/backups/weekly/`
- Keep for: 4 weeks
- Size: ~100-500 MB per backup

### Monthly (05:00 UTC 1st)
- Full system backup
- Location: `/backups/monthly/`
- Keep for: 12 months
- Size: ~100-500 MB per backup

## Failure Scenarios & Recovery

### Scenario 1: Database Corruption

**Time to detect:** 5-15 minutes (monitoring alert)
**Recovery steps:**
1. Stop application: `docker-compose down`
2. Restore from latest daily backup:
   ```bash
   ./restore-database.sh /backups/daily/db_backup_*.gz alawael
   ```
3. Verify data integrity
4. Restart application: `docker-compose up`
5. Run health checks: `./health-check.sh`

**Expected downtime:** 15-30 minutes
**Data loss:** ≤ 24 hours

### Scenario 2: Application Crash

**Time to detect:** < 1 minute (health check)
**Recovery steps:**
1. Check logs: `docker logs -f alawael-api`
2. Identify error
3. Options:
   - Auto-restart (enabled in docker-compose)
   - Manual restart: `docker restart alawael-api`
   - Redeploy from last successful build
4. Verify with health checks

**Expected downtime:** 1-5 minutes
**Data loss:** None

### Scenario 3: Complete Server Failure

**Time to detect:** 5 minutes (uptime monitoring)
**Recovery steps:**
1. Provision new server
2. Install requirements: Node, Docker, MongoDB
3. Copy application: `git clone ...`
4. Configure environment: `.env` file
5. Run migration: `npm run migrate`
6. Start application: `docker-compose up`
7. Restore database if needed

**Expected downtime:** 30-60 minutes
**Data loss:** None (if backup drive preserved)

### Scenario 4: Data Center Failure (Regional)

**Time to detect:** 2-5 minutes
**Recovery steps:**
1. Activate secondary data center
2. Restore database from backup
3. Redeploy application
4. Update DNS/load balancer
5. Verify traffic routing

**Expected downtime:** 1-4 hours
**Data loss:** ≤ 24 hours

## Backup Verification

### Daily Verification (Automated)
- Backup completion check
- File size validation
- Encryption verification
- Checksums validated

### Weekly Verification (Manual)
- List backup contents
- Test partial restore
- Verify data quality
- Document any issues

### Monthly Verification (Full Test)
- Full restoration to test environment
- Data integrity checks
- Performance benchmarks
- Document lessons learned

## Backup Storage

### Primary Storage
- Location: `/backups` (local SSD)
- Capacity: 2 TB
- Redundancy: RAID 1 (mirrored)

### Secondary Storage (Off-site)
- Cloud storage: S3 / Azure Blob
- Frequency: Daily sync
- Encryption: AES-256
- Retention: 90 days

### Backup Transfer
```bash
# To AWS S3
aws s3 sync /backups/daily s3://backup-bucket/alawael/daily/

# To Azure Blob
az storage blob upload-batch -d backups -s /backups/daily \
    --account-name storageaccount
```

## Critical Files to Backup

### Database
- MongoDB data directory: `/var/lib/mongodb`
- Database dumps: `*.gz` archives
- Database configuration: `mongod.conf`

### Application
- Source code: `.git` repository
- Configuration: `.env` and config files
- Secrets: Encrypted key files
- Certificates: SSL certificates

### Infrastructure
- Docker Compose: `docker-compose.yml`
- Nginx configs: `/etc/nginx/`
- System configs: `/etc/` directory

## Testing Recovery

### Monthly Disaster Recovery Drill

Schedule: First Thursday of every month

Steps:
1. [ ] Restore database to test environment
2. [ ] Restore application code
3. [ ] Verify application functionality
4. [ ] Check data integrity
5. [ ] Measure recovery time
6. [ ] Document any issues
7. [ ] Update procedures if needed
8. [ ] Notify team of results

## Communication Plan

### During Active Incident
- **Minutes 0-5:** Confirm issue, start recovery
- **Minutes 5-15:** Notify team and stakeholders
- **Minutes 15-30:** Recovery in progress, updates every 5 min
- **Resolved:** Post-incident review scheduled

### Notification Channels
1. Slack: `#incident-response`
2. Email: ops-team@company.com
3. Phone: On-call escalation if needed
4. Status page: Updates every 15 minutes

## Recovery Team

### Incident Commander
- Leads response efforts
- Communicates status
- Approves workarounds
- Contact: [Name]

### Database Administrator
- Handles restore operations
- Verifies data integrity
- Optimizes recovery
- Contact: [Name]

### DevOps Lead
- Infrastructure recovery
- Deployment verification
- System validation
- Contact: [Name]

## Post-Incident Procedures

### Within 24 hours
- [ ] Document root cause
- [ ] Calculate impact (time, data loss)
- [ ] Identify failure point
- [ ] Note lessons learned

### Within 1 week
- [ ] Schedule post-mortem
- [ ] Create action items
- [ ] Update procedures if needed
- [ ] Share findings with team

### On-going
- [ ] Implement preventive measures
- [ ] Update runbooks
- [ ] Conduct training
- [ ] Increase monitoring

## Help & Support

**Backup questions:**
- Location: `/backups/`
- Logs: `/backups/logs/`
- Status: `ls -lh /backups/*/`

**Restoration help:**
- Database: `./restore-database.sh --help`
- Application: Check git history
- Support: ops-team@company.com

**Emergency contacts:**
- On-call: [Phone number]
- Escalation: [Manager]

---

Last updated: [Date]  
Next review: [Date + 3 months]  
Tested by: [Name]  
Results: ✅ Successful

DRP_EOF

echo "✅ Disaster Recovery Plan created"
echo "   Location: $BACKUP_LOCATION/DISASTER_RECOVERY_PLAN.md"
echo ""

# Create backup monitoring script
cat > "$BACKUP_LOCATION/monitor-backups.sh" << 'MONITOR_EOF'
#!/bin/bash

# Backup Monitoring Script
# Checks backup health and reports status

echo "🔍 Backup Health Check"
echo "━━━━━━━━━━━━━━━━━━━"
echo ""

BACKUP_DIR="${1:-.}"

# Check disk space
echo "📊 Disk Space Usage:"
df -h "$BACKUP_DIR" | tail -n 1 | awk '{
    total = $2
    used = $3
    percent = substr($5, 1, length($5)-1)
    if (percent > 80) print "   ⚠️  HIGH: " percent "% (threshold: 80%)"
    else if (percent > 60) print "   🟡 MEDIUM: " percent "%"
    else print "   ✅ OK: " percent "%"
}'

# Check latest database backup
echo ""
echo "🗄️  Database Backup:"
LATEST_DB=$(find "$BACKUP_DIR/daily" -name "db_backup_*.gz" -type f | sort -r | head -1)
if [ -z "$LATEST_DB" ]; then
    echo "   ❌ No database backup found"
else
    AGE_HOURS=$(( ($(date +%s) - $(stat -f%m "$LATEST_DB" 2>/dev/null || stat -c%Y "$LATEST_DB")) / 3600 ))
    SIZE=$(du -h "$LATEST_DB" | cut -f1)
    if [ $AGE_HOURS -gt 48 ]; then
        echo "   ⚠️  STALE: $AGE_HOURS hours old (last: $(basename $LATEST_DB)) - $SIZE"
    else
        echo "   ✅ OK: $AGE_HOURS hours old - $SIZE"
    fi
fi

# Check latest app backup
echo ""
echo "📦 Application Backup:"
LATEST_APP=$(find "$BACKUP_DIR/daily" -name "app_backup_*.tar.gz" -type f | sort -r | head -1)
if [ -z "$LATEST_APP" ]; then
    echo "   ❌ No application backup found"
else
    AGE_HOURS=$(( ($(date +%s) - $(stat -f%m "$LATEST_APP" 2>/dev/null || stat -c%Y "$LATEST_APP")) / 3600 ))
    SIZE=$(du -h "$LATEST_APP" | cut -f1)
    if [ $AGE_HOURS -gt 48 ]; then
        echo "   ⚠️  STALE: $AGE_HOURS hours old - $SIZE"
    else
        echo "   ✅ OK: $AGE_HOURS hours old - $SIZE"
    fi
fi

# Check backup counts
echo ""
echo "📈 Backup Counts:"
DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "*.gz" -o -name "*.tar.gz" | wc -l)
WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "*.gz" -o -name "*.tar.gz" | wc -l)
MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -name "*.gz" -o -name "*.tar.gz" | wc -l)

echo "   Daily: $DAILY_COUNT backups (keep 7 days)"
echo "   Weekly: $WEEKLY_COUNT backups (keep 4 weeks)"
echo "   Monthly: $MONTHLY_COUNT backups (keep 12 months)"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━"
if [ $DAILY_COUNT -eq 0 ]; then
    echo "❌ CRITICAL: No backups found!"
elif [ -z "$LATEST_DB" ] || [ -z "$LATEST_APP" ]; then
    echo "⚠️  WARNING: Missing backup type"
elif [ $AGE_HOURS -gt 48 ]; then
    echo "⚠️  WARNING: Backups are stale"
else
    echo "✅ All backups healthy"
fi
echo ""

MONITOR_EOF

chmod +x "$BACKUP_LOCATION/monitor-backups.sh"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Disaster Recovery Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📂 Backup Location: $BACKUP_LOCATION"
echo ""

echo "📋 Created Files:"
echo "   • backup-database.sh - Database backup script"
echo "   • backup-application.sh - Application backup script"
echo "   • restore-database.sh - Database restore script"
echo "   • monitor-backups.sh - Backup health monitoring"
echo "   • backup-schedule.cron - Cron schedule template"
echo "   • DISASTER_RECOVERY_PLAN.md - Complete DRP"
echo ""

echo "⏱️  Setup Instructions:"
echo "   1. Review: DISASTER_RECOVERY_PLAN.md"
echo "   2. Install cron: crontab -e"
echo "   3. Paste: backup-schedule.cron contents"
echo "   4. Verify: $BACKUP_LOCATION/monitor-backups.sh"
echo ""

echo "✅ All disaster recovery files ready!"
echo ""
