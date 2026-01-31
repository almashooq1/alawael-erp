# مجموعة أدوات الاستجابة للحوادث - المرحلة 5

# PHASE 5 INCIDENT RESPONSE TOOLKIT

**الغرض | Purpose:** مجموعة شاملة من الأدوات والقوالب لفريق استجابة الحوادث  
**الهدف | Goal:** تقليل MTTR من 18 دقيقة إلى <20 دقيقة (SLA)  
**المسؤول | Owner:** Ops Lead  
**آخر تحديث | Last Updated:** January 30, 2026

---

## 1. مقدمة | Introduction

مجموعة متكاملة من أدوات ونماذج وإجراءات لفريق العمليات لضمان استجابة سريعة
وفعالة للحوادث. تتضمن قوالس التقارير والفحوصات والإجراءات المعيارية.

**Comprehensive incident response toolkit with templates, checklists, decision
trees, and automation scripts ensuring Phase 5 Ops team achieves <20 min MTTR
SLA.**

---

## 2. قالب تقرير الحادثة | Incident Report Template

### Form 1: Incident Intake Form

```markdown
# INCIDENT REPORT

**Incident ID:** INC-2026-\_**\_ **Report Time:** \_\_\_\_** UTC **Reported
By:** ******\_\_\_\_******

## INITIAL INFORMATION

**Incident Title:** **************\_\_\_**************

**Severity Level:** (Select one)

- [ ] SEV-1 (CRITICAL) - System down / Security breach
- [ ] SEV-2 (HIGH) - Degraded performance / Data issues
- [ ] SEV-3 (MEDIUM) - Partial service / Config issues
- [ ] SEV-4 (LOW) - Minor issues / User impact minimal

**Affected Service(s):**

- [ ] API
- [ ] Database
- [ ] Payment Gateway
- [ ] Cache Layer
- [ ] Message Queue
- [ ] Other: ******\_\_\_******

**Customers Impacted:** ********\_********

**Start Time:** **\_** UTC (when did user first notice?)

**Detection Method:** (How was it found?)

- [ ] Customer report
- [ ] Automated alert
- [ ] Internal monitoring
- [ ] Other: ******\_\_\_******

## INITIAL SYMPTOMS

**What's happening?** (in 1-2 sentences)

---

**How many users affected?**

---

**Error messages seen?**

---

**Logs available?** Yes / No If yes, URL or location: ********\_********

## INITIAL TRIAGE (Ops L1)

**Confirmed?** (Real incident, not false alarm?)

- [ ] Yes, real incident
- [ ] Investigating further
- [ ] False alarm - close

**Likely root cause (initial guess):**

---

**Who should be involved?**

- [ ] Database team
- [ ] Development team
- [ ] Infrastructure team
- [ ] Security team
- [ ] Other: ******\_\_\_******

**Next steps:**

---

---

**Form completed by:** ******\_\_\_\_****** **Time:** **\_\_** UTC
**Signature:** ******\_\_\_\_******
```

### Form 2: Incident Escalation Form

```markdown
# INCIDENT ESCALATION NOTICE

**Incident ID:** INC-2026-\_**\_ **Escalation Time:** \_\_\_\_** UTC **Escalated
By:** ******\_\_\_\_******

## ESCALATION REASON

**Why escalating?**

- [ ] SLA at risk (>50% of time used)
- [ ] Issue not resolved after 10 min
- [ ] Issue not resolved after 30 min
- [ ] New information requires different expertise
- [ ] Customer contacted with escalation
- [ ] Other: ******\_\_\_******

**Current Status:**

---

**What L1 has tried so far:**

---

**What failed:**

---

## ESCALATION TARGET

**Escalating to:** L\_\_ (L2/L3/L4?)

**Contact name:** ******\_\_\_\_****** **Method:** [ ] Slack [ ] Phone [ ] Pager
**Time sent:** **\_\_** UTC

## HANDOVER CHECKLIST

- [ ] All logs collected and attached
- [ ] Current dashboard state documented
- [ ] Affected users notified
- [ ] Workaround attempted (if available)
- [ ] Previous incidents searched
- [ ] Customer communication plan agreed

---

**Incident status:** [ ] Open [ ] Escalated [ ] Resolved

**Follow-up required:** Yes / No
```

---

