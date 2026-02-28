# WEEK 1 - 24-Hour Post-Deployment RUNBOOK

**Purpose:** Minute-by-minute procedures for first 24 hours after production deployment  
**Timeline:** March 5, 2026 (10:30 AM) through March 6, 2026 (10:30 AM)  
**Audience:** On-call engineer, deployment team, support team

---

## 📊 DEPLOYMENT SUCCESS DECLARATION (10:30 AM - March 5)

**BEFORE proceeding with this runbook, confirm:**

- ✅ Smoke tests passed (5/5 tests)
- ✅ Application health check: 200 OK
- ✅ Database connection: Responding
- ✅ Error rate: < 2%
- ✅ No critical errors in logs
- ✅ Response time: < 3000ms
- ✅ Team consensus: SYSTEM IS LIVE

**If ANY above not met:** Stop here and follow INCIDENT RESPONSE PLAYBOOK

---

## ⏰ HOUR 1 MONITORING (10:30 AM - 11:30 AM)

**CRITICAL WINDOW** - Application settling in, monitor closely

### Minute-by-Minute Checklist

```
10:30 - START (Deployment complete)
  [ ] Record start time: _____________
  [ ] Note: System transitioned from DEPLOYMENT to MONITORING mode
  [ ] All teams notified system is LIVE
  [ ] On-call team assembled in war room

10:35 - First 5-minute checkpoint
  Bash commands to run:
  $ curl -s http://localhost:3000/health | jq .
  $ docker logs alawael-api | tail -20
  $ ps aux | grep node
  
  Expected:
  - Health: 200 OK, uptime ~5 minutes
  - Logs: Clean, no ERROR lines
  - Process: Running, 1 instance

10:40 - Second 5-minute checkpoint
  Bash commands:
  $ curl -s http://api.example.com/api/health/db | jq .
  $ grep "ERROR" /var/log/alawael-api/error.log | wc -l
  $ free -h | grep Mem
  
  Expected:
  - DB health: 200 OK, latency < 500ms
  - Errors: < 5 total (not per minute)
  - Memory: < 600MB used

10:45 - Third 5-minute checkpoint
  Bash commands:
  $ curl -s http://api.example.com/api/users -H "Authorization: Bearer [token]" | jq length
  $ top -b -n 1 | grep alawael
  $ df -h / | tail -1
  
  Expected:
  - Users returned: > 0
  - CPU: < 30%
  - Disk: > 90% free

10:50 - Fourth 5-minute checkpoint
  Bash commands:
  $ curl -I http://api.example.com/api/users
  $ curl -s http://api.example.com/health/metrics | jq .uptime
  $ tail -5 /var/log/alawael-api/access.log
  
  Expected:
  - HTTP status: 200
  - Uptime: ~20 minutes
  - Requests: Coming through

10:55 - Fifth 5-minute checkpoint
  Bash commands:
  $ curl -s http://api.example.com/api/health | jq .
  $ wc -l /var/log/alawael-api/error.log
  $ ps aux | grep alawael
  
  Expected:
  - Health: OK
  - Error logs: < 20 lines total
  - Process: Still running

11:00 - Sixth 5-minute checkpoint (10 minutes in)
  Dashboard Check:
  [ ] Open Sentry/Rollbar dashboard
    - Event count: < 10 events
    - Error rate: < 2%
    - No crash-type errors
  
  [ ] Open monitoring dashboard:
    - Response time P95: < 3000ms
    - Database latency: < 800ms
    - Error rate: < 2%
    - Memory: < 700MB
    - CPU: < 40%
  
  If anything red:
    [ ] Check logs: tail -50 /var/log/alawael-api/error.log
    [ ] Identify pattern
    [ ] Follow INCIDENT RESPONSE if needed

11:05 - Continue 5-minute intervals
  [ ] Repeat checkpoint (health check, logs, memory, error count)
  [ ] Quick dashboard glance
  [ ] Note time: _____________

11:10 - Checkpoint
  [ ] All systems green? YES / NO
  [ ] If NO: Describe issue: _________________
  [ ] Time: _____________

11:15 - Checkpoint
  [ ] All systems green? YES / NO
  [ ] Time: _____________

11:20 - Checkpoint
  [ ] All systems green? YES / NO
  [ ] Time: _____________

11:25 - Checkpoint
  [ ] All systems green? YES / NO
  [ ] Time: _____________

11:30 - End of HOUR 1
  [ ] Mark completion: _____________
  [ ] Summary:
    ✅ Total errors in hour 1: _____
    ✅ Max response time: _______ ms
    ✅ Peak memory: _______ MB
    ✅ Peak CPU: _______ %
  [ ] Ready to proceed to HOURS 2-4? YES / NO
  
  If NO - issues detected:
    → Follow INCIDENT RESPONSE PLAYBOOK
    → Do NOT proceed to normal monitoring
  
  If YES:
    → Proceed to HOURS 2-4 section
    → Continue monitoring
```

