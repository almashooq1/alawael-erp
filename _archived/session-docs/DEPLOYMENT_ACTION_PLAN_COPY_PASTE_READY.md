# 🎯 DEPLOYMENT ACTION PLAN - COPY-PASTE READY

**ALAWAEL v1.0.0 - February 28, 2026**  
**Status:** Ready to Execute

---

## PHASE 1: PRE-DEPLOYMENT VERIFICATION (30 MINUTES)

### STEP 1.1: Navigate to Backend
```powershell
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\intelligent-agent\backend"
```

### STEP 1.2: Run Final Tests
```powershell
npm test -- --run
```

**Expected Output:**
```
Tests  125 passed | 110 skipped (235)
Duration  7.00s
```

**✓ If you see: 125 passed, 0 failed → CONTINUE**  
**✗ If you see: Any failures → STOP and escalate**

### STEP 1.3: Verify Git Status
```powershell
git status
```

**Expected:** `On branch main, nothing to commit, working tree clean`

### STEP 1.4: Verify Latest Commit
```powershell
git log --oneline -1
```

**Expected:** `cceee48 fix: Achieve 125/125 active tests passing`

### STEP 1.5: Run Linting
```powershell
npm run lint 2>&1 | Select-String "error" | Measure-Object
```

**Expected:** `Count: 0`

**✓ Phase 1 Complete** → Proceed to Phase 2

---

## PHASE 2: STAGING DEPLOYMENT (1-2 HOURS)

### STEP 2.1: Set Staging Environment
```powershell
$env:NODE_ENV = "staging"
$env:DATABASE_URL = "mongodb://staging-server:27017/alawael-staging"
$env:LOG_LEVEL = "debug"
```

### STEP 2.2: Build Application
```powershell
npm run build
```

**Expected:** Build completes without errors

### STEP 2.3: Start Server in Staging
```powershell
npm start
```

**Expected Output:**
```
Server running on port 3000
Database connected
Ready for requests
```

### STEP 2.4: Health Check (New Terminal)
```powershell
# Open new terminal/PowerShell
curl http://localhost:3000/health -TimeoutSec 5
```

**Expected Response:**
```json
{
  "status": "healthy",
  "tests": "125 passed",
  "timestamp": "2026-02-28T..."
}
```

