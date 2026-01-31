# دليل إعداد البيانات الأساسية - المرحلة 5

# PHASE 5 BASELINE DATA SETUP GUIDE

**الغرض | Purpose:** تحضير وتحميل بيانات الأساس لجميع مؤشرات الأداء الـ 6 قبل
الانتشار الفعلي  
**تاريخ البدء | Start Date:** February 1, 2026  
**تاريخ الاكتمال | Target Date:** February 7, 2026  
**المسؤول | Owner:** Finance Lead + Tech Lead  
**آخر تحديث | Last Updated:** January 30, 2026

---

## 1. مقدمة | Introduction

دليل عملي لجمع وتنظيم البيانات الأساسية من Phase 4 ثم تحميلها إلى أنظمة
المراقبة. يضمن أن جميع الإنذارات والتقارير ستعمل بشكل صحيح من اليوم الأول.

**Practical guide for populating Phase 5 operational systems with baseline data
from Phase 4 post-launch period, ensuring accurate SLA thresholds, alert
triggers, and KPI targets from deployment day.**

---

## 2. مقدمة البيانات الأساسية | Baseline Data Overview

### 2.1 مصادر البيانات | Data Sources

| KPI               | المصدر            | Source             | الفترة           | Period | الكمية | Volume |
| ----------------- | ----------------- | ------------------ | ---------------- | ------ | ------ | ------ |
| Response Time     | APM (New Relic)   | 7 days post-launch | 100K+ samples    |
| Error Rate        | Logs (ELK)        | 7 days post-launch | 50M+ log entries |
| Uptime            | Health checks     | 7 days post-launch | 50K+ pings       |
| MTTR              | Incident tracking | Phase 4 incidents  | 15-20 incidents  |
| User Satisfaction | Surveys           | Phase 4 week       | 500+ responses   |
| Cost              | Billing system    | Phase 4 week       | Daily snapshot   |

### 2.2 البيانات المتوقعة | Expected Baseline Values

```
Phase 4 Post-Launch Data (Jan 24-30, 2026):

Response Time (P95):
├─ Average: 95 ms
├─ Min (best case): 72 ms
├─ Max (worst case): 128 ms
├─ Std Dev: ~15 ms
└─ Phase 5 Target: <120 ms ✅

Error Rate:
├─ Average: 0.08%
├─ Min (best case): 0.05%
├─ Max (worst case): 0.15%
├─ Std Dev: ~0.03%
└─ Phase 5 Target: <0.12% ✅

Uptime:
├─ Avg: 99.98%
├─ Min: 99.95%
├─ Max: 100%
├─ Downtime: 10.8 min/month average
└─ Phase 5 Target: 99.99% ✅

MTTR:
├─ Average: 18 min
├─ Min: 5 min
├─ Max: 45 min
├─ Sample incidents: 15
└─ Phase 5 Target: <20 min ✅

User Satisfaction:
├─ NPS Score: 8.2/10
├─ Survey Rating: 4.8/5
├─ Support Rating: 4.7/5
├─ Satisfaction Index: 4.8/5
└─ Phase 5 Target: 4.75/5 ✅

Cost per Transaction:
├─ Average: $0.045
├─ Min: $0.040
├─ Max: $0.052
├─ Daily Cost: $4,500 (100K transactions)
└─ Phase 5 Target: -10% = $0.0405 ✅
```

---

## 3. جمع البيانات | Data Collection

### 3.1 Response Time Data Collection

#### خطوة 1: الاتصال بـ APM

```bash
# Using New Relic API
curl -X GET "https://api.newrelic.com/v2/applications/APP_ID/metrics/data.json?names[]=HttpDispatcher&values[]=request_time&summarize=true" \
  -H "X-Api-Key: YOUR_API_KEY"

# Using DataDog API
curl "https://api.datadoghq.com/api/v1/query?query=avg:trace.web.request.duration{service:api}" \
  -H "DD-API-KEY: YOUR_API_KEY"
```

