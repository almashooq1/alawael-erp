# WEEK 1 DEPLOYMENT DAY OPERATIONS CHECKLIST

**Date Range:** March 5, 2026 (Deployment Day)  
**Status:** Ready for Execution  
**Purpose:** Hour-by-hour operations checklist for deployment day

---

## 🎯 PRE-DEPLOYMENT WINDOW (8:00 AM - 9:30 AM)

### 08:00 - 08:30: Team Assembly & Final Brief

- [ ] Team assembled in war room / video conference
- [ ] All roles present:
  - [ ] Deployment Engineer (lead)
  - [ ] DevOps Engineer
  - [ ] Database Administrator
  - [ ] Backend Engineer
  - [ ] On-call Manager
  - [ ] Support Team Lead
  
- [ ] Equipment ready:
  - [ ] SSH/RDP access verified to production server
  - [ ] Monitoring dashboards open and visible
  - [ ] Chat/communication channel active
  - [ ] Phone line open for escalations
  
- [ ] Documentation available:
  - [ ] DEPLOYMENT_GUIDE_v1.0.md (printed or on screen)
  - [ ] DEPLOYMENT_HANDOFF_FOR_OPERATIONS_TEAM.md open
  - [ ] Runbook for rollback procedure ready
  - [ ] Database backup procedures available

### 08:30 - 09:00: Final System Checks

**Code & Repository:**
- [ ] Latest code deployed from main branch
- [ ] `git log --oneline -5` shows expected commits
- [ ] No uncommitted changes: `git status` is clean
- [ ] All required environment files present:
  - [ ] .env.production exists with all values
  - [ ] Database connection string valid
  - [ ] JWT secret configured
  - [ ] All monitoring credentials set

**Infrastructure:**
- [ ] Production server accessible via SSH/RDP
- [ ] Disk space available (>10GB free)
- [ ] Memory available (monitoring shows >500MB free)
- [ ] Network connectivity verified
- [ ] HTTPS certificate valid and current

**Database:**
- [ ] MongoDB connection test successful
- [ ] Database user authenticated
- [ ] Backup of production data completed
- [ ] Backup location recorded: ________________

**Monitoring:**
- [ ] Error tracking dashboard logged in (Sentry/Rollbar)
- [ ] Performance monitoring accessible (NewRelic/DataDog)
- [ ] Log aggregation accessible (CloudWatch/Splunk)
- [ ] Alert thresholds visible and verified
- [ ] All alert notification channels configured

### 09:00 - 09:30: Final Approval & Go/No-Go Decision

**Engineering Sign-Off:**
- [ ] Code quality verified by engineer
- [ ] No new issues introduced
- [ ] Dependencies current
- [ ] Security validated

**Operations Sign-Off:**
- [ ] Infrastructure ready
- [ ] Backup completed and verified
- [ ] Monitoring fully operational
- [ ] Rollback procedure rehearsed

**Leadership Decision:**
- [ ] Risk assessment: _____ (LOW / MEDIUM / ABORT)
- [ ] Go/No-Go Decision: **GO ✅** / **NO-GO ❌**

**If NO-GO:**
- [ ] Document reason: ___________________________________
- [ ] Reschedule deployment: ________________
- [ ] Notify all stakeholders

**If GO:**
- [ ] Proceed to DEPLOYMENT WINDOW at 09:30

---

## 🚀 DEPLOYMENT WINDOW (09:30 AM - 10:30 AM)

### 09:30 - 09:45: Stop & Prepare Current System

```bash
# Step 1: Log in to production server
ssh prod-server

# Step 2: Stop current application (if running)
pm2 stop alawael-api  # or appropriate process manager
# or
systemctl stop alawael-api
# or
docker stop alawael-api

# Step 3: Verify stopped
ps aux | grep node  # should show no processes
# or
docker ps  # should not show alawael container

# Step 4: Backup current application code (just in case)
cp -r /app/alawael-api /app/alawael-api.backup.$(date +%Y%m%d_%H%M%S)

# Step 5: Remove old logs to avoid confusion
# (optional, but helpful)
rm /var/log/alawael-api/error.log
rm /var/log/alawael-api/access.log
```

**Checklist:**
- [ ] Current application stopped
- [ ] Process verified stopped
- [ ] Backup created (timestamp: ____________)
- [ ] Old logs cleared (if applicable)
- [ ] Ready to deploy new code

### 09:45 - 10:00: Deploy New Code

```bash
# Step 1: Navigate to deployment directory
cd /app/alawael-api

# Step 2: Pull latest code from git
git pull origin main

# Step 3: Install/update dependencies
npm install --production

# Step 4: Verify build (if applicable)
npm run build  # (if build process exists)

# Step 5: Start application
npm start
# or
pm2 start npm --name "alawael-api" -- start
# or
docker pull alawael:latest && docker run -d --name alawael-api alawael:latest

# Step 6: Verify application started
sleep 5
ps aux | grep node  # should show running process
# or
docker ps  # should show alawael container running
```

