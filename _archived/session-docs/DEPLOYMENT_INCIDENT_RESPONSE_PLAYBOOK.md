# DEPLOYMENT INCIDENT RESPONSE PLAYBOOK

**Purpose:** Guide for handling issues during/after Week 1 deployment  
**Audience:** Deployment team, on-call engineers, support team  
**Status:** Activation checklist - use if issues occur

---

## 🚨 INCIDENT CLASSIFICATION

### Severity Levels

```
CRITICAL (Red) - IMMEDIATE ACTION REQUIRED
├─ Application won't start
├─ Health endpoint returning 500
├─ Database completely offline
├─ Error rate > 10%
├─ Security breach detected
└─ Data corruption risk identified

HIGH (Orange) - URGENT ACTION REQUIRED (within 15 min)
├─ Error rate 5-10%
├─ Response time > 5000ms
├─ Memory usage > 90%
├─ Connection pool exhausted
└─ Cascading errors detected

MEDIUM (Yellow) - INVESTIGATE (within 1 hour)
├─ Error rate 2-5%
├─ Response time 3-5 seconds
├─ Memory slowly increasing
├─ Single service failing
└─ Performance degradation

LOW (Green) - MONITOR (within 4 hours)
├─ Error rate < 2%
├─ Response time < 3 seconds
├─ Minor warnings in logs
└─ Expected behavior
```

---

## 🔴 CRITICAL INCIDENT RESPONSE

### CRITICAL: Application Won't Start

**Detection:**
```
Health check endpoint returns: Connection refused
OR
Process not running: ps aux | grep node [no result]
OR
Docker container exited: docker ps [no alawael container]
```

**Emergency Actions (Do Immediately):**

```
STEP 1 - Alert (30 seconds)
  [ ] Declare INCIDENT in war room
  [ ] Ring bell/post to chat "CRITICAL INCIDENT"
  [ ] Bring engineering lead + DevOps into chat
  [ ] Start timer

STEP 2 - Investigate (2 minutes)
  [ ] Check process status:
      ps aux | grep "npm\|node\|alawael"
  [ ] Check logs for startup error:
      docker logs alawael-api  # or pm2 logs
      tail -50 /var/log/alawael-api/error.log
  [ ] Check recent git commits:
      git log --oneline -5

STEP 3 - Quick Fix Attempt (5 minutes)
  
  IF: "Cannot find module"
    → npm install
    → npm start
    
  IF: "Port 3000 already in use"
    → lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
    → npm start
    
  IF: "Database connection string invalid"
    → Verify .env.production loaded correctly
    → Verify MONGODB_URL = correct connection string
    → npm start
    
  IF: "Out of memory"
    → Check dist file size (too large?)
    → Reduce logging level
    → npm start
    
STEP 4 - If Quick Fix Failed (5 minutes)
  [ ] Stop current attempt: pm2 stop alawael-api
  [ ] Check Git HEAD is correct:
      git status  [should be clean]
      git log --oneline -1
  [ ] Try previous version:
      git revert HEAD
      npm install
      npm start
      
STEP 5 - If Still Not Starting (3 minutes)
  [ ] DECLARE ROLLBACK DECISION NEEDED
  [ ] Inform: Engineering lead + Manager
  [ ] Decision: 
      Option A: Execute full rollback (10 min)
      Option B: Continue debugging (risk informed)
```

**If No Quick Fix Available:**
→ **EXECUTE ROLLBACK PROCEDURE** (see "Emergency Rollback" below)

**Timeline:** < 20 minutes from detection to either working or rolled back

---

### CRITICAL: Database Offline

**Detection:**
```
Logs show: "Connection refused" or "Timeout after 30 seconds"
OR
Test shows: MongoDB connection failing
OR
Monitoring shows: 100% of database queries timing out
```

**Emergency Actions:**

```
STEP 1 - Alert & Verify (1 minute)
  [ ] Declare incident
  [ ] Verify database is actually down:
      mongo --eval "db.adminCommand('ping')"  # should fail
      
STEP 2 - Check Network (2 minutes)
  [ ] Can we reach the database server?
      telnet mongodb.example.com 27017
      curl -I mongodb.example.com:27017
  [ ] Check firewall rules
  [ ] Check database service status

STEP 3 - If Database Down (Call DBA / Infrastructure)
  [ ] Contact DBA or MongoDB hosting support
  [ ] Check your provider's status page (AWS/Azure/Atlas)
  [ ] Ask: "When will database be available?"
  [ ] While waiting: See "Database Down Contingency" below

STEP 4 - Options While Waiting
  
  Option A: Rollback to before database requirement
    → Revert to previous version
    → Works if that version had fallbacks
    
  Option B: Redirect to backup database
    → Switch connection string to failover DB
    → Update .env.production
    → Restart application
    
  Option C: Wait for recovery
    → If ETA < 30 minutes
    → Keep system running (read-only or cached)
```

