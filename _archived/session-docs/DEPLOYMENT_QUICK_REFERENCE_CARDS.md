# DEPLOYMENT DAY QUICK REFERENCE CARDS

**Print these single-page guides for quick reference during March 5 deployment**

---

## CARD 1: DEPLOYMENT LEAD - ONE-PAGE GUIDE

```
╔════════════════════════════════════════════════════════════════════╗
║           DEPLOYMENT LEAD - QUICK REFERENCE CARD                  ║
║                  Tuesday, March 5, 2026                           ║
╚════════════════════════════════════════════════════════════════════╝

YOUR ROLE: Make decisions, execute deployment, declare success/rollback

TIMELINE:
  08:00 - Team assembly in war room
  09:00 - Go/No-Go decision ← YOU DECIDE
  09:30 - Deployment starts
  10:30 - Declare live/rollback

CHECKLIST (08:00-09:00):
  [ ] All 6 team members present
  [ ] Dashboard accessible & logged in
  [ ] Backup verified
  [ ] Communications working
  [ ] Final Git check: git status → CLEAN
  [ ] Database responding: curl /health/db → 200

GO/NO-GO DECISION (09:00):
  ✅ GO if: All above ✓, baseline 83.39%, team confident
  ❌ NO-GO if: Any blocker, unsure, infrastructure issue

IF GO → Continue deployment (09:30)
IF NO-GO → Delay & notify manager

DEPLOYMENT EXECUTION (09:30-10:30):
  09:30 → Stop app & backup code
  09:45 → Deploy new version (git pull, npm install)
  10:00 → Run 5 smoke tests (all must pass)
  10:15 → Check logs & dashboard (errors < 2%)
  10:30 → Declare result

SMOKE TESTS:
  Test 1: curl http://localhost:3000/health → 200
  Test 2: curl http://api.example.com/api/health/db → 200
  Test 3: Register + login → token issued
  Test 4: API call with token → data returned
  Test 5: Invalid request → 404 (not 500)

DECISIONS AT 10:30:
  ✅ If 5/5 tests pass + errors < 2% + logs clean
     → "SYSTEM IS LIVE" ✓
     → Begin 24-hour monitoring
  
  ⚠️  If 3-4 tests pass + errors < 5%
     → Investigate, fix issues, re-test
     → Escalate if can't fix in 5 min
  
  ❌ If < 3 tests pass OR errors > 10%
     → DECLARE ROLLBACK
     → Restore from backup (10 min)
     → Notify stakeholders

EMERGENCY CONTACTS:
  Engineering Lead: _______________
  DevOps Lead: _______________
  Manager: _______________

DOCUMENT: Execution tracking log (record all times/decisions)

KEY PHRASE: "All smoke tests pass = system is ready. Deploy with confidence."
```

---

## CARD 2: DEVOPS/INFRASTRUCTURE - ONE-PAGE GUIDE