## 3. قائمة فحص الحادثة | Incident Checklist

### Phase 1: Triage (First 2 minutes)

```
⏱️ TRIAGE CHECKLIST (Max 2 minutes)

□ CONFIRM INCIDENT
  □ Is it real? (Not a false alarm)
  □ Check multiple data sources
  □ Verify with team member

□ DETERMINE SEVERITY
  □ Is system down? (SEV-1)
  □ Is performance degraded? (SEV-2)
  □ Is there data loss? (SEV-1)
  □ How many customers affected?

□ IDENTIFY IMPACT
  □ Which service is down?
  □ What's the scope?
  □ Is it geographic or global?
  □ What's the revenue impact?

□ ESTIMATE DURATION
  □ How long has it been down?
  □ Is it getting worse/better/stable?
  □ When did it start?

□ INITIAL ACTIONS
  □ Post to #incidents Slack channel
  □ Create Jira ticket
  □ Notify manager
  □ Start timer (MTTR clock)
  □ Begin data collection

NEXT: Go to Investigation Phase
```

### Phase 2: Investigation (First 10 minutes)

```
🔍 INVESTIGATION CHECKLIST (10 minutes)

□ GATHER INFORMATION
  □ Pull last 30 min of logs
  □ Check dashboard for anomalies
  □ Review recent changes
  □ Check resource usage (CPU/Memory/Disk)
  □ Verify database connections
  □ Check message queue depth
  □ Monitor error rate and latency

□ CHECK DEPENDENCIES
  □ Is database responding? (5 sec test)
  □ Is cache layer responding? (5 sec test)
  □ Are external APIs responding? (5 sec test)
  □ Is message queue healthy? (5 sec test)
  □ Network connectivity OK? (ping test)

□ LOOK FOR PATTERNS
  □ Did this happen before?
  □ Search incident history (similar symptoms)
  □ Check deployed changes in last 24h
  □ Look for correlation in metrics
  □ Check server logs for errors

□ FORM HYPOTHESIS
  □ What's the most likely cause?
  □ Probability estimate: High/Med/Low
  □ Supporting evidence: ____________
  □ Alternative theories: ___________

□ ESCALATION DECISION
  □ Can L1 fix this? (Yes/No)
  □ Time spent so far: ___ min
  □ If >5 min, escalate to L2
  □ If unsure, escalate (better safe)

NEXT: Go to Resolution Phase (if L1 can fix) or Escalation
```

### Phase 3: Resolution (Time varies by severity)

```
🔧 RESOLUTION CHECKLIST

□ APPLY FIX
  □ Document what you're changing
  □ Make ONE change at a time
  □ Have rollback ready
  □ Monitor impact of change
  □ Wait 2-3 min before next change

□ VERIFY FIX
  □ Is error rate back to normal?
  □ Is latency back to normal?
  □ Are customer complaints stopping?
  □ Are dashboards showing green?
  □ Can you reproduce the issue?

□ PREVENT RECURRENCE
  □ What's the root cause?
  □ Is this a known issue?
  □ Can we prevent it happening again?
  □ Do we need code fix or config change?

□ COMMUNICATE
  □ Notify customers (if relevant)
  □ Post resolution in Slack
  □ Update incident ticket
  □ Record resolution time

NEXT: Go to RCA Phase
```

### Phase 4: Post-Incident (RCA)

```
📋 POST-INCIDENT CHECKLIST

□ SCHEDULE RCA
  □ RCA meeting scheduled within 24h
  □ All involved parties invited
  □ Time: ______ Date: ______

□ COLLECT DATA
  □ Full incident timeline documented
  □ All logs saved for analysis
  □ Performance metrics captured
  □ Customer impact quantified

□ DOCUMENT INCIDENT
  □ Incident report completed
  □ Severity level confirmed
  □ Duration recorded: ___ min
  □ MTTR calculated: ___ min
  □ Did we meet SLA? Yes/No

□ SCHEDULE PREVENTION
  □ Is root cause identified?
  □ Can we prevent this?
  □ Action item created
  □ Owner assigned
  □ Timeline: ____________

NEXT: Complete RCA template (see Section 4)
```

---

## 4. قالب RCA (تحليل السبب الجذري) | RCA Template

