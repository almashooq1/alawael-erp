# Production Secrets Cutover — Rollback Runsheet (W1406)

**For:** War-room execution / Incident response  
**Wave:** W1406  
**Severity:** Critical (production downtime)  
**Date:** [DD]/[MM]/[YYYY]  
**Change Ticket:** [fill]

---

## Trigger Conditions

**When to execute rollback:**

| Condition                 | Trigger                                           | Action                                     |
| ------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Service fails at startup  | `ERROR: Secrets not resolved from managed source` | IMMEDIATE rollback                         |
| Auth broken after 10 min  | Any login endpoints return 401/403                | IMMEDIATE rollback                         |
| Database connection lost  | `ECONNREFUSED` or connection timeout              | ESCALATE (may be DB issue, not secrets)    |
| Encryption failures       | Encrypted fields unreadable                       | IMMEDIATE rollback                         |
| Session validation broken | JWT/session tokens rejected                       | IMMEDIATE rollback                         |
| Health check fails        | `/health` or `/readiness` returns non-200         | Wait 30s, retry; if still failed, ROLLBACK |

**Decision authority:** DevOps Lead or Release Manager on-call

---

## Precondition — Rollback Windows

**Before executing rollback, verify:**

| Check                                       | Status      | Owner          |
| ------------------------------------------- | ----------- | -------------- |
| Old secrets still in backup store           | ☐ Confirmed | DevOps         |
| DNS/routing not yet switched                | ☐ Confirmed | Network/DevOps |
| Load balancer pointing to new deployment    | ☐ Confirmed | DevOps         |
| Previous deployment (N-1) still in registry | ☐ Confirmed | DevOps         |
| Backup database snapshot available          | ☐ Confirmed | DBA            |
| Communication channel open (Slack/war room) | ☐ Confirmed | Ops Lead       |

**If ANY check fails, STOP and escalate to Release Manager.**

---

## Rollback Execution (5 Steps)

### Step 1: Acknowledge Incident & Declare War Room

**Time:** [HH:MM]  
**Status:** ☐ In Progress

**Actions:**

- [ ] Release Manager declares incident at severity "Critical"
- [ ] Page on-call team (DevOps, Backend, Security)
- [ ] Open war-room channel or bridge call
- [ ] Assign roles: Ops Lead (coordinator), DevOps (executor), Backend (verifier)

**Owner:** Release Manager  
**Evidence:** [Slack timestamp / incident ticket ref]

---

### Step 2: Revert Secrets to Previous State (N-1)

**Time:** [HH:MM]  
**Status:** ☐ In Progress

**Environment Source:** [Secrets manager location]

**Commands:**

```bash
# Verify backup location
ls -la /backups/secrets/production/  # or S3 bucket, Vault path, etc.

# Snapshot current (failed) state
cp /production-secrets-live-YYYY-MM-DD-HH:MM.env /archive/failed-cutover-YYYY-MM-DD.env

# Restore previous state
cp /backups/secrets/production/pre-cutover-YYYY-MM-DD.env /production-secrets-live.env

# Verify file
cat /production-secrets-live.env | grep -E "MONGODB_URI|JWT_SECRET|ENCRYPTION_KEY|SESSION_SECRET"
```

**Verification:**

- [ ] All 5 strict keys present
- [ ] Keys match expected format (not corrupted)
- [ ] File permissions: 600 (owner read/write only)
- [ ] Timestamp: confirms pre-cutover state

**Owner:** DevOps Lead  
**Executor:** DevOps Engineer  
**Duration:** ~2 minutes  
**Evidence file:** `[fill path]`

---

### Step 3: Restart Services (Staged)

**Time:** [HH:MM]  
**Status:** ☐ In Progress

**Order & Monitoring:**

| Service     | Command                   | Health Check                               | Wait | Owner  |
| ----------- | ------------------------- | ------------------------------------------ | ---- | ------ |
| Redis       | `docker restart redis`    | `redis-cli ping`                           | 10s  | DevOps |
| MongoDB     | `docker restart mongo`    | `mongosh --eval "db.adminCommand('ping')"` | 15s  | DBA    |
| Backend API | `docker restart backend`  | `curl http://localhost:3001/health`        | 20s  | DevOps |
| Frontend    | `docker restart frontend` | `curl http://localhost:3000/`              | 10s  | DevOps |

**Restart sequence:**

```bash
# 1. Stop ingress traffic first (remove from LB)
lb-tool remove-pool production-backend

# 2. Restart data layer (Redis → MongoDB)
docker restart redis && sleep 10 && docker restart mongo && sleep 15

# 3. Verify data layer
docker logs redis | tail -20
docker logs mongo | tail -20

# 4. Restart application layer
docker restart backend && sleep 20
docker restart frontend && sleep 10

# 5. Health checks
curl http://localhost:3001/health
curl http://localhost:3000/
```

**Owner:** DevOps Lead  
**Executor:** DevOps Engineer  
**Duration:** ~2 minutes  
**Monitoring:** Check logs real-time for errors

---

### Step 4: Sanity Checks (Auth + API + UI)

**Time:** [HH:MM]  
**Status:** ☐ In Progress

**Test 1: env:check**

```bash
cd backend && npm run env:check
```

**Expected:** All 5 keys resolved ✅  
**Result:** [fill]

**Test 2: Auth sanity (local)**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Expected:** 200 + JWT token (or 401 if credentials wrong, NOT 500)  
**Result:** [fill]

**Test 3: Public API (no auth)**

```bash
curl http://localhost:3001/api/v1/health
```

**Expected:** 200 + `{"status":"ok"}`  
**Result:** [fill]

**Test 4: Frontend load**

```bash
curl -I http://localhost:3000/
```