**Checklist:**
- [ ] Code pulled from git
- [ ] Dependencies installed
- [ ] Build completed (if applicable)
- [ ] Application started
- [ ] Process verified running

### 10:00 - 10:15: Smoke Tests & Verification

**Test 1: Health Check**
```bash
curl http://localhost:3000/health
# Expected response:
# {"status":"ok","timestamp":"2026-03-05T10:00:00Z"}
```
- [ ] Health endpoint responds with 200
- [ ] Response includes status: "ok"
- [ ] Timestamp valid (within 1 minute of current time)

**Test 2: Database Connection**
```bash
curl -X GET http://localhost:3000/api/health/db
# Expected: 200 and database connection active message
```
- [ ] Database connection endpoint responds
- [ ] Status shows "connected" or similar
- [ ] No error messages in logs

**Test 3: Authentication Flow**
```bash
# Create test user (if needed)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Attempt login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
  
# Expected: 200 and JWT token returned
```
- [ ] Registration endpoint works
- [ ] Login endpoint works
- [ ] Token returned successfully

**Test 4: API Endpoint Verification**
```bash
# Test a core endpoint (using token from login)
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>"
  
# Expected: 200 and user data
```
- [ ] API endpoint responds
- [ ] Authentication header accepted
- [ ] Data returned successfully

**Test 5: Error Handling**
```bash
curl -X GET http://localhost:3000/api/invalid-endpoint
# Expected: 404 (not 500)
```
- [ ] Invalid endpoints return 404 (not 500)
- [ ] Error response is graceful
- [ ] No stack traces exposed

**Verification Checklist:**
- [ ] Health check: PASS
- [ ] Database connection: PASS
- [ ] Authentication: PASS
- [ ] API endpoints: PASS
- [ ] Error handling: PASS

### 10:15 - 10:30: Monitor & Review

**Log Review:**
```bash
# Check application logs for errors
tail -50 /var/log/alawael-api/error.log
# or
docker logs alawael-api | tail -50
# or
pm2 logs alawael-api | tail -50

# Expected: No errors, or only expected info messages
```

**Monitoring Dashboard Check:**
- [ ] Open monitoring dashboard
- [ ] Error rate: ______ (target: < 2%)
- [ ] Response time: ______ ms (target: < 3000ms)
- [ ] CPU usage: ______ % (target: < 70%)
- [ ] Memory usage: ______ % (target: < 80%)
- [ ] Database connections: ______ (target: healthy)

**Status Review:**
- [ ] Application running stably
- [ ] No error spikes
- [ ] Performance acceptable
- [ ] Database responsive

**Decision Point:**
- [ ] **SYSTEM STABLE:** Declare deployment SUCCESSFUL
- [ ] **ISSUES FOUND:** See "Troubleshooting" section below

---

## ✅ DEPLOYMENT SUCCESS (10:30 AM)

### Immediate Actions (Post-Deployment)

**Communications:**
- [ ] Notify stakeholders: "System deployed successfully"
- [ ] Update status page: "System Online"
- [ ] Alert team: "Monitoring activated, 24-hour watch begins"

**Documentation:**
- [ ] Record deployment timestamps:
  - Start: 09:30
  - Code deployed: 09:45 - 10:00
  - Tests passed: 10:00 - 10:15
  - Declared stable: 10:30
  
- [ ] Record actual metrics:
  - Error rate: _______
  - Response time: _______
  - Database latency: _______
  - Active users: _______

**First Hour Monitoring (10:30 - 11:30):**
- [ ] Check every 5 minutes: Health endpoint
- [ ] Check every 10 minutes: Error logs
- [ ] Check every 15 minutes: Performance metrics
- [ ] Specific checks:
  - [ ] Error rate remains < 1%
  - [ ] Response times stable
  - [ ] No database connection issues
  - [ ] No memory leaks detected
  - [ ] CPU usage normal

---

## 🚨 TROUBLESHOOTING (If Issues Occur)

### Issue 1: Application Won't Start

**Symptom:** Port 3000 shows connection refused

**Steps:**
1. Check logs for startup errors:
   ```bash
   docker logs alawael-api  # or pm2 logs
   ```
2. Verify environment variables:
   ```bash
   env | grep NODE_ENV
   env | grep MONGODB_URL
   ```
3. Restart application:
   ```bash
   npm start
   ```
4. If still failing → **ESCALATE TO ENGINEERING**

**Decision:** 
- [ ] Fixed by engineer? → Continue deployment
- [ ] Can't fix? → **EXECUTE ROLLBACK** (see below)

### Issue 2: Health Check Fails

**Symptom:** curl http://localhost:3000/health returns 500 or timeout

**Steps:**
1. Verify application running:
   ```bash
   ps aux | grep node
   ```
2. Check logs for errors:
   ```bash
   tail -20 /var/log/alawael-api/error.log
   ```
3. Restart application:
   ```bash
   pm2 restart alawael-api
   ```
4. Wait 5 seconds and retry test

**Decision:**
- [ ] Health check passes now? → Continue
- [ ] Still failing? → **EXECUTE ROLLBACK**