```markdown
# ROOT CAUSE ANALYSIS (RCA) REPORT

**Incident ID:** INC-2026-\_**\_ **RCA Completed:** \_\_\_\_** UTC

## INCIDENT SUMMARY

**Title:** **************\_\_\_\_************** **Severity:** SEV-** **Start
Time:** \_\_\_\_** UTC **End Time:** **\_\_** UTC **Duration:** **_ minutes
**MTTR:** _** minutes **SLA Met?** Yes / No (target: 20 min)

**Customers Impacted:** **\_ (count) **Estimated Revenue Impact:** $\_\_\_**

---

## 5-WHY ANALYSIS

**Why #1: What happened?**

---

**Why #2: Why did that happen?**

---

**Why #3: Why did THAT happen?**

---

**Why #4: Why did THAT happen?**

---

**Why #5: Why did THAT happen?**

---

**ROOT CAUSE:** (The real reason)

---

---

## TIMELINE

| Time         | Action                | Owner  |
| ------------ | --------------------- | ------ |
| **\_\_** UTC | Incident detected     | **\_** |
| **\_\_** UTC | Escalation to L2      | **\_** |
| **\_\_** UTC | Root cause identified | **\_** |
| **\_\_** UTC | Fix applied           | **\_** |
| **\_\_** UTC | Service restored      | **\_** |
| **\_\_** UTC | Customer notification | **\_** |

---

## CONTRIBUTING FACTORS

- [ ] Insufficient monitoring
- [ ] Lack of alerting
- [ ] Manual process failure
- [ ] Recent code change
- [ ] Configuration error
- [ ] Resource exhaustion
- [ ] External dependency failure
- [ ] Other: ******\_\_\_******

---

## CORRECTIVE ACTIONS (Next 30 days)

| Action   | Owner  | Deadline | Status |
| -------- | ------ | -------- | ------ |
| **\_\_** | **\_** | **\_\_** | [ ]    |
| **\_\_** | **\_** | **\_\_** | [ ]    |
| **\_\_** | **\_** | **\_\_** | [ ]    |

---

## PREVENTIVE ACTIONS (Long-term)

| Action   | Owner  | Target   | Status |
| -------- | ------ | -------- | ------ |
| **\_\_** | **\_** | **\_\_** | [ ]    |
| **\_\_** | **\_** | **\_\_** | [ ]    |

---

**RCA Approved By:** ******\_\_\_\_****** **Date:** **\_\_** UTC
```

---

## 5. شجرة القرار | Decision Trees

### High Latency Incident

```
    LATENCY ALERT (>180ms)
            │
    ┌───────┴────────┐
    │  Confirm real? │
    └───────┬────────┘
            │
    ┌───────┴────────┐
    │ Check dashboard│ ─→ SEV-2 High
    └───────┬────────┘
            │
    ┌───────┴──────────────┐
    │ Cause?               │
    │ • CPU high? ──┐      │
    │ • Memory high?├─→ Auto-scale
    │ • Slow query? ├─→ Query optimization
    │ • Network lag?├─→ Network check
    │ • Unknown? ───┴─→ Escalate L2
    └──────────────────────┘

    RESOLUTION TIME TARGET: 10 minutes
    SLA ESCALATION: >15 minutes
```

### High Error Rate Incident

```
    ERROR RATE ALERT (>0.20%)
            │
    ┌───────┴────────┐
    │ Confirm type?  │
    └───────┬────────┘
            │
    ┌───────┴──────────────┐
    │ Cause?               │
    │ • 5xx errors? ─┐     │
    │ • 4xx errors? ├─→ Investigate logs
    │ • Timeout? ────┼─→ Check dependencies
    │ • Application?─┴─→ Contact dev team
    └──────────────────────┘

    IF DEV NEEDED: Escalate L2

    RESOLUTION TIME TARGET: 15 minutes
    SLA ESCALATION: >30 minutes
```

### Uptime Anomaly

```
    UPTIME ANOMALY (<99.95%)
            │
    ┌───────┴──────────┐
    │ System down?     │
    └───────┬──────────┘
            │
        YES │ NO
            ├─────────────────┐
            │                 │
        CRITICAL          Check degradation
        SEV-1             SEV-2
            │                 │
    ┌───────┴────────┐  ┌────┴─────────┐
    │ Immediate     │  │ Investigate  │
    │ escalation    │  │ performance  │
    │ to L1-L4      │  │ metrics      │
    └───────────────┘  └──────────────┘

    RESOLUTION TIME TARGET: 4 hours
    SLA ESCALATION: >8 hours
```

