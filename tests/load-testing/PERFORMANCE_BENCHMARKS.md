# Performance Benchmarks & Load Testing Guide

## Table of Contents

1. Performance Targets
2. Load Testing Profiles
3. Running Load Tests
4. Interpreting Results
5. Optimization Guidelines
6. Monitoring During Tests
7. Production Readiness Checklist

---

## 1. Performance Targets

### System-Wide SLAs

| Metric                   | Target        | Status |
| ------------------------ | ------------- | ------ |
| Average Response Time    | < 100ms       | ✅     |
| P95 Response Time        | < 200ms       | ✅     |
| P99 Response Time        | < 500ms       | ✅     |
| Success Rate             | > 99.5%       | ✅     |
| Error Rate               | < 0.5%        | ✅     |
| Minimum Throughput       | > 100 req/sec | ✅     |
| Maximum Concurrent Users | ≥ 250         | ✅     |

### Endpoint-Specific Targets

#### Authentication

- **Endpoint:** `POST /api/auth/login`
- **P95 Response:** 150ms
- **P99 Response:** 300ms
- **Success Rate:** 99.8%
- **Failure Tolerance:** 0.2%

#### Dashboard

- **Endpoint:** `GET /api/dashboard`
- **P95 Response:** 200ms
- **P99 Response:** 500ms
- **Success Rate:** 99.5%
- **Cache Hit Rate:** > 80%

#### Employee Management

- **Endpoints:** `GET/POST /api/employees`
- **P95 Response:** 150ms
- **P99 Response:** 300ms
- **Success Rate:** 99.5%
- **Pagination Limit:** 100 records

#### Payroll Processing

- **Endpoint:** `POST /api/payroll/process`
- **P95 Response:** 500ms
- **P99 Response:** 1000ms
- **Success Rate:** 99.9%
- **Batch Size:** 500 employees max

#### Leave Management

- **Endpoint:** `GET/POST /api/leave/requests`
- **P95 Response:** 150ms
- **P99 Response:** 300ms
- **Success Rate:** 99.5%
- **Query Limit:** 1000 records

#### Reports & Analytics

- **Endpoint:** `GET /api/reports/:type`
- **P95 Response:** 200ms
- **P99 Response:** 500ms
- **Success Rate:** 99.0%
- **Caching:** 5-minute TTL

#### Export Operations

- **Endpoint:** `GET /api/reports/export`
- **P95 Response:** 2000ms
- **P99 Response:** 5000ms
- **Success Rate:** 99.0%
- **Max Size:** 10MB per export

---

## 2. Load Testing Profiles

### Smoke Test

```
Profile: Smoke Test
Users: 10
Spawn Rate: 2 users/sec
Duration: 60 seconds
Purpose: Verify system is operational
Use When: Initial setup, CI/CD pipeline
Target: 100% success rate
```

### Baseline Load

```
Profile: Baseline
Users: 50
Spawn Rate: 5 users/sec
Duration: 5 minutes
Purpose: Measure normal expected load
Use When: Regression testing, daily checks
Target: Meet all SLA targets
```

### Peak Load

```
Profile: Peak Load
Users: 250
Spawn Rate: 10 users/sec
Duration: 10 minutes
Purpose: Test expected peak time load
Use When: Load capacity verification
Target: ≥99.5% success rate
```

### Stress Test

```
Profile: Stress Test
Users: 500
Spawn Rate: 20 users/sec
Duration: 15 minutes
Purpose: Find breaking point
Use When: Capacity planning
Target: Identify failure mode gracefully
```

### Spike Test

```
Profile: Spike Test
Users: 1000
Spawn Rate: 100 users/sec
Duration: 10 minutes
Purpose: Test sudden traffic surge
Use When: Event preparation (e.g., year-end payroll)
Target: Recover within 1 minute
```

---

## 3. Running Load Tests

### Prerequisites

```bash
# Install Locust
pip install locust

# Verify installation
locust --version
```

### Start Backend Server

```bash
cd backend
npm install
npm start
# Server runs on http://localhost:3001
```

### Run Load Tests

#### Using Command Line

```bash
# Smoke test
locust -f locustfile.py --users 10 --spawn-rate 2 --run-time 60s --host http://localhost:3001

# Baseline load
locust -f locustfile.py --users 50 --spawn-rate 5 --run-time 5m --host http://localhost:3001

# Peak load
locust -f locustfile.py --users 250 --spawn-rate 10 --run-time 10m --host http://localhost:3001

# Stress test
locust -f locustfile.py --users 500 --spawn-rate 20 --run-time 15m --host http://localhost:3001

# Spike test
locust -f locustfile.py --users 1000 --spawn-rate 100 --run-time 10m --host http://localhost:3001
```