#### خطوة 2: معالجة البيانات

```python
import numpy as np
from datetime import datetime, timedelta

# Fetch last 7 days of latency data
response_times = fetch_from_apm(
    start=datetime.now() - timedelta(days=7),
    end=datetime.now(),
    metric="latency"
)

# Calculate percentiles
p50 = np.percentile(response_times, 50)  # median
p95 = np.percentile(response_times, 95)  # 95th percentile
p99 = np.percentile(response_times, 99)  # 99th percentile
mean = np.mean(response_times)
std_dev = np.std(response_times)

# Results
baseline_p95 = p95  # Should be ~95ms
threshold_high = p95 + (2 * std_dev)  # ~125ms (alert trigger)
threshold_critical = p95 + (3 * std_dev)  # ~140ms (escalation)

print(f"P95 Baseline: {baseline_p95}ms")
print(f"High Alert Threshold: {threshold_high}ms")
print(f"Critical Threshold: {threshold_critical}ms")
```

#### خطوة 3: التحقق والتسجيل

```
Validation Checklist:
- [ ] P95 value between 80-110ms (expected range)
- [ ] Data covers 7 consecutive days
- [ ] No data gaps (>1 hour)
- [ ] Timestamp format: UTC ISO 8601
- [ ] Sample count: >100K data points

Recorded as:
  Response_Time_Baseline: 95ms
  Response_Time_Std_Dev: 15ms
  Response_Time_High_Threshold: 150ms
  Response_Time_Critical_Threshold: 165ms
```

### 3.2 Error Rate Data Collection

#### خطوة 1: الاتصال بـ ELK Stack

```bash
# Query ELK for errors
curl -X GET "http://elasticsearch:9200/logs-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "range": {
        "@timestamp": {"gte": "now-7d", "lte": "now"}
      }
    },
    "size": 0,
    "aggs": {
      "error_count": {
        "filter": {"term": {"level": "ERROR"}}
      }
    }
  }'
```

#### خطوة 2: معالجة البيانات

```python
import json

# Fetch errors and total logs
error_logs = query_elasticsearch(
    query='level:ERROR AND timestamp:[now-7d TO now]'
)
total_logs = query_elasticsearch(
    query='timestamp:[now-7d TO now]'
)

# Calculate error rate
error_count = len(error_logs)
total_count = len(total_logs)
error_rate_percent = (error_count / total_count) * 100

baseline_error_rate = error_rate_percent  # Should be ~0.08%
threshold_warning = 0.15%  # Alert at this level
threshold_critical = 0.25%  # Escalate at this level

print(f"Error Rate Baseline: {baseline_error_rate}%")
print(f"Warning Threshold: {threshold_warning}%")
print(f"Critical Threshold: {threshold_critical}%")
```

#### خطوة 3: التحقق والتسجيل

```
Validation Checklist:
- [ ] Error rate between 0.05%-0.15% (expected range)
- [ ] Total log count >50 million
- [ ] Error count >400,000
- [ ] Time period: exactly 7 days
- [ ] No partial hours in data

Recorded as:
  Error_Rate_Baseline: 0.08%
  Error_Count: 450,000
  Total_Requests: 5,625,000
  Error_Rate_High_Threshold: 0.20%
  Error_Rate_Critical_Threshold: 0.30%
```

### 3.3 Uptime Data Collection

#### خطوة 1: الاتصال بـ Health Check System

```bash
# Using Pingdom API
curl "https://api.pingdom.com/api/3.1/checks/CHECK_ID/uptime?from=START&to=END" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Manual health checks via monitoring
curl -X GET "http://api.example.com/health" -w "%{http_code}"
```

#### خطوة 2: معالجة البيانات

