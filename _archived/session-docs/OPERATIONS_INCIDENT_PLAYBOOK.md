# OPERATIONS & INCIDENT RESPONSE PLAYBOOK
# ALAWAEL ERP Production Environment
# Version: 1.0.0 | Date: February 28, 2026

---

## TABLE OF CONTENTS
1. [Quick Reference](#quick-reference)
2. [Daily Operations](#daily-operations)
3. [Incident Response Procedures](#incident-response-procedures)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Recovery Procedures](#recovery-procedures)
7. [Escalation Matrix](#escalation-matrix)

---

## QUICK REFERENCE

### Critical Commands
```powershell
# View all PM2 processes
pm2 list

# View real-time logs
pm2 logs

# Monitor resource usage
pm2 monit

# Restart specific instance
pm2 restart alawael-backend

# Stop all instances
pm2 stop alawael-backend

# Stop everything
pm2 kill

# Restart with ecosystem config
pm2 start ecosystem.config.js

# Save PM2 state
pm2 save

# Health check
curl http://localhost:3001/api/v1/health/alive
```

### Key Directories
```
Frontend:    c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\frontend
Backend:     c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend
Logs:        c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\logs
Backups:     C:\mongodb-backups
Config:      c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\.env
```

### Important Ports
```
HTTP:        80
HTTPS:       443
PM2 Port:    3001 (primary), 3000 (fallback)
MongoDB:     27017 (localhost only)
```

---

## DAILY OPERATIONS

### Morning Startup (8:00 AM)
1. **System Health Check**
   ```powershell
   # Check PM2 processes
   pm2 list
   
   # Expected: All 8 instances showing "online"
   ```

2. **Database Connectivity**
   ```powershell
   # Test MongoDB connection
   curl http://localhost:3001/api/v1/health/db
   
   # Expected: HTTP 200 with database status "connected"
   ```

3. **Log Review**
   ```powershell
   # Check error logs
   Get-Content backend\logs\error.log -Tail 20
   
   # Check for any warnings
   Get-Content backend\logs\out.log -Tail 20 | Select-String "ERROR|WARN"
   ```

4. **Performance Baseline**
   ```powershell
   # Record response times
   $start = Get-Date
   curl http://localhost:3001/api/v1/health/alive
   Write-Host "Response time: $((Get-Date) - $start).TotalMilliseconds ms"
   ```

### Hourly Checks (Every Hour)
- [ ] Verify PM2 processes still online (`pm2 list`)
- [ ] Check no spikes in CPU/Memory (`pm2 monit`)
- [ ] Monitor HTTP error rate (check logs)

### End-of-Day Review (5:00 PM)
- [ ] Review error logs for critical issues
- [ ] Verify backup completion
- [ ] Document any incidents or anomalies
- [ ] Update status dashboard

---

## INCIDENT RESPONSE PROCEDURES

### INCIDENT: Application Not Responding

**Severity:** CRITICAL | **Response Time:** Immediate

**Step 1: Verify Problem**
```powershell
# Test endpoint
curl http://localhost:3001/api/v1/health/alive

# If timeout, continue to Step 2
```

**Step 2: Check PM2 Status**
```powershell
# View process status
pm2 list

# If any process shows "stopped" or "errored", continue
```

**Step 3: View Recent Logs**
```powershell
# Check last 50 lines of error log
Get-Content backend\logs\error.log -Tail 50

# Look for:
# - Memory errors
# - Database connection errors
# - Unhandled exceptions
```

**Step 4: Resource Check**
```powershell
# Check system resources
Get-WmiObject win32_operatingsystem | Select-Object @{n="Memory Usage %";e={[math]::Round(100-([math]::Round(($_.FreePhysicalMemory/$_.TotalVisibleMemorySize)*100,2)),2)}}

# If memory > 90%, restart instances
```

**Step 5: Restart Procedures**

**Option A: Soft Restart (Preferred)**
```powershell
# Restart with zero-downtime (cluster mode)
pm2 reload alawael-backend

# Verify all instances came back online
pm2 list

# Test endpoint
Start-Sleep -Seconds 5
curl http://localhost:3001/api/v1/health/alive
```

**Option B: Hard Restart**
```powershell
# Stop and start
pm2 stop alawael-backend
Start-Sleep -Seconds 2
pm2 start alawael-backend

# Verify
pm2 list
```

**Step 6: Validation**
```powershell
# Run health checks
$endpoints = @(
  "http://localhost:3001/api/v1/health/alive",
  "http://localhost:3001/api/v1/health/db",
  "http://localhost:3001/api/v1/health/ready"
)

foreach ($endpoint in $endpoints) {
  try {
    $resp = Invoke-WebRequest -Uri $endpoint -UseBasicParsing
    Write-Host "✅ $endpoint → HTTP $($resp.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Host "❌ $endpoint → ERROR" -ForegroundColor Red
  }
}
```

**Step 7: Escalation (If Still Not Working)**
- Document: Timestamp, symptoms, steps taken, current status
- Contact: Secondary admin or support team
- Check database connectivity separately
- Consider database restart or failover

---

### INCIDENT: High Memory Usage

**Severity:** HIGH | **Response Time:** 10 minutes

**Symptoms:**
- CPU/Memory spike in `pm2 monit`
- Response time degradation
- Some requests timing out

**Resolution:**
```powershell
# 1. Identify memory-heavy instances
pm2 monit

# 2. Check for memory leaks in specific instance
pm2 logs alawael-backend --lines 100 | Select-String "memory\|leak\|GC"

# 3. Graceful restart of high-memory instance
pm2 gracefulReload alawael-backend

# 4. Monitor for improvement
pm2 monit

# 5. If persists, investigate code
# - Look for unreleased event listeners
# - Check for circular references
# - Review recent code changes
```

**Prevention:**
- Max memory restart set to 500MB per instance
- PM2 auto-restart on memory threshold

---

### INCIDENT: Database Connection Lost

**Severity:** CRITICAL | **Response Time:** Immediate

**Symptoms:**
- Error logs show "MongoDB connection refused"
- `/api/v1/health/db` returns error
- All API calls fail (retry after delay)

**Resolution:**
```powershell
# 1. Check MongoDB service status
Get-Service MongoDB
# Should show: Status = Running

# 2. If not running, start MongoDB
Start-Service MongoDB
Start-Sleep -Seconds 5

# 3. Verify MongoDB is listening
netstat -an | findstr "27017"

# 4. Check MongoDB connection
# mongo localhost:27017/alawael-erp (if mongo CLI installed)

# 5. Test from backend
curl http://localhost:3001/api/v1/health/db

# 6. If still failing, restart MongoDB service
Stop-Service MongoDB
Start-Sleep -Seconds 2
Start-Service MongoDB
Start-Sleep -Seconds 3

# 7. Restart PM2 instances
pm2 reload alawael-backend

# 8. Database backup check
# If data is corrupted:
# - Stop application
# - Restore from backup
# - Clear application cache
# - Restart application
```

---

### INCIDENT: High Error Rate (>5% 5xx errors)

**Severity:** HIGH | **Response Time:** 5 minutes

**Symptoms:**
- API returning HTTP 500 errors
- Spikes in error logs
- Increased error rate alerts

**Resolution:**
```powershell
# 1. Identify error pattern
Get-Content backend\logs\error.log -Tail 100 | Group-Object | Sort-Object Count -Descending | Select-Object -First 5

# 2. Check for specific route issues
pm2 logs | Select-String "ERROR\|Exception" -A 5

# 3. Restart application
pm2 reload alawael-backend

# 4. If continues, check database
curl http://localhost:3001/api/v1/health/db

# 5. Check dependencies (Redis, external APIs)
# - Redis: (should be offline, using in-memory fallback)
# - Webhook services: Check configuration
# - External services: Verify connectivity

# 6. If still failing:
# - Rollback recent code changes
# - Restore from backup
# - Check system resources
```

---

### INCIDENT: DDoS or Unusual Traffic

**Severity:** HIGH | **Response Time:** 2 minutes

**Symptoms:**
- Sudden spike in requests
- Response time degradation
- 429 Too Many Requests errors

**Resolution:**
```powershell
# 1. Enable rate limiting (already configured in Nginx)
# Default: 100 requests per 15 minutes per IP

# 2. Check spike source
Get-Content backend\logs\access.log | Group-Object -Property "client_ip" | Sort-Object Count -Descending | Select-Object -First 10

# 3. Ban malicious IPs (in firewall)
New-NetFirewallRule -DisplayName "Block DDoS IP" -Direction Inbound -Action Block -RemoteAddress "X.X.X.X"

# 4. Monitor recovery
pm2 monit

# 5. Notify security team

# 6. Post-incident:
# - Enable CloudFlare protection
# - Increase rate limit thresholds if legitimate spike
# - Add IP whitelist for legitimate services
```

---

## TROUBLESHOOTING GUIDE

### Symptom: "Address already in use" error

**Cause:** Port 3001 is already bound

**Solution:**
```powershell
# Find process using port 3001
netstat -ano | findstr "3001"

# Kill process (replace PID with actual number)
taskkill /PID 12345 /F

# Or let PM2 use different port:
# Edit ecosystem.config.js and change port to 3011
# Then: pm2 start ecosystem.config.js
```

### Symptom: "EACCES: permission denied" in logs

**Cause:** Application doesn't have write permissions to logs directory

**Solution:**
```powershell
# Check directory permissions
Get-Acl backend\logs

# Grant write permissions
icacls "backend\logs" /grant Users:F /T
```

### Symptom: "MongoDB ECONNREFUSED" errors

**Cause:** MongoDB is not running or not accessible

**Solution:**
```powershell
# Start MongoDB
Start-Service MongoDB

# Verify it's listening
netstat -an | findstr "27017"

# Test connection
# If using MongoDB CLI:
# mongo --host localhost --port 27017

# Otherwise, test via API
curl http://localhost:3001/api/v1/health/db
```

### Symptom: "Cannot read property 'xxx' of undefined" errors

**Cause:** Code bug or data integrity issue

**Solution:**
```powershell
# 1. Check recent git changes
git log --oneline -n 10

# 2. Identify which API is failing
pm2 logs | Select-String "Cannot read"

# 3. Roll back recent changes
git revert --no-edit <commit-hash>

# 4. Rebuild and restart
npm install
pm2 reload alawael-backend

# 5. Test affected endpoint
curl http://localhost:3001/api/endpoint/that/failed
```

---

## MAINTENANCE PROCEDURES

### Weekly Maintenance (Sunday 2:00 AM)

```powershell
# 1. Clear old logs
$LogDir = "backend\logs"
Get-ChildItem -Path "$LogDir\archive\*.gz" -OlderThan (Get-Date).AddDays(-30) | Remove-Item -Force

# 2. Run npm audit
npm audit fix

# 3. Check node version
node --version

# 4. Verify backups
Get-ChildItem C:\mongodb-backups | Measure-Object
# Should show: 7 backup folders (daily for 7+ days)

# 5. Restart PM2 (optional, only if no traffic)
# pm2 restart alawael-backend
```

### Monthly Maintenance (First Sunday)

```powershell
# 1. Full npm update
npm update

# 2. Security audit
npm audit

# 3. Run full test suite
npm test

# 4. Check disk space
Get-Volume C

# 5. Review and archive old logs
$ArchiveDate = (Get-Date).AddDays(-30)
Get-ChildItem "backend\logs\*.log" | Where-Object { $_.LastWriteTime -lt $ArchiveDate } | Move-Item -Destination "backend\logs\archive\"

# 6. Backup configuration
Copy-Item "backend\.env" -Destination "backend\.env.backup.$(Get-Date -Format 'yyyyMMdd')"
```

### Quarterly Maintenance (Every 3 Months)

```powershell
# 1. Disaster recovery test
# - Stop application
# - Delete data
# - Restore from backup
# - Start application
# - Verify all data intact

# 2. Security assessment
npm audit
git log --all | Select-String "password\|secret\|token"

# 3. Database optimization
# - Run MongoDB maintenance
# - Check index fragmentation
# - Rebuild if needed

# 4. Performance review
# - Compare metrics to baseline
# - Identify bottlenecks
# - Plan optimizations
```

---

## RECOVERY PROCEDURES

### Full System Restore from Backup

**Situation:** Complete data loss or corruption

**Time to Recover:** ~15 minutes

```powershell
# 1. Stop application
pm2 stop alawael-backend

# 2. Stop database
Stop-Service MongoDB

# 3. Find latest backup
Get-ChildItem C:\mongodb-backups | Sort-Object CreationTime -Descending | Select-Object -First 1

# 4. Restore from backup
# Using mongorestore (if MongoDB CLI installed):
# mongorestore --uri "mongodb://localhost:27017/alawael-erp" "C:\mongodb-backups\backup_YYYY-MM-DD_HH-MM-SS"

# Or manually restore:
Copy-Item "C:\mongodb-backups\backup_2026-02-28_02-00-00\*" -Destination "backend\data\" -Recurse -Force

# 5. Start services
Start-Service MongoDB
Start-Sleep -Seconds 5

# 6. Start application
pm2 start alawael-backend

# 7. Verify integrity
curl http://localhost:3001/api/v1/health/db
curl http://localhost:3001/api/v1/health/alive

# 8. Check data
# Spot-check critical data in application
```

### Rollback to Previous Version

**Situation:** Code bug detected in production

**Time to Recover:** ~5 minutes

```powershell
# 1. Identify last good commit
git log --oneline -n 10

# 2. Revert to previous commit
git revert --no-edit <commit-hash>
# or
git reset --hard <previous-commit-hash>

# 3. Rebuild application
npm install
npm build

# 4. Restart PM2
pm2 reload alawael-backend

# 5. Verify
curl http://localhost:3001/api/v1/health/alive

# 6. Monitor logs for issues
pm2 logs --lines 50
```

---

## ESCALATION MATRIX

| Severity | Issue | Response Time | Who | Action |
|----------|-------|---|---|---|
| P1 - Critical | Complete outage, data loss | Immediate | Primary Admin | Page on-call, start incident response |
| P1 - Critical | Database unreachable | Immediate | Primary Admin | Attempt restart, escalate if fails |
| P2 - High | High error rate (>5%) | 5 min | Primary Admin | Identify root cause, restart if needed |
| P2 - High | High memory/CPU usage | 10 min | Primary Admin | Monitor, restart if threshold exceeded |
| P3 - Medium | Degraded performance | 30 min | Primary Admin | Investigate, apply fix, test |
| P4 - Low | Minor bugs, alerts | Next business day | Support Team | Document, plan for next release |

---

## CONTACTS

**Primary Administrator**
- Name: [Your Name]
- Email: admin@alawael-erp.com
- Phone: [Phone Number]
- Available: 24/7 for P1 issues

**Secondary Administrator**
- Name: [Backup Name]
- Email: backup@alawael-erp.com
- Phone: [Phone Number]

**Development Team**
- Email: dev-team@alawael-erp.com
- Slack: #alawael-alerts

**Security Team**
- Email: security@alawael-erp.com
- Emergency: [Security Phone]

---

*Last Updated: February 28, 2026*  
*Next Review: March 31, 2026*
