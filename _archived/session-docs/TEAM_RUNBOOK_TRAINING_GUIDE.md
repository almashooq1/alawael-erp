# TEAM RUNBOOK & TRAINING GUIDE
# Daily Operations, Incident Response, and Knowledge Repository
# Version: 1.0.0 | Date: February 28, 2026

---

## QUICK START FOR NEW TEAM MEMBERS

### Your First Day

**1. Setup (30 minutes)**
- [ ] Receive SSH key and credentials
- [ ] Login to server: `ssh admin@alawael-prod.com`
- [ ] Verify access to backend: `pm2 list`
- [ ] Verify database: `mongo mongodb://localhost:27017/alawael-erp`

**2. Read Documentation (1 hour)**
- [ ] ALAWAEL_v1.0.0_QUICK_CHECKLIST.md
- [ ] OPERATIONS_INCIDENT_PLAYBOOK.md
- [ ] PRODUCTION_DEPLOYMENT_SIGN_OFF.md

**3. Explore System (1 hour)**
- [ ] Walk through backend codebase
- [ ] Review API documentation: `/docs/api`
- [ ] Check health endpoints: `curl localhost:3001/api/v1/health/full`
- [ ] Review recent logs: `pm2 logs`

**4. Hands-on Training (2 hours)**
- [ ] Shadow team member in production environment
- [ ] Practice checking logs
- [ ] Practice restarting PM2 instances
- [ ] Practice simple troubleshooting

---

## DAILY OPERATIONS CHECKLIST

### Morning (Start of Shift)

**Step 1: System Health Check (5 min)**
```powershell
# Check all PM2 instances are running
pm2 list
# Expected: 8 instances, all showing "online"

# If any offline:
pm2 restart ecosystem.config.js
pm2 save

# Check error logs for overnight
pm2 logs --err --lines 20
```

**Step 2: Database Health (5 min)**
```powershell
# Verify MongoDB connection
mongo mongodb://localhost:27017/alawael-erp --eval "db.stats()"

# Expected: Returns database statistics
# If error: Check MongoDB service running
Get-Service MongoDB | select Status
```

**Step 3: Monitoring Dashboard (5 min)**
```
Open Grafana if configured:
http://localhost:3000/dashboards

Check these metrics:
- CPU usage (should be < 20%)
- Memory usage (should be < 60%)
- Request rate (should be stable)
- Error rate (should be < 1%)
```

**Step 4: Recent Alert Review (5 min)**
```powershell
# Check alert logs from night shift
Get-Content logs/alerts.log -Tail 50 | Select-String "ALERT"

# If alerts exist:
1. Review severity (INFO, WARNING, CRITICAL)
2. Investigate root cause
3. Document in incident log
4. Escalate if needed
```

**Step 5: Communication (5 min)**
- [ ] Check Slack/email for messages from night shift
- [ ] Post morning status update to team
- [ ] Note any known issues for team

### Throughout the Shift

**Every Hour:**
- [ ] Glance at monitoring dashboard
- [ ] Quick log review (no errors?)
- [ ] Check alert notifications

**Before End of Shift:**
- [ ] Document any issues encountered
- [ ] Leave notes for next shift in shared log
- [ ] Ensure all instances healthy
- [ ] Verify database backed up

---

## INCIDENT RESPONSE PLAYBOOK

### Severity Levels

| Severity | Impact | Response Time | Example |
|----------|--------|---|---|
| **P1 (Critical)** | Systems down, user impact | 5 min | All servers offline |
| **P2 (High)** | Degraded performance | 15 min | 50% error rate |
| **P3 (Medium)** | Minor issue | 1 hour | 5% error rate |
| **P4 (Low)** | Informational | 24 hours | Log warnings |

### Incident Response Workflow

```
1. Detection → 2. Assessment → 3. Response → 4. Recovery → 5. Review
```

#### **Detection** (0-5 min)
```powershell
# Alert triggers automatically from monitoring
# OR manual discovery by team member

# Confirm issue
curl localhost:3001/api/v1/health/full
# If error: Issue confirmed

# Document start time
$incidentStart = Get-Date
Write-Host "⚠️ INCIDENT START: $incidentStart"
```

#### **Assessment** (5-15 min)
```powershell
# 1. Determine scope
"Are ALL services down or just some endpoints?"

# 2. Check logs
pm2 logs --err --lines 100
pm2 logs combined | Select-String "ERROR" | Select-Object -Last 20

# 3. Check resources
"Is this a resource exhaustion? (CPU, Memory, Disk)"
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5

# 4. Check database
"Is database responding?"
mongo --eval "db.serverStatus()"

# 5. Determine root cause
"Is it:"
"a) Code error?"
"b) Database error?"
"c) Resource exhaustion?"
"d) External dependency?"
```

#### **Response** (15-30 min)

