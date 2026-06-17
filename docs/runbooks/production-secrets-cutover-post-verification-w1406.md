# Production Secrets Cutover — Post-Cutover Verification (W1406)

**For:** Ongoing health monitoring after cutover  
**Wave:** W1406  
**Verification windows:** 24h + 7d post-cutover

---

## Context

After successful secrets cutover execution, the system enters a **critical monitoring window**. This checklist captures two verification phases:

1. **24-hour verification** — Immediate post-cutover (first business day)
2. **7-day verification** — Stability confirmation (one week)

Both phases aim to detect late-onset issues (connection pool exhaustion, cache misses, auth token expiration cycles, data drift, backup integrity, compliance gaps).

---

## Phase 1: 24-Hour Post-Cutover Verification

**Window:** Cutover completion + 24 hours  
**Verification owner:** DevOps Lead + Backend on-call  
**Escalation:** Release Manager at T+6h and T+24h

---

## 24h-1: System Health (Immediate: 0–30 min)

**Goal:** Confirm all services stable after 30 minutes of live traffic

| Check                  | Command                                        | Expected     | Owner   | Time    | Status |
| ---------------------- | ---------------------------------------------- | ------------ | ------- | ------- | ------ |
| API availability       | `curl -s http://api.prod/health \| jq .status` | `"ok"`       | DevOps  | [HH:MM] | ☐ Pass |
| Frontend load          | `curl -I https://app.prod/ \| head -1`         | `200 or 301` | DevOps  | [HH:MM] | ☐ Pass |
| Database latency (p50) | Query monitoring dashboard                     | <50ms        | DBA     | [HH:MM] | ☐ Pass |
| Error rate (5xx)       | APM / Log aggregation                          | <0.1%        | DevOps  | [HH:MM] | ☐ Pass |
| Cache hit rate         | Redis monitoring                               | >80%         | Backend | [HH:MM] | ☐ Pass |

**Result:** ☐ All green → continue to 24h-2  
**Result:** ☐ Any failures → **ESCALATE to Release Manager immediately**

---

## 24h-2: Authentication Flow (T+1h)

**Goal:** Verify JWT generation, refresh, and session validation work end-to-end

```bash
# Test 1: Login (new session)
TOKEN=$(curl -s -X POST https://api.prod/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qa.com","password":"test123"}' | jq -r .token)

echo "Token: ${TOKEN:0:50}..."

# Test 2: Use token (protected endpoint)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.prod/api/v1/me | jq .email

# Test 3: Refresh token (if 2-factor)
curl -s -X POST https://api.prod/api/v1/auth/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Refresh-Token: [refresh-token-from-login]" | jq .newToken

# Test 4: Logout
curl -s -X POST https://api.prod/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

| Scenario              | Expected                     | Result | Owner   | Time    | Status |
| --------------------- | ---------------------------- | ------ | ------- | ------- | ------ |
| Login generates JWT   | Token present, claims valid  | [fill] | Backend | [HH:MM] | ☐ Pass |
| Bearer token accepted | 200 + user profile           | [fill] | Backend | [HH:MM] | ☐ Pass |
| Token refresh works   | New token returned           | [fill] | Backend | [HH:MM] | ☐ Pass |
| Logout invalidates    | 200, token rejected on retry | [fill] | Backend | [HH:MM] | ☐ Pass |

**Result:** ☐ All pass → continue to 24h-3  
**Result:** ☐ Any fail → Check JWT_SECRET key in managed source (may be corrupted)

---

## 24h-3: Data Integrity (T+2h)

**Goal:** Verify encryption/decryption of sensitive fields works correctly

```bash
# Test 1: Encrypted field read (e.g., SSN, phone)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.prod/api/v1/beneficiaries/[id] | jq .ssn

# Test 2: Encrypted field write
curl -s -X PATCH https://api.prod/api/v1/beneficiaries/[id] \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966501234567"}' | jq .phone

