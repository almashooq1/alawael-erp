# دليل التكامل النظامي - المرحلة 5

# PHASE 5 SYSTEMS INTEGRATION GUIDE

**الغرض | Purpose:** تكامل نظام المرحلة 5 مع أنظمة المراقبة والقياس والإشعارات
الحية  
**تاريخ البدء | Start Date:** February 1, 2026  
**تاريخ الاكتمال | Target Date:** February 7, 2026  
**المسؤول | Owner:** Tech Lead  
**آخر تحديث | Last Updated:** January 30, 2026

---

## 1. مقدمة | Introduction

دليل تقني شامل لربط أنظمة المرحلة 5 (Templates + Checklists) مع البنية التحتية
الموجودة (Monitoring + Alerting + Reporting). يوفر خطوات عملية لتكامل جميع
المكونات الـ 28 مع الأنظمة الحية.

**Technical guide for integrating Phase 5 operational framework with live
monitoring infrastructure, enabling automated data flows, real-time alerting,
and continuous reporting.**

---

## 2. معمارية التكامل | Integration Architecture

### 2.1 مكونات النظام | System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     PHASE 5 OPERATIONAL LAYER                │
│  (28 Files: Daily/Weekly/Monthly/Quarterly + Risk/Change)  │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │  KPI   │ │ ALERTS │ │REPORTS │
   │DATA    │ │SYSTEM  │ │SYSTEM  │
   └────────┘ └────────┘ └────────┘
        │         │         │
        └────┬────┴────┬────┘
             │         │
             ▼         ▼
        ┌─────────────────┐
        │MONITORING LAYER │
        │(Prometheus+ELK) │
        └────┬────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌─────┐┌────────┐┌──────────┐
│LIVE ││GRAFANA ││ALERTMANAGR
│DATA ││DASH    ││SLACK/MAIL
└─────┘└────────┘└──────────┘
```

### 2.2 تدفق البيانات | Data Flow

```
Phase 5 Daily Checklist
    ↓
Automated Data Collection (Every 1 hour)
    ↓
Prometheus Scrape (metrics)
    ↓
Grafana Transformation & Display
    ↓
Real-time Dashboards
    ↓
Alert Evaluation (Every 5 min)
    ↓
Alertmanager Routing
    ↓
Notifications (Slack + Email + PagerDuty)
    ↓
Human Response (Incident Response Playbook)
    ↓
RCA & Documentation (Daily Brief)
    ↓
Weekly Aggregation
    ↓
Monthly Executive Report
    ↓
Quarterly Strategic Review
```

---

## 3. تكامل مؤشرات الأداء | KPI Integration

### 3.1 مصادر البيانات | Data Sources

| KPI               | مصدر البيانات            | Collection        | التحديث     | Update |
| ----------------- | ------------------------ | ----------------- | ----------- | ------ |
| Response Time     | APM (New Relic/DataDog)  | Every 1 min       | Real-time   |
| Error Rate        | Application Logs (ELK)   | Every 1 min       | Real-time   |
| Uptime            | Health Checks (Pingdom)  | Every 30 sec      | Real-time   |
| MTTR              | Incident Tracking (Jira) | On incident close | Real-time   |
| User Satisfaction | Survey System + NPS      | Daily             | Daily 18:00 |
| Cost/Transaction  | Billing System           | Every 24 hours    | Daily 23:00 |

### 3.2 الصيغ الحسابية | Calculation Formulas

#### 1. Response Time (P95 Latency)

```
Formula: Sort all response times → Select 95th percentile
Example: 1000 requests sorted → response_time[950]
Threshold Alert: >180ms (2σ above baseline 95ms)
Escalation: >150ms (σ above baseline)
```

#### 2. Error Rate

```
Formula: (Errors / Total Requests) × 100
Example: 120 errors / 100,000 requests = 0.12%
Threshold Alert: >0.20% (alert threshold)
Target: <0.12% (SLA target)
```

#### 3. Uptime

```
Formula: (Total Seconds - Downtime Seconds) / Total Seconds × 100
99.99% target = 5.4 minutes downtime per month
99.98% baseline = 10.8 minutes downtime per month
Alert trigger: Any unplanned downtime >5 min
```

#### 4. MTTR (Mean Time To Recovery)

```
Formula: Sum of (End Time - Start Time) / Number of Incidents
Target: <20 minutes
Baseline: 18 minutes
Tracked in: Jira Incident Tracking
```

#### 5. User Satisfaction

```
Formula: (NPS Score × 0.4) + (Survey Score × 0.3) + (Support Rating × 0.3)
Target: 4.75/5
Baseline: 4.8/5 (Phase 4 post-launch)
Collection: Daily surveys + weekly feedback forms
```

#### 6. Cost per Transaction

```
Formula: Total Daily Cost / Total Daily Transactions
Baseline: $0.045/transaction
Target: -10% = $0.0405/transaction
Components: Server cost + DB cost + Network cost + Storage cost
```

### 3.3 نقاط البيانات اليومية | Daily Data Points

```
Daily Collection Schedule:

