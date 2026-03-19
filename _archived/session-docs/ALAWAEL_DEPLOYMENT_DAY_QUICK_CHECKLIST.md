# ALAWAEL v1.0.0 - Deployment Day Quick Reference Checklist

**Print This Document Before Deployment Day**

---

## 📋 DEPLOYMENT DAY CHECKLIST

**Deployment Date:** ________________  
**Deployment Lead:** ________________  
**Time Started:** ________________  
**Estimated End Time:** ________________ (+ 2 hours buffer)  

---

## ⏰ PHASE 2: GitHub Configuration (30-45 minutes)

**Timeline: [Start Time] → [End Time]**

**Assigned To:** ________________  

### Branch Protection
- [ ] Backend: Settings → Branches → Add rule for `main`
  - [ ] Require 1 pull request review
  - [ ] Require status checks
  - [ ] Require branches up to date
- [ ] ERP: Same settings for `main` branch
- [ ] Verify: Both repos show protected branch status

### Environments (Development/Staging/Production)
- [ ] Backend: Create 3 environments (dev, staging, prod)
- [ ] ERP: Create 3 environments (dev, staging, prod)
- [ ] Verify: All environments visible in repo settings
- [ ] Add required approvers for production environment

### GitHub Secrets
- [ ] Backend: Add 6 secrets (GITHUB_TOKEN, SONAR_TOKEN, etc.)
- [ ] ERP: Add 6 secrets
- [ ] Verify: All secrets show as "updated"
- [ ] Test: Try one API call using secrets

### Teams
- [ ] Create alawael-admins team (add: CTO, VP Eng, DevOps Lead)
- [ ] Create alawael-developers team (add: 5 backend + 3 ERP engineers)
- [ ] Create alawael-ops team (add: 2 DevOps + 2 Database)
- [ ] Create alawael-security team (add: Security engineer)
- [ ] Verify: All teams appear in organization

### Sign-Off
**Phase 2 Status:** ✅ COMPLETE / ❌ INCOMPLETE  
**Verified By:** ________________  
**Time Completed:** ________________  

❗ **DO NOT PROCEED** if any item unchecked

---

## ⏰ PHASE 3: Staging Deployment (45 minutes)

**Timeline: [Start Time] → [End Time]**

**Assigned To:** ________________  
**Backup Person:** ________________  

### Pre-Deployment
- [ ] Verify Phase 2 is COMPLETE
- [ ] Check staging environment is empty/clean
- [ ] Verify all Phase 3 metrics baseline captured
- [ ] Slack: Notify team "Staging deployment starting"
- [ ] Grafana: Open staging metrics dashboard
- [ ] Terminal: Check cloud credentials valid (`aws sts get-caller-identity`)

### Execute Deployment Script
```bash
bash alawael-phase3-staging-deploy.sh
```

- [ ] Script started successfully (no errors in first 10 seconds)
- [ ] Phase 3A: Pre-deployment validation passed
- [ ] Phase 3B: Green environment provisioned
- [ ] Phase 3C: Canary Stage 1 (5% traffic) - PASS
- [ ] Phase 3D: Canary Stage 2 (25% traffic) - PASS
- [ ] Phase 3E: Canary Stage 3 (50% traffic) - PASS
- [ ] Phase 3F: Canary Stage 4 (100% traffic) - PASS
- [ ] Phase 3G: Post-deployment validation - PASS

### Metrics Validation (Critical - All must PASS)
During script execution, verify in Grafana:
- [ ] Response Time P99: < 500ms (target: 475ms)
  - Actual: __________ ms ✅/❌
- [ ] Error Rate: < 0.05%
  - Actual: __________ % ✅/❌
- [ ] CPU Usage: < 80%
  - Actual: __________ % ✅/❌
- [ ] Memory Usage: < 85%
  - Actual: __________ % ✅/❌
- [ ] Uptime: 100%
  - Actual: __________ % ✅/❌

