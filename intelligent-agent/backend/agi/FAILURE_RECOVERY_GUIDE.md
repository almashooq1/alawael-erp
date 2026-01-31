# 🔄 Failure Recovery & Remediation Guide

دليل التعافي من الأعطال والإصلاح

**Document Type**: Recovery Guide  
**Version**: 1.0.0  
**Created**: January 30, 2026  
**Owner**: DevOps Lead + QA Lead

---

## 🎯 Purpose

Provide fast-track procedures for identifying, diagnosing, and recovering from
failures during Phase 4 testing. This guide enables rapid response to minimize
test delays.

---

## 📋 Failure Severity Levels

**Critical (P1)**: Test suite completely blocked, launch risk

- Recovery Time: < 30 minutes
- Escalation: Immediate (CTO)
- Fallback: Activate contingency plan

**High (P2)**: Test suite significantly impacted, limited functionality

- Recovery Time: < 2 hours
- Escalation: Manager + team
- Fallback: Work around or skip test category

**Medium (P3)**: Single test or feature affected

- Recovery Time: < 4 hours
- Escalation: Team lead
- Fallback: Retry or escalate

**Low (P4)**: Minor impact, non-blocking

- Recovery Time: < 8 hours
- Escalation: None (log for later)
- Fallback: Continue with other tests

---

## 🎯 Failure Category 1: Infrastructure Failures

### 1.1 Kubernetes Cluster Node Down

**Symptoms**:

- Pod evictions observed
- "Node not ready" status
- 0 ready replicas

**Diagnosis** (2 min):

```bash
# Check node status
kubectl get nodes -o wide

# Identify failed node
kubectl describe node <node-name>

# Check pod events
kubectl get events -n scm-staging --sort-by='.lastTimestamp'
```

**Recovery** (10-15 min):

**Option A: Node Recovery** (if temporary issue)

```bash
# Drain node (move pods elsewhere)
kubectl drain <node-name> --ignore-daemonsets

# Cordon node (prevent new pods)
kubectl cordon <node-name>

# Investigate issue (disk space, memory pressure, etc.)
ssh <node-ip>
df -h          # Check disk
free -h        # Check memory
journalctl -u kubelet -n 50  # Check logs

# If fixable, uncordon
kubectl uncordon <node-name>
```

**Option B: Node Replacement** (if failed)

```bash
# Create new node (via cloud provider)
aws ec2 run-instances --image-id ami-xxxxx --instance-type t3.xlarge

# Delete failed node
kubectl delete node <node-name>

# New node auto-joins cluster
# Verify
kubectl get nodes -o wide
```

**Rollback**: N/A (automatic pod restart)

**Severity**: P1 (test suite blocked)  
**Owner**: DevOps Lead  
**Escalate if**: > 30 min to recover

---

### 1.2 Database Connection Pool Exhausted

**Symptoms**:

- Application error: "too many connections"
- Database logs: "FATAL: remaining connection slots reserved for non-replication
  superuser connections"
- p95 latency spike

**Diagnosis** (1 min):

```bash
# Check active connections
psql -h postgres-postgresql.scm-databases -U postgres -c \
  "SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;"

# Check PgBouncer stats
redis-cli -h pgbouncer -p 6432 SHOW stats
```

**Recovery** (5-10 min):

**Option A: Restart PgBouncer** (safe, reconnects)

```bash
# Restart PgBouncer
kubectl rollout restart deployment/pgbouncer -n scm-databases

# Verify
kubectl get pods -n scm-databases | grep pgbouncer
```

**Option B: Increase Connection Limits**

```bash
# Edit PgBouncer config
kubectl edit cm pgbouncer-config -n scm-databases

# Increase:
# max_client_conn = 2000  (was 1000)
# default_pool_size = 50  (was 25)

# Restart to apply
kubectl rollout restart deployment/pgbouncer -n scm-databases
```

**Option C: Kill Idle Connections**