08:00 - Morning KPI Check (6 KPIs)
  ├─ Response Time: 95th percentile
  ├─ Error Rate: 24-hour average
  ├─ Uptime: 24-hour availability
  ├─ MTTR: Previous day incidents
  ├─ User Satisfaction: Overnight surveys
  └─ Cost: Previous day accumulated

14:00 - Mid-day Snapshot (6 KPIs)
  └─ Same as morning

18:00 - Evening Finalization (6 KPIs)
  ├─ Final daily averages
  ├─ Incident summary
  ├─ Capacity status
  └─ Cost reconciliation

23:00 - Night Close (Cost Final)
  └─ Final cost calculation + reconciliation

Daily Sign-off:
  ├─ Operations Lead: KPI verification
  ├─ QA Lead: Quality checks
  └─ Escalation: If any KPI out of threshold
```

---

## 4. تكامل نظام الإنذارات | Alert System Integration

### 4.1 إعدادات الإنذارات | Alert Configuration

#### Alert Rule 1: High Response Time

```yaml
Alert Name: HighResponseTime
Condition: P95_latency > 180ms for 5 minutes
Severity: High (Sev-2)
Recipients: Ops Team (L1)
Channel: Slack #operations + Email
Escalation: If continues >15min → L2 Manager
Action: Trigger "High Latency Response Playbook"
```

#### Alert Rule 2: High Error Rate

```yaml
Alert Name: HighErrorRate
Condition: error_rate > 0.20% for 3 minutes
Severity: High (Sev-2)
Recipients: Dev Team (L1)
Channel: Slack #errors + PagerDuty
Escalation: If continues >10min → Tech Lead
Action: Trigger "High Error Rate Response Playbook"
```

#### Alert Rule 3: Uptime Anomaly

```yaml
Alert Name: UptimeAnomaly
Condition: downtime > 1 minute or uptime < 99.95%
Severity: Critical (Sev-1)
Recipients: All L1-L4 leads
Channel: Slack #critical + SMS + PagerDuty
Escalation: Immediate
Action: Trigger incident response protocol
```

#### Alert Rule 4: Cost Overrun

```yaml
Alert Name: CostOverrun
Condition: cost_per_txn > $0.05 or daily_cost > budget
Severity: Medium (Sev-3)
Recipients: Finance Lead + Ops Lead
Channel: Email + Slack #cost-tracking
Escalation: If >$0.06 → Daily standup
Action: Review cost optimization runbook
```

#### Alert Rule 5: Support Pressure

```yaml
Alert Name: SupportPressure
Condition: open_tickets > 300 or response_time > 20min
Severity: High (Sev-2)
Recipients: Support Lead + Ops Lead
Channel: Slack #support + Email
Escalation: If continues >2hrs → Hire temp support
Action: Trigger "Support Load Response Playbook"
```

### 4.2 قنوات الإشعارات | Notification Channels

| القناة        | Channel              | الاستخدام           | Usage   | التأخير | Latency |
| ------------- | -------------------- | ------------------- | ------- | ------- | ------- |
| **Slack**     | Ops alerts           | Sev-2/3/4           | <1 sec  |
| **Email**     | Daily/Weekly reports | Scheduled           | <5 min  |
| **PagerDuty** | On-call escalation   | Sev-1/2 critical    | <30 sec |
| **SMS**       | Critical alerts only | Sev-1 + Uptime      | <10 sec |
| **Webhook**   | External systems     | Custom integrations | <5 sec  |

### 4.3 جدول الإشعارات | Notification Schedule

```
Sev-1 (Critical): Immediate
  ├─ Slack + SMS + PagerDuty
  ├─ All L1-L4 leads notified
  └─ Email escalation every 5 min if unresolved