### Post-Deployment Actions
- [ ] Slack: Notify team "Staging deployment PASSED"
- [ ] Email: ops-team@alawael.company with logs link
- [ ] Verify: Log file created at `/tmp/alawael-staging-[ID].log`
- [ ] Archive: Save deployment ID for post-mortem: ________________

### Sign-Off
**Phase 3 Status:** ✅ PASS / ❌ FAIL  
**All Metrics Within SLA:** ✅ YES / ❌ NO  
**Verified By:** ________________  
**Time Completed:** ________________  

❗ **DO NOT PROCEED TO PHASE 4** if Phase 3 FAILED

---

## ⏰ PHASE 4: Production Deployment (30 minutes)

**Timeline: [Start Time] → [End Time]**

**Deployment Lead:** ________________  
**Backup Person:** ________________  
**CTO On Standby:** ✅ YES / ❌ NO  

### Pre-Deployment Verification

**Blue Environment (v0.9.8 - Current Production):**
- [ ] Response Time P99: < 500ms
  - Check: `curl https://api.alawael.company/api/health`
- [ ] Error Rate: < 0.05%
  - Check: Grafana production dashboard
- [ ] All servers responding: 5/5 healthy
  - Check: Load balancer health checks

**Team Ready:**
- [ ] On-Call Primary: ✅ Alerted & Standing by
- [ ] On-Call Secondary: ✅ Alerted & Standing by
- [ ] CTO: ✅ Available for decisions
- [ ] Support Lead: ✅ Notified & monitoring

**Approval:**
- [ ] Phase 3 Staging: ✅ PASSED
- [ ] Metrics baseline: ✅ CAPTURED
- [ ] Team consensus: ✅ READY TO DEPLOY
- [ ] CTO verbal approval: ✅ OBTAINED

### Execute Production Deployment
```bash
bash alawael-phase4-production-deploy.sh
```

**DEPLOYMENT RUNNING - DO NOT INTERRUPT**

- [ ] Script started (no errors in first 10 seconds)
- [ ] Step 1: Pre-deployment validation - PASS
- [ ] Step 2: Green environment provisioning - IN PROGRESS
- [ ] Step 3: Green validation - IN PROGRESS
- [ ] **CRITICAL**: Traffic switch running...

### Traffic Switch Validation (Most Critical - Watch This!)

**DURING T+0 (Traffic Switch at ~20-30 min mark):**
- [ ] Grafana: P99 response time live feed visible
- [ ] Grafana: Error rate live feed visible
- [ ] Dashboard: Traffic distribution (Blue 100% → Green 100%)
- [ ] Load balancer: 0 errors during switch
- [ ] Database: No connection pool spike

**IMMEDIATELY AFTER SWITCH (T+0 to T+5):**
- [ ] Response Time P99: Watch for spike then return
  - Expected: Temporary dip to 300-350ms, then 475-500ms
  - ❌ IF > 1000ms for > 30 seconds: **ROLLBACK**
- [ ] Error Rate: Watch for spike then return
  - Expected: Temporary dip to 0%, climb to < 0.05%
  - ❌ IF > 1% for > 30 seconds: **ROLLBACK**
- [ ] CPU: Watch on all servers
  - Expected: Temporary spike to 70-80%, then stabilize
  - ❌ IF > 90% for > 1 min: **ROLLBACK**
- [ ] Users Affected: Check chat/support tickets
  - Expected: Some "(connection reset)" messages (normal)
  - ❌ IF major spike in errors: **ROLLBACK**

### Post-Deployment Validation (5 minutes)
- [ ] Response Time P99: < 500ms (check in Grafana)
  - Actual: __________ ms ✅/❌
- [ ] Error Rate: < 0.05% (check in Grafana)
  - Actual: __________ % ✅/❌
- [ ] All servers: Green responding (5/5 healthy)
  - Check: Load balancer health check
- [ ] Database: Connected and synchronized
  - Check: Replication lag < 1 second
- [ ] Logs: No critical errors
  - Check: `/var/log/alawael-production.log` last 100 lines

### EMERGENCY ROLLBACK PROCEDURE

