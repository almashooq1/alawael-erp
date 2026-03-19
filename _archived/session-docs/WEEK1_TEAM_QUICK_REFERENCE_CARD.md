# WEEK 1 DEPLOYMENT - TEAM QUICK REFERENCE CARD

**Print & Keep On Desk During March 1-5, 2026**

---

## ⏰ CRITICAL TIMELINE

```
FRIDAY, MARCH 1 ..................... Infrastructure Setup
MONDAY, MARCH 4 ..................... Final Validation
TUESDAY, MARCH 5
  08:00-09:30 ....................... Team Assembly & Final Checks
  09:30-10:30 ....................... DEPLOYMENT WINDOW (1 hour critical)
  10:30-14:30 ....................... Intensive Monitoring (every 5-15 min)
  14:30-18:30 ....................... Extended Monitoring (every 30 min)
  18:30-next day 10:30 .............. Overnight Monitoring (hourly)
```

---

## 👥 YOUR ROLE & RESPONSIBILITIES

### DEPLOYMENT LEAD
```
PRIMARY OWNER: Entire deployment
DESK LOCATION: War room, center (all can see you)
KEY TIMES: 08:00 assembly, 09:30 deployment GO, 10:30 success decision, 24-h review

CRITICAL ACTIONS:
✓ Run WEEK1_FINAL_48HOUR_PRE_DEPLOYMENT_CHECKLIST.md Monday 17:00
✓ Call 09:30 GO/NO-GO meeting - get 4 sign-offs
✓ Coordinate all teams during deployment
✓ Make 10:30 success declaration decision
✓ Review 24-hour metrics at 10:30 AM Wednesday

ESCALATION: Contact manager immediately if uncertain
SUCCESS CRITERIA: All 4 sign-offs obtained before 09:30
```

### DEVOPS / INFRASTRUCTURE ENGINEER
```
PRIMARY OWNER: Deployment execution & infrastructure
DESK LOCATION: War room, next to Deployment Lead
KEY TIMES: Entire deployment window + 24-hour monitoring

CRITICAL ACTIONS:
✓ Execute WEEK1_DEPLOYMENT_DAY_CHECKLIST.md steps 1-4 (09:30-10:30)
✓ Run: git pull, npm install, npm start
✓ Bash commands: docker logs, ps aux, curl /health
✓ Monitor server resources: memory, CPU, disk
✓ Every 5-min Hour 1: Check logs & health

ESCALATION: Inform Deployment Lead immediately if:
  - App won't start
  - Health check fails
  - Error rate >5%
  - Memory/CPU spiking
SUCCESS CRITERIA: Steps 1-4 complete by 10:30, app running
```

### BACKEND ENGINEER
```
PRIMARY OWNER: Code validation & smoke tests
DESK LOCATION: War room, with QA engineer
KEY TIMES: 10:00-10:15 (smoke tests), then hourly checks

CRITICAL ACTIONS:
✓ Step 3 (10:00-10:15): Run all 5 smoke tests
  1. curl -i http://localhost/health → 200 OK
  2. curl -i http://localhost/api/health/db → 200 OK
  3. /auth/register → Create & verify token
  4. /api/protected with token → Data returned
  5. /invalid-route → 404 not 500 error
✓ Document test results in WEEK1_DEPLOYMENT_EXECUTION_TRACKING_LOG.md
✓ Identify patterns if errors occur

ESCALATION: Inform Deployment Lead if:
  - Any smoke test fails
  - Pattern shows in error logs
  - New errors not in baseline
SUCCESS CRITERIA: All 5 smoke tests pass, sign-off sheet completed
```

### DATABASE ADMIN
```
PRIMARY OWNER: Database stability & performance
DESK LOCATION: War room, with monitoring dashboard
KEY TIMES: Verify startup (Step 2), then hourly

CRITICAL ACTIONS:
✓ Monitor database connection pool
✓ Watch query performance (check slow logs)
✓ Monitor replication lag (if applicable)
✓ Every check: Verify DB responding to /health/db
✓ Bash commands:
  - Check: mongo --eval "db.adminCommand('ping')"
  - Query performance: db.system.profile.find().sort({ ts: -1 }).limit(5)

ESCALATION: Inform Deployment Lead if:
  - Connection pool exhausted
  - Slow queries detected
  - Replication lag >5 sec
  - Database connection fails
SUCCESS CRITERIA: Database stable, no slow queries, zero connection failures
```