**Scenario A: Code Error**
```powershell
# 1. Check recent changes
git log --oneline | head -5

# 2. If bad code deployed:
git revert <commit-hash>
pm2 restart ecosystem.config.js

# 3. If error in current code:
# Make fix in code, commit, and restart
npm run test  # Verify fix doesn't break tests
pm2 restart ecosystem.config.js
```

**Scenario B: Database Error**
```powershell
# 1. Check database status
mongo --eval "rs.status()"

# 2. If database is down:
Get-Service MongoDB | Start-Service

# 3. If collections corrupted:
# Restore from backup (see BACKUP_DISASTER_RECOVERY_GUIDE.md)
"Path: C:\mongodb-backups"
mongorestore --uri "mongodb://localhost:27017" --archive="C:\mongodb-backups\latest.archive"
```

**Scenario C: Resource Exhaustion**
```powershell
# 1. Identify what's using resources
Get-Process | Sort-Object WorkingSet -Descending | Select-Object Name, WorkingSet

# 2. If Node.js using too much:
# Increase heap size
# Edit ecosystem.config.js: max_memory_restart = "2000M"
pm2 restart ecosystem.config.js

# 3. If disk full:
# Delete old logs: Get-ChildItem logs/*.old | Remove-Item
# Compress archives: 7z a logs-backup.7z logs/
```

**Scenario D: External Dependency (API, Service)**
```powershell
# 1. Check if external service is down
# Test connectivity: curl <external-api>

# 2. If external service down:
# Use fallback/cache if available
# OR return graceful error to users
# OR wait for service recovery

# 3. Degrade gracefully:
# Disable feature temporarily
# Show message to users
```

#### **Recovery** (30-60 min)
```powershell
# 1. Verify fix worked
curl localhost:3001/api/v1/health/full
# Should return: { status: "healthy" }

# 2. Monitor closely
# Keep dashboard open for 15-30 min
# Watch for error rate returning to 0

# 3. Run smoke tests
npm test -- --testNamePattern="critical"  # Run critical tests

# 4. Notify team
# Post update: "Issue resolved at [time], all systems healthy"
```

#### **Review** (Same day, within 4 hours)
```powershell
# 1. Gather data
$incidentEnd = Get-Date
$duration = $incidentEnd - $incidentStart
$errorCount = (Select-String "ERROR" logs/error.log | Measure-Object).Count

# 2. Document incident report
$report = @"
INCIDENT REPORT
===============
Start Time: $incidentStart
End Time: $incidentEnd
Duration: $duration
Severity: P2 (High)
Root Cause: Database connection pool exhausted
Affected Users: ~500
Error Count: $errorCount

Actions Taken:
1. Increased database pool from 10 to 20 connections
2. Restarted PM2 instances
3. Verified all health checks passing

Prevention:
1. Monitor connection pool usage in real-time
2. Alert when pool reaches 80% utilization
3. Quarterly review of database limits

Owner: [Name]
Date: $(Get-Date -Format 'yyyy-MM-dd')
"@

$report | Out-File "incidents/$(Get-Date -Format 'yyyy-MM-dd-HHmm')-report.txt"

# 3. Post-mortem meeting
# Team discussion of root cause
# Action items to prevent recurrence
# Document lessons learned
```

---

## COMMON SCENARIOS & SOLUTIONS

### Scenario 1: High Response Time (P95 > 500ms)

**Quick Check:**
```powershell
# 1. CPU usage
"Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 5"

# 2. Memory usage  
"[decimal]($systemInfo.TotalVisibleMemorySize - $systemInfo.AvailablePhysicalMemory) / $systemInfo.TotalVisibleMemorySize * 100"

# 3. Database queries
"mongo --eval 'db.currentOp()'"

# 4. Active connections
"netstat -an | find 'ESTABLISHED' | wc -l"
```

**Solutions:**
1. If CPU > 80%: Scale up or optimize queries
2. If Memory > 85%: Restart instances or add more RAM
3. If slow queries: Add database indexes
4. If many connections: Increase pool size

---

### Scenario 2: Database Connection Errors

**Quick Check:**
```powershell
# Verify MongoDB is running
Get-Service MongoDB | Select-Object Status, Name

# Check listening ports
netstat -ano | find "27017"

# Test connection
mongo mongodb://localhost:27017 --eval "db.serverStatus()"
```

**Solutions:**
1. If not running: `Start-Service MongoDB`
2. If port not listening: Check firewall rules
3. If connection rejected: Check credentials in .env

---

### Scenario 3: Disk Space Warning

**Quick Check:**
```powershell
# Check disk usage
Get-Volume | Select-Object DriveLetter, Size, SizeRemaining

# Find large log files
Get-ChildItem logs -Recurse | Sort-Object Length -Descending | Select-Object -First 10 Name, Length
```

**Solutions:**
1. Delete old logs (> 30 days): `Remove-Item logs/old/*.log`
2. Compress archives: `7z a logs.7z logs/*.old`
3. Configure log rotation (see SETUP_LOG_ROTATION.sh)
4. Add more disk space if growth > 1GB/week