---

## 6. الأتمتة والسكريبتات | Automation & Scripts

### Script 1: Incident Creation (Automated)

```bash
#!/bin/bash
# incident_auto_create.sh
# Creates Jira ticket on alert trigger

ALERT_NAME=$1
SEVERITY=$2
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

DESCRIPTION="
Alert: $ALERT_NAME
Severity: $SEVERITY
Detected: $TIMESTAMP
Status: New
Owner: Unassigned
"

curl -X POST "$JIRA_URL/rest/api/3/issue" \
  -H "Authorization: Bearer $JIRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"fields\": {
      \"project\": {\"key\": \"OPS\"},
      \"issuetype\": {\"name\": \"Incident\"},
      \"summary\": \"$ALERT_NAME\",
      \"description\": \"$DESCRIPTION\",
      \"priority\": {\"name\": \"$SEVERITY\"},
      \"labels\": [\"phase5\", \"auto-created\"]
    }
  }"

echo "Incident created"
```

### Script 2: Data Collection (On-Demand)

```bash
#!/bin/bash
# incident_data_collect.sh
# Collects diagnostic data

INCIDENT_ID=$1
OUTDIR="/tmp/incident-$INCIDENT_ID"
mkdir -p $OUTDIR

# Collect logs (last 30 min)
curl -s "http://elasticsearch/logs/_search?size=10000" \
  -d '{"query":{"range":{"@timestamp":{"gte":"now-30m"}}}}' \
  > $OUTDIR/logs-30min.json

# Collect metrics
curl -s "http://prometheus:9090/api/v1/query_range?query=up&start=..." \
  > $OUTDIR/metrics-30min.json

# Collect system stats
free -h > $OUTDIR/memory.txt
ps aux > $OUTDIR/processes.txt
df -h > $OUTDIR/disk.txt

# Collect database info
mysql -e "SHOW PROCESSLIST;" > $OUTDIR/db-processes.txt

# Compress
tar -czf $OUTDIR.tar.gz $OUTDIR

echo "Data collected: $OUTDIR.tar.gz"
```

### Script 3: Alert Notification

```bash
#!/bin/bash
# send_incident_alert.sh

INCIDENT_ID=$1
SEVERITY=$2
SUMMARY=$3

# Slack message
SLACK_MSG="{
  \"text\": \"⚠️ Incident Alert\",
  \"blocks\": [
    {\"type\": \"header\", \"text\": {\"type\": \"plain_text\", \"text\": \"Incident INC-$INCIDENT_ID\"}},
    {\"type\": \"section\", \"text\": {\"type\": \"mrkdwn\", \"text\": \"*Severity:* $SEVERITY\n*Summary:* $SUMMARY\"}},
    {\"type\": \"section\", \"text\": {\"type\": \"mrkdwn\", \"text\": \"<https://jira/browse/INC-$INCIDENT_ID|View Details>\"}},
    {\"type\": \"section\", \"text\": {\"type\": \"mrkdwn\", \"text\": \"<!channel> New incident requires attention\"}}
  ]
}"

curl -X POST $SLACK_WEBHOOK \
  -H 'Content-type: application/json' \
  -d "$SLACK_MSG"

echo "Alert sent to Slack"
```

---

## 7. معايير الأداء | Performance Metrics

### MTTR Target: <20 minutes

```
Breakdown by phase:
├─ Triage (Confirm incident): 2 min max
├─ Investigation (Root cause): 8 min max
├─ Resolution (Fix applied): 5 min max
├─ Verification (Confirm fix): 3 min max
└─ Communication (Notify users): 2 min max
   ────────────────────────────────
   TOTAL MTTR: 20 minutes (SLA)

Target distribution:
- 80% of incidents: <20 min
- 95% of incidents: <35 min
- 99% of incidents: <60 min
```

### Alert Response SLA

