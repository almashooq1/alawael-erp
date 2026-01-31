# بطاقات المراجعة السريعة - المرحلة 5

# PHASE 5 QUICK REFERENCE CARDS

**الغرض | Purpose:** بطاقات مرجعية قابلة للطباعة سريعة للفريق أثناء الاستجابة
للحوادث والعمليات  
**الصيغة | Format:** A6 cards (printable 4 per page)  
**تاريخ الطباعة | Print Date:** Before Feb 1, 2026

---

## 1. بطاقة التصعيد السريع | Quick Escalation Card

```
┌─────────────────────────────────┐
│  PHASE 5 ESCALATION MATRIX      │
│  Quick Reference Card           │
├─────────────────────────────────┤
│ SEVERITY → ACTION                │
├─────────────────────────────────┤
│ 🔴 SEV-1 (CRITICAL)              │
│    Downtime / Security           │
│    ├─ Trigger: System down       │
│    ├─ Response: 15 min           │
│    ├─ RTO: <4 hours              │
│    └─ Escalate: L1→L2→L3→L4     │
│       All levels notified        │
│                                 │
│ 🟠 SEV-2 (HIGH)                  │
│    Performance Degraded          │
│    ├─ Trigger: >180ms latency   │
│    ├─ Response: 30 min           │
│    ├─ RTO: <8 hours              │
│    └─ Escalate: L2 after 15min  │
│                                 │
│ 🟡 SEV-3 (MEDIUM)                │
│    Operational Issues            │
│    ├─ Trigger: Config issues    │
│    ├─ Response: 2 hours          │
│    ├─ RTO: <24 hours             │
│    └─ Track in Jira             │
│                                 │
│ 🟢 SEV-4 (LOW)                   │
│    Minor Issues                  │
│    ├─ Trigger: Non-critical     │
│    ├─ Response: 24 hours         │
│    ├─ RTO: <72 hours             │
│    └─ Schedule for next sprint  │
│                                 │
├─────────────────────────────────┤
│ L1: Ops Team (15 min response)   │
│ L2: Managers (30 min response)   │
│ L3: Team Leads (1 hr response)   │
│ L4: Directors (2 hrs response)   │
│                                 │
│ Emergency: +1-555-EMERGENCY     │
│ Slack: #critical-incidents      │
└─────────────────────────────────┘
```

---

## 2. بطاقة مؤشرات الأداء | KPI Quick Reference Card

```
┌─────────────────────────────────┐
│  PHASE 5 KPIs                   │
│  Quick Reference Card           │
├─────────────────────────────────┤
│ 1️⃣ RESPONSE TIME (P95)           │
│   ├─ Target: <120ms              │
│   ├─ Baseline: 95ms              │
│   ├─ Alert: >150ms               │
│   └─ Escalate: >180ms            │
│                                 │
│ 2️⃣ ERROR RATE                    │
│   ├─ Target: <0.12%              │
│   ├─ Baseline: 0.08%             │
│   ├─ Alert: >0.20%               │
│   └─ Escalate: >0.30%            │
│                                 │
│ 3️⃣ UPTIME                        │
│   ├─ Target: 99.99%              │
│   ├─ Baseline: 99.98%            │
│   ├─ Alert: <99.95%              │
│   └─ Escalate: <99.90%           │
│                                 │
│ 4️⃣ MTTR (Mean Time to Recovery)  │
│   ├─ Target: <20 min             │
│   ├─ Baseline: 18 min            │
│   ├─ Alert: >25 min              │
│   └─ Escalate: >35 min           │
│                                 │
│ 5️⃣ USER SATISFACTION             │
│   ├─ Target: 4.75/5              │
│   ├─ Baseline: 4.8/5             │
│   ├─ Alert: <4.6/5               │
│   └─ Escalate: <4.5/5            │
│                                 │
│ 6️⃣ COST/TRANSACTION              │
│   ├─ Target: -10% = $0.0405      │
│   ├─ Baseline: $0.045            │
│   ├─ Alert: >$0.055              │
│   └─ Escalate: >$0.065           │
│                                 │
├─────────────────────────────────┤
│ Dashboard: Grafana Executive     │
│ URL: https://grafana/phase5      │
└─────────────────────────────────┘
```

---

## 3. بطاقة الحوادث | Incident Response Card

