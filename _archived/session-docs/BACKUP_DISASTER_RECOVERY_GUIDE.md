# BACKUP & DISASTER RECOVERY GUIDE
# Complete Recovery Procedures for ALAWAEL ERP
# Version: 1.0.0 | Date: February 28, 2026

---

## QUICK REFERENCE: 3-MINUTE RECOVERY

**If Database is Down:**
```powershell
# 1. Identify latest backup
Get-ChildItem C:\mongodb-backups | Sort-Object CreationTime -Descending | Select-Object -First 1

# 2. Stop application
pm2 stop alawael-backend

# 3. Restore from backup
mongorestore --uri "mongodb://localhost:27017/alawael-erp" "C:\mongodb-backups\backup_YYYY-MM-DD_HH-MM-SS"

# 4. Restart application
pm2 start alawael-backend

# 5. Verify restore
curl http://localhost:3001/api/v1/health/db
```

**If Application is Down:**
```powershell
# 1. Check PM2 status
pm2 list

# 2. View error logs
pm2 logs alawael-backend --lines 50

# 3. Restart application
pm2 reload alawael-backend

# 4. Verify health
pm2 heal
curl http://localhost:3001/api/v1/health/alive
```

---

## BACKUP STRATEGY

### Current Backup Configuration
- **Frequency:** Daily at 2:00 AM
- **Retention:** 30 days (automatic cleanup)
- **Location:** C:\mongodb-backups
- **Type:** Full database dump (mongodump)
- **Size:** ~500MB per backup (typical)
- **Scripts:** BACKUP_MONGODB_AUTOMATED.ps1

### Backup Schedule
```
Monday   : 2:00 AM (02:00) - Daily backup
Tuesday  : 2:00 AM - Daily backup
...
Sunday   : 2:00 AM - Daily backup + Weekly archive
```

### Backup Verification
```powershell
# Verify backup exists and is complete
Function Test-BackupIntegrity {
    param([string]$BackupPath)
    
    $backupSize = (Get-ChildItem -Path $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum
    
    if ($backupSize -gt 100MB) {
        Write-Host "✅ Backup integrity verified"
        Write-Host "Backup size: $(($backupSize/1GB).ToString('F2'))GB"
        return $true
    } else {
        Write-Host "⚠️  Backup may be incomplete or corrupted"
        return $false
    }
}

# Run verification
Test-BackupIntegrity "C:\mongodb-backups\backup_2026-02-28_02-00-00"
```

---

## DISASTER RECOVERY SCENARIOS

### Scenario 1: Database Corruption (Single Collection)

**Symptoms:**
- Specific collection returning errors
- Cannot query particular collection
- Data integrity warnings in logs

**Recovery Steps:**

```powershell
# 1. Identify corrupted collection
# Contact: admin@alawael-erp.com for confirmation

# 2. Find backup before corruption occurred
$backups = Get-ChildItem C:\mongodb-backups | Sort-Object CreationTime
# Select backup from last known good time

# 3. Stop application
pm2 stop alawael-backend

# 4. Restore only affected collection
mongorestore --uri "mongodb://localhost:27017/alawael-erp" `
  --db alawael-erp `
  --collection problematic_collection `
  "C:\mongodb-backups\backup_2026-02-28_02-00-00\alawael-erp\problematic_collection.bson"

# 5. Restart application  
pm2 start alawael-backend

# 6. Verify data
curl http://localhost:3001/api/v1/health/db

# 7. Validate affected features work
# Test critical user endpoints related to corrupted data
```

**Time to Recover:** 5-10 minutes

---

### Scenario 2: Complete Database Loss

**Symptoms:**
- MongoDB service cannot start
- Database files corrupted
- Disk failure or data deletion

**Recovery Steps:**

```powershell
# 1. Assess severity
Stop-Service MongoDB
Get-Item -Path "C:\Program Files\MongoDB\Server\6.0\data\mongod.lock"

# 2. If files recoverable, attempt repair
# STOP - Do not attempt repair without backup first

# 3. Restore from latest backup
# Assuming MongoDB service is running
mongorestore --uri "mongodb://localhost:27017" `
  --drop `
  "C:\mongodb-backups\backup_2026-02-28_02-00-00"