**Critical Decision Point:**
> If error rate > 5% or critical issues found → Reference INCIDENT RESPONSE PLAYBOOK  
> If stable < 2% error rate → Continue to next phase

---

## ⏰ HOURS 2-4 MONITORING (11:30 AM - 2:30 PM)

**STABILIZATION WINDOW** - System normalizing, less frequent checks

### Every 15 Minutes (Relaxed Schedule)

```
11:30 - Start hour 2
11:45 - Checkpoint
12:00 - Checkpoint  
12:15 - Checkpoint
12:30 - Checkpoint
12:45 - Checkpoint (Hour 3 midpoint)
13:00 - Checkpoint
13:15 - Checkpoint
13:30 - Checkpoint
13:45 - Checkpoint (Hour 4 midpoint)
14:00 - Checkpoint
14:15 - Checkpoint
14:30 - End hour 4
```

### 15-Minute Checkpoint Procedure

```bash
# Quick health check (30 seconds)
curl -s http://localhost:3000/health | jq .
curl -s http://api.example.com/api/health/db | jq .uptime

# Log review (1 minute)
grep "ERROR" /var/log/alawael-api/error.log | tail -10
# Expected: 0-5 errors in last 15 minutes, not per minute

# Resource check (1 minute)
free -h | grep Mem
top -b -n 1 | grep alawael
df -h / | tail -1

# Decision (30 seconds)
# All green? Continue
# Something orange? Add to watch list
# Something red? Escalate to INCIDENT RESPONSE
```

### Checkpoint Recording Template

```
Time: 11:45
Health: ✅ / ⚠️  / ❌
DB latency: _____ ms (target: <500)
Error count last 15 min: _____ (target: 0-2)
Memory: _____ MB (target: <700)
CPU: _____ % (target: <40%)
Notes: _________________________________
Decision: ✅ Continue / ⚠️ Watch / ❌ Escalate
```

### Dashboard Review (at 12:00, 13:00, 14:00)

Every hour, do full dashboard review:
- [ ] Sentry/Rollbar: Error trend (should be flat or declining)
- [ ] APM: Response time trend (should not be increasing)
- [ ] Logs: Any new error patterns? (should be none)
- [ ] Metrics: Memory stable? CPU stable?

### End of HOURS 2-4 (14:30)

```
Summary of hours 2-4:
✅ Total errors in hours 2-4: _____
✅ Error rate: _____ % (target: < 2%)
✅ Max response time: _____ ms
✅ Max memory: _____ MB
✅ System stability: STABLE / CONCERNING / CRITICAL

[ ] If STABLE: Proceed to HOURS 5-8
[ ] If CONCERNING: Continue enhanced monitoring
[ ] If CRITICAL: Escalate to INCIDENT RESPONSE
```

---

## ⏰ HOURS 5-8 MONITORING (2:30 PM - 6:30 PM)

**NORMALIZATION WINDOW** - System should be normal, lighter monitoring

### Every 30 Minutes

```
14:30 - Start hour 5
15:00 - Checkpoint
15:30 - Checkpoint  
16:00 - Checkpoint (Hour 6 midpoint)
16:30 - Checkpoint
17:00 - Checkpoint
17:30 - Checkpoint (Hour 8 approaching)
18:00 - Checkpoint
18:30 - End hour 8
```

### 30-Minute Checkpoint (Quick Version)

```bash
# Combined health/log/resource check (1-2 minutes total)
curl -s http://localhost:3000/health && \
  grep -c "ERROR" /var/log/alawael-api/error.log && \
  free -h | grep Mem && \
  echo "---" && \
  top -b -n 1 | grep alawael
```

### Acceptance Criteria for HOURS 5-8

- ✅ Error rate < 1% (preferably < 0.5%)
- ✅ Response time stable, P95 < 2000ms
- ✅ No memory leaks (memory not growing)
- ✅ CPU usage < 50%
- ✅ Database connected and responsive
- ✅ No cascading failures
- ✅ User activity normal

### Milestone: 8-Hour Mark (18:30)

```
MILESTONE DECISION:
If ALL above criteria met:
  ✅ DECLARE PARTIAL SUCCESS
  └─ System is operating normally
  └─ Schedule full 24-hour review
  └─ Reduce monitoring frequency to hourly
  
If ANY criteria not met:
  ⚠️ CONTINUE MONITORING
  └─ Keep 30-minute intervals
  └─ Prepare escalation if worsens
```

---

## ⏰ HOURS 9-24 MONITORING (6:30 PM - Next Day 10:30 AM)

