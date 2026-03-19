# PHASE 7: TEAM RUNBOOK & TRAINING MANUAL
# Complete Operations & Training Guide
# ALAWAEL ERP Production System
# Version: 1.0 | Date: February 28, 2026

---

## TABLE OF CONTENTS

1. [Quick Start (New Team Member)](#quick-start)
2. [Production Access Procedures](#production-access)
3. [Daily Operations Checklist](#daily-ops)
4. [Emergency Response](#emergency-response)
5. [Common Tasks & Solutions](#common-tasks)
6. [Training Schedule](#training-schedule)
7. [Certification Requirements](#certification)

---

## QUICK START FOR NEW TEAM MEMBERS

### Day 1: Account Setup (30 minutes)

**Onboarding Coordinator will provide:**
- [ ] SSH private key and passphrase
- [ ] GitHub account access
- [ ] Slack channel invites
- [ ] Documentation repository link
- [ ] Monitoring dashboard credentials

**Your tasks:**
```bash
# 1. Save SSH key securely
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# Move provided key to ~/.ssh/id_rsa_alawael
chmod 600 ~/.ssh/id_rsa_alawael

# 2. Test SSH connection
ssh -i ~/.ssh/id_rsa_alawael production@alawael-erp.example.com
# Expected: Connected prompt

# 3. Clone repository
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# 4. Join Slack channels
# #alawael-alerts
# #alawael-deployments
# #alawael-support
```

### Day 2: Environment Familiarization (2 hours)

**Learn the following:**

1. **System Architecture**
   - [ ] Read SYSTEM_ARCHITECTURE.md (20 min)
   - [ ] Review PM2 cluster setup (10 min)
   - [ ] Understand database structure (20 min)

2. **Critical Procedures**
   - [ ] Review INCIDENT_PLAYBOOK.md (30 min)
   - [ ] Study health check procedures (15 min)
   - [ ] Learn restart procedures (15 min)

3. **Access Verification**
   - [ ] Test PM2 access (`pm2 list`) (5 min)
   - [ ] Test database access (5 min)
   - [ ] Verify log access (5 min)

### Day 3: Live Shadowing (4 hours)

**Schedule with primary admin:**

- [ ] 9:00 AM - Morning health checks (30 min)
- [ ] 9:30 AM - Review logs from past 24h (30 min)
- [ ] 10:00 AM - Walkthrough incident response (1 hour)
- [ ] 11:00 AM - Q&A and questions (30 min)
- [ ] 11:30 AM - Practice health check procedures (30 min)
- [ ] 12:00 PM - Handle first alert together (1 hour, if applicable)

### Day 4-5: Solo Tasks Under Supervision

- [ ] Execute morning health checks independently (admin watching)
- [ ] Create test incident scenario and practice response
- [ ] Review logs and identify any issues
- [ ] Document one "lessons learned" from the week

**Completion:** After 5 days, new team member ready for Level 1 support

---

## PRODUCTION ACCESS PROCEDURES

### Before You Access Production

**Checklist:**
- [ ] I have read the Security Hardening Checklist
- [ ] I understand the principle of least privilege
- [ ] I know who to escalate to if unsure
- [ ] I have confirmed the task with my manager
- [ ] I understand the change control process

### Accessing Production Server

```bash
# 1. Connect via SSH
ssh -i ~/.ssh/id_rsa_alawael production@alawael-erp.example.com

# 2. Upon connection, review the MOTD (Message of the Day)
# This contains current system status and alerts

# 3. Always start with status check
pm2 list        # View process status
pm2 logs        # View recent logs
df -h           # Check disk space
free -h         # Check memory

# 4. Perform your task
# ... execute task ...

# 5. Always end with verification
pm2 list        # Confirm processes still running
curl http://localhost:3001/api/v1/health/alive  # Test API
```

### Logging Out Safely

```bash
# 1. Document what you did
# Add entry to the daily log (admin will show you how)

# 2. Clear your command history (optional, for security)
history -c

# 3. Disconnect
exit
```

---

## DAILY OPERATIONS CHECKLIST

### Morning (8:00 AM)

**Estimated Time: 10 minutes**

```powershell
# 1. Check system status
pm2 list

# Expected: All 8 instances showing "online"
# If any showing "stopped" or "errored", escalate immediately

# 2. Check last night's logs
pm2 logs --lines 50

# Look for ERROR or WARN messages
# If found, investigate root cause

# 3. Start health checks
curl http://localhost:3001/api/v1/health/alive
curl http://localhost:3001/api/v1/health/db
curl http://localhost:3001/api/v1/health/ready

# Expected: All return HTTP 200

# 4. Check backup status
ls -lah /C:/mongodb-backups | head -5
# Last backup should be from yesterday 2:00 AM

# 5. Review alert log
# Check Slack #alawael-alerts for overnight alerts
```

### Midday (12:00 PM)

**Estimated Time: 5 minutes**

```powershell
# 1. Quick health check (same as morning)
pm2 list
curl http://localhost:3001/api/v1/health/alive

# 2. Check error rate
# Count errors in last 12 hours
Get-Content backend\logs\error.log -Tail 100 | Measure-Object -Line
# Should be < 10 errors

# 3. Spot-check performance
# Measure response time
$time = (Measure-Command { curl http://localhost:3001/api/v1/health/db }).TotalMilliseconds
Write-Host "Response time: $time ms (target: <50ms)"
```

### Evening (5:00 PM)

**Estimated Time: 15 minutes**

```powershell
# 1. Final health check
pm2 list
pm2 logs --lines 20

# 2. Review day's incidents
# Any alerts from Slack? Any errors?

# 3. Check upcoming maintenance
# Any planned maintenance tonight?

# 4. Document in daily log
# Write brief summary:
# - All systems operational or issues encountered
# - Any errors logged
# - Performance observations
# - Recommendations for next day

# 5. Verify backup
# (Already automated, but verify it completed)
ls -lah /C:/mongodb-backups | head -1
```

---

## EMERGENCY RESPONSE

### IF SYSTEM IS DOWN (PRI CRITICAL)

**Immediate Actions (First 2 minutes):**

```powershell
# 1. Check if application is actually down
for ($i = 0; $i -lt 5; $i++) {
    try {
        $response = curl http://localhost:3001/api/v1/health/alive -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ System is UP (may have been transient issue)"
            break
        }
    } catch { }
    Write-Host "Attempt $($i+1)/5: No response"
    Start-Sleep -Seconds 1
}

# 2. If confirmed down, check PM2
pm2 list
# Look for "stopped" or "errored" status

# 3. Check error logs
Get-Content backend\logs\error.log -Tail 50
```

**Recovery Actions (Next 5 minutes):**

```powershell
# Step 1: Restart application (graceful)
pm2 reload alawael-backend

# Wait and check
Start-Sleep -Seconds 5
pm2 list

# Step 2: If still failing, hard restart
pm2 stop alawael-backend
pm2 start alawael-backend

# Wait and check
Start-Sleep -Seconds 5
curl http://localhost:3001/api/v1/health/alive

# Step 3: If STILL failing, check database
curl http://localhost:3001/api/v1/health/db
# Look for connection errors
```

**Escalation (If still down after 10 minutes):**

```
1. Page Primary Admin immediately
2. Start incident response procedure (see INCIDENT_PLAYBOOK.md)
3. Begin triage:
   - Check database status
   - Check disk space
   - Check memory usage
   - Review error logs
4. Document all steps taken
```

---

## COMMON TASKS & SOLUTIONS

### Task 1: Restart Single Instance (Load-Balanced Restart)

```powershell
# If instance 3 has issues:

# Option A: Graceful reload (zero downtime)
pm2 reload alawael-backend --only 3
# This restarts ONLY instance 3, others handle traffic

# Verify
Start-Sleep -Seconds 3
pm2 list
# Instance 3 should show "online"
```

### Task 2: View Application Logs

```powershell
# View logs from all instances
pm2 logs alawael-backend

# View specific number of lines
pm2 logs alawael-backend --lines 100

# View only errors
pm2 logs alawael-backend | Select-String "ERROR|WARN"

# Save logs to file
pm2 logs alawael-backend --lines 500 > daily-logs.txt
```

### Task 3: Check Database Connectivity

```bash
# If mongodb is installed:
mongo --host localhost:27017 --eval "db.adminCommand('ping')"

# Expected output: { "ok" : 1 }

# Or use application health endpoint:
curl http://localhost:3001/api/v1/health/db
# Should return JSON with "status": "connected"
```

### Task 4: Clear Application Cache

```powershell
# Note: In-memory cache (no Redis yet), clears on restart

# Option 1: Reload application (clears cache)
pm2 reload alawael-backend

# Option 2: If Redis is deployed:
redis-cli FLUSHALL  # Clear all Redis cache
```

### Task 5: Manually Trigger Backup

```powershell
# Run backup script immediately
& "C:\backup_mongodb_automated.ps1"

# Verify backup was created
Get-ChildItem "C:\mongodb-backups" | Sort-Object CreationTime -Descending | Select-Object -First 1
```

---

## TRAINING SCHEDULE

### Week 1: Foundation Training

| Day | Topic | Duration | Format |
|-----|-------|----------|--------|
| Mon | System overview and access | 1 hour | Lecture + Lab |
| Tue | PM2 and process management | 1 hour | Demo + Practice |
| Wed | Database and data operations | 1 hour | Demo + Practice |
| Thu | Logs and monitoring | 1 hour | Demo + Practice |
| Fri | Mini incident drill | 1 hour | Hands-on |

### Week 2: Advanced Training

| Day | Topic | Duration | Format |
|-----|-------|----------|--------|
| Mon | Backup and recovery | 1.5 hours | Lecture + Demo |
| Tue | Security and access control | 1 hour | Lecture |
| Wed | Performance tuning | 1.5 hours | Demo |
| Thu | Capacity planning | 1 hour | Discussion |
| Fri | Full incident response drill | 2 hours | Realistic scenario |

### Week 3: Certification

| Day | Topic | Duration | Format |
|-----|-------|----------|--------|
| Mon-Wed | Independent tasks | - | On-the-job |
| Thu | Knowledge assessment | 1 hour | Written exam |
| Fri | Practical certification | 1 hour | Live task |

---

## CERTIFICATION REQUIREMENTS

### To Become Certified on Production Support

**Knowledge Requirements:**
- [ ] Pass written exam (80% passing score)
  - 20 questions on procedures, 25 questions on troubleshooting
  
- [ ] Complete practical certification
  - Restart an instance successfully
  - Read and interpret logs correctly
  - Perform health checks correctly
  - Respond to simulated incident properly

**Experience Requirements:**
- [ ] Shadow shifts: Minimum 3 days (12 hours)
- [ ] Solo shifts: Minimum 1 week (40 hours)
- [ ] Successfully handle at least 2 real incidents
- [ ] Maintain zero critical errors during solo shifts

**Ongoing Requirements:**
- [ ] Monthly knowledge refresher (30 min)
- [ ] Quarterly scenario drills (1 hour)
- [ ] Annual certification renewal (written + practical)

---

## FREQUENTLY ASKED QUESTIONS

**Q: What should I do if I'm unsure about a procedure?**  
A: ASK! Better to escalate and ask than to make a mistake. Contact primary admin in Slack #alawael-alerts.

**Q: What's the difference between "reload" and "restart"?**  
A: Reload = graceful (no traffic lost), Restart = stops then starts (brief downtime). Use reload first.

**Q: How do I know if the database is having issues?**  
A: Run `curl http://localhost:3001/api/v1/health/db`. If it returns error, database is having issues.

**Q: How long does a backup take?**  
A: ~5-10 minutes depending on database size. It runs at 2 AM daily automatically.

**Q: What's the rollback procedure if something goes wrong?**  
A: 1) Stop the change, 2) Restore from backup, 3) Test thoroughly, 4) Notify team.

---

## SUPPORT & ESCALATION

### During Business Hours (8 AM - 6 PM)
- Slack #alawael-support (response: <15 min)
- Direct message to admin on-call

### After Hours (6 PM - 8 AM)
- Page on-call admin (response: <5 min for critical)
- Emergency contact: [Phone number]

### Day Off / Weekend
- Escalate to backup admin
- Emergency hotline for critical issues

---

**Training Status: ✅ READY FOR TEAM ONBOARDING**

*Document Version: 1.0*  
*Created: February 28, 2026*  
*Last Updated: February 28, 2026*