```bash
# Kill idle connections > 5 minutes
psql -h postgres-postgresql.scm-databases -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND now() - query_start > '5 minutes'::interval;"
```

**Severity**: P1 (load tests fail)  
**Owner**: DevOps Lead  
**Escalate if**: > 15 min to recover

---

### 1.3 Redis Cache Unavailable

**Symptoms**:

- Application error: "Redis connection timeout"
- Grafana dashboard shows no cache metrics
- Application performance degrades

**Diagnosis** (1 min):

```bash
# Check Redis pod status
kubectl get pods -n scm-staging -l app=redis

# Check Redis connectivity
kubectl exec -n scm-staging pod/redis-master-0 -- redis-cli ping
```

**Recovery** (5-10 min):

**Option A: Restart Redis** (safe)

```bash
# Restart Redis master
kubectl delete pod redis-master-0 -n scm-staging

# Wait for restart
kubectl get pods -n scm-staging -l app=redis -w
```

**Option B: Clear Cache** (if memory issue)

```bash
# Connect to Redis
kubectl exec -n scm-staging pod/redis-master-0 -- redis-cli

# Clear cache
FLUSHDB

# Verify
DBSIZE
```

**Option C: Scale Out** (if capacity)

```bash
# Add Redis replicas
helm upgrade redis bitnami/redis \
  --namespace scm-staging \
  --reuse-values \
  --set replica.replicaCount=3
```

**Severity**: P2 (performance degrades, not blocked)  
**Owner**: DevOps Lead  
**Escalate if**: > 20 min to recover

---

## 🎯 Failure Category 2: Application Failures

### 2.1 Application Crash (500 errors)

**Symptoms**:

- HTTP 500 errors in load test
- Application logs: "FATAL error"
- Pods restarting repeatedly (CrashLoopBackOff)

**Diagnosis** (2 min):

```bash
# Check pod status
kubectl get pods -n scm-staging -l app=scm-backend

# Check logs
kubectl logs -n scm-staging deployment/scm-backend --tail=100

# Check previous crash logs
kubectl logs -n scm-staging deployment/scm-backend --previous

# Check pod events
kubectl describe pod <pod-name> -n scm-staging
```

**Recovery** (10-20 min):

**Option A: Revert Last Deployment**

```bash
# Check rollout history
kubectl rollout history deployment/scm-backend -n scm-staging

# Revert to previous version
kubectl rollout undo deployment/scm-backend -n scm-staging

# Verify
kubectl rollout status deployment/scm-backend -n scm-staging
```

**Option B: Disable New Features**

```bash
# Connect to pod and disable feature flag
kubectl exec -n scm-staging pod/<pod-name> -- \
  redis-cli SET feature:phase4_ai_analysis enabled false

# Restart pod
kubectl delete pod <pod-name> -n scm-staging
```

**Option C: Increase Resource Limits**

```bash
# If OOMKilled (out of memory)
kubectl patch deployment scm-backend -n scm-staging -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

**Severity**: P1 (test suite blocked)  
**Owner**: DevOps Lead + Dev Lead  
**Escalate if**: > 30 min to recover

---

### 2.2 High Error Rate (> 1%)

**Symptoms**:

- k6 reports error rate > 1%
- Application logs: repeated errors
- Specific test scenario failing

**Diagnosis** (3 min):

```bash
# Check error patterns
kubectl logs -n scm-staging deployment/scm-backend \
  --tail=200 | grep ERROR | sort | uniq -c | sort -rn

# Check specific error
kubectl logs -n scm-staging deployment/scm-backend \
  --tail=500 | grep "403\|404\|500"
```

**Recovery** (15-30 min):

**Option A: Fix Application Bug**

```bash
# Identify affected code path
# Create hotfix commit
git commit -m "Hotfix: Fix [error description]"

# Rebuild image
docker build -t scm:backend-phase4-hotfix .

# Redeploy
kubectl set image deployment/scm-backend \
  backend=scm:backend-phase4-hotfix -n scm-staging