# Test 3: Verify encryption in database (raw lookup)
mongo --eval "db.beneficiaries.findOne({_id: ObjectId('[id]')}).phone"
```

| Scenario                  | Expected                   | Result | Owner   | Time    | Status |
| ------------------------- | -------------------------- | ------ | ------- | ------- | ------ |
| Encrypted fields readable | Plain text decrypted       | [fill] | Backend | [HH:MM] | ☐ Pass |
| New writes encrypted      | Database stores ciphertext | [fill] | Backend | [HH:MM] | ☐ Pass |
| Encryption key correct    | Decryption succeeds        | [fill] | Backend | [HH:MM] | ☐ Pass |

**Result:** ☐ All pass → continue to 24h-4  
**Result:** ☐ Any fail → **CRITICAL**: ENCRYPTION_KEY mismatch; may require rollback

---

## 24h-4: Session Persistence (T+3h)

**Goal:** Verify Redis/session store persists across restarts

```bash
# Step 1: Create a session
SESSION_ID=$(curl -s -X POST https://api.prod/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qa.com","password":"test123"}' | jq -r .sessionId)

echo "Session ID: $SESSION_ID"

# Step 2: Query from Redis
redis-cli --scan | grep "session:$SESSION_ID"

# Step 3: Use the session immediately
curl -s -H "Cookie: sessionId=$SESSION_ID" \
  https://api.prod/api/v1/me | jq .email

# Step 4: Wait 5 minutes, try again
sleep 300
curl -s -H "Cookie: sessionId=$SESSION_ID" \
  https://api.prod/api/v1/me | jq .email
```

| Scenario                   | Expected                  | Result | Owner   | Time    | Status |
| -------------------------- | ------------------------- | ------ | ------- | ------- | ------ |
| Session created in Redis   | Session stored with TTL   | [fill] | Backend | [HH:MM] | ☐ Pass |
| Session usable immediately | 200 + user profile        | [fill] | Backend | [HH:MM] | ☐ Pass |
| Session survives 5 min     | Still valid (not expired) | [fill] | Backend | [HH:MM] | ☐ Pass |

**Result:** ☐ All pass → continue to 24h-5  
**Result:** ☐ Any fail → SESSION_SECRET mismatch or Redis TTL misconfiguration

---

## 24h-5: Database Connection Pool (T+4h)

**Goal:** Verify DB connection pool not exhausted under moderate load

```bash
# Monitor pool stats
mongo --eval "db.serverStatus().connections"

# Expected output: { "current" : N, "available" : M, "totalCreated" : K }
# current should be <80% of max pool size

# Run a simple query storm (10 concurrent requests)
for i in {1..10}; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    https://api.prod/api/v1/beneficiaries?page=$i &
done
wait

# Check pool again
mongo --eval "db.serverStatus().connections"
```

| Metric                | Baseline | Current | Target | Status |
| --------------------- | -------- | ------- | ------ | ------ |
| Connections current   | ~20      | [fill]  | <80    | ☐ OK   |
| Connections available | ~80      | [fill]  | >10    | ☐ OK   |
| Query response time   | <100ms   | [fill]  | <150ms | ☐ OK   |

**Result:** ☐ All OK → continue to 24h-6  
**Result:** ☐ Pool exhausted → DB max_connections too low or connection leaks in code

---

## 24h-6: Backup & Recovery (T+6h)

**Goal:** Verify database backup integrity (no manual action, read-only check)

```bash
# Check last backup timestamp
ls -lh /backups/mongodb/latest/ | head -5

# Expected: File modification time <6h ago

# Quick restore validation (read-only, no actual restore)
mongorestore --dryRun --archive=/backups/mongodb/latest/dump.archive

# Expected: Shows restore plan without errors
```

| Check                  | Expected            | Result | Owner | Time    | Status |
| ---------------------- | ------------------- | ------ | ----- | ------- | ------ |
| Backup exists & recent | <6h old             | [fill] | DBA   | [HH:MM] | ☐ Pass |
| Backup not corrupted   | dryRun succeeds     | [fill] | DBA   | [HH:MM] | ☐ Pass |
| Restore plan valid     | No errors in output | [fill] | DBA   | [HH:MM] | ☐ Pass |

**Result:** ☐ All pass → continue to 24h-7  
**Result:** ☐ Backup failed → **Escalate to DBA immediately**

---

## 24h-7: T+24h Decision Gate

**At T+24 hours, DevOps Lead certifies:**

**All 6 phases passed?** ☐ YES ☐ NO

**If YES:**

- [ ] System stable for 24h post-cutover
- [ ] No rollback needed
- [ ] Proceed to 7-day verification
- [ ] Archive all 24h evidence

**If NO:**

- [ ] Identify failing phase(s)
- [ ] **Escalate to Release Manager**
- [ ] Evaluate: Continue monitoring or trigger rollback?
- [ ] Document root cause

**Decision:** ☐ APPROVED for 7-day verification  
**Approved by:** [fill] | **Signature:** [sig] | **Time:** [HH:MM]

---

---

## Phase 2: 7-Day Post-Cutover Verification

**Window:** Day 1 end + 7 days (spans one full week of production)  
**Verification owner:** DevOps Lead + Backend team  
**Escalation:** Release Manager at any failure

---

## 7d-1: Weekly Traffic Pattern (Day 2–7)

**Goal:** Confirm system handles full week of real user patterns (weekday + weekend)

| Metric               | Baseline (staging) | Current (production) | Target | Owner   | Status |
| -------------------- | ------------------ | -------------------- | ------ | ------- | ------ |
| Peak QPS (weekday)   | 150                | [fill]               | >120   | DevOps  | ☐ OK   |
| Peak QPS (weekend)   | 80                 | [fill]               | >60    | DevOps  | ☐ OK   |
| Error rate (5xx avg) | 0.05%              | [fill]%              | <0.1%  | DevOps  | ☐ OK   |
| API p99 latency      | <500ms             | [fill]ms             | <600ms | Backend | ☐ OK   |
| Cache hit rate (avg) | 85%                | [fill]%              | >80%   | Backend | ☐ OK   |

**Collection:** Daily APM dashboard snapshots (screenshot or CSV)  
**Owner:** DevOps | **Time:** Daily at 18:00 UTC | **Status:** ☐ 7 snapshots collected

---

## 7d-2: Auth Token Lifecycle (Day 2–7)

**Goal:** Verify JWT expiration / refresh cycles stable across full week

```bash
# Monitor JWT failure rate (should be <1%)
APM_FILTER="event_type:auth_failure AND token_expired:true"
# Expected: <0.5% of all auth events

# Check refresh token regeneration (should work consistently)
APM_FILTER="event_type:token_refresh"
# Expected: >99% success rate
```

| Metric                   | Target     | Status    | Evidence       |
| ------------------------ | ---------- | --------- | -------------- |
| JWT invalid rate         | <0.5%      | ☐ [fill]% | [APM link]     |
| Token refresh success    | >99%       | ☐ [fill]% | [APM link]     |
| Session expiration clean | No orphans | ☐ OK      | [Query result] |

**Owner:** Backend | **Time:** Daily review | **Status:** ☐ 7-day trend confirmed

---

## 7d-3: Encryption Rotation & Consistency (Day 3)

**Goal:** Verify ENCRYPTION_KEY has not drifted; all encrypted fields still decrypt

```bash
# Spot-check 100 random encrypted records
for i in {1..100}; do
  BEN_ID=$(mongo --eval "db.beneficiaries.find().limit(1).skip($RANDOM % 10000).toArray()[0]._id")
  curl -s -H "Authorization: Bearer $TOKEN" \
    https://api.prod/api/v1/beneficiaries/$BEN_ID | jq .ssn
done

# Count failures: should be 0
```

| Check                   | Expected           | Result     | Owner   | Time    | Status |
| ----------------------- | ------------------ | ---------- | ------- | ------- | ------ |
| 100 spot checks         | 100/100 decrypt    | [fill]/100 | Backend | [HH:MM] | ☐ Pass |
| No " corrupted " errors | 0 decrypt failures | [fill]     | Backend | [HH:MM] | ☐ Pass |

**Owner:** Backend | **Time:** Day 3 | **Status:** ☐ Complete

---

## 7d-4: Backup Integrity (Day 4 & Day 7)

**Goal:** Verify backups still running and restorable

**Day 4 check:**

```bash
# Verify incremental backups running
ls -lh /backups/mongodb/ | grep -E "incremental-2026-06-(18|19|20)"

# Expected: One backup per day
```

**Day 7 check (full restore simulation):**

```bash
# On a staging replica: perform a test restore
mongorestore --archive=/backups/mongodb/week1-final.archive --dryRun

# Expected: Zero errors, full document count matches
```

| Check                       | Day 4       | Day 7            | Owner | Status |
| --------------------------- | ----------- | ---------------- | ----- | ------ |
| Incremental backups running | ☐ 4 backups | ☐ 7 backups      | DBA   | ☐ Pass |
| Full restore simulation     | —           | ☐ dryRun success | DBA   | ☐ Pass |
| Document count match        | —           | ☐ Match          | DBA   | ☐ Pass |

**Owner:** DBA | **Status:** ☐ 7-day backups validated

---

## 7d-5: Data Drift Audit (Day 5)

**Goal:** Verify no silent data loss or corruption (checksums, counts, relationships)

```bash
# Count total documents per key collection
mongo --eval "
  print('Beneficiaries: ' + db.beneficiaries.count());
  print('Episodes: ' + db.episodes.count());
  print('CarePlans: ' + db.careplans.count());
  print('Sessions: ' + db.sessions.count());
"

# Compare with Day 1 post-cutover counts
EXPECTED_BENS=5432
EXPECTED_EPIS=8901
# etc.

# Referential integrity (spot-check)
mongo --eval "
  db.careplans.find({beneficiaryId: {$exists: false}}).count()
  // Expected: 0 (no orphans)
"
```

| Collection    | Day 1 Count | Day 5 Count | Growth OK? | Owner | Status |
| ------------- | ----------- | ----------- | ---------- | ----- | ------ |
| Beneficiaries | [fill]      | [fill]      | ☐ +0-5%    | DBA   | ☐ OK   |
| Episodes      | [fill]      | [fill]      | ☐ +0-5%    | DBA   | ☐ OK   |
| CarePlans     | [fill]      | [fill]      | ☐ +0-5%    | DBA   | ☐ OK   |
| Orphaned refs | 0           | [fill]      | ☐ 0        | DBA   | ☐ OK   |

**Owner:** Backend + DBA | **Time:** Day 5 | **Status:** ☐ Audit complete

---

## 7d-6: Compliance & Audit Logs (Day 6)

**Goal:** Verify audit trail captured all actions correctly

```bash
# Check audit log volume
mongo --eval "db.auditLogs.find({createdAt: {$gt: ISODate('2026-06-17')}}).count()"

# Expected: >100 entries per day

# Spot-check auth audit entries
mongo --eval "
  db.auditLogs.find({action: 'auth.login'}).limit(5).pretty()
"

# Expected: all entries have userId, timestamp, IP, result
```

| Check                | Expected              | Result | Owner   | Time    | Status |
| -------------------- | --------------------- | ------ | ------- | ------- | ------ |
| Audit logs generated | >700 entries (7 days) | [fill] | Backend | [HH:MM] | ☐ OK   |
| Auth audit complete  | All logins logged     | ☐ Yes  | Backend | [HH:MM] | ☐ OK   |
| Timestamps correct   | ISO 8601, UTC         | ☐ Yes  | Backend | [HH:MM] | ☐ OK   |

**Owner:** Compliance/Security | **Time:** Day 6 | **Status:** ☐ Audit validated

---

## 7d-7: T+7d Final Decision Gate

**At T+7 days, DevOps Lead + Release Manager certify:**

**All 6 verification phases passed?** ☐ YES ☐ NO

**If YES:**

- [ ] System proven stable for one full week
- [ ] Cutover approved as successful
- [ ] Archive all 7-day evidence
- [ ] Schedule post-incident review (lessons learned)
- [ ] Update runbooks with real metrics

**If NO:**

- [ ] Identify failing phase(s)
- [ ] Evaluate: Critical issue or acceptable drift?
- [ ] Document incident and mitigation
- [ ] Determine next steps (rollback not applicable at 7d; repair or accept risk)

**Final Approval:**

**Cutover status:** ☐ SUCCESSFUL ☐ DEGRADED ☐ FAILED  
**Approved by:** [fill] | **Signature:** [sig] | **Time:** [HH:MM] | **Date:** [DD]/[MM]

---

## Evidence Archival

**Collect and store in:** `/archive/w1406-post-cutover-verification-[date]`

- 24h phase results (6 phases × check logs)
- 7d APM snapshots (7 daily dashboards)
- Backup validation logs
- Data drift audit output
- Audit log sample
- Final sign-off document

---

## Escalation Contacts

| Phase Fails        | Owner           | Alert    | Window    |
| ------------------ | --------------- | -------- | --------- |
| 24h-1 (health)     | DevOps Lead     | CRITICAL | Immediate |
| 24h-2 (auth)       | Backend Lead    | HIGH     | <15 min   |
| 24h-3 (encryption) | Security Lead   | CRITICAL | Immediate |
| 24h-4 (sessions)   | Backend Lead    | HIGH     | <30 min   |
| 24h-5 (DB pool)    | DBA             | MEDIUM   | <60 min   |
| 24h-6 (backup)     | DBA             | CRITICAL | Immediate |
| 7d-x (any)         | Release Manager | MEDIUM   | <2 hours  |

---

## Post-Cutover Maintenance (Ongoing)

**Weekly (every Monday):**

- Review APM metrics against baseline
- Confirm backups completed successfully
- Check error rates trend

**Monthly:**

- Update secrets rotation schedule (if needed)
- Review access logs for anomalies
- Validate encryption key rotation policy

---

## Related Documents

- **Execution:** [production-secrets-cutover-runsheet-w1406.md](production-secrets-cutover-runsheet-w1406.md)
- **Rollback:** [production-secrets-cutover-rollback-runsheet-w1406.md](production-secrets-cutover-rollback-runsheet-w1406.md)
- **Summary:** [production-secrets-cutover-summary-w1406.md](production-secrets-cutover-summary-w1406.md)