Sev-2 (High): Within 2 minutes
  ├─ Slack + PagerDuty
  ├─ L1 team notified
  └─ Email to L2 if unresolved after 15 min

Sev-3 (Medium): Within 15 minutes
  ├─ Slack + Email
  ├─ Ops team notified
  └─ Daily standup if unresolved

Sev-4 (Low): Daily digest
  ├─ Email only
  └─ Included in daily/weekly reports

Daily Reports: 08:00 + 18:00 (email)
Weekly Reports: Friday 17:00 (email + Slack)
Monthly Reports: 1st of month 09:00 (email + meeting)
```

---

## 5. تكامل لوحات البيانات | Dashboard Integration

### 5.1 لوحات بيانات Grafana | Grafana Dashboards

#### Dashboard 1: Executive Summary (Real-time)

```
Layout: 6 KPI cards (top), trend graphs (middle), incidents (bottom)

Panels:
├─ Response Time: Current + 24h trend + SLA line
├─ Error Rate: Current + 24h trend + SLA line
├─ Uptime: Current + 7d trend + target line
├─ MTTR: Current + 7d average + target line
├─ Satisfaction: Current + 30d trend + target line
├─ Cost: Current + 7d trend + budget line
├─ Incident Log: Last 24h incidents
└─ Alert Status: Active alerts by severity
```

#### Dashboard 2: Operations Detail (15-min refresh)

```
Panels:
├─ System Resources: CPU + Memory + Disk (per server)
├─ Database Metrics: Query latency + connections + throughput
├─ Application Metrics: Requests/sec + errors + response time
├─ Network: Bandwidth + latency + packet loss
├─ Capacity Forecast: Trend analysis + projection
└─ Scaling Status: Auto-scaling events + instance count
```

#### Dashboard 3: Incident Timeline (Live)

```
Panels:
├─ Current Incidents: Status + severity + duration
├─ Timeline Graph: Incident events + KPI changes
├─ Root Cause Candidates: Correlated metrics
├─ Affected Services: Impact analysis
└─ Response Actions: Playbook steps executed
```

#### Dashboard 4: Cost Tracking (Daily)

```
Panels:
├─ Daily Cost: Amount + trend + budget status
├─ Cost per Transaction: Current + trend + target
├─ Cost by Component: Server % + DB % + Network %
├─ Savings Opportunities: Recommendations
└─ Budget vs Actual: Monthly comparison
```

#### Dashboard 5: Risk & Compliance (Weekly)

```
Panels:
├─ Risk Heat Map: 18 risks by impact/likelihood
├─ Risk Trend: New risks + mitigated risks
├─ Compliance Status: Audit items
├─ Security Metrics: Vulnerability count + patch status
└─ SLA Compliance: 5 SLAs + breach count
```

#### Dashboard 6: Capacity Planning (Weekly)

```
Panels:
├─ Current Utilization: CPU + Memory + Disk + Network
├─ Peak Usage: By hour + day + week
├─ Trend Forecast: 4-week projection
├─ Scaling Recommendations: Upgrade options
└─ Cost Impact: Cost of recommended scaling
```

### 5.2 مواصفات لوحة البيانات | Dashboard Specifications

```
Resolution: 1920×1080 minimum
Refresh Rate: 15-60 seconds (real-time)
Color Scheme: Green (healthy) → Yellow (warning) → Red (critical)
Data Retention: Live 24h + archived 90d
Access Control: Role-based (Ops/Managers/Executives)
Mobile Support: Responsive design for mobile viewing
Export: PDF reports, CSV data export
```

---

## 6. تكامل التقارير الآلية | Automated Reporting Integration

### 6.1 جدول التقارير | Report Schedule

| التقرير           | Report               | التكرار  | Frequency      | الوقت          | Time | الجهات | Recipients |
| ----------------- | -------------------- | -------- | -------------- | -------------- | ---- | ------ | ---------- |
| Daily Brief       | اليومي               | يومي     | 18:00          | Ops Team       |
| Weekly Stability  | الاستقرار            | أسبوعي   | الجمعة 17:00   | Ops + Managers |
| Weekly Risk       | المخاطر              | أسبوعي   | الأربعاء 10:00 | Leadership     |
| Weekly Ops Report | تقرير العمليات       | أسبوعي   | الجمعة 17:00   | Ops + Managers |
| Monthly Exec      | التقرير التنفيذي     | شهري     | 1st 09:00      | Executives     |
| SLA Monitoring    | مراقبة SLA           | شهري     | 7th 09:00      | Leadership     |
| Quarterly Review  | المراجعة الربع سنوية | ربع سنوي | Q boundary     | Board          |

### 6.2 آلية توليد التقارير | Report Generation Mechanism

```
Data Collection Script (runs every hour)
    ↓
    ├─ Pull KPI data from Prometheus
    ├─ Pull incident data from Jira
    ├─ Pull cost data from billing system
    └─ Pull risk status from risk register
    ↓