# Monitor
kubectl logs -n scm-staging deployment/scm-backend -f
```

**Option B: Adjust Load Test Threshold**

```bash
# If error rate acceptable for use case
# Update k6 test threshold
k6 run load_test.js --threshold error_rate<0.5%
```

**Option C: Scale Up Capacity**

```bash
# If errors due to overload
kubectl scale deployment scm-backend --replicas=5 -n scm-staging

# Verify load reduction
kubectl get pods -n scm-staging -l app=scm-backend
```

**Severity**: P1 or P2 (depends on error type)  
**Owner**: Dev Lead + DevOps Lead  
**Escalate if**: > 1 hour to resolve

---

## 🎯 Failure Category 3: Test Failures

### 3.1 UAT Test Fails (Regression)

**Symptoms**:

- UAT test marked FAIL
- Test steps complete but result doesn't match expected
- Manual test on same system passes (flaky test)

**Diagnosis** (5 min):

```
[ ] Reproduce test locally
[ ] Check test data (is data seeded?)
[ ] Check test environment (staging vs local)
[ ] Review test logs/screenshots
[ ] Check recent code changes (git log --oneline -20)
[ ] Compare with baseline results
```

**Recovery** (15-45 min):

**Step 1: Root Cause Analysis**

- Is it a code bug? → Dev fixes + redeploy
- Is it a data issue? → Reseed data + rerun
- Is it a flaky test? → Improve test reliability
- Is it environmental? → Fix environment + rerun

**Step 2: Remediation**

```
If Code Bug:
  [ ] Developer fixes
  [ ] Code review
  [ ] Redeploy
  [ ] Rerun test
  [ ] Document change in TESTING_METRICS_DASHBOARD.md

If Data Issue:
  [ ] Reseed test data
  [ ] Verify data count/integrity
  [ ] Rerun test

If Flaky Test:
  [ ] Add explicit waits
  [ ] Improve test assertion
  [ ] Add retry logic
  [ ] Rerun 3x to confirm stable

If Environmental:
  [ ] Fix infrastructure issue
  [ ] Verify fix
  [ ] Rerun test
```

**Severity**: P2 or P3  
**Owner**: QA Lead + Dev Lead  
**Escalate if**: > 45 min to resolve

---

### 3.2 Performance Test Fails (p95 > threshold)

**Symptoms**:

- k6 reports p95 > 200ms
- Threshold check fails
- Specific API endpoint slow

**Diagnosis** (3 min):

```bash
# Review k6 results
k6 run load_test.js --summary-export=results.json
cat results.json | grep p95

# Check database performance
psql -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Check application metrics
kubectl logs -n scm-staging deployment/scm-backend | grep "Response time"
```

**Recovery** (30-60 min):

**Option A: Optimize Database Queries**

```
[ ] Identify slow query (> 50ms)
[ ] Run EXPLAIN ANALYZE
[ ] Add index if needed
[ ] Verify execution time < 20ms
[ ] Rerun load test
```

**Option B: Optimize Cache**

```
[ ] Check cache hit rate
[ ] Add missing cache keys
[ ] Increase cache TTL
[ ] Verify hit rate > 70%
[ ] Rerun load test
```

**Option C: Optimize Code**

```
[ ] Profile application (FlameGraph)
[ ] Identify bottleneck
[ ] Optimize algorithm
[ ] Redeploy
[ ] Rerun load test
```

**Option D: Scale Infrastructure**

```bash
# Increase backend replicas
kubectl scale deployment scm-backend --replicas=5 -n scm-staging