```python
# Calculate uptime for 7-day period
total_seconds = 7 * 24 * 3600  # 604,800 seconds
downtime_seconds = sum_of_downtime_events
uptime_percent = ((total_seconds - downtime_seconds) / total_seconds) * 100
uptime_minutes_per_month = (1 - (1 - uptime_percent/100)) * 60 * 24 * 30

baseline_uptime = 99.98%  # Expected
monthly_downtime = 10.8 minutes  # Expected

# Calculate SLA threshold
sla_target = 99.99%
sla_monthly_allowance = 5.4 minutes  # Max downtime for 99.99% SLA
alert_threshold = 99.95%  # Alert if drops below this

print(f"Uptime Baseline: {baseline_uptime}%")
print(f"SLA Target: {sla_target}%")
print(f"Monthly Downtime Budget: {sla_monthly_allowance} minutes")
```

#### خطوة 3: التحقق والتسجيل

```
Validation Checklist:
- [ ] Uptime between 99.95%-100% (expected range)
- [ ] Downtime events documented
- [ ] Total downtime <60 minutes for 7 days
- [ ] No cascading failure patterns
- [ ] Failover events properly logged

Recorded as:
  Uptime_Baseline: 99.98%
  Total_Downtime_Minutes: 10.8 (7-day period)
  Scheduled_Maintenance_Minutes: 2
  Unplanned_Downtime_Minutes: 8.8
  SLA_Target: 99.99%
  SLA_Alert_Threshold: 99.95%
```

### 3.4 MTTR Data Collection

#### خطوة 1: الاتصال بـ Incident Tracking System

```bash
# Using Jira API
curl -X GET "https://jira.example.com/rest/api/3/search?jql=project=OPS AND created>=-7d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### خطوة 2: معالجة البيانات

```python
import pandas as pd
from datetime import datetime

# Fetch Phase 4 incidents
incidents = query_jira(
    jql='project=OPS AND created>=-30d',
    fields=['created', 'resolved', 'severity']
)

# Calculate MTTR for each incident
mttr_list = []
for incident in incidents:
    created_time = parse_datetime(incident['created'])
    resolved_time = parse_datetime(incident['resolved'])
    mttr_minutes = (resolved_time - created_time).total_seconds() / 60
    mttr_list.append(mttr_minutes)

# Aggregate statistics
baseline_mttr = np.mean(mttr_list)  # Should be ~18 min
mttr_median = np.median(mttr_list)
mttr_p95 = np.percentile(mttr_list, 95)
mttr_max = np.max(mttr_list)

print(f"MTTR Baseline (mean): {baseline_mttr:.1f} minutes")
print(f"MTTR Median: {mttr_median:.1f} minutes")
print(f"MTTR P95: {mttr_p95:.1f} minutes")
print(f"MTTR Max: {mttr_max:.1f} minutes")

# Severity breakdown
print("\nMTTR by Severity:")
for severity in ['Critical', 'High', 'Medium', 'Low']:
    sev_incidents = [m for i, m in enumerate(mttr_list) if incidents[i]['severity'] == severity]
    if sev_incidents:
        print(f"  {severity}: {np.mean(sev_incidents):.1f} min avg")
```

#### خطوة 3: التحقق والتسجيل

```
Validation Checklist:
- [ ] Minimum 10 incidents in data set
- [ ] MTTR average between 15-25 minutes
- [ ] Data covers at least Phase 4 week
- [ ] All incident types included
- [ ] No incomplete incidents (without resolution)

Recorded as:
  MTTR_Baseline: 18 minutes
  MTTR_Median: 16 minutes
  MTTR_P95: 35 minutes
  Incident_Count: 18
  SLA_Target: <20 minutes
  Alert_Threshold: >25 minutes
```

### 3.5 User Satisfaction Data Collection

#### خطوة 1: جمع استطلاعات المستخدمين

```python
# Fetch NPS data
nps_data = query_survey_system(
    survey_type='nps',
    date_range=['2026-01-24', '2026-01-30']
)

# Calculate NPS score
detractors = len([r for r in nps_data if r['score'] < 7])
passives = len([r for r in nps_data if 7 <= r['score'] < 9])
promoters = len([r for r in nps_data if r['score'] >= 9])
total = len(nps_data)