### Issue 3: Database Connection Fails

**Symptom:** Database connectivity errors in logs

**Steps:**
1. Verify MongoDB is running:
   ```bash
   mongo --eval "db.adminCommand('ping')"
   ```
2. Check connection string:
   ```bash
   echo $MONGODB_URL
   ```
3. Verify network connectivity:
   ```bash
   curl -I <mongodb-host>:27017
   ```
4. Restart application after verifying

**Decision:**
- [ ] Connection restored? → Monitor closely
- [ ] Can't restore? → **EXECUTE ROLLBACK**

### Issue 4: High Error Rate (>5%)

**Symptom:** Monitoring dashboard shows error rate > 5%

**Steps:**
1. Review last 100 errors:
   ```bash
   tail -100 /var/log/alawael-api/error.log
   ```
2. Identify error pattern:
   - Authentication errors? → Check JWT secret
   - Database errors? → Check MongoDB connectivity
   - 500 errors? → Check logs for stack traces
3. If quick fix available → Apply and restart
4. Otherwise → **ESCALATE OR ROLLBACK**

**Decision:**
- [ ] Error rate dropped below 2%? → Continue monitoring
- [ ] Still high after 10 minutes? → **EXECUTE ROLLBACK**

---

## 🔄 EMERGENCY ROLLBACK PROCEDURE

### When To Rollback

**Automatic Rollback Triggers:**
- [ ] Application won't start
- [ ] Health check fails for > 5 minutes
- [ ] Error rate > 10%
- [ ] Database completely unavailable
- [ ] Critical security issue detected

### Rollback Steps (5-10 minutes)

**Step 1: Stop Current Version**
```bash
pm2 stop alawael-api
# or
docker stop alawael-api
# or
systemctl stop alawael-api
```
- [ ] Current version stopped

**Step 2: Restore Previous Version**
```bash
# Restore from backup created at start of deployment
cp -r /app/alawael-api.backup.20260305_093000 /app/alawael-api

# Or restore from git
git checkout HEAD~1  # revert to previous commit
npm install
npm start
```
- [ ] Previous version restored

**Step 3: Verify Restoration**
```bash
curl http://localhost:3000/health
# Expected: 200 OK
```
- [ ] Health check passing
- [ ] Application responding
- [ ] Database connected

**Step 4: Confirm Stability**
```bash
# Wait 5 minutes and verify no new errors
sleep 300
tail -20 /var/log/alawael-api/error.log
```
- [ ] Error logs clean
- [ ] No error spikes
- [ ] System stable

**Step 5: Notifications**
- [ ] Notify team: "Rollback completed, system restored"
- [ ] Update status page: "Incident - Rolled back to previous version"
- [ ] Contact engineering team for post-mortem

**Timeline:** Rollback complete by ~10:40 AM

---

## ✨ FIRST 24 HOURS MONITORING PLAN

### Hour 1 (10:30 - 11:30)
- [ ] Check every 5 minutes: Health endpoint
- [ ] Check every 10 minutes: Error logs
- [ ] Status: DEPLOYMENT_LEAD monitoring

### Hours 2-4 (11:30 - 14:30)
- [ ] Check every 15 minutes: Health endpoint
- [ ] Check every 30 minutes: Error logs & metrics
- [ ] Status: DEPLOYMENT_TEAM monitoring
- [ ] **Target:** Error rate < 1%, Response time < 2 sec

### Hours 5-8 (14:30 - 18:30)
- [ ] Check every 30 minutes: All metrics
- [ ] Status: DEPLOYMENT_ENGINEER monitoring
- [ ] **Milestone:** If stable at 6 hours → Declare SUCCESS

### Hours 9-24 (18:30 - 09:30 next day)
- [ ] Check every hour: Key metrics
- [ ] Status: ON-CALL_ENGINEER monitoring
- [ ] **Final Review:** At 24 hours post-deployment

---

## 📊 DEPLOYMENT SUCCESS METRICS

Record actual values:

```
DEPLOYMENT COMPLETED: Date _______ Time _______

Error Rate (Target: < 1%): _______
Response Time P95 (Target: < 2s): _______  
Database Latency (Target: < 500ms): _______
Active Users: _______
CPU Usage (Target: < 70%): _______
Memory Usage (Target: < 80%): _______
Disk Usage: _______

Issues Encountered: 
- _____________________________________
- _____________________________________

Lessons Learned:
- _____________________________________
- _____________________________________

Sign-Off:
Deployment Lead: _________________ Time: _______
Operations Manager: _________________ Time: _______
```

---

## ✅ DEPLOYMENT DAY SIGN-OFF

- [ ] Pre-deployment checks complete
- [ ] Deployment executed
- [ ] Smoke tests passed
- [ ] System stable
- [ ] Monitoring active
- [ ] Team notified
- [ ] Status page updated
- [ ] First hour monitoring completed
- [ ] 24-hour monitoring plan activated

---

**Status:** ✅ READY FOR MARCH 5 DEPLOYMENT  
**Next Review:** March 6, 2026 (at 24-hour mark)

