# 🚦 Load Test Execution Guide

دليل تنفيذ اختبارات التحميل

**Document Type**: Execution Guide  
**Version**: 1.0.0  
**Created**: January 30, 2026  
**Owner**: DevOps Lead + QA Lead

---

## 🎯 Purpose

Provide a step-by-step, repeatable process to run k6 load tests safely and
capture consistent performance results.

---

## ✅ Prerequisites

```
[ ] k6 installed and available in PATH
[ ] Test environment running and stable
[ ] Performance Baseline Config reviewed
[ ] Monitoring dashboards active (Prometheus + Grafana)
[ ] Test data seeded (500+ beneficiaries, 100+ programs)
[ ] Cache warmed
[ ] Alerting configured
[ ] Rollback plan documented
```

---

## 📂 Required Files

- PERFORMANCE_BASELINE_CONFIG.md
- PHASE_4_WEEK2_PROCEDURES.md
- TESTING_METRICS_DASHBOARD.md
- PHASE_4_DAILY_LOG_TEMPLATE.md

---

## 🔧 Environment Variables

Set these before running any test:

```
BASE_URL=https://staging.your-domain.com
AUTH_USER=load_test_user
AUTH_PASS=load_test_password
K6_INFLUXDB_ORGANIZATION=performance
K6_INFLUXDB_BUCKET=metrics
K6_INFLUXDB_URL=http://influxdb:8086
K6_INFLUXDB_TOKEN=********
```

---

## 🧪 Test Scenarios

### 1) Single-User Baseline

**Goal**: Establish baseline response times

```
k6 run single_user_baseline.js
```

**Expected**:

- p95 < 200ms
- Error rate < 0.1%

---

### 2) 100 Users (Normal Load)

```
k6 run load_100_users.js
```

**Expected**:

- p95 < 250ms
- Error rate < 0.1%

---

### 3) 500 Users (Heavy Load)

```
k6 run load_500_users.js
```

**Expected**:

- p95 < 300ms
- Error rate < 0.15%

---

### 4) 1000+ Users (Stress Test)

```
k6 run stress_1000_users.js
```

**Expected**:

- p95 < 400ms
- Error rate < 0.5%
- Recovery time < 2 min

---

## 📊 Monitoring Checklist

Before and during test:

```
[ ] CPU usage < 80%
[ ] Memory usage < 80%
[ ] DB connections stable
[ ] Cache hit rate > 60%
[ ] Error rate monitored in Grafana
[ ] p95 latency monitored in Grafana
```

---

## 📥 Data Capture (Required)

After each test, capture:

```
- k6 summary output (raw)
- Grafana screenshots (p95, error rate, throughput)
- DB query stats (pg_stat_statements)
- Redis cache metrics (hit/miss)
- Infrastructure metrics (CPU, memory, disk)
```

---

## 🧯 Failure Handling

If any of the following occurs, STOP the test:

```
- Error rate > 1% for 5 minutes
- p95 latency > 2x expected
- DB connections saturate
- Service crashes or restarts
```

**Action**:

- Stop test
- Capture logs
- Notify DevOps Lead
- Document in daily log

---

## ✅ Post-Test Reporting

Update these documents after each run:

- TESTING_METRICS_DASHBOARD.md
- PHASE_4_DAILY_LOG_TEMPLATE.md
- PHASE_4_WEEK2_PROCEDURES.md (if run in Week 2)

---

## 🔗 References

- PERFORMANCE_BASELINE_CONFIG.md
- PHASE_4_WEEK2_PROCEDURES.md
- TESTING_METRICS_DASHBOARD.md