### QA / TESTING ENGINEER
```
PRIMARY OWNER: Smoke test execution & validation
DESK LOCATION: War room, next to Backend Engineer
KEY TIMES: 10:00-10:15 (smoke tests execution)

CRITICAL ACTIONS:
✓ Execute 5 smoke tests with Backend Engineer (10:00-10:15)
✓ Document EXACT results (success/fail with timestamps)
✓ Verify expected behavior vs actual output
✓ Note any warnings/errors even if test "passes"
✓ Sign test result sheet at 10:15

SMOKE TEST CHECKLIST:
[ ] Health endpoint responds (200)
[ ] Database accessible (200 /health/db)
[ ] Authentication working (token created)
[ ] Protected endpoint accessible (data returned)
[ ] Error handling works (404 not 500)

ESCALATION: Inform Deployment Lead if any test fails
SUCCESS CRITERIA: All 5 tests pass, signed off by 10:15
```

### MANAGER / OVERSIGHT
```
PRIMARY OWNER: Decisions & escalation authority
DESK LOCATION: War room, can see Deployment Lead clearly
KEY TIMES: 09:30 sign-off, 10:30 success decision, hourly reviews

CRITICAL ACTIONS:
✓ 09:30: Review pre-flight with Deployment Lead → Sign GO/NO-GO
✓ 10:30: Make final success declaration (Yes/Conditional/Continue/Rollback)
✓ Hourly: Check with Deployment Lead on status
✓ If Issue Detected: Escalate immediately
✓ 24-hour mark (10:30 Wed): Final sign-off on success

AUTHORITY LEVELS:
✓ Approve continuation if issue < 15 minutes to fix
✓ Call rollback if issue > 15 minutes unfixable
✓ Contact executive sponsor for major decisions

ESCALATION: Have phone number ready for exec sponsor
SUCCESS CRITERIA: Confidence in GO decision, successful 24-hour stability
```

### SUPPORT / OPERATIONS
```
PRIMARY OWNER: User communication & incident handling
DESK LOCATION: War room, near communication hub
KEY TIMES: 10:30-14:30 (monitor user reports), 24-hour checklist

CRITICAL ACTIONS:
✓ Monitor support channels (Slack, email, chat)
✓ Collect user feedback (all positive/negative/neutral)
✓ Flag any user-facing issues immediately
✓ Document issues in WEEK1_DEPLOYMENT_EXECUTION_TRACKING_LOG.md
✓ Respond to users: "New system live, we're monitoring - thank you for patience"

ESCALATION PATH:
User reports issue → You → Deployment Lead → Backend Engineer
(Do not try to fix; just report)

SUCCESS CRITERIA: Zero critical user issues, positive feedback, quick response
```

---

## 🔧 CRITICAL BASH COMMANDS (Copy-Paste Ready)

```bash
# Health Check (every 5 minutes, Hour 1)
curl -i http://localhost:3000/health

# Database Check
curl -i http://localhost:3000/api/health/db

# View Recent Logs
docker logs alawael-api | tail -50

# Check Process Running
ps aux | grep "node\|npm"

# Memory / CPU Usage
free -h && df -h

# Count Error Lines (Last Hour)
docker logs alawael-api --since 1h | grep -i "error" | wc -l

# Database Connection Test
mongo --eval "db.adminCommand('ping')"

# Kill Process & Restart (Emergency)
killall node npm
npm start

# Rollback to Previous
cd /app
rm -rf alawael-api
cp -r alawael-api.backup.* alawael-api
cd alawael-api
npm start
```

---

## 📋 FORMS YOU NEED

### Pre-Deployment Sign-Off (Tuesday 09:30)

```
DEPLOYMENT GO/NO-GO DECISION

Infrastructure Ready? ........................ YES / NO
Code Baseline (83.39%)? ..................... YES / NO
Database Responsive? ........................ YES / NO
Monitoring Active? .......................... YES / NO

Sign-offs Required:
  Deployment Lead: __________________ Time: ______
  Infrastructure: __________________ Time: ______
  Database Admin: __________________ Time: ______
  QA: __________________ Time: ______

Decision: ⭐ GO / NO-GO / CONDITIONAL ⭐

If NO-GO: Reason: ___________________________________
If CONDITIONAL: Conditions: ___________________________________
```

### Smoke Test Results (Tuesday 10:00-10:15)

```
SMOKE TEST EXECUTION LOG

Test 1 - Health Endpoint
  Command: curl http://localhost:3000/health
  Expected: 200 OK
  Actual: _____ Result: PASS / FAIL
  Timestamp: _________ Tester: _________

Test 2 - Database Health
  Command: curl http://localhost:3000/api/health/db
  Expected: 200 OK
  Actual: _____ Result: PASS / FAIL
  Timestamp: _________ Tester: _________

Test 3 - Authentication
  Step: Register user, get token
  Expected: Token created successfully
  Actual: _____ Result: PASS / FAIL
  Timestamp: _________ Tester: _________

Test 4 - Protected Endpoint
  Command: curl /api/protected -H "Authorization: Bearer TOKEN"
  Expected: Data returned
  Actual: _____ Result: PASS / FAIL
  Timestamp: _________ Tester: _________

Test 5 - Error Handling
  Command: curl http://localhost:3000/invalid-path
  Expected: 404 error
  Actual Response Code: _____ Result: PASS / FAIL
  Timestamp: _________ Tester: _________

Overall Result: ALL PASS / SOME FAIL / ALL FAIL

QA Sign-off: __________________ Time: ________
Backend Sign-off: __________________ Time: ________
```