```
┌─────────────────────────────────┐
│  INCIDENT RESPONSE               │
│  Quick Response Card             │
├─────────────────────────────────┤
│ WHEN YOU SEE AN ALERT:           │
│                                 │
│ ✓ Step 1: CONFIRM (1 min)        │
│   ├─ Is it a real incident?      │
│   ├─ Check Grafana for pattern   │
│   └─ Confirm in logs             │
│                                 │
│ ✓ Step 2: CLASSIFY (1 min)       │
│   ├─ Determine severity (1-4)    │
│   ├─ Identify affected service   │
│   └─ Note start time             │
│                                 │
│ ✓ Step 3: RESPOND (0-30 min)     │
│   ├─ Select playbook by type:    │
│   │  • High Latency               │
│   │  • High Error Rate            │
│   │  • Uptime Anomaly             │
│   │  • Cost Overrun               │
│   │  • Support Pressure           │
│   ├─ Follow 5-step procedures    │
│   └─ Track time to resolution    │
│                                 │
│ ✓ Step 4: ESCALATE (if >SLA)     │
│   ├─ Contact next level (L2)     │
│   ├─ Share findings so far       │
│   └─ Continue investigation      │
│                                 │
│ ✓ Step 5: RESOLVE & LOG          │
│   ├─ Update incident status      │
│   ├─ Document resolution         │
│   ├─ Calculate MTTR              │
│   └─ Schedule RCA meeting        │
│                                 │
├─────────────────────────────────┤
│ Playbooks: See Runbook            │
│ Tracking: Jira (OPS project)     │
│ Communication: Slack #incidents  │
└─────────────────────────────────┘
```

---

## 4. بطاقة دليل التشغيل | Runbook Quick Card

```
┌─────────────────────────────────┐
│  PHASE 5 RUNBOOK                │
│  Quick Reference Card           │
├─────────────────────────────────┤
│ DAILY PROCEDURES:                │
│                                 │
│ 08:00 - MORNING CHECK             │
│   1. Open Grafana dashboard      │
│   2. Check all 6 KPIs            │
│   3. Review overnight alerts     │
│   4. Note any anomalies          │
│   5. Sign morning checklist      │
│                                 │
│ 12:00 - MID-DAY CHECK             │
│   1. KPI status snapshot         │
│   2. Check support queue         │
│   3. Verify database connections│
│   4. Update daily checklist      │
│                                 │
│ 18:00 - EVENING CLOSE             │
│   1. Generate daily report       │
│   2. Review day's incidents      │
│   3. Document anomalies          │
│   4. Prepare handoff to on-call  │
│   5. Sign off daily checklist    │
│                                 │
│ EMERGENCY PROCEDURES:             │
│                                 │
│ IF LATENCY >180ms (HIGH):        │
│   → Trigger: HighLatencyPlaybook │
│   → Actions: CPU check, query    │
│   → Escalate: L2 if >15 min     │
│                                 │
│ IF ERROR RATE >0.20% (HIGH):     │
│   → Trigger: HighErrorPlaybook   │
│   → Actions: Log analysis, find  │
│   → Escalate: Dev team + L2      │
│                                 │
│ IF UPTIME <99.95% (CRITICAL):   │
│   → Trigger: Critical alert      │
│   → Actions: Immediate response  │
│   → Escalate: All L1-L4          │
│                                 │
├─────────────────────────────────┤
│ Full Runbook: PHASE_5_RUNBOOK.md │
│ Playbooks: PHASE_5_OPS_PLAYBOOKS│
└─────────────────────────────────┘
```

---

## 5. بطاقة جهات الاتصال | Contacts Card

```
┌─────────────────────────────────┐
│  EMERGENCY CONTACTS              │
│  Phase 5 Quick Card              │
├─────────────────────────────────┤
│ LEVEL 1 - OPERATIONS TEAM         │
│ (First responders - 24/7)         │
│   Primary: _______________        │
│   Phone: _______________          │
│   Backup: _______________         │
│   Phone: _______________          │
│                                 │
│ LEVEL 2 - MANAGERS                │
│ (Escalation - 30 min response)    │
│   Ops Manager: ______________     │
│   Phone: _______________          │
│   Tech Manager: ______________    │
│   Phone: _______________          │
│                                 │
│ LEVEL 3 - TEAM LEADS              │
│ (Strategic - 1 hr response)       │
│   Ops Lead: _______________       │
│   Phone: _______________          │
│   Tech Lead: _______________      │
│   Phone: _______________          │
│                                 │
│ LEVEL 4 - DIRECTORS               │
│ (Executive - 2 hrs response)      │
│   VP Operations: _______________  │
│   Phone: _______________          │
│   CTO: _______________            │
│   Phone: _______________          │
│                                 │
│ OTHER CONTACTS:                  │
│   Security: _______________       │
│   Database: _______________       │
│   Infrastructure: _____________   │
│                                 │
├─────────────────────────────────┤
│ Emergency Line: +1-555-HELP      │
│ Slack: #emergency-only (tag @ops)│
│ Email: ops-emergency@company.com │
│                                 │
│ NEVER ignore a SEV-1 alert!      │
│ ESCALATE if stuck >SLA time!     │
└─────────────────────────────────┘
```