```
╔════════════════════════════════════════════════════════════════════╗
║        DEVOPS/INFRASTRUCTURE - QUICK REFERENCE CARD               ║
║                  Tuesday, March 5, 2026                           ║
╚════════════════════════════════════════════════════════════════════╝

YOUR ROLE: Execute deployment, monitor infrastructure, handle issues

FRIDAY MARCH 1 SETUP (You complete this):
  [ ] Database created & tested
  [ ] Connection pooling configured
  [ ] Backup scheduled
  [ ] Monitoring dashboards set up
  [ ] SSH access verified
  [ ] Disk/memory adequate (>20GB, >2GB)
  [ ] .env.production configured
  [ ] All secrets in secure store (not git)

MONDAY MARCH 4 VALIDATION:
  [ ] Database responsive (latency < 500ms)
  [ ] Backup verified & restorable
  [ ] Infrastructure resources green
  [ ] Monitoring all accessible

DEPLOYMENT DAY TASKS:

At 09:30 (Stop & Backup):
  $ pm2 stop alawael-api
  $ cp -r /app/alawael-api /app/alawael-api.backup.$(date +%s)
  $ rm /var/log/alawael-api/*.log

At 09:45 (Deploy):
  $ cd /app/alawael-api
  $ git pull origin main
  $ npm install --production
  $ npm start
  
  Watch for: "Server running on port 3000"
  If error: Check logs, diagnose, report to lead

At 10:00-10:15 (Monitoring):
  $ watch 'curl -s http://localhost:3000/health | jq .'
  $ tail -20 /var/log/alawael-api/error.log
  $ top -b -n 1 | grep alawael
  $ free -h | grep Mem
  
  Report:
    - Health: 200 or error code?
    - Error log: Clean or issues?
    - Memory: < 700MB?
    - CPU: < 60%?

FIRST 24 HOURS (10:30-next day 10:30):

Hour 1: Every 5 minutes
  Health check + error count

Hours 2-4: Every 15 minutes
  Health check + error review

Hours 5-8: Every 30 minutes
  Database check, resource monitoring

Hours 9-24: Hourly
  Spot check, overnight watch

ISSUES ENCOUNTERED:

If app won't start:
  → Check logs: tail -50 error.log
  → Check env: grep MONGODB /etc/environment
  → Try restart: pm2 restart alawael-api

If database connection fails:
  → Check MongoDB: curl mongodb endpoint
  → Check firewall: telnet localhost 27017
  → Verify connection string in .env

If memory growing:
  → Stop app (pm2 stop alawael-api)
  → Check for leaks
  → Restart (pm2 start alawael-api)

If can't fix in 5 minutes:
  → Report to deployment lead
  → Prepare rollback: cp -r backup /app/alawael-api

ROLLBACK PROCEDURE (if needed):
  $ pm2 stop alawael-api
  $ cp -r /app/alawael-api.backup.* /app/alawael-api
  $ npm start
  $ curl http://localhost:3000/health
  → Verify 200 OK
  → Notify team

DOCUMENTATION: Record all activity in execution tracking log

KEY PHRASE: "Infrastructure is stable, team can deploy with confidence."
```

---

## CARD 3: ON-CALL ENGINEER - ONE-PAGE GUIDE

```
╔════════════════════════════════════════════════════════════════════╗
║          ON-CALL ENGINEER - QUICK REFERENCE CARD                  ║
║                  March 5-6, 2026 (24+ hours)                      ║
╚════════════════════════════════════════════════════════════════════╝

YOUR ROLE: Monitor system for first 24 hours, respond to alerts

DEPLOYMENT WINDOW (10:30-11:30) - CRITICAL HOUR:
  Every 5 minutes:
    □ curl http://localhost:3000/health → expect 200
    □ Check error count: grep ERROR error.log | wc -l → expect < 5
    □ Check memory: free -h | grep Mem
    □ Report to war room every 10 min: "Status: all green / issues found"

HOUR 1 DECISION (11:30):
  If all green → "System stable, proceed to normal monitoring"
  If issues → "Continue enhanced monitoring, investigate"

HOURS 2-4 (11:30-14:30) - EVERY 15 MINUTES:
  □ Health check
  □ Error log review (grep ERROR | tail -10)
  □ Dashboard glance (error rate, response time)
  □ Memory check

HOURS 5-8 (14:30-18:30) - EVERY 30 MINUTES:
  □ Health check
  □ Error log review
  □ Database latency check
  □ Resource monitoring

HOURS 9-24 (18:30-next day 10:30) - EVERY HOUR:
  □ Quick health check
  □ Sentry alerts check (auto-notify)
  □ System still up?

IF YOU FIND ERRORS:
  1. Count errors: grep ERROR error.log | wc -l
  2. Identify pattern: tail -100 error.log | grep ERROR | head -5
  3. Is it critical? (DB down, 100% failure rate)
     → YES: Call engineering lead NOW
     → NO: Document & monitor
  4. If rate > 5/min: Notify on-call manager
  5. If rate > 10/min: Prepare for escalation

CRITICAL INDICATORS (escalate immediately):
  ⚠️  Health check 500 (app down)
  ⚠️  Error rate > 10% (cascading failure)
  ⚠️  Memory > 90% (crash risk)
  ⚠️  Database connection refused
  ⚠️  Errors staying high (not decreasing)

MONITORING TOOLS:
  Dashboard: [URL logged in]
  Sentry: [URL with alerts enabled]
  Logs: SSH to prod, tail error.log
  Health: curl http://localhost:3000/health

AT 24-HOUR MARK (next day 10:30):
  □ Collect final metrics
  □ Report to deployment lead:
    - Total errors: _____
    - Error rate: ____%
    - Any critical issues: YES / NO
    - System stable: YES / NO
  □ Deployment lead declares success/continue/rollback

EMERGENCY CONTACT:
  Engineering Lead: _______________
  On-Call Manager: _______________

KEY PHRASE: "Eyes on system 24/7. Quick escalation if issues."
```

