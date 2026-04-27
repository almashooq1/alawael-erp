# ═══════════════════════════════════════════════════════

# BACKUP & RECOVERY GUIDE

# دليل النسخ الاحتياطي والاسترجاع

# Version: 2.0.0

# Date: January 22, 2026

# ═══════════════════════════════════════════════════════

## 📋 Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Automated Backups](#automated-backups)
4. [Manual Backups](#manual-backups)
5. [Backup Verification](#backup-verification)
6. [Recovery Procedures](#recovery-procedures)
7. [Disaster Recovery](#disaster-recovery)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 📖 Overview

This guide provides comprehensive instructions for backing up and recovering the
Alawael ERP System data, ensuring business continuity and data protection.

### System Components

- **MongoDB Database**: Primary data store
- **Redis Cache**: Session and cache data
- **File Storage**: Uploaded documents and media
- **Configuration Files**: Environment and system configs
- **Application Code**: Source code repository

### Backup Objectives

- **RPO (Recovery Point Objective)**: ≤ 1 hour
- **RTO (Recovery Time Objective)**: ≤ 4 hours
- **Retention Period**: 30 days local, 90 days cloud
- **Backup Frequency**: Daily full, hourly incremental

---

## 🎯 Backup Strategy

### Three-Tier Backup Strategy

#### 1. Local Backups (Tier 1)

- **Location**: `/backup` directory on server
- **Frequency**: Daily at 2:00 AM
- **Retention**: 7 days
- **Purpose**: Quick recovery for recent data

#### 2. Cloud Backups (Tier 2)

- **Location**: AWS S3 bucket
- **Frequency**: Daily at 3:00 AM
- **Retention**: 30 days
- **Purpose**: Off-site disaster recovery

#### 3. Archive Backups (Tier 3)

- **Location**: AWS Glacier
- **Frequency**: Weekly (Sunday)
- **Retention**: 90 days
- **Purpose**: Long-term compliance and audit

### Backup Types

```
┌─────────────────────────────────────────────────┐
│           BACKUP SCHEDULE                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Daily Full Backup       : 02:00 AM             │
│  Hourly Incremental      : Every hour           │
│  Weekly Archive          : Sunday 01:00 AM      │
│  Monthly Snapshot        : 1st of month         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🤖 Automated Backups

### Using BackupRestore Service

The `BackupRestore.js` service handles automated backups.

#### Configuration

```javascript
// backend/services/BackupRestore.js
const backupService = require('./services/BackupRestore');

// Setup automated backup schedule
backupService.setupAutoBackupSchedule();

// Schedules:
// - Daily backups at 2:00 AM
// - Weekly backups on Sunday at 1:00 AM
```

#### Docker Implementation

```yaml
# docker-compose.prod.yml
backup:
  build:
    context: ./backend
    dockerfile: Dockerfile.backup
  environment:
    BACKUP_SCHEDULE: '0 2 * * *' # Daily at 2 AM
    BACKUP_RETENTION_DAYS: 30
    AWS_S3_BUCKET: ${AWS_S3_BUCKET}
  volumes:
    - backup-data:/backup
```

#### Cron Job (Alternative)

```bash
# /etc/cron.d/alawael-backup
# Daily backup at 2 AM
0 2 * * * /opt/alawael/scripts/backup.sh >> /var/log/backup.log 2>&1

# Weekly backup on Sunday at 1 AM
0 1 * * 0 /opt/alawael/scripts/backup-weekly.sh >> /var/log/backup.log 2>&1
```

---

## 🔧 Manual Backups

### Database Backup

#### MongoDB Full Backup

```bash
# Using Docker
docker exec alawael-mongodb mongodump \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --out=/backup/manual-$(date +%Y%m%d-%H%M%S) \
  --gzip

# Direct on server
mongodump \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --out=/backup/manual-$(date +%Y%m%d-%H%M%S) \
  --gzip
```

#### MongoDB Specific Collection

```bash
# Backup single collection
docker exec alawael-mongodb mongodump \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --collection=users \
  --out=/backup/users-$(date +%Y%m%d-%H%M%S) \
  --gzip
```

#### MongoDB Compressed Archive

```bash
# Create compressed archive
docker exec alawael-mongodb mongodump \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --archive=/backup/alawael-$(date +%Y%m%d-%H%M%S).gz \
  --gzip
```

### Redis Backup

```bash
# Create RDB snapshot
docker exec alawael-redis redis-cli SAVE

# Copy snapshot
docker cp alawael-redis:/data/dump.rdb /backup/redis-$(date +%Y%m%d-%H%M%S).rdb
```

### File Storage Backup

```bash
# Backup uploads directory
tar -czf /backup/uploads-$(date +%Y%m%d-%H%M%S).tar.gz /opt/alawael/uploads

# Sync to S3
aws s3 sync /opt/alawael/uploads s3://alawael-backups/uploads/
```

### Configuration Backup

```bash
# Backup environment files
cp /opt/alawael/.env.production /backup/env-$(date +%Y%m%d-%H%M%S).backup

# Backup Nginx config
cp /etc/nginx/nginx.conf /backup/nginx-$(date +%Y%m%d-%H%M%S).conf

# Backup Docker Compose
cp /opt/alawael/docker-compose.prod.yml /backup/docker-compose-$(date +%Y%m%d-%H%M%S).yml
```

---

## ✅ Backup Verification

### Automated Verification

```javascript
// Test backup integrity
const backupService = require('./services/BackupRestore');

async function verifyBackup() {
  const backupFile = '/backup/latest-backup.gz';

  try {
    const isValid = await backupService.verifyBackupIntegrity(backupFile);

    if (isValid) {
      console.log('✅ Backup verification passed');
    } else {
      console.error('❌ Backup verification failed');
    }
  } catch (error) {
    console.error('Error verifying backup:', error);
  }
}
```

### Manual Verification

```bash
# Test backup by restoring to test database
docker exec alawael-mongodb mongorestore \
  --uri="mongodb://username:password@localhost:27017/test_restore?authSource=admin" \
  --gzip \
  /backup/alawael-20260122.gz

# Verify collection counts
docker exec alawael-mongodb mongosh \
  --eval "db.getSiblingDB('test_restore').users.count()"

# Cleanup test database
docker exec alawael-mongodb mongosh \
  --eval "db.getSiblingDB('test_restore').dropDatabase()"
```

### Backup Report

```bash
# Generate backup report
#!/bin/bash

echo "═══════════════════════════════════════"
echo "   BACKUP VERIFICATION REPORT"
echo "═══════════════════════════════════════"
echo ""

# Check backup directory
echo "Backup Directory:"
ls -lh /backup | tail -10

echo ""
echo "Backup Sizes:"
du -sh /backup/*

echo ""
echo "S3 Backups:"
aws s3 ls s3://alawael-backups/ --human-readable --summarize

echo ""
echo "Last Backup:"
ls -lt /backup | head -2

echo ""
echo "═══════════════════════════════════════"
```

---

## 🔄 Recovery Procedures

### Full Database Recovery

#### From Local Backup

```bash
# 1. Stop application
docker-compose -f docker-compose.prod.yml stop backend

# 2. Restore database
docker exec alawael-mongodb mongorestore \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --gzip \
  --drop \
  /backup/alawael-20260122.gz

# 3. Verify restoration
docker exec alawael-mongodb mongosh \
  --eval "db.getSiblingDB('alawael').users.count()"

# 4. Restart application
docker-compose -f docker-compose.prod.yml start backend
```

#### From S3 Backup

```bash
# 1. Download backup from S3
aws s3 cp s3://alawael-backups/2026/01/alawael-20260122.gz /tmp/

# 2. Stop application
docker-compose -f docker-compose.prod.yml stop backend

# 3. Restore database
docker exec alawael-mongodb mongorestore \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --gzip \
  --drop \
  /tmp/alawael-20260122.gz

# 4. Restart application
docker-compose -f docker-compose.prod.yml start backend
```

### Partial Recovery (Specific Collection)

```bash
# Restore only users collection
docker exec alawael-mongodb mongorestore \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --nsInclude="alawael.users" \
  --gzip \
  --drop \
  /backup/alawael-20260122.gz
```

### Point-in-Time Recovery

```bash
# Using MongoDB Change Streams (if enabled)
# 1. Restore from last full backup
# 2. Apply change stream events up to desired point

# Example: Restore to specific timestamp
docker exec alawael-mongodb mongorestore \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --oplogReplay \
  --oplogLimit="1674393600:1" \
  /backup/alawael-20260122.gz
```

### Redis Recovery

```bash
# 1. Stop Redis
docker-compose -f docker-compose.prod.yml stop redis

# 2. Replace dump.rdb
docker cp /backup/redis-20260122.rdb alawael-redis:/data/dump.rdb

# 3. Start Redis
docker-compose -f docker-compose.prod.yml start redis
```

### File Storage Recovery

```bash
# Restore uploads from backup
tar -xzf /backup/uploads-20260122.tar.gz -C /opt/alawael/

# Or sync from S3
aws s3 sync s3://alawael-backups/uploads/ /opt/alawael/uploads/
```

---

## 🚨 Disaster Recovery

### Complete System Disaster

#### Scenario: Complete server failure

**Recovery Steps:**

1. **Provision New Server**

```bash
# Setup new Ubuntu 22.04 server
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

2. **Clone Repository**

```bash
cd /opt
git clone https://github.com/your-org/alawael.git
cd alawael
```

3. **Download Latest Backup**

```bash
# Download from S3
aws s3 cp s3://alawael-backups/latest/alawael-latest.gz /backup/
aws s3 sync s3://alawael-backups/uploads/ /opt/alawael/uploads/
```

4. **Configure Environment**

```bash
cp .env.example .env.production
# Edit .env.production with actual values
```

5. **Start Services**

```bash
docker-compose -f docker-compose.prod.yml up -d mongodb redis
sleep 30
```

6. **Restore Database**

```bash
docker exec alawael-mongodb mongorestore \
  --uri="mongodb://username:password@localhost:27017/alawael?authSource=admin" \
  --gzip \
  /backup/alawael-latest.gz
```

7. **Start Application**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

8. **Verify System**

```bash
curl http://localhost/api/health
```

**Estimated Recovery Time: 2-4 hours**

---

## 📊 Monitoring & Alerts

### Backup Monitoring

```javascript
// Check backup status
const backupService = require('./services/BackupRestore');

async function monitorBackups() {
  const report = await backupService.getBackupReport();

  console.log('Last Backup:', report.lastBackup);
  console.log('Backup Size:', report.size);
  console.log('Status:', report.status);

  // Alert if last backup > 24 hours
  if (report.age > 86400) {
    sendAlert('Backup overdue!');
  }
}
```

### Alert Configuration

```javascript
// backend/services/AlertService.js
const alertService = require('./services/AlertService');

// Backup failed alert
await alertService.createAlert({
  type: 'BACKUP_FAILED',
  severity: 'critical',
  component: 'backup-service',
  message: 'Daily backup failed',
  details: {
    error: error.message,
    timestamp: new Date(),
  },
});
```

---

## ✨ Best Practices

### 1. Regular Testing

- Test recovery procedures monthly
- Document recovery times
- Update procedures based on tests

### 2. Multiple Locations

- Keep backups in 3 different locations
- Use different cloud providers for redundancy
- Maintain offline backups for critical data

### 3. Encryption

- Encrypt backups at rest
- Use encrypted transfer (SSL/TLS)
- Secure backup credentials

### 4. Documentation

- Document backup procedures
- Keep recovery instructions updated
- Train team on recovery procedures

### 5. Automation

- Automate backup processes
- Schedule regular verifications
- Monitor backup health

### 6. Version Control

- Keep multiple backup versions
- Follow retention policies
- Archive old backups properly

---

## 🔧 Troubleshooting

### Backup Fails

**Problem**: Backup script fails to complete

**Solutions**:

```bash
# Check disk space
df -h

# Check MongoDB connection
docker exec alawael-mongodb mongosh --eval "db.serverStatus()"

# Check backup logs
tail -f /var/log/backup.log

# Manual backup attempt
docker exec alawael-mongodb mongodump --help
```

### Restore Fails

**Problem**: Database restore fails

**Solutions**:

```bash
# Check backup file integrity
gunzip -t /backup/alawael-20260122.gz

# Check MongoDB version compatibility
docker exec alawael-mongodb mongod --version

# Try restoring to different database first
mongorestore --uri="mongodb://localhost:27017/test_db" /backup/alawael-20260122.gz
```

### Slow Backup/Restore

**Problem**: Backup or restore takes too long

**Solutions**:

```bash
# Use parallel processing
mongodump --numParallelCollections=4

# Compress during backup
mongodump --gzip

# Use --archive for faster transfer
mongodump --archive=/backup/fast.gz --gzip
```

### Insufficient Space

**Problem**: Not enough disk space for backup

**Solutions**:

```bash
# Clean old backups
find /backup -name "*.gz" -mtime +30 -delete

# Compress backups
gzip /backup/*.dump

# Move to S3 immediately
aws s3 mv /backup/ s3://alawael-backups/ --recursive
```

---

## 📞 Support & Emergency Contacts

### Emergency Recovery Hotline

- **Phone**: +20-XXX-XXXX-XXX
- **Email**: emergency@alawael.com
- **Slack**: #emergency-response

### Escalation Path

1. **Level 1**: System Administrator
2. **Level 2**: DevOps Lead
3. **Level 3**: CTO

---

## 📝 Backup Checklist

```
Daily Backup Checklist:
□ Automated backup completed
□ Backup uploaded to S3
□ Backup verification passed
□ Backup size within expected range
□ No critical errors in logs
□ Alert system functioning

Weekly Backup Checklist:
□ Archive backup created
□ Long-term storage verified
□ Recovery test performed
□ Documentation updated
□ Team notified of any issues

Monthly Backup Checklist:
□ Full disaster recovery test
□ Review retention policies
□ Update recovery procedures
□ Audit backup access logs
□ Review and optimize storage costs
```

---

## 📖 Additional Resources

- [MongoDB Backup Methods](https://docs.mongodb.com/manual/core/backups/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-best-practices.html)
- [Docker Backup Strategies](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)

---

**Document Version**: 2.0.0  
**Last Updated**: January 22, 2026  
**Maintained by**: DevOps Team