---

### Scenario 4: Rate Limiting Issues (429 Too Many Requests)

**Quick Check:**
```powershell
# Check current rate limit settings
Get-Content backend/.env | Select-String "RATE_LIMIT"

# Monitor real-time rate limit hits
pm2 logs | Select-String "429"
```

**Solutions:**
1. Increase rate limit if legitimate traffic growth
2. Check for bot/DDoS attacks (monitor source IPs)
3. Implement IP whitelisting if needed
4. Add Redis to handle distributed rate limiting

---

## KNOWLEDGE BASE

### Important Links
- **API Documentation:** `/docs/api`
- **Database Schema:** `backend/models/`
- **Configuration:** `backend/.env`
- **Logs:** `backend/logs/`
- **Monitoring:** `http://localhost:3000` (Grafana)

### Key Files to Know
```
backend/
├── ecosystem.config.js     # PM2 configuration
├── .env                    # Environment settings
├── package.json            # Dependencies
├── src/
│   ├── routes/            # API endpoints
│   ├── models/            # Database schemas
│   ├── middleware/        # Auth, logging, etc.
│   └── services/          # Business logic
└── logs/                  # Application logs
```

### Critical Commands Reference

```powershell
# PM2 Commands
pm2 list                      # View all instances
pm2 status                    # Alternative status view
pm2 logs                      # View logs (all)
pm2 logs --err               # View error logs only
pm2 restart ecosystem.config.js  # Restart all instances
pm2 reload ecosystem.config.js   # Graceful reload
pm2 monit                    # Monitor resources
pm2 save                     # Save startup script

# Database Commands
mongo                        # Connect to MongoDB
db.collections()            # List collections
db.stats()                  # Database statistics
db.collection('name').count()  # Count documents

# Testing Commands
npm test                     # Run all tests
npm run format              # Format code
npm run lint                # Check code quality

# Deployment Commands
git log --oneline           # View recent commits
git status                  # Check uncommitted changes
git pull                    # Get latest code
```

### Troubleshooting Decision Tree

```
Problem: Application Not Responding
├─ Check PM2 Status?
│  ├─ All instances online? YES → Continue
│  └─ Instances offline? → Restart PM2
├─ Check Database?
│  ├─ MongoDB responding? YES → Check logs
│  └─ MongoDB offline? → Start MongoDB service
├─ Check Logs?
│  ├─ Error messages? → Follow error guidance
│  └─ Clean logs? → Check external dependencies
└─ Still broken? → Escalate to senior team member
```

---

## TEAM CONTACTS & ESCALATION

### Support Hours
- **Business Hours:** Mon-Fri, 9 AM - 5 PM (Local Time)
- **On-Call Rotation:** See schedule in shared calendar
- **Emergency Contact:** See OPERATIONS_INCIDENT_PLAYBOOK.md

### Role Responsibilities

| Role | Responsibility | Escalation |
|------|---|---|
| **Operations (SRE)** | Daily monitoring, alerts, incident response | Escalate P1 to Manager |
| **Database Admin** | Schema changes, backups, optimization | Escalate to CTO |
| **Application Developer** | Code issues, deployments, features | Escalate to Tech Lead |
| **Manager** | Resource allocation, team decisions | CEO/Board |

### When to Escalate

- **To Senior Engineer:** Issue not resolved in 30 min
- **To Manager:** P1 incident ongoing > 1 hour
- **To CTO:** Data loss or security incident

---

## TRAINING CURRICULUM

### Week 1: Onboarding
- [ ] Day 1: Overview & system walkthrough (4 hours)
- [ ] Day 2: Database and data model (4 hours)
- [ ] Day 3: API endpoints and testing (4 hours)
- [ ] Day 4: Monitoring and alerting (4 hours)
- [ ] Day 5: Shadowing experienced team member (full day)

### Week 2: Hands-on
- [ ] Monitor production (no intervention)
- [ ] Respond to P4 (low) issues with senior oversight
- [ ] Practice incident response (simulated scenarios)
- [ ] Learn documentation and knowledge base

### Week 3-4: Independence
- [ ] Handle P3 (medium) issues independently
- [ ] On-call rotation begins for P1/P2
- [ ] Begin mentoring next team member
- [ ] Knowledge sharing session (teach what you learned)

---

## FEEDBACK & CONTINUOUS IMPROVEMENT

### Monthly Review
- [ ] Team discusses incidents and learnings
- [ ] Update this runbook based on gaps found
- [ ] Identify process improvements
- [ ] Share knowledge across team

### Quarterly Assessment
- [ ] Team member readiness + skills evaluation
- [ ] Process efficiency review
- [ ] Training needs identification
- [ ] Career development discussion

---

*This runbook is a living document. Update it as you learn!*
*Last Updated: February 28, 2026*