---

## CARD 4: BACKEND ENGINEER - ONE-PAGE GUIDE

```
╔════════════════════════════════════════════════════════════════════╗
║          BACKEND ENGINEER - QUICK REFERENCE CARD                  ║
║                  Tuesday, March 5, 2026                           ║
╚════════════════════════════════════════════════════════════════════╝

YOUR ROLE: Execute smoke tests, troubleshoot code issues

MONDAY MARCH 4 (Preparation):
  [ ] Review code changes since last deployment
  [ ] Run baseline test: npm test → expect 83.39%
  [ ] Check critical tests pass:
      [ ] Authentication tests
      [ ] Authorization tests
      [ ] Core API routes
      [ ] Database operations
  [ ] Know current error logs (what's normal?)

DEPLOYMENT DAY TIMELINE:

09:30 - Deployment starts (you stand by)
09:45 - Code deployed (you monitor for startup errors)
        → Watch logs for "Server running on port 3000"
        → If startup error: Report to lead immediately

10:00 - SMOKE TESTS (you execute these):

Test 1: Health Endpoint
  $ curl http://localhost:3000/health
  Expected: 200 OK
  Result: ✅ PASS / ❌ FAIL
  Record: _______________________

Test 2: Database Connection
  $ curl http://api.example.com/api/health/db
  Expected: 200 OK, latency < 500ms
  Result: ✅ PASS / ❌ FAIL
  Record: _______________________

Test 3: Authentication Flow
  Action: Register new user + login
  Expected: Get JWT token
  Result: ✅ PASS / ❌ FAIL
  Record: _______________________

Test 4: Protected API Call
  $ curl -H "Authorization: Bearer [token]" http://api.example.com/api/users
  Expected: 200 OK, user data returned
  Result: ✅ PASS / ❌ FAIL
  Record: _______________________

Test 5: Error Handling
  $ curl http://api.example.com/api/invalid
  Expected: 404 (not 500)
  Result: ✅ PASS / ❌ FAIL
  Record: _______________________

SMOKE TEST SUMMARY:
  [ ] 5/5 PASS - Proceed with confidence
  [ ] 3-4 PASS - Investigate failures, fix if quick
  [ ] <3 PASS - Escalate to deployment lead

IF SMOKE TEST FAILS:
  1. Check logs: tail -50 /var/log/alawael-api/error.log
  2. Identify error type (auth, DB, validation, etc.)
  3. Potential causes & quick fixes:
     
     Error: "Cannot find module"
       → Check node_modules: npm install
       → Restart: pm2 restart alawael-api
     
     Error: "Database connection failed"
       → Check connection string: echo $MONGODB_URL
       → Restart: pm2 restart alawael-api
     
     Error: "Port already in use"
       → Kill process: lsof -i :3000 | xargs kill -9
       → Restart: npm start
     
     Error: Auth test fails (token not issued)
       → Check JWT_SECRET: echo $JWT_SECRET
       → Check user creation: query database directly
     
     If no quick fix (>5 min): Report to lead for escalation

10:15 - Final Assessment
  Answer deployment lead:
  "All tests passed and system ready?"
  → YES: Deployment is successful
  → NO: Describe failures and recommend action

DURING FIRST HOUR (10:30-11:30):
  Monitor error logs for new error patterns
  If errors spike: Alert on-call engineer immediately

DOCUMENTATION:
  Record test results & any issues in execution tracking log

KEY PHRASE: "5/5 smoke tests = code is ready for production."
```

---

## CARD 5: MANAGER/LEADERSHIP - ONE-PAGE GUIDE