nps_score = ((promoters - detractors) / total) * 100

# Fetch satisfaction survey
satisfaction_data = query_survey_system(
    survey_type='satisfaction',
    date_range=['2026-01-24', '2026-01-30']
)

avg_satisfaction = np.mean([r['rating'] for r in satisfaction_data])

# Fetch support satisfaction
support_data = query_support_system(
    metric='satisfaction',
    date_range=['2026-01-24', '2026-01-30']
)

avg_support_rating = np.mean([r['rating'] for r in support_data])

print(f"NPS Score: {nps_score:.1f}/10")
print(f"Satisfaction Rating: {avg_satisfaction:.2f}/5")
print(f"Support Rating: {avg_support_rating:.2f}/5")
```

#### خطوة 2: التحقق والتسجيل

```
Validation Checklist:
- [ ] Minimum 300 NPS responses
- [ ] Minimum 200 satisfaction responses
- [ ] Minimum 100 support interactions rated
- [ ] Data spans exactly 7 days
- [ ] No duplicate responses detected

Recorded as:
  NPS_Score: 8.2/10
  Satisfaction_Rating: 4.8/5
  Support_Rating: 4.7/5
  Satisfaction_Index: 4.8/5 (weighted average)
  Phase_5_Target: 4.75/5 ✅
  Alert_Threshold: <4.6/5
```

### 3.6 Cost Data Collection

#### خطوة 1: جمع بيانات التكاليف

```python
# Fetch from billing system
cost_data = query_billing_system(
    date_range=['2026-01-24', '2026-01-30'],
    breakdown=['server_cost', 'db_cost', 'network_cost', 'storage_cost']
)

# Fetch transaction counts
daily_transactions = query_analytics(
    metric='transaction_count',
    date_range=['2026-01-24', '2026-01-30']
)

# Calculate cost per transaction
total_cost = sum(day['total_cost'] for day in cost_data)
total_transactions = sum(day['transaction_count'] for day in daily_transactions)
cost_per_txn = total_cost / total_transactions

# Cost breakdown
server_cost_percent = sum(d['server_cost'] for d in cost_data) / total_cost * 100
db_cost_percent = sum(d['db_cost'] for d in cost_data) / total_cost * 100
network_cost_percent = sum(d['network_cost'] for d in cost_data) / total_cost * 100
storage_cost_percent = sum(d['storage_cost'] for d in cost_data) / total_cost * 100

print(f"Cost per Transaction: ${cost_per_txn:.6f}")
print(f"  Server cost: {server_cost_percent:.1f}%")
print(f"  DB cost: {db_cost_percent:.1f}%")
print(f"  Network cost: {network_cost_percent:.1f}%")
print(f"  Storage cost: {storage_cost_percent:.1f}%")
```

#### خطوة 2: التحقق والتسجيل

```
Validation Checklist:
- [ ] Cost data in USD, verified with billing
- [ ] Transaction counts match analytics
- [ ] Daily breakdown available
- [ ] Cost per transaction between $0.040-$0.050
- [ ] Cost components add up to 100%

Recorded as:
  Daily_Cost: $4,500
  Daily_Transactions: 100,000
  Cost_per_Transaction: $0.045
  Server_Cost: 45%
  DB_Cost: 30%
  Network_Cost: 15%
  Storage_Cost: 10%
  Phase_5_Target: -10% = $0.0405 ✅
  Alert_Threshold: >$0.055/txn
```

---

## 4. تحميل البيانات | Data Loading

### 4.1 تحميل إلى Prometheus

```yaml
# File: /prometheus/baseline_data.yml
global:
  scrape_interval: 15s
  baseline_data:
    response_time_p95: 95
    response_time_high: 150
    error_rate_baseline: 0.08
    error_rate_high: 0.20
    uptime_baseline: 99.98
    uptime_alert: 99.95
    mttr_baseline: 18
    mttr_alert: 25
    satisfaction_baseline: 4.8
    satisfaction_alert: 4.6
    cost_baseline: 0.045
    cost_target: 0.0405
    cost_alert: 0.055