#### Using Web UI

```bash
locust -f locustfile.py --host http://localhost:3001
# Open http://localhost:8089
```

#### Using Python Script

```python
from locust import LoadTestShape
from load-test-config import LoadTestConfig, get_profile_config

# See advanced scenarios below
```

### Test Output Files

- `load_test_results.json` - Raw metrics data
- `load_test_report.html` - Interactive HTML report
- Console output - Real-time statistics

---

## 4. Interpreting Results

### Key Metrics

#### Response Time Percentiles

```
P50 (Median): 50% of requests complete in this time
P95: 95% of requests complete in this time
P99: 99% of requests complete in this time
P99.9: 99.9% of requests complete in this time

Example Results:
P50: 45ms ✅ Good
P95: 180ms ✅ Below 200ms target
P99: 450ms ✅ Below 500ms target
```

#### Success Rate

```
Formula: (Total Requests - Failed Requests) / Total Requests × 100

Example:
10,000 requests, 30 failures
(10,000 - 30) / 10,000 × 100 = 99.7% ✅ Above 99.5% target
```

#### Throughput

```
Requests per second
Formula: Total Requests / Total Duration (seconds)

Example:
50,000 requests in 500 seconds
50,000 / 500 = 100 req/sec ✅ Meets minimum target
```

#### Error Rate

```
Failed requests / Total requests × 100

Target: < 0.5%
Example: 30 failures / 10,000 requests = 0.3% ✅
```

### Sample Result Analysis

```
LOAD TEST RESULTS - BASELINE (50 users, 5 min)
==============================================

Response Times:
  Min:     12 ms
  Max:  1,240 ms ⚠️ Spike detected
  Average: 87 ms ✅
  P50:     45 ms ✅
  P95:    185 ms ✅ Below 200ms
  P99:    450 ms ✅ Below 500ms

Requests:
  Successful: 8,970 (99.67%) ✅
  Failed: 30 (0.33%) ✅
  Total: 9,000

Performance:
  Requests/sec: 30 req/sec
  Duration: 5m 0s

Endpoints:
  POST /api/auth/login: 99 req, 0 failures ✅
  GET /api/dashboard: 1,485 req, 5 failures ⚠️ (0.34%)
  GET /api/employees: 2,970 req, 10 failures ⚠️ (0.34%)
  POST /api/payroll/process: 597 req, 15 failures ⚠️ (2.5%) ❌ OVER LIMIT

Top 5 Slowest Endpoints:
  1. POST /api/payroll/process: 450ms avg, 1240ms max
  2. GET /api/reports/overview: 280ms avg, 890ms max
  3. GET /api/dashboard: 185ms avg, 645ms max
  ...
```

### Issues to Watch For

| Issue                      | Symptom                         | Action                         |
| -------------------------- | ------------------------------- | ------------------------------ |
| Cascading Failures         | Failures increase over time     | Check database connection pool |
| Memory Leak                | Response time degrades          | Review backend logs for leaks  |
| Cache Misses               | Dashboard times out             | Verify Redis connection        |
| Database Overload          | P99 times exceed 1 second       | Optimize queries, add indexes  |
| Connection Pool Exhaustion | Get "connection refused" errors | Increase pool size             |

---

## 5. Optimization Guidelines

### If Response Times Are High

**Issue: P95 > 200ms, P99 > 500ms**

1. **Check Backend Performance**

   ```bash
   # Monitor Node.js heap usage
   node --max-old-space-size=4096 backend/app.js

   # Check database query times
   # Add query logging: db.query.enableProfiling = true

   # Review slow queries
   db.setProfilingLevel(1, { slowms: 100 })
   ```

2. **Optimize Database Queries**

   ```javascript
   // ❌ Bad - N+1 queries
   const employees = await Employee.find().lean();
   for (let emp of employees) {
     emp.department = await Department.findById(emp.deptId);
   }

   // ✅ Good - Single query with population
   const employees = await Employee.find().populate('deptId').lean();
   ```

3. **Implement Caching**

   ```javascript
   const cached = await redis.get(`employees:page:${page}`);
   if (cached) return JSON.parse(cached);

   const data = await Employee.find();
   await redis.setex(`employees:page:${page}`, 300, JSON.stringify(data));
   return data;
   ```

4. **Add Database Indexes**
   ```javascript
   // Identify frequently queried fields
   db.employees.createIndex({ email: 1 });
   db.employees.createIndex({ department: 1 });
   db.leaves.createIndex({ status: 1, created: -1 });
   ```

### If Error Rate Is High

**Issue: > 0.5% errors**

