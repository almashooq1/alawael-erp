# Production Secrets Cutover — Rollback (1-Page) (W1406)

**For:** War-room quick reference  
**Date:** [DD]/[MM]/[YYYY] | **Change Ticket:** [fill]

---

## TRIGGER → ROLLBACK Decision (90 seconds)

**Is ANY condition true?**

- Service won't start (secrets not resolved)
- Auth endpoints return 401/403 (all users affected)
- Encryption fails (unreadable data)
- Health check fails after 30s retry

**YES** → Page Release Manager → Declare incident → Proceed to Step 1  
**NO** → Investigate further (may not be secrets issue)

---

## Step 1: War Room (2 min)

- [ ] Release Manager: Declare critical incident
- [ ] Page on-call: DevOps, Backend, Security
- [ ] Open: War-room bridge / Slack thread
- [ ] Assign: Ops Lead (coord), DevOps (exec), Backend (verify)

**Owner:** Release Manager | **Channel:** [Slack/Bridge] | **Time:** [HH:MM]

---

## Step 2: Restore Secrets (2 min)

```bash
# Backup failed state
cp /production-secrets-live.env /archive/failed-cutover-$(date +%s).env

# Restore pre-cutover
cp /backups/secrets/production/pre-cutover-*.env /production-secrets-live.env

# Verify all 5 keys present
cat /production-secrets-live.env | grep -E "MONGODB_URI|JWT_SECRET|ENCRYPTION_KEY|SESSION_SECRET"
```

**Checks:**

- [ ] All 5 keys present
- [ ] Keys valid format (not corrupted)
- [ ] Permissions: 600

**Owner:** DevOps Lead | **Evidence:** `[path]` | **Time:** [HH:MM]

---

## Step 3: Restart Services (3 min)

```bash
# Remove from LB
lb-tool remove-pool production-backend

# Restart (order matters)
docker restart redis && sleep 10
docker restart mongo && sleep 15
docker restart backend && sleep 20
docker restart frontend && sleep 10

# Add back to LB
lb-tool add-pool production-backend instance-1 instance-2
```

**Owner:** DevOps Lead | **Time:** [HH:MM]

---

## Step 4: Sanity Checks (5 min)

```bash
# 1. Env check
cd backend && npm run env:check

# 2. Auth sanity
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. Health
curl http://localhost:3001/api/v1/health

# 4. Frontend
curl -I http://localhost:3000/
```

**Results:** ☐ All pass ☐ Some fail (see detailed runsheet)

**Owner:** Backend Verifier | **Time:** [HH:MM]

---

## Step 5: Monitor (10 min)

```bash
# Watch health for 10 minutes
watch -n 5 'curl -s http://lb.prod/health | jq .status'

# Check error logs
docker logs backend 2>&1 | grep -i error | tail -20
```

**Metrics:**

| Metric             | Target | Status      |
| ------------------ | ------ | ----------- |
| API response (p50) | <100ms | ☐ OK ☐ HIGH |
| Auth success rate  | >99%   | ☐ OK ☐ LOW  |
| Error rate         | <0.1%  | ☐ OK ☐ HIGH |

**Owner:** DevOps + Backend | **Time:** [HH:MM]

---

## Decision: Rollback Complete?

**All green?**  
☐ **YES** → Rollback successful. Go to: _Notify Team_ (below)  
☐ **NO** → See escalation (detailed runsheet) or call Backend Lead immediately

---

## Notify Team

**Status:** ☐ Complete  
**Announcement:**

> Rollback complete. System restored to pre-cutover secrets. Auth/API/UI verified operational. RCA to follow within 24 hours.

**Channels:** Slack #incidents, #ops-team, stakeholder email  
**Owner:** Release Manager | **Time:** [HH:MM]

---

## Evidence Archive

- Backup secrets fingerprint: [file]
- env:check log: [file]
- Health check outputs: [file]
- Service logs: [folder]
- Incident ticket: [link]

---

## Signatures

| Role                   | Name   | Sig   | Time    |
| ---------------------- | ------ | ----- | ------- |
| Release Manager (auth) | [fill] | [sig] | [HH:MM] |
| DevOps Lead (exec)     | [fill] | [sig] | [HH:MM] |
| Backend (verify)       | [fill] | [sig] | [HH:MM] |

---

**Next:** Detailed RCA document (within 24h)  
**Related:** [production-secrets-cutover-rollback-runsheet-w1406.md](production-secrets-cutover-rollback-runsheet-w1406.md)