**If any of these occur, execute rollback IMMEDIATELY:**
- ❌ Response Time P99 > 1000ms AND sustained > 30 seconds
- ❌ Error Rate > 1% AND sustained > 30 seconds
- ❌ Data anomalies or corruption detected
- ❌ Database connections exhausted
- ❌ Customer reports major outage

**Execute Rollback (< 30 seconds):**
```bash
bash alawael-phase4-production-rollback.sh
```

- [ ] Script started
- [ ] Diagnostics captured from Green (for investigation)
- [ ] Traffic switching back to Blue...
- [ ] Blue responding (5/5 servers)
- [ ] Metrics returned to normal
- [ ] Slack alert sent to team

### Post-Phase 4 Documentation
- [ ] Deployment ID saved: ________________
- [ ] Start time: ________________
- [ ] Switch time: ________________
- [ ] End time: ________________
- [ ] Total duration: ________________ minutes

### Sign-Off
**Phase 4 Status:** ✅ SUCCESS / ❌ ROLLBACK  
**All Metrics Within SLA:** ✅ YES / ❌ NO  
**Deployment Lead Sign-Off:** ________________  
**CTO Sign-Off:** ________________  
**Time Completed:** ________________  

---

## ⏰ PHASE 5: Post-Deployment Monitoring (7 days)

**Starts:** [Deployment Day]  
**Ends:** [Deployment Day + 7 days]  

### Hour 1-24 (Intensive Monitoring)

**Hour 1-6:**
- [ ] On-Call Primary: Monitoring dashboard every 5 min
- [ ] Slack: Status updates every hour
- [ ] Critical Metrics Target:
  - P99 < 500ms (actual: ____________)
  - Error rate < 0.05% (actual: ____________)
  - No critical escalations

**Hour 7-24:**
- [ ] Daily checkpoints at 9 AM UTC
- [ ] Review metrics from past 24 hours
- [ ] Team sign-off: Ready for Day 2-7 monitoring

**Hourly Checkpoint Template (use for each hour):**
```
Hour #: ___  Time: ___:___
P99:        _____ ms ✅/❌
Error Rate: _____ % ✅/❌
CPU:        _____ % ✅/❌
Memory:     _____ % ✅/❌
Issues:     [None / List below]
  -
  -
Sign-off:   ________________
```

### Days 2-7 (Daily Monitoring)

**Daily Review Meeting: 9:00 AM UTC**

**Daily Checklist (repeat each day):**
- [ ] Day ___: All SLA metrics reviewed
- [ ] Metrics Within SLA: ✅ YES / ❌ NO
- [ ] New Issues Detected: ⭕ NONE / ❌ YES
  - If yes, document: ________________________________________
- [ ] Action Items: [None / List below]
  - 
  - 
- [ ] Team Sign-off: ________________

**Days 2-7 Metrics (Document Daily):**

| Day | P99 | Error % | CPU % | Memory % | Issues | Status |
|-----|-----|---------|-------|----------|--------|--------|
| 1 | ___ | ___ | ___ | ___ | None | ✅ |
| 2 | ___ | ___ | ___ | ___ | ___ | ✅/❌ |
| 3 | ___ | ___ | ___ | ___ | ___ | ✅/❌ |
| 4 | ___ | ___ | ___ | ___ | ___ | ✅/❌ |
| 5 | ___ | ___ | ___ | ___ | ___ | ✅/❌ |
| 6 | ___ | ___ | ___ | ___ | ___ | ✅/❌ |
| 7 | ___ | ___ | ___ | ___ | ___ | ✅/❌ |

### Phase 5 Sign-Off

**After 7 Days Complete:**
- [ ] All daily reviews completed
- [ ] All SLA metrics PASSED (100% compliance)
- [ ] Zero critical incidents
- [ ] Team confident & autonomous
- [ ] CTO approval to proceed to Phase 6

**Phase 5 Status:** ✅ PASS / ❌ ISSUES  
**CTO Sign-Off:** ________________  
**Date:** ________________  

---

## ⏰ PHASE 6: Decommission Blue Environment