1. **Analyze Error Types**

   ```bash
   grep "ERROR\|error\|fail" backend/logs/*.log | tail -100
   ```

2. **Check Common Issues**
   - Database connection limits
   - Memory exhaustion
   - Timeout errors
   - Authentication failures

3. **Fix Connection Issues**
   ```javascript
   // Increase connection pool
   const pool = new Pool({
     connectionLimit: 100,
     waitForConnections: true,
     queueLimit: 0,
   });
   ```

### If Throughput Is Low

**Issue: < 100 req/sec**

1. **Check Network Bandwidth**

   ```bash
   # Monitor network during test
   netstat -i
   ```

2. **Reduce Response Payload Size**

   ```javascript
   // Enable Gzip compression
   app.use(compression());

   // Return only needed fields
   Employee.select('name email position');
   ```

3. **Implement Query Pagination**

   ```javascript
   const limit = req.query.limit || 10;
   const page = req.query.page || 1;
   const skip = (page - 1) * limit;

   const employees = await Employee.find().skip(skip).limit(limit);
   ```

---

## 6. Monitoring During Tests

### System Metrics to Watch

```bash
# Monitor CPU usage
top -b -n 1 | grep node

# Monitor memory
ps aux | grep node
free -h

# Monitor disk I/O
iostat -x 1

# Monitor network
iftop -n

# Monitor MongoDB
mongostat --rowcount 10

# Monitor Redis
redis-cli INFO stats
```

### Application Metrics

```javascript
// Track in app.js
const metrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  responseTimeSum: 0,

  recordRequest(statusCode, duration) {
    this.requestCount++;
    if (statusCode >= 400) this.errorCount++;
    this.responseTimeSum += duration;
  },

  getReport() {
    return {
      uptime: Date.now() - this.startTime,
      avgResponseTime: this.responseTimeSum / this.requestCount,
      errorRate: (this.errorCount / this.requestCount) * 100,
      requestsPerSecond:
        this.requestCount / ((Date.now() - this.startTime) / 1000),
    };
  },
};
```

### Locust Statistics

Access at `http://localhost:8089`:

- Real-time request statistics
- Response time distributions
- Error rates by endpoint
- RPS (requests per second) graph
- User count over time

---

## 7. Production Readiness Checklist

Before deploying to production, verify:

### Performance

- [ ] Average response time < 100ms
- [ ] P95 response time < 200ms
- [ ] P99 response time < 500ms
- [ ] Success rate > 99.5%
- [ ] Error rate < 0.5%
- [ ] Throughput > 100 req/sec

### Capacity

- [ ] Peak load test (250 users) passes
- [ ] Stress test identifies graceful degradation
- [ ] Spike test recovers within 1 minute
- [ ] No memory growth over 30 minutes

### Reliability

- [ ] All endpoints respond to load
- [ ] Error handling works correctly
- [ ] Database connections don't exhaust
- [ ] Cache layer prevents database overload
- [ ] Timeouts configured appropriately

### Monitoring

- [ ] Application metrics exposed
- [ ] Alerts configured for thresholds
- [ ] Logging enabled and working
- [ ] Database monitoring in place
- [ ] Cache hit rates tracked

### Documentation

- [ ] Results documented
- [ ] Baseline metrics recorded
- [ ] Optimization recommendations captured
- [ ] Runbooks for failure scenarios created
- [ ] Load test procedures documented

### Deploy Checklist

- [ ] Blue-green deployment ready
- [ ] Rollback procedure tested
- [ ] Health checks configured
- [ ] Circuit breakers implemented
- [ ] Rate limiting configured

---

## Next Steps

1. **Run baseline test:**

   ```bash
   locust -f locustfile.py --users 50 --spawn-rate 5 --run-time 5m --host http://localhost:3001
   ```

2. **Analyze results** against targets in Section 1

3. **Optimize** using guidelines in Section 5

4. **Re-test** with same profile to verify improvements

5. **Document** results and optimization history

6. **Deploy** when all checklist items pass

---

## Load Testing Commands Reference

```bash
# Quick smoke test
locust -f locustfile.py --users 10 --spawn-rate 2 --run-time 60s --headless --host http://localhost:3001

# Interactive testing (Web UI)
locust -f locustfile.py --host http://localhost:3001

# Baseline with output file
locust -f locustfile.py --users 50 --spawn-rate 5 --run-time 300s --csv=results --host http://localhost:3001

# Peak load
locust -f locustfile.py --users 250 --spawn-rate 10 --run-time 600s --headless --host http://localhost:3001

# Stress test
locust -f locustfile.py --users 500 --spawn-rate 20 --run-time 900s --headless --host http://localhost:3001
```

Last Updated: February 15, 2026
