# 👥 TEAM TRAINING & KNOWLEDGE TRANSFER GUIDE
## Pre-Launch Operations Readiness

**Version**: 1.0
**Created**: 25 February 2026
**Target Audience**: Operations Team, Support Team, Developers
**Training Duration**: 8 hours (2 sessions)

---

## 🎯 Training Objectives

By end of training, team will be able to:

✅ **Monitor System Health**
- Understand key metrics and what they mean
- Identify normal vs abnormal behavior
- Access and read dashboards

✅ **Respond to Incidents**
- Classify incident severity  
- Follow playbooks correctly
- Communicate during incidents
- Escalate appropriately

✅ **Perform Common Operational Tasks**
- Deploy new versions safely
- Rollback if needed
- Restart services
- Perform backups and restores

✅ **Troubleshoot Issues**
- Read logs effectively
- Identify root causes
- Know when to escalate
- Document findings

✅ **Maintain System Security**
- Protect credentials
- Monitor for threats
- Follow security procedures
- Report suspicious activity

---

## 📚 Pre-Training Assignments (Complete Before Day 1)

### For all team members:
- [ ] Read [System Architecture Overview](./ARCHITECTURE.md) (30 min)
- [ ] Watch [API Demo Video](./DEMO_VIDEO.md) (20 min)
- [ ] Review [Glossary of Terms](#glossary-of-terms) (15 min)
- [ ] Setup local dashboard access (Datadog/Grafana) (15 min)

### For operations/support:
- [ ] Read [Monitoring Guide](./MONITORING_OPERATIONS_GUIDE_PRODUCTION.md) (45 min)
- [ ] Read [Incident Response Playbooks](./PRODUCTION_DEPLOYMENT_CHECKLIST_COMPLETE.md#incident-playbooks) (30 min)

### For developers:
- [ ] Review [API Documentation](./API_DOCS.md) (1 hour)
- [ ] Review [Database Schema](./DB_SCHEMA.md) (45 min)

---

## 📅 Training Schedule

### Day 1: System Overview & Monitoring (4 hours)
```
9:00-9:30    Welcome & Agenda
9:30-10:15   System Architecture Deep Dive
10:15-11:00  Metrics & Monitoring Setup
11:00-11:15  BREAK
11:15-12:00  Dashboard Walkthrough
12:00-1:00   LUNCH
1:00-1:45    Alert Handling Simulation
1:45-2:30    Q&A & Hands-on Practice
```

### Day 2: Incident Response & Operations (4 hours)
```
9:00-9:30    Review Day 1 Learnings
9:30-10:30   Incident Response Procedures
10:30-11:15  Playbook Walkthroughs
11:15-11:30  BREAK
11:30-12:30  Incident Simulation Exercises
12:30-1:30   LUNCH
1:30-2:00    Deployment & Rollback Procedures
2:00-2:30    Q&A & Knowledge Check
```

---

## 🏗️ Session 1: System Architecture & Monitoring

### Part A: System Architecture (45 min)

**Learning Objectives:**
□ Understand how system components connect
□ Know what each service does
□ Understand data flow
□ Recognize single points of failure

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────────────┐
│                     CDN (CloudFlare)                     │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│          Application Load Balancer (AWS ALB)             │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼─────┐ ┌────▼──────┐ ┌───▼──────────┐
│  Node #1    │ │  Node #2  │ │   Node #3    │
│ :3000       │ │ :3000     │ │   :3000      │
│ ┌─────────┐ │ │┌─────────┐│ │┌──────────┐ │
│ │Express  │ │ ││Express  ││ ││Express   │ │
│ │Middleware││ ││Middleware││ ││Middleware│ │
│ └────┬────┘ │ │└────┬────┘│ │└────┬─────┘ │
└──────┼──────┘ └─────┼──────┘ └─────┼──────┘
       │              │              │
       └──────────────┼──────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼──────┐  ┌──────▼─────┐  ┌────────▼──┐
│ RDS DB   │  │Redis Cache │  │S3 Storage │
│PostgreSQL│  │ Cluster    │  │ (Assets)  │
└──────────┘  └────────────┘  └───────────┘

Data Flow:
User → Load Balancer → API Server → Cache/DB → Response
```

**Key Components to Know:**

| Component | Purpose | Critical? | Failover |
|-----------|---------|-----------|----------|
| Load Balancer | Distribute requests | YES | Built-in redundancy |
| API Servers (3x) | Process requests | Any 2 can handle load | Auto-scaling |
| Database (RDS) | Persistent data | YES | Multi-AZ failover |
| Redis Cache | Speed up responses | NO | Fall back to DB |
| S3 Storage | File/asset storage | NO | CloudFront backup |

**Single Points of Failure to Monitor:**
❌ Database is critical - monitor replication
❌ Load Balancer - ensure health checks pass
✅ API Servers - 3 servers provide redundancy
✅ Cache - system works without it (slower)

---

### Part B: Key Metrics & What They Mean (45 min)

**Golden Signals (Most Important):**

```
1️⃣ LATENCY - How fast is API responding?
   ├─ Normal: p95 < 200ms
   ├─ Warning: 200-500ms 
   ├─ Critical: > 500ms
   └─ Action: Check database, cache hits, application logs

2️⃣ TRAFFIC - How many requests?
   ├─ Normal: Baseline usage
   ├─ Warning: 2x baseline
   ├─ Critical: 5x baseline (capacity exceeded)
   └─ Action: Scale up, check for attacks

3️⃣ ERRORS - What's breaking?
   ├─ Normal: < 0.1% error rate
   ├─ Warning: 0.1-1%
   ├─ Critical: > 1%
   └─ Action: Check logs, identify root cause

4️⃣ SATURATION - How full is system?
   ├─ CPU: Normal < 60%, Warning > 80%
   ├─ Memory: Normal < 70%, Warning > 90%
   ├─ DB Connections: Warning when near max
   └─ Action: Scale, optimize code, or kill slow queries
```

**Dashboard Walkthrough:**

**Main Dashboard View:**
```
┌────────────────────────────────────────────────┐
│ ALAWAEL PRODUCTION - Real-Time Status           │
├────────────────────────────────────────────────┤
│ ✅ All Systems Healthy                         │
├────────────────────────────────────────────────┤
│                                                 │
│ API Latency        Requests/sec   Error Rate   │
│ ▓▓▓▓░░ 145ms      ▓▓▓▓▓░ 1200/s    ▓░░░░ 0.3% │
│ (healthy)         (high but ok)    (normal)   │
│                                                 │
├────────────────────────────────────────────────┤
│                                                 │
│ Database            Cache Hits     CPU Usage   │
│ ▓▓▓▓▓░ 95% conn   ▓▓▓▓▓▓ 96%      ▓▓▓░░ 55%  │
│ (warning)         (excellent)     (healthy)   │
│                                                 │
├────────────────────────────────────────────────┤
│ ⚠️  1 Warning: Database connections at 95%    │
│ → Action: Auto-scaling should kick in soon    │
└────────────────────────────────────────────────┘
```

---

## 🚨 Session 2: Incident Response

### Part A: Incident Severity Classification (30 min)

**P0 (Critical - Page Immediately)**
```
❌ Service completely down
❌ Cannot login (authentication broken)
❌ Data loss detected
❌ Security breach detected
❌ Payment system not working

Actions:
├─ Declare war room immediately
├─ Page all on-call staff
├─ CEO & VP notified
├─ Aim to resolve in < 5 minutes
└─ Public status page updated
```

**P1 (High - Page within 15 minutes)**
```
⚠️  Error rate > 5%
⚠️  API latency p95 > 500ms
⚠️  Major feature not working
⚠️  Database connections exhausted
⚠️  Cache system down

Actions:
├─ Page on-call engineer
├─ Team lead notified
├─ Resolve within 15-30 minutes
└─ Team Slack notification
```

**P2 (Medium - Email & Slack)**
```
⚠️  Error rate 1-5%
⚠️  API latency p95 > 200ms
⚠️  Non-critical feature broken
⚠️  CPU > 80%

Actions:
├─ Send Slack message
├─ Email to team
├─ Resolve in next 1-2 hours
└─ Document findings
```

**P3 (Low - Slack only)**
```
ℹ️  Minor performance issue
ℹ️  Non-urgent optimization
ℹ️  Documentation needs update

Actions:
├─ Log in system
├─ No immediate action needed
└─ Address in normal work
```

### Part B: Response Playbooks (60 min)

#### Playbook #1: API Latency is High (p95 > 200ms)

```
┌─ START: Someone reports slow API
│
├─ Step 1: Confirm in Dashboard
│  └─ Check Datadog/Grafana for p95 latency
│
├─ Step 2: Check Database Performance
│  Command:
│  SELECT query, mean_exec_time, calls 
│  FROM pg_stat_statements 
│  ORDER BY mean_exec_time DESC LIMIT 10;
│
│  Indicators:
│  ✅ < 50ms: Normal
│  ⚠️  50-200ms: Investigate
│  ❌ > 200ms: Fix immediately
│
├─ Step 3: Check Cache Hit Rate
│  Expected: > 90%
│  If < 90%: Rebuild cache with:
│  npm run cache:rebuild
│
├─ Step 4: Check Resource Usage
│  CPU: Should be < 70%
│  Memory: Should be < 80%
│
│  If high:
│  └─ Scale up: kubectl scale deployment alawael-backend --replicas=5
│
├─ Decision Tree:
│  High database time?
│  ├─ YES: Optimize query (add index if needed)
│  └─ NO: Check cache/CPU
│
│  Low cache hits?
│  ├─ YES: Rebuild cache
│  └─ NO: Check CPU usage
│
│  High CPU?
│  ├─ YES: Scale up instances
│  └─ NO: Investigate application code
│
└─ Resolution: Log issue + timeline in incident tracker
```

**Hands-on Practice:**
Instructor shows a slow query and team must:
1. [ ] Identify it in dashboard
2. [ ] Connect to database
3. [ ] Find the slow query
4. [ ] Suggest optimization (index? code change?)

---

#### Playbook #2: High Error Rate (> 1%)

```
┌─ START: Error rate alert triggered
│
├─ Step 1: Assess Severity
│  Error rate 1-5%? → P2 (medium)
│  Error rate > 5%?  → P1 (high)
│
├─ Step 2: Identify Error Type
│  Check logs for patterns:
│  tail -f /var/log/alawael-error.log | grep -i error
│
│  Common patterns:
│  ├─ "Database connection timeout" → Database issue
│  ├─ "Cannot read property of undefined" → Code bug
│  ├─ "Rate limited" → Too much traffic
│  ├─ "Authentication failed" → Auth system issue
│  └─ "Timeout" → External service slow
│
├─ Step 3: Find Recent Changes
│  git log --oneline -10
│  Was there a deployment today?
│  ├─ YES: Consider rollback
│  └─ NO: Check infrastructure changes
│
├─ Step 4: Decide: Fix or Rollback?
│  Flowchart:
│  Can you fix in 5 minutes?
│  ├─ YES: Apply hot fix
│  └─ NO: Rollback and fix offline
│
│  To rollback:
│  kubectl rollout undo deployment/alawael-backend
│  Wait 2-3 min for health checks
│
├─ Step 5: Investigate Root Cause
│  1. What exactly is erroring?
│  2. When did it start?
│  3. What changed?
│  4. Who needs to know?
│
└─ Resolution: Document + create bug ticket
```

**Hands-on Practice:**
Instructor introduces an error (code change) and team must:
1. [ ] Spot high error rate alert
2. [ ] Identify error type from logs
3. [ ] Decide: fix or rollback?
4. [ ] Execute decision
5. [ ] Verify it's resolved

---

#### Playbook #3: Database Connection Pool Exhausted

```
┌─ START: "Too many connections" error
│
├─ Step 1: Check Current Connections
│  SELECT count(*) FROM pg_stat_activity;
│
│  Safe: < 50 connections
│  Warning: 50-80 connections  
│  Critical: > 80 connections (out of 100 max)
│
├─ Step 2: Identify Culprits
│  SELECT application_name, count(*), state
│  FROM pg_stat_activity
│  GROUP BY application_name, state;
│
│  Look for:
│  ├─ Idle connections (stuck)
│  ├─ Connections from old servers
│  └─ Connections in transaction
│
├─ Step 3: Force Close Old Connections
│  SELECT pg_terminate_backend(pid) 
│  FROM pg_stat_activity 
│  WHERE state = 'idle' AND query_start < now() - interval '30 minutes';
│
├─ Step 4: Scale the Application
│  Current app instances: 3
│  New required: 5
│  kubectl scale deployment alawael-backend --replicas=5
│  Wait for health checks: 2-3 minutes
│
├─ Step 5: Increase Database Connections (temporary)
│  Update RDS parameter group:
│  max_connections = 150 (was 100)
│  Requires: DB restart (5-10 min downtime)
│  ⚠️  Only if absolutely necessary
│
└─ Resolution: Monitor connections, adjust pooling config
```

---

### Part C: Deployment & Rollback (30 min)

**Safe Deployment Procedure:**

```
Step 1: Prepare Release
├─ Version bump: v1.2.3
├─ Update changelog
├─ Run full test suite
│  npm test ✅ (all passing)
└─ Commit & push to main

Step 2: Build & Test
├─ GitHub Actions triggers
├─ Build Docker image
├─ Run automated tests: ✅
├─ Security scan: ✅
└─ Build artifacts ready

Step 3: Staging Deployment
├─ Deploy to staging environment
├─ Run smoke tests:
│  ├─ Can login? ✅
│  ├─ Can create transaction? ✅
│  └─ Can generate report? ✅
├─ Performance check: < 200ms p95 ✅
└─ Team verifies

Step 4: Production Deployment (Canary)
├─ Deploy to 25% of servers (1 of 4)
├─ Monitor for 10 minutes:
│  ├─ Error rate: normal? ✅
│  ├─ Latency: normal? ✅
│  └─ No customer complaints? ✅
├─ Deploy to 50% (2 of 4)
├─ Monitor for 10 minutes: ✅
├─ Deploy to 100% (all servers)
├─ Final monitoring: 30 minutes
└─ Mark deployment complete

Step 5: Post-Deployment
├─ Monitor metrics for 1 hour
├─ Check error logs
├─ Customer feedback? Any issues?
└─ Team high-five! 🎉
```

**Rollback Procedure (if issues found):**

```
Decision: When to rollback?
├─ Error rate > 2%? → YES
├─ Latency degraded > 50%? → YES
├─ Customer reports core feature broken? → YES
└─ Still debugging after 15 min? → YES

Execute Rollback:
1. github.com/alawael/backend/deployments
2. Click "Rollback" button
3. Confirm version to revert to
4. Wait for health checks (3-5 min)
5. Verify previous version working
6. Announce rollback in #incidents
7. Schedule post-mortem

Expected: Back to stable state in 5-10 minutes
```

---

## 📝 Knowledge Check Exam

**Part 1: Scenario-Based (20 questions, 15 min)**

**Scenario 1:**
Error rate jumps from 0.1% to 3% at 2:47 PM.
Your action in order:
[ ] Check dashboard for error type
[ ] Check logs for error message
[ ] Check git log for recent changes
[ ] Decide: fix or rollback?
[ ] Communicate on Slack
[ ] Implement solution

---

**Scenario 2:**
Customer reports: "API is super slow, taking 5 seconds to respond."
Your first action:
A) Restart servers
B) Check dashboard for latency metrics
C) Increase database connections
D) Scale up to more servers

**Answer**: B - Always verify the problem first

---

**Scenario 3:**
You see "Database connection pool exhausted" error.
What's the first diagnostic command?
```
[ ] SELECT count(*) FROM pg_stat_activity;
[ ] kubectl restart deployment alawael-backend
[ ] aws rds restart-db-instance
[ ] Check CloudWatch metrics
```

**Part 2: Practical Skills**

**Task 1:** (5 min)
Connect to production database and answer:
- How many DB connections are active right now?
- What's the largest table by size?

**Task 2:** (5 min)
Access Datadog dashboard and find:
- What's the current error rate?
- What's the slowest endpoint?

**Task 3:** (10 min)
A deployment failed mid-way.
Show me how to rollback to previous version.

---

## 📚 Glossary of Terms

**API Latency** - How long it takes for API to respond to a request
- Measured in milliseconds (ms)
- p95 means 95% of requests are this fast or faster
- Threshold: < 200ms is good

**Error Rate** - Percentage of requests that fail (return 5xx)
- Normal: < 0.1%
- Warning: 0.1 - 1%
- Critical: > 1%

**Request Per Second (RPS/QPS)** - How many API calls per second
- Used to measure traffic
- Peak can be 10x average

**Cache Hit Rate** - Percentage of requests served from cache (not database)
- > 90% is good
- < 80% means cache needs rebuild or bigger

**Connection Pool** - Pre-established database connections ready to use
- Faster than creating new connection each time
- Limited max (usually 100)

**Replication** - Backup database synchronized with primary
- Used for failover
- Lag = delay between primary & replica
- Should be < 1 second

**Rollback** - Returning to previous working version after bad deployment
- RTO = time to get working (target < 5 min)
- RPO = how much data loss (target 0)

**Canary Deployment** - Release to small % of users first
- Catch issues before 100% exposure
- Typical: 25% → 50% → 100%

**Blue-Green Deployment** - Keep two production environments
- Blue = current version
- Green = new version
- Switch traffic when ready

**Circuit Breaker** - Stops requests to failing service
- Prevents cascading failures
- Automatically re-enables when service recovers

**Rate Limiter** - Limits requests per user/IP
- Prevents abuse
- Returns 429 (Too Many Requests) when limit exceeded

---

## 🎓 Certification

**Upon Completion of Training:**

Each team member receives:
```
┌─────────────────────────────────────┐
│   ALAWAEL PRODUCTION OPERATIONS      │
│           CERTIFIED                   │
│                                       │
│  [Team Member Name]                  │
│                                       │
│  Has successfully completed training │
│  and demonstrated competency in:     │
│  □ System monitoring                  │
│  □ Incident response                  │
│  □ Troubleshooting procedures        │
│  □ Deployment & rollback              │
│                                       │
│  Valid: 25 FEB 2026 - 25 FEB 2027    │
│  Certification ID: OPS-2026-[####]   │
└─────────────────────────────────────┘
```

**Continuing Education:**
- Monthly: Review 1 incident postmortem (30 min)
- Quarterly: Update on new features/architecture (1 hour)
- Annual: Full training refresher (4 hours)

---

## 📞 Support Contacts

| Issue Type | Primary Contact | Backup | Response Time |
|-----------|-----------------|--------|----------------|
| Alert/Impact | On-Call Engineer | Eng Manager | < 5 min |
| Deployment Q | DevOps Lead | Backend Lead | < 15 min |
| Database Issue | DBA | DevOps Lead | < 10 min |
| Troubleshooting | Your Team | On-Call | < 30 min |
| General Q | Engineering Lead | anyone | < 1 hour |

---

## 📋 Pre-Launch Checklist

- [ ] All team members completed Day 1 training
- [ ] All team members completed Day 2 training
- [ ] Knowledge check exam passed (> 80%)
- [ ] Hands-on simulations completed successfully
- [ ] Dashboard access configured for all
- [ ] On-call rotation established
- [ ] Emergency contacts updated
- [ ] Runbook printed and posted
- [ ] Slack channels created (#incidents, #deployments, #alerts)
- [ ] PagerDuty configured with escalation paths
- [ ] War room setup instructions documented
- [ ] Post-incident review process agreed upon

---

**Training Material Created**: 25 February 2026
**Training Completion Target**: 27 February 2026
**Go-Live Date**: Week of March 18-22, 2026

🎓 Let's get the team ready for production! 🚀