### STEP 2.5: Test SAMA Payment Endpoint
```powershell
$body = @{
    iban = "SA0380000000608010167519"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/payments/sama/validate" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Expected:** HTTP 200 with `{"valid": true, "status": "success"}`

### STEP 2.6: Monitor Logs (New Terminal)
```powershell
# In another terminal, monitor logs
Get-Content -Path ./logs/staging.log -Wait -Tail 20
```

### STEP 2.7: Stop Staging Server
```powershell
# When ready to move to production
Stop-Process -Name node -Force
```

**✓ Phase 2 Complete** → Proceed to Phase 3

---

## PHASE 3: PRODUCTION DEPLOYMENT (30 MINUTES)

### STEP 3.1: Set Production Environment
```powershell
$env:NODE_ENV = "production"
$env:DATABASE_URL = "mongodb://production-server:27017/alawael-prod"
$env:LOG_LEVEL = "warn"
$env:PORT = "3000"
```

### STEP 3.2: Verify Certificates
```powershell
Get-ChildItem -Path "./certs" | Where-Object {$_.Extension -eq ".pem"} | Select-Object Name
```

**Expected:** 2+ certificate files present

### STEP 3.3: Start Production Server
```powershell
npm start
```

**Expected Output:**
```
Server running on port 3000
Production environment active
Database connected
```

### STEP 3.4: Production Health Check (New Terminal)
```powershell
curl https://alawael.example.com/health -TimeoutSec 5
```

**Expected:** HTTP 200, healthy status

### STEP 3.5: Monitor Production Logs (New Terminal)
```powershell
# Monitor logs for first hour
Get-Content -Path "./logs/production.log" -Wait -Tail 30
```

### STEP 3.6: Verify Payment Processing (New Terminal)
```powershell
# Test a payment transaction
$body = @{
    iban = "SA0380000000608010167519"
    amount = 10000
    reference = "TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://alawael.example.com/api/payments/process" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer TOKEN"} `
  -Body $body
```

### STEP 3.7: Check Database Connections
```powershell
# Monitor database connection pool
curl https://alawael.example.com/api/status/database
```

**✓ Phase 3 Complete** → Deployment Successful

---

## EMERGENCY PROCEDURES

### If Tests Fail During Phase 1

**Stop immediately and escalate:**
```powershell
# Save test output
npm test -- --run 2>&1 | Out-File "test-failure-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Run focused test on failures
npm test -- --reporter=verbose

# Contact: Backend Team Lead
```

### If Server Won't Start

```powershell
# Check for port conflicts
netstat -ano | findstr :3000

# If port in use, kill process
Get-Process | Where-Object {$_.Port -eq 3000} | Stop-Process -Force

# Check logs for errors
Get-Content ./logs/*.log | Select-String "error" | Out-File debug.log

# Contact: DevOps Engineer
```

### If Payment Processing Fails

```powershell
# Check SAMA service connectivity
curl https://sama.example.com/health

# Review SAMA-specific logs
Get-Content ./logs/sama.log -Tail 50

# Check database indices
# Contact: Database Administrator
```

### EMERGENCY ROLLBACK

```powershell
# STOP production immediately
Stop-Process -Name node -Force

# Revert to previous version
git checkout HEAD~1

# Reset hard if needed
git reset --hard HEAD~1

# Reinstall clean
Remove-Item -Path "node_modules" -Recurse -Force
npm install

# Start with previous version
$env:NODE_ENV = "production"
npm start

# Monitor rollback
Get-Content ./logs/production.log -Wait -Tail 50

# Contact: CTO immediately with error details
```

---

## MONITORING CHECKLIST (First 24 Hours)

### Hourly Checks
```powershell
# Every hour, run:
curl https://alawael.example.com/health

# Check for errors in logs
Get-Content ./logs/production.log | Select-String "ERROR" | Measure-Object

# Verify database connectivity
curl https://alawael.example.com/api/status/database

# Monitor system resources
Get-Process node | Select-Object CPU, Memory
```

### Every 4 Hours
```powershell
# Backup logs
Copy-Item -Path "./logs/production.log" -Destination "./logs/backup/production-$(Get-Date -Format 'yyyyMMdd-HHmm').log"

# Check transaction logs
Get-Content ./logs/sama.log | Select-String "transaction" | Measure-Object

# Verify no memory leaks
Get-Process node | Select-Object WorkingSet | ForEach-Object {$_.WorkingSet / 1MB}
```

### End of Day
```powershell
# Summarize errors
Get-Content ./logs/production.log | Select-String "ERROR" | Out-File "daily-summary-$(Get-Date -Format 'yyyyMMdd').txt"

# Transaction counts
Get-Content ./logs/sama.log | Select-String "SUCCESS" | Measure-Object

# Report to management
# - Errors encountered
# - Transactions processed
# - Performance metrics
# - Any issues resolved
```

---

## QUICK DIAGNOSIS COMMANDS

### Test Status
```powershell
cd intelligent-agent/backend
npm test -- --run 2>&1 | Select-String "passed|failed|skipped" | Select-Object -Last 3
```

### Server Status
```powershell
# Is it running?
Get-Process node | Select-Object Name, CPU, Memory

# What port?
netstat -ano | findstr :3000

# Recent errors?
Get-Content ./logs/production.log | Select-String "ERROR|WARN" | Select-Object -Last 20
```

### Database Status
```powershell
# Connection test
curl http://localhost:3000/api/status/database

# Collection status
# (if MongoDB client available)
# db.adminCommand({serverStatus: 1})
```

### Payment Processing Status
```powershell
# Recent transactions
Get-Content ./logs/sama.log | Select-String "transaction" | Select-Object -Last 10

# Transaction success rate
$total = (Get-Content ./logs/sama.log | Measure-Object -Line).Lines
$success = (Get-Content ./logs/sama.log | Select-String "SUCCESS" | Measure-Object).Count
Write-Host "Success Rate: $($success/$total*100)%"
```

---

## TEAM COMMUNICATION TEMPLATE

### When Phase 1 Complete
```
✅ Phase 1: Pre-Deployment Verification COMPLETE
- All 125 tests passing ✓
- Git status clean ✓
- No compilation errors ✓
- Ready for staging deployment

Proceed to Phase 2 in 5 minutes.
```

### When Phase 2 Complete
```
✅ Phase 2: Staging Deployment COMPLETE
- Server started successfully ✓
- Health checks passing ✓
- SAMA endpoint tested ✓
- All smoke tests passed ✓

Ready for production deployment.
```

### When Phase 3 Complete
```
✅ Phase 3: Production Deployment COMPLETE
- Server running on port 3000 ✓
- Database connected ✓
- APIs responding ✓
- Payment processing verified ✓

System LIVE. Monitoring for 24 hours.
```

### Emergency Alert Template
```
🚨 DEPLOYMENT ISSUE DETECTED

Issue: [DESCRIBE]
Severity: [CRITICAL/HIGH/MEDIUM]
Time: [TIMESTAMP]
Impact: [SERVICES AFFECTED]

Actions Taken: [WHAT WE DID]
Status: [INVESTIGATING/MITIGATING/ROLLBACK IN PROGRESS]

Next Steps: [WHAT'S NEXT]
ETA: [TIME]

Contact: [ON-CALL ENGINEER]
```

---

## REQUIRED APPROVALS BEFORE DEPLOYING

- [ ] Manager Approval: _________________ Date: _______
- [ ] Technical Lead Sign-Off: __________ Date: _______
- [ ] DBA Approval: ___________________ Date: _______
- [ ] Security Clearance: ______________ Date: _______
- [ ] Operations Ready: _______________ Date: _______

---

## SUCCESS CRITERIA - POST DEPLOYMENT

- ✅ Server running and responding to health checks
- ✅ Database connected and queryable
- ✅ all 125 tests still passing (if re-run)
- ✅ Payment processing operational
- ✅ SAMA endpoints responding
- ✅ No critical errors in first hour
- ✅ Performance baseline met (< 5 sec response time)
- ✅ No data consistency issues
- ✅ All scheduled jobs executing
- ✅ System monitoring alerts functioning

---

**Print this page. Keep it during deployment. Good luck! 🚀**

Generated: February 28, 2026  
For: ALAWAEL v1.0.0 Deployment