```
╔════════════════════════════════════════════════════════════════════╗
║         MANAGER/LEADERSHIP - QUICK REFERENCE CARD                 ║
║                  March 1-6, 2026                                  ║
╚════════════════════════════════════════════════════════════════════╝

YOUR ROLE: Make go/no-go approval, escalate decisions, stakeholder comms

FRIDAY MARCH 1:
  [ ] Approve infrastructure setup (call lead at 16:00)
  [ ] Confirm all prerequisites met by 17:00

MONDAY MARCH 4:
  [ ] Approve test baseline results (expect 83.39%)
  [ ] Approve staging deployment
  [ ] Final team brief at 14:00-16:00
  [ ] Confirm all systems ready by 16:00

PROCEDURE DOCUMENTS TO READ:
  □ WEEK1_DEPLOYMENT_EXECUTION_TIMELINE.md (key dates)
  □ WEEK1_DEPLOYMENT_PACKAGE_COMPLETE_MANIFEST.md (overview)

TUESDAY MARCH 5 - 09:00 GO/NO-GO DECISION:

Deployment lead asks: "Ready to deploy?"

You approve if ALL are true:
  ✅ Code baseline 83.39% verified
  ✅ All dependencies installed 
  ✅ Infrastructure ready (disk, memory, DB)
  ✅ Monitoring configured & accessible
  ✅ Team assembled & briefed
  ✅ Backup verified
  ✅ Rollback procedure tested
  ✅ No critical blockers identified

You say NO-GO if ANY are true:
  ❌ Code baseline below 83%
  ❌ Build errors
  ❌ Database issues
  ❌ Key team unavailable
  ❌ Infrastructure not ready
  ❌ Monitoring not configured
  ❌ Critical security/compliance issue

DECISION AUTHORITY: You have final say
  → "APPROVED - Proceed with deployment" ✓
  → "HOLD - Address issues first" ✗

DEPLOYMENT WINDOW (09:30-10:30):
  You → War room observer (listen, don't interrupt)
  Deployment lead → Running the show
  Your job → Be available for escalation

POTENTIAL ESCALATIONS:

If system won't start:
  Lead asks: "Rollback or keep trying?"
  You decide: Time limit is 10 minutes
  
If error rate > 10%:
  Lead asks: "Rollback or continue?"
  You decide: Based on error severity
  
If database goes down:
  Lead asks: "Rollback immediately?"
  You decide: YES (data integrity risk)

AT 10:30 DECLARATION:
  ✅ If successful → Celebrate team effort
  ⚠️  If conditional → Acknowledge learnings, plan follow-up
  ❌ If rollback → Support team, schedule post-mortem

COMMUNICATIONS:
  10:30 AM → Update stakeholders (success/status/rollback)
  4:00 PM → Brief leadership on day's results
  Next day 10:30 → Make final success decision

WEDNESDAY MARCH 6 - 10:30 FINAL DECISION:

On-call engineer provides 24-hour metrics:
  - Uptime: _____ hours
  - Error rate: _____%
  - Critical issues: NONE / YES (describe)
  - User feedback: POSITIVE / ISSUES

You declare:
  ✅ "DEPLOYMENT SUCCESSFUL" → Celebrate, reduce monitoring
  ⚠️  "SUCCESSFUL WITH MINOR ISSUES" → Fix items, continue monitoring
  🔄 "CONTINUE MONITORING 24 MORE HOURS" → Assess again
  ❌ "ROLLBACK & INVESTIGATE" → Return to previous version

PHASE 2 APPROVAL (Docker Upgrade):
  If deployment successful → Approve Phase 2
  If issues → Address first, then Phase 2

DOCUMENTATION:
  Ask lead for: Execution tracking log (completed)
  Review: Success metrics, issues, decisions

KEY PHRASE: "Make one decision at 09:00 (go/no-go). Rest follows naturally."
```

---

## CARD 6: QA/TESTING - ONE-PAGE GUIDE