# 4. Restart services
Restart-Service MongoDB
Start-Sleep -Seconds 5
pm2 start alawael-backend

# 5. Full system health check
curl http://localhost:3001/api/v1/health/full

# 6. Notify stakeholders
# Email: team@alawael-erp.com
# Message: "Database restored from 02:00 backup. Some data may be up to 12 hours old."
```

**Time to Recover:** 10-20 minutes  
**Data Loss:** Up to 24 hours (since last backup)

---

### Scenario 3: Application Server Complete Failure

**Symptoms:**
- All PM2 processes down
- System cannot start
- Disk full or hardware failure

**Recovery Steps - Option A: Restart (Fastest)**

```powershell
# 1. Check disk space
Get-Volume C | Select-Object Size, SizeRemaining

# If disk is full, free space
# Remove old logs, backups to archive location
Get-ChildItem C:\mongodb-backups\*.* | Where-Object CreationTime -lt (Get-Date).AddDays(-30) | Remove-Item

# 2. Restart PM2
pm2 restart all
Start-Sleep -Seconds 10

# 3. Verify all instances
pm2 list
pm2 logs

# 4. Health check
curl http://localhost:3001/api/v1/health/alive
```

**Time to Recover:** 2-3 minutes  
**Data Loss:** None

---

**Recovery Steps - Option B: Fresh Deploy (If Corrupted)**

```powershell
# 1. Backup current state (for forensics)
Copy-Item -Path "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend" `
  -Destination "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend.backup.$(Get-Date -Format 'yyyyMMdd')" `
  -Recurse

# 2. Stop all services
pm2 stop all
Stop-Service MongoDB

# 3. Redeploy application
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"
npm install lq 2>&1 | Out-Null

# 4. Start services
Start-Service MongoDB
Start-Sleep -Seconds 5
pm2 start ecosystem.config.js

# 5. Restore database if needed
mongorestore --uri "mongodb://localhost:27017" --drop `
  "C:\mongodb-backups\backup_2026-02-28_02-00-00"

# 6. Verify health
pm2 list
curl http://localhost:3001/api/v1/health/alive
```

**Time to Recover:** 10-15 minutes  
**Data Loss:** None (if from backup restore)

---

### Scenario 4: Specific API Endpoints Down

**Symptoms:**
- Some endpoints return 500 errors
- Other endpoints work fine
- Errors logged with specific routes

**Recovery Steps:**

```powershell
# 1. Identify affected routes
pm2 logs | Select-String "ERROR|500" -A 2 | Select-Object -First 20

# 2. Check if database is accessible
curl http://localhost:3001/api/v1/health/db

# 3. If database issue, restore:
mongorestore --uri "mongodb://localhost:27017" `
  "C:\mongodb-backups\backup_2026-02-28_02-00-00"

# 4. If code issue, rollback:
git log --oneline -n 5
git revert --no-edit <commit-hash>
npm install
pm2 reload alawael-backend

# 5. Test affected endpoints
curl -X GET http://localhost:3001/api/endpoint/that/failed

# 6. Monitor for further issues
pm2 logs --lines 100 --nostream | Select-String "ERROR"
```

**Time to Recover:** 5-15 minutes  
**Data Loss:** Depends on root cause

---

## BACKUP VERIFICATION CHECKLIST

### Daily Verification (Automated)

```powershell
# Run daily via scheduled task
Function Verify-DailyBackup {
    $backupDir = "C:\mongodb-backups"
    $latestBackup = Get-ChildItem -Path $backupDir | Sort-Object CreationTime -Descending | Select-Object -First 1
    
    if ($null -eq $latestBackup) {
        Write-Error "No backup found!"
        Exit 1
    }
    
    $backupAge = (Get-Date) - $latestBackup.CreationTime
    $backupSize = (Get-ChildItem $latestBackup -Recurse | Measure-Object -Property Length -Sum).Sum
    
    Write-Host "Backup Status:"
    Write-Host "  Name: $($latestBackup.Name)"
    Write-Host "  Age: $($backupAge.TotalHours) hours"
    Write-Host "  Size: $(($backupSize/1MB).ToString('F2'))MB"
    
    # Verify backup is recent (within 25 hours)
    if ($backupAge.TotalHours -le 25) {
        Write-Host "✅ Backup is current"
        return $true
    } else {
        Write-Error "⚠️  Backup is older than 25 hours!"
        return $false
    }
}