# Load into Prometheus via API
curl -X POST http://prometheus:9090/api/v1/write \
  -H "Content-Type: application/json" \
  -d @baseline_data.json
```

### 4.2 تحميل إلى Grafana

```json
{
  "dashboard": {
    "title": "Phase 5 Baseline Reference",
    "panels": [
      {
        "title": "Response Time Baseline",
        "targets": [
          {
            "expr": "baseline_response_time_p95",
            "legendFormat": "P95 Baseline: 95ms"
          }
        ]
      },
      {
        "title": "Error Rate Baseline",
        "targets": [
          {
            "expr": "baseline_error_rate",
            "legendFormat": "Error Rate Baseline: 0.08%"
          }
        ]
      }
    ]
  }
}

# Import dashboard via Grafana API
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @baseline_dashboard.json
```

### 4.3 تحميل قيم الإنذارات

```bash
# Update alert thresholds in AlertManager config
cat > /alertmanager/phase5_rules.yml << EOF
groups:
  - name: phase5_alerts
    interval: 30s
    rules:
      - alert: HighResponseTime
        expr: response_time_p95 > 150
        for: 5m

      - alert: HighErrorRate
        expr: error_rate > 0.20
        for: 3m

      - alert: UptimeAnomaly
        expr: uptime < 99.95
        for: 1m

      - alert: CostOverrun
        expr: cost_per_txn > 0.055
        for: 10m

      - alert: SupportPressure
        expr: support_tickets > 300
        for: 5m
EOF

# Reload AlertManager
curl -X POST http://alertmanager:9093/-/reload
```

---

## 5. التحقق من البيانات | Data Validation

### 5.1 قائمة التحقق | Validation Checklist

```
Response Time:
  ✅ P95 value loaded: 95ms
  ✅ High threshold set: 150ms
  ✅ Data visible in Grafana
  ✅ Historical data archived

Error Rate:
  ✅ Baseline loaded: 0.08%
  ✅ Alert threshold: 0.20%
  ✅ Data visible in Grafana
  ✅ Daily aggregation working

Uptime:
  ✅ Baseline loaded: 99.98%
  ✅ SLA target: 99.99%
  ✅ Alert threshold: 99.95%
  ✅ Monthly allowance: 5.4 min

MTTR:
  ✅ Baseline loaded: 18 min
  ✅ Sample size: 18 incidents
  ✅ P95 calculated: 35 min
  ✅ Alert threshold: 25 min

Satisfaction:
  ✅ Baseline loaded: 4.8/5
  ✅ Target set: 4.75/5
  ✅ Alert threshold: <4.6/5
  ✅ Weekly tracking enabled

Cost:
  ✅ Cost per txn loaded: $0.045
  ✅ Target set: -10% = $0.0405
  ✅ Breakdown by component
  ✅ Daily reconciliation working
```

### 5.2 اختبارات السلامة | Sanity Tests

```python
# Test 1: Verify all metrics are present
def test_metrics_loaded():
    metrics = [
        'response_time_baseline',
        'error_rate_baseline',
        'uptime_baseline',
        'mttr_baseline',
        'satisfaction_baseline',
        'cost_baseline'
    ]

    for metric in metrics:
        value = query_prometheus(metric)
        assert value is not None, f"{metric} not found"
        print(f"✅ {metric} = {value}")

# Test 2: Verify alert rules are loaded
def test_alert_rules():
    rules = query_prometheus('/api/v1/rules')
    expected_rules = [
        'HighResponseTime',
        'HighErrorRate',
        'UptimeAnomaly',
        'CostOverrun',
        'SupportPressure'
    ]

    for rule in expected_rules:
        assert rule in str(rules), f"{rule} not loaded"
        print(f"✅ {rule} rule loaded")