```
╔════════════════════════════════════════════════════════════════════╗
║            QA/TESTING - QUICK REFERENCE CARD                      ║
║                  Tuesday, March 5, 2026                           ║
╚════════════════════════════════════════════════════════════════════╝

YOUR ROLE: Execute smoke tests, verify test pass/fail status

BEFORE TUESDAY:

Monday afternoon:
  [ ] Review 5 smoke tests (see below)
  [ ] Prepare test account credentials
  [ ] Know APIs being tested
  [ ] Have test URLs written down
  [ ] Know what "success" looks like for each test

DEPLOYMENT DAY (Tuesday 10:00-10:15):

You execute 5 smoke tests in this exact order:

SMOKE TEST #1: Health Endpoint ✓
  Command: curl -s http://localhost:3000/health | jq .
  Expected: { "status": "healthy", "uptime": "...", ...}
  Expected HTTP Code: 200
  Your Result: 
    ✅ PASS (200 OK)
    ❌ FAIL (code _____, error: ______________)
  
SMOKE TEST #2: Database Health Check ✓
  Command: curl -s http://api.example.com/api/health/db | jq .
  Expected: { "status": "connected", "latency": "...", ...}
  Expected HTTP Code: 200
  Your Result:
    ✅ PASS (200 OK, latency < 500ms)
    ❌ FAIL (code _____, error: ______________)

SMOKE TEST #3: User Registration + Login ✓
  Steps:
    1. Register new user:
       POST /api/auth/register
       { "email": "test@example.com", "password": "Test123!" }
    2. Expected: User created, account active
    3. Login with credentials:
       POST /api/auth/login
       { "email": "test@example.com", "password": "Test123!" }
    4. Expected: JWT token returned
  
  Your Result:
    ✅ PASS (Got token: ________________)
    ❌ FAIL (Error at step ___, message: ______________)

SMOKE TEST #4: Protected API with Token ✓
  Using token from Test #3:
    GET /api/users
    Headers: Authorization: Bearer [token from above]
  
  Expected HTTP Code: 200
  Expected Response: Array of users (not empty)
  
  Your Result:
    ✅ PASS (Received user data)
    ❌ FAIL (code _____, error: ______________)

SMOKE TEST #5: Error Handling ✓
  Request invalid endpoint:
    GET /api/invalid-endpoint
  
  Expected HTTP Code: 404 (NOT 500)
  Expected Response: { "error": "Not Found" }
  
  Your Result:
    ✅ PASS (404 response)
    ❌ FAIL (code _____, expected 404)

SUMMARY FOR DEPLOYMENT LEAD:
  
  "Smoke test results: ____ / 5 passed"
  
  Results:
  [ ] Test 1 (health): ✅ / ❌
  [ ] Test 2 (DB): ✅ / ❌
  [ ] Test 3 (auth): ✅ / ❌
  [ ] Test 4 (API): ✅ / ❌
  [ ] Test 5 (errors): ✅ / ❌
  
  Recommendation:
    [ ] All pass (5/5) → System ready to declare LIVE
    [ ] Mostly pass (3-4) → Investigate & fix if quick
    [ ] Not ready (< 3) → ESCALATE, consider rollback

IF A TEST FAILS:
  1. Note exact error message
  2. Check logs: tail -20 /var/log/app/error.log
  3. Report to backend engineer:
     "Test X failed: [error message]"
  4. Backend engineer investigates
  5. Re-run test to confirm fix
  6. Move to next test

DOCUMENTATION:
  Record all test results & times in execution tracking log

KEY PHRASE: "5/5 tests pass = system is production-ready."
```

---

## PRINT INSTRUCTIONS

```
HOW TO USE THESE CARDS:

1. PRINT all 6 cards
2. LAMINATE or use card sleeves (they'll get used)
3. DISTRIBUTE:
   - Deployment Lead gets Card 1
   - DevOps gets Card 2
   - On-Call Engineer gets Card 3
   - Backend Engineer gets Card 4
   - Manager gets Card 5
   - QA gets Card 6

4. KEEP IN POCKET during deployment
5. Reference during execution
6. No need to read full documents if card has what you need

BACKUP:
   - Digital copy in war room
   - Printed backup set at desk
   - PDF version in shared drive
```

---

**Status:** ✅ QUICK REFERENCE CARDS READY  
**Print these 6 single-page cards and distribute to each team member**