**Timeline: [Day 9, ~24 hours after Phase 4]**

**Assigned To:** ________________  

### Pre-Decommission Checklist
- [ ] Phase 5 monitoring completed (7 days)
- [ ] All SLA metrics PASSED
- [ ] Blue environment idle for 24+ hours
- [ ] Backup of old environment completed
- [ ] CTO approval obtained

### Execute Decommission
```bash
bash alawael-phase6-decommission.sh
```

- [ ] Script started successfully
- [ ] Blue environment verification: PASSED
- [ ] Backup archival: COMPLETE
- [ ] Blue servers: Gracefully shutdown
- [ ] Infrastructure released
- [ ] Cost savings calculated: $5,600/month = $67,200/year
- [ ] Documentation updated

### Post-Decommission Verification
- [ ] Green (v1.0.0): All 5 servers receiving 100% traffic
- [ ] Blue (v0.9.8): Completely decommissioned
- [ ] Cost savings: Applied to next month's bill
- [ ] Team trained on Green-only operations

### Sign-Off
**Phase 6 Status:** ✅ COMPLETE / ❌ INCOMPLETE  
**Cost Savings Confirmed:** ________________  
**Verified By:** ________________  
**Date:** ________________  

---

## 📊 DEPLOYMENT SUCCESS SUMMARY

### Final Metrics (All Must Be ✅)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Downtime | 0 seconds | _____ seconds | ✅/❌ |
| P99 Response | <500ms | _____ ms | ✅/❌ |
| Error Rate | <0.05% | _____ % | ✅/❌ |
| Rollbacks Required | 0 | _____ | ✅/❌ |
| Data Loss | 0 bytes | _____ bytes | ✅/❌ |
| SLA Compliance | 100% | _____ % | ✅/❌ |

### Team Performance

- [ ] On-call response: < 5 minutes (maintained)
- [ ] Issue resolution: < 30 minutes (90% of issues)
- [ ] Customer impact: ZERO
- [ ] Team confidence: HIGH

### Business Results

- [ ] Revenue impact: ZERO (no customer churn)
- [ ] Cost savings: $67,200/year (Phase 6)
- [ ] Performance improvement: +19.4% throughput
- [ ] Compliance maintained: 99.6% score

### Executive Sign-Off

```
Deployment Successful:  ✅ YES / ❌ NO

CTO:        _________________  Date: __________

VP Ops:     _________________  Date: __________

Finance:    _________________  Date: __________


ALAWAEL v1.0.0 DEPLOYMENT COMPLETE ✅
```

---

## 📞 EMERGENCY CONTACTS

Keep these numbers handy:

| Role | Contact | Phone |
|------|---------|-------|
| **On-Call Primary** | ________________ | ________________ |
| **On-Call Secondary** | ________________ | ________________ |
| **CTO** | ________________ | ________________ |
| **VP Operations** | ________________ | ________________ |

**Slack War Room:** #alawael-war-room  
**PagerDuty Escalation:** alawael-oncall  

---

## ✅ Final Reminders

**Before You Start:**
- [ ] Print this document
- [ ] Have all contact numbers ready
- [ ] Open Slack #alawael-war-room
- [ ] Open Grafana dashboard
- [ ] Have rollback script terminal ready
- [ ] Notify stakeholders: "Deployment starting in 30 minutes"

**During Deployment:**
- ❌ **DO NOT** interrupt script execution
- ✅ **DO** monitor metrics on Grafana in real-time
- ✅ **DO** communicate status updates every 30 min
- ⚡ **BE READY** with rollback command if metrics fail

**After Successful Phase 4:**
- ✅ Activate 24/7 monitoring (Phase 5)
- ✅ Schedule daily review meetings
- ✅ Prepare Phase 6 decommission plan
- ✅ Begin Phase 7 optimization

---

**Good Luck! You've got this! 🚀**

**ALAWAEL v1.0.0 - Zero-Downtime Production Deployment**

---

*Last Updated: February 22, 2026*  
*Print Date: ________________*  
*Printed By: ________________*