# Verify p95 improves
# Run load test again
```

**Severity**: P1 (may block go-live)  
**Owner**: DevOps Lead + Dev Lead  
**Escalate if**: > 1 hour to resolve

---

## 🎯 Failure Category 4: Security Test Failures

### 4.1 Critical Vulnerability Found

**Symptoms**:

- SAST scan reports Critical severity finding
- Code injection or auth bypass detected
- Go-Live decision at risk

**Diagnosis** (5 min):

```
[ ] Review vulnerability details in SonarQube
[ ] Determine if exploitable
[ ] Check if in Phase 4 code or pre-existing
[ ] Assess blast radius
[ ] Check if false positive
```

**Recovery** (Priority-dependent):

**If False Positive**:

```
[ ] Mark as false positive in SonarQube
[ ] Document reason
[ ] Proceed with testing
[ ] Time: 10 minutes
```

**If Pre-Existing (not Phase 4 code)**:

```
[ ] Document in risk register
[ ] Escalate to security team
[ ] Decide: Fix now vs accept risk
[ ] Time: 1-2 hours (decision time)
```

**If Phase 4 Code (new vulnerability)**:

```
[ ] Immediate code review by developer
[ ] Create emergency fix
[ ] Code review by security lead
[ ] Patch + test (< 1 hour)
[ ] Re-run SAST scan
[ ] Document fix
```

**Severity**: P1 (may block go-live)  
**Owner**: Security Lead + Dev Lead  
**Escalate if**: High priority fix needed

---

### 4.2 Dependency Vulnerability (critical package)

**Symptoms**:

- npm audit reports Critical in dependency
- Package needs immediate update
- Supply chain risk

**Diagnosis** (2 min):

```bash
npm audit
npm list <package-name>
```

**Recovery** (30-60 min):

```bash
# Option A: Update package
npm update <package-name>
npm audit

# Option B: Patch package version
npm audit fix --force

# Test after update
npm test
npm run test:integration

# Rebuild + redeploy
docker build -t scm:backend-phase4
kubectl set image deployment/scm-backend backend=scm:backend-phase4
```

**Severity**: P1 (go-live risk)  
**Owner**: DevOps Lead + Dev Lead  
**Escalate if**: Update breaks application

---

## 📞 Escalation Path

```
Level 1: Individual Contributor
  └─ Diagnose issue, attempt fix
  └─ If > 15 min, escalate

Level 2: Team Lead (QA, Dev, DevOps)
  └─ Review diagnosis
  └─ Authorize fix/workaround
  └─ If > 1 hour, escalate

Level 3: Manager (QA Manager, Dev Manager, Infrastructure Manager)
  └─ Executive decision on timeline impact
  └─ Allocate additional resources
  └─ If > 4 hours, escalate

Level 4: Executive (CTO, Product Manager)
  └─ Go/No-Go decision impact
  └─ Launch timeline decision
  └─ Stakeholder communication
```

---

## 🚨 Critical Response Checklist

For P1/Critical failures:

```
Within 5 minutes:
[ ] Assess severity
[ ] Page on-call lead
[ ] Create incident ticket
[ ] Post in Slack #incidents

Within 15 minutes:
[ ] Gather diagnostics
[ ] Start investigation
[ ] Update incident status

Within 30 minutes:
[ ] Identify root cause
[ ] Activate recovery procedure
[ ] Estimate resolution time

Within 1 hour:
[ ] Implement fix/workaround
[ ] Verify resolution
[ ] Re-run affected tests

Post-incident:
[ ] Document in TESTING_METRICS_DASHBOARD.md
[ ] Post-mortem (what happened, why, prevention)
[ ] Share learnings with team
```

---

## ✅ Sign-Off

**DevOps Lead**: **********\_\_********** Date: **\_\_**

**QA Lead**: **********\_\_********** Date: **\_\_**

**Dev Lead**: **********\_\_********** Date: **\_\_**

**CTO**: **********\_\_********** Date: **\_\_**

---

## 📚 Related Documents

- PHASE_4_WEEK1_PROCEDURES.md
- PHASE_4_WEEK2_PROCEDURES.md
- PHASE_4_WEEK3_PROCEDURES.md
- PHASE_4_WEEK4_PROCEDURES.md
- TESTING_METRICS_DASHBOARD.md
- GO_LIVE_DECISION_FRAMEWORK.md