# Test 3: Trigger test alert
def test_alert_notification():
    # Temporarily modify metric to trigger alert
    trigger_high_response_time()

    # Wait 5 minutes for alert to fire
    time.sleep(300)

    # Check if alert was sent
    assert check_slack_notification('HighResponseTime'), "Alert not sent"
    print("✅ Alert notification working")
```

---

## 6. توثيق البيانات | Data Documentation

### 6.1 سجل البيانات الأساسية | Baseline Data Registry

```markdown
# Phase 5 Baseline Data Registry

**Generated:** 2026-01-30 **Valid From:** 2026-02-08 **Valid Until:** 2026-05-08
(3 months, updated quarterly)

## Response Time

- **Baseline:** 95 ms (P95)
- **Source:** New Relic APM
- **Period:** 2026-01-24 to 2026-01-30
- **Sample Size:** 142,000 requests
- **Status:** ✅ Loaded

## Error Rate

- **Baseline:** 0.08%
- **Source:** ELK Logs
- **Period:** 2026-01-24 to 2026-01-30
- **Sample Size:** 5.6M requests
- **Status:** ✅ Loaded

## Uptime

- **Baseline:** 99.98%
- **Source:** Pingdom Health Checks
- **Period:** 2026-01-24 to 2026-01-30
- **Downtime:** 10.8 minutes (7-day period)
- **Status:** ✅ Loaded

## MTTR

- **Baseline:** 18 minutes (mean)
- **Source:** Jira Incident Tracking
- **Period:** 2026-01-17 to 2026-01-30
- **Incident Count:** 18
- **Status:** ✅ Loaded

## User Satisfaction

- **Baseline:** 4.8/5
- **NPS:** 8.2/10
- **Source:** Survey System
- **Period:** 2026-01-24 to 2026-01-30
- **Response Count:** 450+ responses
- **Status:** ✅ Loaded

## Cost per Transaction

- **Baseline:** $0.045
- **Daily Cost:** $4,500
- **Daily Transactions:** 100,000
- **Source:** Billing System
- **Period:** 2026-01-24 to 2026-01-30
- **Status:** ✅ Loaded

**Approval:** ******\_\_\_****** **Date:** ****\_\_****
```

---

## 7. ملفات البيانات | Data Files

- [ ] `baseline_response_time.csv` (142K rows)
- [ ] `baseline_error_rate.csv` (5.6M rows, compressed)
- [ ] `baseline_uptime.json` (7-day timeline)
- [ ] `baseline_incidents.csv` (18 incidents)
- [ ] `baseline_satisfaction.json` (450+ surveys)
- [ ] `baseline_cost.xlsx` (7-day daily breakdown)
- [ ] `baseline_registry.md` (summary document)

---

## 8. الموافقات | Approvals

| الدور        | Role          | الاسم  | Name   | التاريخ | Date   | التوقيع | Signature |
| ------------ | ------------- | ------ | ------ | ------- | ------ | ------- | --------- |
| Tech Lead    | المسؤول الفني | **\_** | **\_** | **\_**  | **\_** |
| Finance Lead | قائد المالية  | **\_** | **\_** | **\_**  | **\_** |
| Ops Lead     | قائد العمليات | **\_** | **\_** | **\_**  | **\_** |

---

## 9. الملاحظات | Notes

1. **جميع البيانات قابلة للتحديث الدوري** - All data refreshed quarterly
2. **الحفاظ على البيانات التاريخية** - Archive historical data for trend
   analysis
3. **لا يتم تعديل القيم الأساسية يدويا** - Baseline values auto-calculated, not
   manually edited
4. **التحقق الأسبوعي** - Weekly validation against live data
5. **التقارير الشهرية** - Monthly baseline accuracy review

---

**✅ BASELINE DATA SETUP GUIDE READY FOR EXECUTION**  
**Data collection begins: February 1, 2026**  
**Data loading completes: February 7, 2026**  
**Go-live ready: February 8, 2026**