```
SLA Response Times by Severity:

Sev-1 (Critical):
├─ Alert received
├─ L1 acknowledges: <15 min
├─ L2 engaged: <30 min
└─ Resolution begins: <60 min

Sev-2 (High):
├─ Alert received
├─ L1 acknowledges: <30 min
├─ L2 engaged: <60 min
└─ Resolution begins: <120 min

Sev-3 (Medium):
├─ Alert received
├─ L1 reviews: <2 hours
└─ Scheduled for resolution

Sev-4 (Low):
└─ Batched in weekly review
```

---

## 8. Knowledge Base Links

```
QUICK LINKS FOR INCIDENTS:

Playbooks:
├─ High Latency Response
│  └─ PHASE_5_OPS_PLAYBOOKS.md (Section 1)
├─ Error Rate Response
│  └─ PHASE_5_OPS_PLAYBOOKS.md (Section 2)
├─ Scaling Response
│  └─ PHASE_5_OPS_PLAYBOOKS.md (Section 4)
├─ Security Incident Response
│  └─ PHASE_5_OPS_PLAYBOOKS.md (Section 5)
└─ Support Load Response
   └─ PHASE_5_OPS_PLAYBOOKS.md (Section 3)

Operational Guides:
├─ Runbook
│  └─ PHASE_5_RUNBOOK.md
├─ Escalation Matrix
│  └─ PHASE_5_ESCALATION_MATRIX.md
├─ Quick Reference
│  └─ PHASE_5_QUICK_REFERENCE_CARDS.md
└─ RCA Template
   └─ PHASE_5_INCIDENT_RCA_TEMPLATE.md
```

---

## 9. Sample Incidents

### Example 1: High Latency Response

```
INCIDENT INC-2026-0001
Time: Feb 8, 14:30 UTC
Severity: SEV-2

Timeline:
14:30 - Alert: Response time >180ms
14:31 - L1 triage: SEV-2 confirmed
14:33 - Dashboard check: CPU at 85%, spike detected
14:35 - Database check: Slow queries identified
14:37 - Query optimization applied
14:40 - Response time back to 95ms
14:42 - Verification: All green
14:45 - Customer notification sent

MTTR: 15 minutes ✅ (SLA: 20 min)

Root Cause: Missing database index on transaction queries
Action: Index added in 15 min (quick fix)
Prevention: Add monitoring for query performance
```

### Example 2: Error Rate Spike

```
INCIDENT INC-2026-0002
Time: Feb 9, 09:15 UTC
Severity: SEV-2

Timeline:
09:15 - Alert: Error rate 0.28%
09:16 - L1 triage: Confirmed, SEV-2
09:18 - Error analysis: All 5xx errors
09:20 - Logs checked: External API timeout
09:22 - L2 escalation (External API issue)
09:25 - External API provider confirms outage
09:35 - External API restored
09:38 - Error rate back to 0.08%
09:40 - Verification: All green

MTTR: 25 minutes ⚠️ (SLA: 20 min - EXCEEDED by 5 min)

Root Cause: External dependency timeout (not in our control)
Action: Added circuit breaker for external API
Prevention: Graceful degradation when external API down
```

---

## 10. Continuous Improvement

### Monthly Incident Review

```
Schedule: First Friday of each month @ 10:00 UTC

Agenda:
1. Incident statistics
   ├─ Total incidents: ___
   ├─ Average MTTR: ___ min
   ├─ SLA attainment: ____%
   └─ Comparison to target

2. Incidents analysis
   ├─ Category breakdown
   ├─ Root cause trends
   ├─ Recurring issues
   └─ Prevention ideas

3. Team feedback
   ├─ What went well?
   ├─ What can improve?
   ├─ Process changes?
   └─ Training needs?

4. Action items
   ├─ Prevention improvements
   ├─ Monitoring enhancements
   ├─ Process changes
   └─ Owner assignment
```

---

**✅ INCIDENT RESPONSE TOOLKIT READY**

**Deployment Date:** February 8, 2026  
**Owner:** Ops Lead  
**Distribution:** Print quick reference cards + brief Ops team  
**Usage:** Incident response procedures

**Key Files:**

- PHASE_5_RUNBOOK.md
- PHASE_5_OPS_PLAYBOOKS.md
- PHASE_5_ESCALATION_MATRIX.md
- PHASE_5_QUICK_REFERENCE_CARDS.md
- PHASE_5_INCIDENT_RCA_TEMPLATE.md

---

**Target SLA: MTTR <20 minutes for Phase 5 operations**