Template Population (Python/Groovy script)
    ↓
    ├─ Daily: Populate PHASE_5_DAILY_OPTIMIZATION_CHECKLIST.md
    ├─ Weekly: Populate 4 weekly reports
    ├─ Monthly: Populate executive report + SLA pack
    └─ Quarterly: Populate quarterly review
    ↓
PDF Rendering (Pandoc/WeasyPrint)
    ↓
Email Distribution (SMTP)
    ↓
Slack Notification (Webhook)
    ↓
Archived in Report Repository
```

### 6.3 نموذج البيانات للتقرير | Report Data Model

```
Daily Report JSON:
{
  "date": "2026-02-08",
  "kpis": {
    "response_time": {"value": 98, "target": 120, "status": "green"},
    "error_rate": {"value": 0.09, "target": 0.12, "status": "green"},
    "uptime": {"value": 99.99, "target": 99.99, "status": "green"},
    "mttr": {"value": 15, "target": 20, "status": "green"},
    "satisfaction": {"value": 4.8, "target": 4.75, "status": "green"},
    "cost_per_txn": {"value": 0.042, "target": 0.0405, "status": "yellow"}
  },
  "incidents": [
    {"id": "INC-001", "severity": "Sev-2", "status": "resolved", "mttr_min": 18}
  ],
  "alerts": 3,
  "sign_off": {"ops_lead": "John Doe", "qa_lead": "Jane Smith"}
}
```

---

## 7. التكامل الآلي | Automation Integration

### 7.1 سكريبتات التكامل | Integration Scripts

#### Script 1: KPI Data Collector

```bash
Location: /scripts/kpi_collector.sh
Runs: Every 1 hour
Input: Prometheus API + APM APIs
Output: JSON with 6 KPIs
Error Handling: Retry 3× with 5min backoff
```

#### Script 2: Alert Evaluator

```bash
Location: /scripts/alert_evaluator.py
Runs: Every 5 minutes
Logic: Evaluate 5 alert rules
Output: Trigger alerts via AlertManager
Escalation: Send to notification channels
```

#### Script 3: Report Generator

```bash
Location: /scripts/report_generator.py
Runs: On schedule (daily/weekly/monthly)
Input: KPI data + incident data + risk data
Output: Markdown files + PDF reports
Distribution: Email + Slack webhooks
```

#### Script 4: RCA Automation

```bash
Location: /scripts/auto_rca.py
Trigger: On high-severity incident
Action: Correlate metrics + suggest root causes
Output: Pre-filled RCA template
Manual Step: Human review + verification
```

### 7.2 Pipeline CI/CD لـ Phase 5 | Phase 5 CI/CD Pipeline

```
Commit to Phase_5_Templates_Repo
    ↓
    ├─ Validate YAML/JSON syntax
    ├─ Check for broken cross-references
    └─ Spell-check English + Arabic
    ↓
    [If valid] → Auto-deploy to staging
    ↓
    ├─ Test report generation
    ├─ Test alert triggering
    └─ Test dashboard updates
    ↓
    [If all pass] → Promote to production
    ↓
    ├─ Update live dashboards
    ├─ Activate new alert rules
    └─ Notify team via Slack
    ↓
    [If any fail] → Rollback + notify maintainer