**OVERNIGHT WINDOW** - Less critical, hourly spot checks

### Every Hour (18:30 - Next Day 10:30)

```
18:30 - End hour 8, start hour 9
19:30 - Hour 9 checkpoint
20:30 - Hour 10 checkpoint
21:30 - Hour 11 checkpoint
22:30 - Hour 12 checkpoint (Midnight)
23:30 - Hour 13 checkpoint
00:30 - Hour 14 checkpoint (Night)
01:30 - Hour 15 checkpoint
02:30 - Hour 16 checkpoint
03:30 - Hour 17 checkpoint
04:30 - Hour 18 checkpoint  
05:30 - Hour 19 checkpoint
06:30 - Hour 20 checkpoint
07:30 - Hour 21 checkpoint  
08:30 - Hour 22 checkpoint
09:30 - Hour 23 checkpoint
10:30 - FINAL DECISION POINT
```

### Hourly Checkpoint (Very Quick - 1 minute)

```bash
# Single command: Health + Error count
curl -s http://localhost:3000/health | jq .uptime && \
  (grep "ERROR" /var/log/alawael-api/error.log | wc -l)

# Expected output:
# [hours deployed since 10:30 AM on March 5]
# [<50 errors in past 24 hours is EXCELLENT]
```

### Overnight Procedure (While On-Call)

- [ ] Set up hourly reminder/alarm
- [ ] Quick check at each hour mark (1 minute)
- [ ] If all OK: Acknowledge and go back to sleep
- [ ] If issue: Follow INCIDENT RESPONSE
- [ ] Keep phone nearby
- [ ] Monitor Sentry alerts (set to notify)

---

## 🎯 FINAL DECISION: 24-HOUR MARK (10:30 AM - March 6)

**This is the critical decision point**

### Check Final Metrics

```bash
# Comprehensive final review
echo "=== DEPLOYMENT SUCCESS METRICS (24-Hour Review) ==="
echo ""
echo "1. Uptime:"
curl -s http://localhost:3000/health | jq '.uptime'
# Expected: ~86400 seconds (24 hours) or close

echo ""
echo "2. Total errors in 24 hours:"
grep "ERROR" /var/log/alawael-api/error.log | wc -l
# Expected: < 50 errors (acceptable error rate)

echo ""
echo "3. Error rate:"
echo "If 50 errors / 86400 seconds = 0.057% per second ✅ EXCELLENT"

echo ""
echo "4. Current system health:"
curl -s http://localhost:3000/health | jq .

echo ""
echo "5. Database latency:"
curl -s http://api.example.com/api/health/db | jq .latency_ms
# Expected: < 500ms

echo ""
echo "6. Memory stability check:"
tail -24 /var/log/deployment_memory_trend.log | \
  cut -d' ' -f1 | \
  (first=$(head -1); last=$(tail -1); echo "Start: $first MB, End: $last MB")
  
echo ""
echo "7. No critical errors:"
grep "CRITICAL\|FATAL" /var/log/alawael-api/error.log | wc -l
# Expected: 0
```

### SUCCESS DECLARATION CRITERIA

**All items must be TRUE:**

- [ ] Application uptime: 24 hours (or near 24)
- [ ] Error rate: < 1% (less than 0.01 errors per second)
- [ ] No CRITICAL/FATAL errors
- [ ] Database connection: Stable and responsive
- [ ] Response time: P95 < 2000ms consistently
- [ ] Memory: Stable (not growing)
- [ ] CPU: Stable (< 60%)
- [ ] No user complaints in support channel
- [ ] All features tested still working
- [ ] Security: No suspicious activity

### Declaration Options

#### ✅ OPTION A: FULL SUCCESS

**Declare if:** All 10 criteria met

```
📢 DEPLOYMENT SUCCESSFUL
├─ Uptime: 24 hours ✅
├─ Error rate: < 1% ✅
├─ System stable ✅
├─ Database healthy ✅
├─ Performance normal ✅
├─ No critical issues ✅
└─ Ready for normal operations ✅

Actions:
1. Post success announcement to all stakeholders
2. Return monitoring to standard procedures
3. Schedule post-deployment retrospective
4. Resolve any open incidents
5. Update status page: "FULLY OPERATIONAL"
6. Note: Phase 2 (Docker upgrade) ready for March 5-6
```

#### ⚠️ OPTION B: CONDITIONAL SUCCESS

**Declare if:** 8-9 criteria met, 1 minor issue

```
⚠️ DEPLOYMENT SUCCESSFUL WITH MINOR ISSUES
├─ Minor issue: [describe]
├─ Impact: Low (not affecting core functionality)
├─ Plan to fix: [by when]
└─ Monitoring: Continue normal procedures

Actions:
1. Create ticket for minor issue
2. Schedule fix for next cycle
3. Continue normal operations
4. Document issue for post-mortem
5. Update status page: "OPERATIONAL - KNOWN ISSUE"
```