**If Database Won't Recover Within 30 Minutes:**
→ **EXECUTE ROLLBACK PROCEDURE**

**Timeline:** < 15 minutes to decision, up to 30 min to recovery

---

### CRITICAL: Error Rate > 10%

**Detection:**
```
Monitoring dashboard shows:
  Error Rate: 15% (or higher)
  Last 100 requests: 15+ failed
OR
Sentry/Rollbar showing spike in same error
```

**Emergency Actions:**

```
STEP 1 - Identify Error Pattern (2 minutes)
  [ ] What error is most common?
      grep "ERROR:" /var/log/alawael-api/error.log | \
        cut -d'-' -f2 | sort | uniq -c | sort -rn | head -5
  [ ] Is it:
      - Authentication error?
      - Database error?
      - External API error?
      - Configuration error?

STEP 2 - Attempt Quick Fix (5 minutes depends on error)
  
  IF: "MongoDB buffering timeout" (MongoDB issue)
    → Check MongoDB connection pool
    → Increase timeout: MONGODB_TIMEOUT=45000
    → Restart application
    
  IF: "JWT invalid" (Authentication issue)
    → Verify JWT_SECRET is correct
    → Verify token expiration not too short
    → Restart application
    
  IF: "External API timeout" (Third-party issue)
    → Check service status page
    → Increase timeout values
    → Restart application
    
  IF: "Database query error" (Query issue)
    → Check for recent code changes
    → Revert last commit if recent change
    → Restart application
    
  IF: Unknown error
    → Check full stack trace:
        tail -100 /var/log/alawael-api/error.log | grep -A 20 "ERROR:"
    
STEP 3 - Monitor Error Rate (2 minutes)
  [ ] After fix, monitor for 2 minutes
  [ ] Has error rate dropped below 5%?
    - YES: Continue monitoring, normal procedures
    - NO: Proceed to Step 4

STEP 4 - If Error Rate Still High (3 minutes)
  [ ] DECLARE ROLLBACK IF:
      - Error rate still > 5% after 5 minutes
      - Root cause unknown
      - Multiple cascading errors
```

**If Error Rate Doesn't Improve:**
→ **EXECUTE ROLLBACK PROCEDURE**

**Timeline:** < 10 minutes to fix or rollback decision

---

## 🟠 HIGH INCIDENT RESPONSE

### HIGH: Error Rate 5-10%

**Actions:**
1. **Identify pattern** - What errors are happening?
2. **Assess impact** - Are critical functions affected?
3. **Attempt fix** - One of: timeout adjustment, config fix, service restart
4. **Monitor result** - Has error rate improved?

**Decision Points:**
- Fixed within 15 min? → Continue deployment
- Not fixed? → Escalate to CRITICAL response
- Uncertain? → Implement temporary mitigation (fallback response, cache, etc.)

### HIGH: Response Time > 5000ms

**Actions:**
1. **Check database** - Is MongoDB responding?
2. **Check resources** - CPU/memory usage?
3. **Identify slow queries** - What API calls are slow?
4. **Options:**
   - Optimize query (if recent code change)
   - Increase server resources
   - Implement caching layer
   - Scale horizontally

**Decision:** If not improvable in 15 min → escalate

### HIGH: Memory Growing Rapidly

**Actions:**
1. **Identify memory user** - Which process/service?
2. **Check for memory leaks** - Is memory constantly growing?
3. **Options:**
   - Restart service (temporary fix)
   - Reduce batch sizes
   - Add memory limit
   - Implement garbage collection tuning

**Decision:** If memory reaches 90% → restart service to stabilize

---

## 🟡 MEDIUM INCIDENT RESPONSE

### MEDIUM: Error Rate 2-5%

**Actions:**
1. **Do NOT interrupt deployment**
2. **Monitor closely** (every 5 minutes)
3. **Investigate** root cause
4. **Plan fix** but don't implement unless rate increases
5. **If improves on own** → continue deployment

### MEDIUM: Single Service Failing

**Actions:**
1. **Isolate service** - Which endpoint?
2. **Test directly** - Can you call it?
3. **Check service logs** - Specific error?
4. **Options:**
   - Restart service
   - Verify configuration
   - Check dependencies
5. **Escalate if** critical service affected

---

## 🟢 GREEN: All Systems Nominal

**Monitoring:**
- ✅ Error rate < 2%
- ✅ Response time < 3 seconds
- ✅ Memory stable
- ✅ Database responsive

**Actions:**
1. **Continue routine monitoring**
2. **Document baseline metrics**
3. **Prepare phase 2 deployment** (if applicable)
4. **Schedule post-deployment review**

---

## 🔄 EMERGENCY ROLLBACK PROCEDURE

### When To Rollback (Auto-Trigger)

**ANY of the following:**
- [ ] CRITICAL incident not resolved within 10 minutes
- [ ] Error rate > 10% for > 5 minutes
- [ ] Database connection completely failed
- [ ] Application won't start after 3 attempts
- [ ] Data integrity risk detected