```

---

## 8. خطوات التكامل التفصيلية | Integration Steps

### المرحلة 1: إعداد البنية التحتية | Phase 1: Infrastructure Setup (Feb 1-2)

- [ ] **Prometheus Setup**

  ```bash
  - Verify Prometheus is running (http://localhost:9090)
  - Check all scrape targets are healthy
  - Verify data retention: 15 days minimum
  - Test: curl http://localhost:9090/api/v1/query?query=up
  ```

- [ ] **Grafana Setup**

  ```bash
  - Verify Grafana is running (http://localhost:3000)
  - Add Prometheus as datasource
  - Import 6 Phase 5 dashboards (JSON files)
  - Configure dashboard permissions (role-based)
  - Test: Access all 6 dashboards
  ```

- [ ] **AlertManager Setup**

  ```bash
  - Verify AlertManager is running (port 9093)
  - Configure SMTP for email notifications
  - Configure Slack webhooks
  - Configure PagerDuty integration
  - Test: Send test alerts to all channels
  ```

- [ ] **ELK Stack Setup**
  ```bash
  - Verify Elasticsearch cluster (3+ nodes)
  - Verify Kibana is running
  - Create Phase 5 index patterns (daily rollover)
  - Import 3 Kibana dashboards
  - Test: Search logs in Kibana
  ```

### المرحلة 2: تكامل البيانات | Phase 2: Data Integration (Feb 2-3)

- [ ] **KPI Data Source Integration**

  ```bash
  - Connect APM tool (New Relic/DataDog): API key + webhook setup
  - Connect Logs System (ELK): Index pattern + query validation
  - Connect Health Check System (Pingdom): API integration
  - Connect Incident Tracking (Jira): API token + JQL setup
  - Connect Survey System: Data export mechanism
  - Connect Billing System: Cost data export
  ```

- [ ] **Test Data Flow**
  ```bash
  - Generate test transaction (1,000 requests)
  - Verify data appears in Prometheus within 1 minute
  - Verify data appears in Grafana dashboard within 5 minutes
  - Verify metrics are correctly aggregated (P95 calculation)
  ```

### المرحلة 3: تكامل الإنذارات | Phase 3: Alert Integration (Feb 3-4)

- [ ] **Configure Alert Rules**

  ```bash
  - Create 5 alert rules in Prometheus rules.yml
  - Reload Prometheus configuration
  - Verify rules are loaded: curl http://localhost:9090/api/v1/rules
  - Test each alert with synthetic data
  ```

- [ ] **Test Notification Channels**
  ```bash
  - Test Slack: Send test message to #operations
  - Test Email: Send test email to ops team
  - Test PagerDuty: Trigger test incident
  - Test SMS: Send test message to on-call
  - Verify all channels working correctly
  ```

### المرحلة 4: تكامل التقارير | Phase 4: Report Integration (Feb 4-5)

- [ ] **Deploy Report Generation Scripts**

  ```bash
  - Deploy KPI collector script (/scripts/kpi_collector.sh)
  - Deploy alert evaluator (/scripts/alert_evaluator.py)
  - Deploy report generator (/scripts/report_generator.py)
  - Set up cron jobs for scheduled runs
  ```

- [ ] **Test Report Generation**
  ```bash
  - Run KPI collector manually: verify JSON output
  - Run alert evaluator manually: verify alerts triggered
  - Run report generator for daily report: verify PDF generated
  - Verify email delivery
  - Verify Slack notification
  ```

### المرحلة 5: التحقق النهائي | Phase 5: Final Validation (Feb 5-7)

- [ ] **End-to-End Testing**

  ```bash
  - Simulate high latency incident
  - Verify alert triggered within 5 minutes
  - Verify notification sent to correct channels
  - Verify incident appears in incident timeline dashboard
  - Verify daily report includes incident
  ```

- [ ] **Performance Validation**

  ```bash
  - Verify dashboard load time <3 seconds
  - Verify alert evaluation completes in <30 seconds
  - Verify report generation completes in <5 minutes
  - Verify no excessive CPU/memory usage
  ```

- [ ] **High Availability Validation**
  ```bash
  - Stop Prometheus: verify graceful degradation
  - Restart Prometheus: verify automatic recovery
  - Simulate network outage: verify retries work
  - Verify no data loss during recovery
  ```

---

## 9. استكشاف الأخطاء | Troubleshooting Guide

### المشكلة 1: البيانات لا تظهر في لوحة البيانات

**Problem: Data not showing in Grafana**

```
Troubleshooting Steps:
1. Verify data in Prometheus: curl http://localhost:9090/api/v1/query?query=up
2. Verify datasource connection: Grafana → Configuration → Data Sources
3. Verify dashboard query: Click dashboard → Edit → Check Prometheus query
4. Check time range: Verify time picker includes data time range
5. Verify data scraping is active: Check Prometheus targets status
```

### المشكلة 2: الإنذارات لا تُرسل

**Problem: Alerts not firing**

```
Troubleshooting Steps:
1. Verify rule file syntax: promtool check rules rules.yml
2. Verify rule is loaded: curl http://localhost:9090/api/v1/rules
3. Check metric exists: curl http://localhost:9090/api/v1/query?query=metric_name
4. Manually trigger alert: Modify threshold temporarily to force trigger
5. Verify AlertManager is running: curl http://localhost:9093/-/healthy
6. Check notification channel: Test Slack webhook directly
```

### المشكلة 3: التقارير متأخرة

**Problem: Reports not generated on schedule**

```
Troubleshooting Steps:
1. Verify cron job is active: crontab -l
2. Check script permissions: ls -l /scripts/report_generator.py
3. Check script output: Run manually with full paths
4. Verify email configuration: Check SMTP settings in config
5. Check logs: tail -f /var/log/report_generator.log
6. Verify data availability: Confirm KPI data is fresh
```

---

## 10. الملفات المطلوبة | Required Files

- [ ] `PHASE_5_DEPLOYMENT_CHECKLIST.md` ← Reference for infrastructure
- [ ] `PHASE_5_RUNBOOK.md` ← Alert definitions + escalation
- [ ] `PHASE_5_ESCALATION_MATRIX.md` ← Notification recipients
- [ ] `PHASE_5_OPS_PLAYBOOKS.md` ← Incident response procedures
- [ ] `/scripts/kpi_collector.sh` ← Data collection
- [ ] `/scripts/alert_evaluator.py` ← Alert triggering
- [ ] `/scripts/report_generator.py` ← Report generation
- [ ] `/dashboards/*.json` ← Grafana dashboard definitions
- [ ] `/prometheus/rules.yml` ← Alert rules

---

## 11. جهات الاتصال التقنية | Technical Contacts

| الدور       | Role                 | الاسم  | Name   | الهاتف | Phone  | البريد | Email |
| ----------- | -------------------- | ------ | ------ | ------ | ------ | ------ | ----- |
| Tech Lead   | المسؤول الفني        | **\_** | **\_** | **\_** | **\_** |
| DevOps Lead | قائد DevOps          | **\_** | **\_** | **\_** | **\_** |
| DBA         | مسؤول قاعدة البيانات | **\_** | **\_** | **\_** | **\_** |

---

**✅ SYSTEMS INTEGRATION GUIDE READY**  
**Integration begins: February 1, 2026**  
**Integration completes: February 7, 2026**  
**Go-live: February 8, 2026**