### Hourly Status Report

```
HOUR _____ STATUS CHECK (Time: ________)

Health Status: GREEN / YELLOW / RED
Error Count (last 60 min): _____
Error Rate: ____% (Target: <1%)
Memory Usage: ____MB (Target: <2GB)
CPU Usage: ___% (Target: <80%)
Database Responsive: YES / NO
All Features Working: YES / NO / PARTIAL
User Feedback: POSITIVE / NEUTRAL / NEGATIVE

Issues Detected: _______________
Status: STABLE / MONITORING / INVESTIGATE / CRITICAL

Checked by: __________________ Time: ______
Next check: ________ (in 5 / 15 / 30 / 60 minutes)
```

---

## ☎️ ESCALATION CONTACTS

```
IMMEDIATE EMERGENCY (System Down):
  Deployment Lead: [PHONE]
  Manager: [PHONE]
  Executive Sponsor: [PHONE]

CRITICAL ISSUE (Error rate >10%):
  Deployment Lead: [PHONE]
  Backend Engineer: [PHONE]

DATABASE ISSUE:
  Database Admin: [PHONE]
  Infrastructure Engineer: [PHONE]

USER COMPLAINTS:
  Support Lead: [PHONE]
  Operations Manager: [PHONE]

ESCALATION SEQUENCE:
  1. Report to Deployment Lead immediately
  2. If unresolved in 5 min → Contact Manager
  3. If unresolved in 10 min → Contact Executive Sponsor
  4. If unresolved in 15 min → Initiate rollback procedure
```

---

## 📊 SUCCESS INDICATORS AT KEY TIMES

```
10:15 AM (Test Completion):
✅ All 5 smoke tests pass
✅ No errors during testing
✅ Team ready to declare system LIVE

10:30 AM (1-Hour Mark):
✅ Error rate < 2%
✅ Zero critical errors
✅ Database responsive
✅ Memory/CPU normal
✅ Dashboard shows green

14:30 PM (5-Hour Mark):
✅ Error rate < 1%
✅ System stable for 4+ hours
✅ No new issues emerged
✅ User feedback positive

10:30 AM Next Day (24-Hour Mark):
✅ Uptime 24+ hours
✅ Error rate < 0.5%
✅ All features working
✅ User satisfaction positive
✅ System declared SUCCESS
```

---

## 🚨 IF SOMETHING GOES WRONG

### Issue: App Won't Start (09:45-10:00)
```
1. Check logs: docker logs alawael-api
2. Verify config: cat .env.production (check all vars)
3. Try restart: npm start
4. Check Node version: node -v (should be 16+)
5. Still failing? → Inform Deployment Lead
   Time allowed: 10 minutes
```

### Issue: Health Check Fails (10:00+)
```
1. Verify process is running: ps aux | grep node
2. Check if listening on port: netstat -tlnp | grep 3000
3. Try curl again: curl -v http://localhost:3000/health
4. Check logs for errors: docker logs | grep -i error
5. Still failing? → Inform Deployment Lead
   Time allowed: 10 minutes
```

### Issue: Database Offline (Any Time)
```
1. Verify MongoDB running: systemctl status mongod
2. Test connection: mongo --eval "db.adminCommand('ping')"
3. Check connection string in .env.production
4. Verify network connectivity: ping db-server
5. Still offline? → Inform Database Admin
   Time allowed: 10 minutes
```

### Issue: Error Rate Spiking (Hour 1)
```
1. Check what errors: docker logs | grep -A5 -B5 ERROR
2. Identify pattern: Are all errors same type?
3. Document errors: Screenshot errors in log
4. If fixable: Apply quick fix, re-test
5. If pattern unclear: Inform Backend Engineer
   Time allowed: 10 minutes
   Decision: Fix it or escalate to rollback
```

---

## 🎯 YOUR MISSION

> "Ensure ALAWAEL ERP transitions smoothly from development to production on March 5, 2026, with zero critical incidents and all systems stable by March 6, 10:30 AM."

**Your role is critical. Execute your checklist. Stay calm. Follow procedures. Ask for help early.**

**We've plan for every scenario. Trust the plan. Support each other. We've got this! 🚀**

---

**Print this card. Keep it on your desk Tuesday morning. Use it as your reference guide.**

**Questions before Tuesday? Ask Deployment Lead NOW, not during execution.**

**Success is teamwork. Communication is key. Let's ship this! ⭐**