---

## 6. بطاقة اختبار الإنذار | Alert Testing Card

```
┌─────────────────────────────────┐
│  ALERT TESTING PROCEDURE         │
│  Quick Reference Card            │
├─────────────────────────────────┤
│ BEFORE EACH SHIFT START:         │
│                                 │
│ 🧪 Test 1: Slack Alert            │
│    Command: /testslack           │
│    Expected: Message in          │
│              #operations         │
│    ✓ Pass / ✗ Fail               │
│                                 │
│ 🧪 Test 2: Email Alert            │
│    Command: /testemail           │
│    Expected: Email received      │
│              in <1 minute        │
│    ✓ Pass / ✗ Fail               │
│                                 │
│ 🧪 Test 3: PagerDuty Alert        │
│    Command: /testpagerduty       │
│    Expected: Incident in         │
│              PagerDuty           │
│    ✓ Pass / ✗ Fail               │
│                                 │
│ 🧪 Test 4: Dashboard Access       │
│    1. Open Grafana               │
│    2. Check all 6 dashboards     │
│    3. Verify data refreshing     │
│    ✓ Pass / ✗ Fail               │
│                                 │
│ 🧪 Test 5: Database Access        │
│    Command: SELECT COUNT(*) FROM │
│              transactions;       │
│    Expected: <1 second response  │
│    ✓ Pass / ✗ Fail               │
│                                 │
│ IF ANY TEST FAILS:                │
│ ├─ DO NOT START YOUR SHIFT       │
│ ├─ Call L2 Manager immediately   │
│ ├─ Wait for fix verification     │
│ └─ Repeat all tests before work  │
│                                 │
├─────────────────────────────────┤
│ Test Log: See operations checklist│
│ Support: Slack #operations       │
└─────────────────────────────────┘
```

---

## 7. بطاقة SLA | SLA Card

```
┌─────────────────────────────────┐
│  SERVICE LEVEL AGREEMENTS        │
│  Quick Reference Card            │
├─────────────────────────────────┤
│ 5 CORE SLAs - MUST MEET:          │
│                                 │
│ 1. UPTIME: 99.99%                 │
│    └─ Max downtime: 5.4 min/mo  │
│                                 │
│ 2. RESPONSE TIME: P95 <120ms      │
│    └─ 95% of requests <120ms    │
│                                 │
│ 3. ERROR RATE: <0.12%             │
│    └─ Max 12 errors per 10K     │
│                                 │
│ 4. MTTR: <20 minutes              │
│    └─ Fix incidents quickly      │
│                                 │
│ 5. SUPPORT: <15 min first response│
│    └─ Initial response required  │
│                                 │
├─────────────────────────────────┤
│ IF SLA BREACHED:                  │
│                                 │
│ 1. IMMEDIATE ESCALATION:          │
│    → Notify L2 within 5 min      │
│    → Update incident status      │
│    → Calculate time to restore   │
│                                 │
│ 2. ROOT CAUSE:                    │
│    → Identify what went wrong    │
│    → Why was SLA breached?       │
│    → When will it be fixed?      │
│                                 │
│ 3. CUSTOMER NOTIFICATION:         │
│    → Inform customer if external │
│    → Provide status updates      │
│    → Compensate if required      │
│                                 │
│ 4. TRACKING:                      │
│    → Log in SLA monitoring       │
│    → Report to leadership        │
│    → Schedule review meeting     │
│                                 │
│ NO EXCUSES - SLA IS COMMITMENT!  │
├─────────────────────────────────┤
│ SLA Details: PHASE_5_SLA_PACK.md │
└─────────────────────────────────┘
```

---

## 8. بطاقة التغييرات | Change Management Card