### Rollback Steps (Complete within 10 minutes)

**STEP 1: Stop Current System (1 minute)**
```bash
# Stop application immediately
pm2 stop alawael-api
# or
docker stop alawael-api
# or
systemctl stop alawael-api

# Verify stopped
ps aux | grep node
docker ps  # should be empty for alawael

# Time taken: _____ seconds
```

**STEP 2: Restore Previous Version (2 minutes)**
```bash
# Option A: From backup created at deployment start
cp -r /app/alawael-api.backup.20260305_093000 /app/alawael-api

# Option B: From git
cd /app/alawael-api
git revert HEAD
npm install

# Option C: From Docker registry (previous tag)
docker pull alawael:previous-stable
docker run -d --name alawael-api alawael:previous-stable

# Time taken: _____ seconds
```

**STEP 3: Start Previous Version (1 minute)**
```bash
npm start
# or
pm2 start npm --name "alawael-api" -- start
# or
docker start alawael-api

# Wait 5 seconds
sleep 5

# Verify running
ps aux | grep node
docker ps

# Time taken: _____ seconds
```

**STEP 4: Verify Rollback (2 minutes)**
```bash
# Health check
curl http://localhost:3000/health
# Expected: 200 OK

# Test API
curl -X GET http://localhost:3000/api/users

# Check logs for errors
tail -10 /var/log/alawael-api/error.log
# Expected: No new errors

# Monitor metrics
# Error rate should drop to < 0.1%
# Response time should return to normal

# Verification time: _____ seconds
```

**STEP 5: Confirm Stability (1 minute)**
```bash
# Wait 60 seconds
sleep 60

# Verify still running
ps aux | grep node

# Check error logs again
tail -5 /var/log/alawael-api/error.log

# Final check
curl http://localhost:3000/health

# Confirmation: PASS / FAIL
```

**STEP 6: Notify Team (1 minute)**
```bash
# Send message to war room:
echo "
🔄 ROLLBACK COMPLETE
└─ Time: $(date)
└─ From: [new version]
└─ To: [previous version]
└─ Reason: [brief reason]
└─ Status: STABLE ✅
└─ Next: Post-mortem scheduled for [time]
"
```

**TOTAL ROLLBACK TIME: ~10 minutes from decision**

---

## 📋 POST-INCIDENT PROCEDURES

### Immediate (30 minutes after incident resolved)

- [ ] All team members in incident room
- [ ] Document:
  - What happened: _________________________
  - When discovered: _________________________
  - Time to resolution: _________________________
  - Severity: CRITICAL / HIGH / MEDIUM / LOW
  
- [ ] Notify stakeholders
  - [ ] Product/Leadership
  - [ ] Customers (if public-facing)
  - [ ] Support team (for customer inquiries)

### Short-Term (End of day)

- [ ] Write incident report including:
  - Timeline of events
  - Root cause analysis
  - Action taken
  - Lessons learned
  - Prevention measures
  
- [ ] Create follow-up tasks:
  - [ ] Fix root cause (if needed)
  - [ ] Improve monitoring
  - [ ] Update documentation
  - [ ] Add test case (if applicable)

### Long-Term (Next week)

- [ ] Implement prevention measures
- [ ] Update deployment procedures
- [ ] Post-mortem meeting with team
- [ ] Share lessons learned across team

---

## 📞 ESCALATION MATRIX

### During Deployment

```
Issue → Who to Call → Contact → Timeline

Can't start app → Engineering Lead → [phone] → Immediately
Database down → Database Admin → [phone] → Immediately
High error rate → Backend Lead → [phone] → Within 2 min
Performance issue → DevOps Lead → [phone] → Within 5 min
Security issue → Security Officer → [phone] → Immediately
```

### Command Chain

```
Deployment Lead (makes final decisions)
  ├─ Engineering Lead (technical assessment)
  ├─ DevOps Lead (infrastructure fixes)
  ├─ Database Admin (database issues)
  └─ On-Call Manager (escalation authority)
```

### When To Rollback (Authority Required)

**Can Rollback Without Approval:**
- Health check failing (no recovery within 5 min)
- Error rate > 10% (no improvement within 5 min)

**Must Get Approval To Rollback:**
- Performance issues (can try optimization first)
- Minor errors (< 5% error rate)
- Uncertain root cause

**Approval From:** Deployment Lead or Manager

---

## ✅ INCIDENT RESPONSE READINESS CHECKLIST

Before deployment day:

- [ ] All team members read this guide
- [ ] Know who to contact for each issue type
- [ ] Rollback procedure tested in staging
- [ ] Backup of previous version verified
- [ ] Monitoring dashboards set up
- [ ] Alert thresholds configured
- [ ] Communication channels ready
- [ ] Escalation matrix posted in war room

---

**Status:** ✅ INCIDENT RESPONSE READY  
**Last Updated:** February 28, 2026  
**Next Review:** After deployment (Day 2)