**Expected:** 200 or 301 redirect (not 500)  
**Result:** [fill]

**Test 5: Session validation**

```bash
# Retrieve a session token from login test above, then:
curl -H "Authorization: Bearer [TOKEN]" \
  http://localhost:3001/api/v1/me
```

**Expected:** 200 + user profile  
**Result:** [fill]

**Owner:** Backend Verifier  
**Duration:** ~5 minutes  
**Pass/Fail:** ☐ Pass ☐ Fail (details below)

**If ANY test fails:**

- Check logs: `docker logs backend 2>&1 | tail -100`
- Verify secrets file again: `echo $MONGODB_URI | head -c 50`
- If still broken, ESCALATE to Backend on-call

---

### Step 5: Re-enable Traffic & Monitor

**Time:** [HH:MM]  
**Status:** ☐ In Progress

**Actions:**

```bash
# Re-add to load balancer
lb-tool add-pool production-backend instance-1 instance-2

# Monitor key endpoints for 5 minutes
watch -n 1 'curl -s http://lb.prod/health | jq .status'

# Check error logs (grep for 5xx)
docker logs backend 2>&1 | grep -i error | tail -20
docker logs frontend 2>&1 | grep -i error | tail -20
```

**Monitoring metrics (next 10 minutes):**

| Metric                  | Baseline | Current | Status          |
| ----------------------- | -------- | ------- | --------------- |
| API response time (p50) | <100ms   | [fill]  | ☐ OK ☐ HIGH     |
| Auth success rate       | >99%     | [fill]% | ☐ OK ☐ DEGRADED |
| DB connection pool      | <50%     | [fill]% | ☐ OK ☐ FULL     |
| Error rate (5xx)        | <0.1%    | [fill]% | ☐ OK ☐ ELEVATED |

**Owner:** DevOps Lead + Backend on-call  
**Duration:** 10 minutes of monitoring  
**Decision:** ☐ All green → Rollback complete ☐ Still issues → Escalate

---

## Rollback Outcome Matrix

| Scenario                             | Action                                                           | Next Step                              |
| ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------- |
| **All tests pass, traffic green**    | Document incident, notify team                                   | Post-incident review                   |
| **Auth still broken after rollback** | Check backup secrets not corrupted; restore from 2 versions back | Escalate to Security                   |
| **Database unresponsive**            | This is NOT a secrets issue; coordinate with DBA for recovery    | Separate incident (notify DBA on-call) |
| **Load balancer misbehaving**        | Manual DNS switch or static IP fallback                          | Coordinate with Network team           |

---

## Escalation Path (If Rollback Fails)

**Tier 1 (DevOps):** 10 min response  
**Tier 2 (Backend Lead):** 15 min response  
**Tier 3 (Release Manager + Security Lead):** 20 min response  
**Tier 4 (VP Engineering):** 30 min response

**Escalation triggers:**

- Rollback step takes >5 min
- Tests still fail after rollback
- Database not responding
- Secrets backup corrupted

---

## Evidence Pack — Rollback Execution

Collect and archive in `[ARCHIVE_LOCATION]`:

| Evidence                        | Source                                                        | Owner           | Status            |
| ------------------------------- | ------------------------------------------------------------- | --------------- | ----------------- |
| Backup secrets fingerprint      | `sha256sum /backups/secrets/production/*.env`                 | DevOps          | ☐                 |
| Timestamp of rollback start/end | War-room chat / incident ticket                               | Ops Lead        | ☐                 |
| env:check success log           | `npm run env:check > env-check-rollback.log 2>&1`             | Backend         | ☐                 |
| Health check outputs (5 tests)  | Curl responses, timestamps                                    | Backend         | ☐                 |
| Service restart logs            | `docker logs <service> > service-restart-YYYY-MM-DD.log 2>&1` | DevOps          | ☐                 |
| Incident ticket link            | [fill]                                                        | Ops Lead        | ☐                 |
| War-room recording              | [fill]                                                        | Ops Lead        | ☐                 |
| Root cause analysis             | [fill]                                                        | Release Manager | ☐ (post-incident) |

---

## Signatures — Rollback Completion

**Rollback authorized by:**  
Name: [fill]  
Title: Release Manager  
Signature: [sig]  
Date/Time: [DD]/[MM]/[YYYY] [HH:MM]

**Rollback executed by:**  
Name: [fill]  
Title: DevOps Lead  
Signature: [sig]  
Date/Time: [DD]/[MM]/[YYYY] [HH:MM]

**Rollback verified by:**  
Name: [fill]  
Title: Backend Verifier  
Signature: [sig]  
Date/Time: [DD]/[MM]/[YYYY] [HH:MM]

---

## Post-Rollback Actions

### Immediate (within 1 hour)

- [ ] Notify stakeholders via channel (Slack announcement)
- [ ] Create post-incident ticket for RCA
- [ ] Preserve all logs and evidence in archive
- [ ] Scale services back up if auto-scaled down

### Within 24 hours

- [ ] Root cause analysis (RCA) document drafted
- [ ] Identify why cutover failed (secrets corrupted? wrong format? timing?)
- [ ] Plan corrective action for next attempt

### Within 1 week

- [ ] RCA completed and reviewed by team
- [ ] Corrective changes implemented (e.g., better validation, staged rollout)
- [ ] Next cutover window scheduled with updated runsheet

---

## Related Documents

- **Original Execution:** `production-secrets-cutover-runsheet-w1406.md`
- **Checklist:** `production-secrets-cutover-checklist-w1406.md`
- **One-page Rollback (Quick Ref):** `production-secrets-cutover-rollback-runsheet-w1406-onepage.md`
- **One-page Rollback (Arabic):** `production-secrets-cutover-rollback-runsheet-w1406-onepage-ar.md`