```
┌─────────────────────────────────┐
│  CHANGE MANAGEMENT               │
│  Quick Reference Card            │
├─────────────────────────────────┤
│ CHANGE WINDOWS:                  │
│   Tuesday & Thursday             │
│   20:00 - 22:00 UTC              │
│   (Only these times allowed!)    │
│                                 │
│ CHANGE TYPES:                    │
│                                 │
│ 🟢 STANDARD (Auto-approved)      │
│    ├─ 24-hour notice             │
│    ├─ Low risk changes           │
│    ├─ Config updates             │
│    └─ Minor patches              │
│                                 │
│ 🟡 NORMAL (Manual approval)      │
│    ├─ 48-hour notice             │
│    ├─ Medium risk                │
│    ├─ Database schema changes    │
│    └─ API updates                │
│                                 │
│ 🔴 EMERGENCY (Executive approval)│
│    ├─ <2-hour notice             │
│    ├─ High risk                  │
│    ├─ Security patches           │
│    └─ Critical fixes             │
│                                 │
│ CHANGE REQUEST PROCESS:           │
│                                 │
│ 1. SUBMIT REQUEST:                │
│    ├─ File: CHANGE_TEMPLATE.md   │
│    ├─ Include: What/Why/When     │
│    ├─ Risk: Low/Med/High         │
│    └─ Rollback: Yes/No           │
│                                 │
│ 2. APPROVAL CHAIN:                │
│    ├─ QA Lead review (24h)       │
│    ├─ Tech Lead approval         │
│    ├─ Ops Lead sign-off          │
│    └─ Schedule deployment        │
│                                 │
│ 3. TESTING:                       │
│    ├─ Staging validation         │
│    ├─ Automated tests pass       │
│    └─ Rollback tested            │
│                                 │
│ 4. DEPLOYMENT:                    │
│    ├─ Execute in window          │
│    ├─ Monitor for issues         │
│    ├─ Confirm success            │
│    └─ Document results           │
│                                 │
├─────────────────────────────────┤
│ Change Calendar: PHASE_5_CHANGE_ │
│ Workflow: PHASE_5_CHANGE_APPROVAL│
└─────────────────────────────────┘
```

---

## 9. بطاقة النسخ الاحتياطي | Backup Card

```
┌─────────────────────────────────┐
│  BACKUP & RECOVERY               │
│  Quick Reference Card            │
├─────────────────────────────────┤
│ BACKUP SCHEDULE:                 │
│                                 │
│ Daily Backups (Full):             │
│   └─ Time: 23:00 UTC             │
│   └─ Location: /backups/daily    │
│   └─ Retention: 7 days           │
│                                 │
│ Weekly Backups (Archive):         │
│   └─ Time: Sunday 23:00 UTC      │
│   └─ Location: /backups/weekly   │
│   └─ Retention: 30 days          │
│                                 │
│ RTO/RPO TARGETS:                  │
│   ├─ RTO (Recovery Time): <15min │
│   ├─ RPO (Data Loss): <1 min     │
│   └─ Both MUST be met!           │
│                                 │
│ IF DATABASE FAILURE:              │
│                                 │
│ IMMEDIATE:                        │
│ 1. Alert received at 00:00       │
│ 2. Verify failure (< 5 min)      │
│ 3. Trigger recovery (< 10 min)   │
│                                 │
│ RECOVERY STEPS:                   │
│ 1. Stop all applications         │
│ 2. Restore from latest backup    │
│ 3. Apply transaction logs        │
│ 4. Verify data integrity         │
│ 5. Resume applications           │
│ 6. Monitor for errors            │
│                                 │
│ SUCCESS = RTO <15 min            │
│                                 │
│ TESTING:                          │
│ └─ Monthly backup restore test   │
│   └─ Verify RTO/RPO targets      │
│   └─ Document any issues         │
│                                 │
├─────────────────────────────────┤
│ Runbook: PHASE_5_RUNBOOK.md      │
│ Contact: Database Admin          │
└─────────────────────────────────┘
```

---

## 10. Printing Instructions

```
PRINT THESE CARDS:

1. Paper: Cardstock (A6 size, 4.1" × 5.8")
   OR: Print 4 per page on A4 and trim

2. Copies needed:
   - Ops Team (12): 3 sets each = 36 total
   - Support Team (15): 2 sets each = 30 total
   - Dev Team (10): 1 set = 10 total
   - Managers (5): 1 set = 5 total
   - Security (3): 1 set = 3 total
   Total: ~85 cards

3. Lamination:
   - Recommended for durability
   - Use matte finish (easier to read in glare)

4. Distribution:
   - Hand out Feb 1 during training
   - Keep spare set at front desk
   - Distribute again at Feb 8 deployment

5. Storage:
   - Keep in pocket or near workstation
   - Accessible during incidents
   - Refer to when in doubt!

REMEMBER:
These cards are a quick reference, NOT a replacement
for full documentation. Always consult the full Runbook
and Playbooks for complex procedures.
```

---

**✅ QUICK REFERENCE CARDS READY FOR PRINTING**

Print Date: Before February 1, 2026  
Total Cards: ~85 copies needed  
Distribution: During Phase 5 Training Week  
Use: Daily operations and incident response

---

**Print these cards and carry them during Phase 5 operations!**