Verify-DailyBackup
```

### Monthly Verification (Manual)

```powershell
# Test backup restoration monthly
Function Test-BackupRestore {
    $backupPath = "C:\mongodb-backups\backup_2026-02-28_02-00-00"
    
    Write-Host "Testing backup restore..."
    
    # Create test database
    mongorestore --uri "mongodb://localhost:27017/alawael-erp-test" `
      --drop `
      $backupPath
    
    # Verify collections
    $collections = mongo --uri "mongodb://localhost:27017/alawael-erp-test" `
      --eval "db.getCollectionNames()"
    
    Write-Host "Collections in backup:"
    Write-Host $collections
    
    # Drop test database
    mongo --uri "mongodb://localhost:27017/alawael-erp-test" `
      --eval "db.dropDatabase()"
    
    Write-Host "✅ Backup restore test successful"
}

Test-BackupRestore
```

---

## RECOVERY TIME OBJECTIVES (RTO)

| Scenario | RTO | RPO | Effort |
|----------|-----|-----|--------|
| **App restart** | 2 min | None | Easy |
| **Database restore** | 10 min | 24h | Medium |
| **Full system restore** | 15 min | 24h | Medium |
| **Hardware failure** | 1-2h | 24h | Hard (needs new server) |
| **Data corruption** | 20 min | 24h | Medium |

**RTO = Recovery Time Objective** (maximum acceptable downtime)  
**RPO = Recovery Point Objective** (maximum acceptable data loss)

---

## BACKUP STORAGE & RETENTION

### Storage Summary
```
Backup Location: C:\mongodb-backups
Current Size: ~15GB (30 daily backups × ~500MB each)
Retention Policy: 30 days
Auto-cleanup: Enabled (deletes backups >30 days old)
```

### Archive Strategy
```powershell
# Archive old backups (run quarterly)
# Move backups to external storage before 30-day auto-delete
Copy-Item -Path "C:\mongodb-backups\backup_*" `
  -Destination "D:\archive\mongodb-backups-Q1-2026" -Recurse

# Verify archive
Get-ChildItem "D:\archive\mongodb-backups-Q1-2026\backup_*" | Measure-Object
```

### Off-site Backup (Recommended for Production)
```powershell
# Upload to cloud storage (AWS S3, Azure Blob, etc.)
# Example using AWS CLI:
aws s3 sync C:\mongodb-backups s3://company-backups/alawael-erp/

# Schedule backup sync (daily at 3:00 AM)
# Windows Task Scheduler: aws-backup-sync.ps1
```

---

## TESTING & VALIDATION

### Monthly Disaster Recovery Drill

**Schedule:** First Sunday of each month, 9:00 AM


**Procedure:**
1. **Notification** - Email team: "DR Drill in progress"
2. **Simulate Failure** - Intentionally stop one service
3. **Execute Recovery** - Follow recovery steps above
4. **Verify Function** - Test all critical endpoints
5. **Document Results** - Record time, issues, improvements
6. **Team Debrief** - Review what worked, what didn't

**Success Criteria:**
- ✅ Service restored within RTO
- ✅ All data integrity checks pass
- ✅ All critical endpoints respond
- ✅ No data loss detected

---

## CONTACTS & ESCALATION

**Backup Issues:**
- Primary: admin@alawael-erp.com
- Escalate if: Backup not created for >25 hours

**Recovery Issues:**
- Primary: admin@alawael-erp.com (24/7)
- Second: backup-admin@alawael-erp.com
- Escalate if: Cannot restore within RTO

**Database Corruption:**
- Alert: database-team@alawael-erp.com
- Action: Immediate assessment and restoration

---

*Last Updated: February 28, 2026*  
*Next Drill Date: March 6, 2026*