#### ❌ OPTION C: CONDITIONAL - CONTINUE MONITORING

**Declare if:** 7 or fewer criteria met, multiple minor issues

```
⏳ DEPLOYMENT STABLE - CONTINUED MONITORING
├─ System operational but needs attention
├─ Issues: [list]
├─ Monitoring: Will continue enhanced (every 4 hours)
├─ Review again: [in 24 hours]
└─ Escalation: If any issue worsens

Actions:
1. Keep on-call team alert
2. Continue 4-hour monitoring intervals
3. Assign engineers to issues
4. Schedule 24-hour re-review
5. Update status page: "OPERATIONAL - MONITORING"
6. Brief stakeholders on issues & timeline
```

#### 🔴 OPTION D: ROLLBACK + INVESTIGATION

**Declare if:** System has degraded OR critical issue found

```
❌ DEPLOYMENT ROLLBACK IN PROGRESS
├─ Reason: [describe issue]
├─ Action: Reverting to previous version
├─ Timeline: Within 30 minutes
├─ Impact: Service unavailable temporarily
└─ Investigation: Post-mortem scheduled

Actions:
1. Execute ROLLBACK PROCEDURE immediately
2. Notify all stakeholders
3. Investigate root cause
4. Create plan to fix before next attempt
5. Update status page: "INCIDENT - INVESTIGATING"
6. Schedule post-mortem within 24 hours
```

---

## 📋 SIGN-OFF & DOCUMENTATION

### 24-Hour Sign-Off (10:30 AM - March 6)

```
Deployment Successful Sign-Off
═════════════════════════════════════════════════════════════

Deployment Date: March 5, 2026
Sign-Off Date: March 6, 2026, 10:30 AM
Duration: 24 hours ([___] actual deployment to [___] decision)

System Status: [SELECT]
  [ ] FULL SUCCESS - Ready for normal operations
  [ ] CONDITIONAL SUCCESS - With minor issues (see below)
  [ ] CONTINUE MONITORING - Multiple issues, re-review in 24 hours
  [ ] ROLLED BACK - See incident report

Metrics Summary:
  Uptime: _____ hours
  Error rate: _____ % (target: < 1%)
  Errors total: _____ (target: < 50)
  Peak response time: _____ ms (target: < 3000)
  Peak memory: _____ MB (target: < 800)
  Peak CPU: _____ % (target: < 80%)

Issues Encountered:
  1. [if any]
  2. [if any]
  3. [if any]

Issues Resolved:
  1. [if any]
  2. [if any]
  3. [if any]

Approvals:
  Deployment Lead: _________________ Date: _______
  Engineering Lead: ________________ Date: _______
  Operations Lead: _________________ Date: _______
  Product/Manager: _________________ Date: _______

Next Actions:
  [ ] Return to standard monitoring
  [ ] Schedule post-deployment retrospective
  [ ] Proceed with Phase 2 (Docker upgrade)
  [ ] Other: _______________________________________

Notes:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 📞 ESCALATION DURING 24-HOUR MONITORING

### Who To Call (By Time of Day)

```
During Business Hours (08:00 - 18:00):
- Issue detected → Call Engineering Lead immediately
- Decision needed → Escalate to Manager
- User impact → Notify Product team

After Hours (18:00 - 08:00):
- Critical issue → Call on-call engineer NOW
- Warning-level issue → Document and follow up morning
- Information-level → Log and review in morning
```

### Call Escalation Tree

```
On-Call Engineer (tries to fix issue)
    ├─ If resolvable → Fix & document
    ├─ If unclear → Call Engineering Lead
    └─ If critical → Call Manager + DevOps Lead
        ├─ If system degrading → Prepare rollback
        └─ If unknown cause → Declare incident
```

---

## ✅ RUNBOOK COMPLETION CHECKLIST

After 24-hour monitoring complete:

- [ ] All 24 hours monitored (hourly checkpoints recorded)
- [ ] Final metrics documented
- [ ] Success decision made (A/B/C/D)
- [ ] Sign-offs obtained (4 signatures)
- [ ] Post-mortem scheduled (if needed)
- [ ] Issues documented and assigned
- [ ] Next phase confirmed (Phase 2 Docker upgrade readiness)
- [ ] Team debriefed
- [ ] Stakeholders notified

---

**Status:** ✅ 24-HOUR RUNBOOK COMPLETE  
**Activation:** March 5, 2026 at 10:30 AM  
**Completion:** March 6, 2026 at 10:30 AM  
**Contact:** [On-call engineer phone number]  
**Escalation:** [Manager phone number]

