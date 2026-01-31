# ⚡ Performance Baseline Configuration

تكوين الأداء الأساسي

**Document Type**: Technical Configuration  
**Version**: 1.0.0  
**Date Created**: January 30, 2026  
**Owner**: DevOps Lead & QA Lead

---

## 📊 Target Performance Metrics

### Response Time Targets

| Endpoint            | p50 Target | p95 Target  | p99 Target  | Notes             |
| ------------------- | ---------- | ----------- | ----------- | ----------------- |
| GET /health         | 50-75ms    | 100-120ms   | 150-200ms   | Health check      |
| POST /auth/login    | 150-200ms  | 250-300ms   | 400-500ms   | Auth required     |
| GET /beneficiaries  | 100-150ms  | 200-250ms   | 300-400ms   | List operation    |
| POST /beneficiaries | 200-300ms  | 400-500ms   | 600-800ms   | Create operation  |
| GET /analyses       | 150-200ms  | 300-400ms   | 500-600ms   | List operation    |
| POST /analyses      | 300-500ms  | 800-1000ms  | 1200-1500ms | AI processing     |
| POST /reports       | 500-800ms  | 1200-1500ms | 2000-2500ms | Report generation |
| POST /export        | 300-600ms  | 800-1200ms  | 1500-2000ms | Data export       |

---

## 🔧 k6 Load Test Configuration

### Single-User Test Script

**File**: `load-test-single-user.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 1 }, // 1 user
    { duration: '5m', target: 1 }, // stay at 1
    { duration: '1m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<300'], // 95% below 200ms
    http_req_failed: ['rate<0.1'], // error rate < 0.1%
  },
};

export default function () {
  // Test authentication
  let loginResponse = http.post(
    'https://staging-api.example.com/auth/login',
    JSON.stringify({
      email: 'test@example.com',
      password: 'testPassword123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(loginResponse, {
    'login status is 200': r => r.status === 200,
    'login time < 200ms': r => r.timings.duration < 200,
  });

  const token = loginResponse.json('token');
  sleep(1);

  // Test get beneficiaries
  let beneficiariesResponse = http.get(
    'https://staging-api.example.com/beneficiaries',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  check(beneficiariesResponse, {
    'list status is 200': r => r.status === 200,
    'list time < 150ms': r => r.timings.duration < 150,
    'has results': r => r.json('data.length') > 0,
  });

  sleep(2);

  // Test create beneficiary
  let createResponse = http.post(
    'https://staging-api.example.com/beneficiaries',
    JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      email: 'test' + Date.now() + '@example.com',
      disabilityType: 'mobility',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  check(createResponse, {
    'create status is 201': r => r.status === 201,
    'create time < 300ms': r => r.timings.duration < 300,
  });

  sleep(2);

  // Test analysis creation
  let analysisResponse = http.post(
    'https://staging-api.example.com/analyses',
    JSON.stringify({
      beneficiaryId: beneficiariesResponse.json('data.0.id'),
      assessmentData: {
        mobility: 7,
        cognitive: 8,
        emotional: 6,
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  check(analysisResponse, {
    'analysis status is 201': r => r.status === 201,
    'analysis time < 500ms': r => r.timings.duration < 500,
  });

  sleep(1);

  // Test report generation
  let reportResponse = http.post(
    'https://staging-api.example.com/reports',
    JSON.stringify({
      beneficiaryId: beneficiariesResponse.json('data.0.id'),
      format: 'pdf',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  check(reportResponse, {
    'report status is 200': r => r.status === 200,
    'report time < 800ms': r => r.timings.duration < 800,
  });

  sleep(3);
}
```

**Run Command**:

```bash
k6 run load-test-single-user.js --out json=results-single-user.json
```

---

## 🔧 Load Test Scenarios

### Scenario 1: 100 Concurrent Users

**File**: `load-test-100-users.js`

```javascript
export let options = {
  stages: [
    { duration: '2m', target: 10 }, // ramp up to 10
    { duration: '2m', target: 50 }, // continue to 50
    { duration: '2m', target: 100 }, // reach 100
    { duration: '10m', target: 100 }, // stay at 100
    { duration: '2m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.1'],
  },
};

// Use same test functions as single-user
```

**Expected Results**:

```
Response Time:
  p50:  120-150ms
  p95:  200-250ms
  p99:  300-400ms

Throughput: 50-80 req/sec
Error Rate: < 0.1%
Errors: < 10 total
```

---

### Scenario 2: 500 Concurrent Users

**File**: `load-test-500-users.js`

```javascript
export let options = {
  stages: [
    { duration: '3m', target: 50 }, // ramp up to 50
    { duration: '3m', target: 250 }, // to 250
    { duration: '3m', target: 500 }, // to 500
    { duration: '10m', target: 500 }, // sustain 500
    { duration: '3m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.15'],
  },
};
```

**Expected Results**:

```
Response Time:
  p50:  150-180ms
  p95:  250-300ms
  p99:  400-500ms

Throughput: 80-120 req/sec
Error Rate: < 0.15%
Errors: < 50 total
```

---

### Scenario 3: 1000+ Concurrent Users (Stress Test)

**File**: `load-test-1000-users.js`

```javascript
export let options = {
  stages: [
    { duration: '5m', target: 200 }, // ramp up gradually
    { duration: '5m', target: 500 },
    { duration: '5m', target: 1000 },
    { duration: '10m', target: 1000 }, // sustain
    { duration: '5m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.5'], // relaxed for stress
  },
};
```

**Expected Results**:

```
Response Time:
  p50:  200-250ms
  p95:  350-400ms
  p99:  500-800ms

Throughput: 100-150 req/sec
Error Rate: < 0.5%
Database connections: Maxed out
Recovery Time: < 2 minutes
```

---

## 📊 Database Configuration for Testing

### Connection Pool Settings

**PostgreSQL (node-postgres)**:

```javascript
const pool = new Pool({
  user: 'rehab_user',
  password: process.env.DB_PASSWORD,
  host: 'staging-db.example.com',
  port: 5432,
  database: 'rehab_agi_staging',

  // Connection pool
  max: 20, // max clients
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 2000,

  // Performance
  statement_timeout: 5000, // 5 second timeout
});
```

### Query Optimization Indexes

```sql
-- Essential indexes for performance
CREATE INDEX idx_beneficiaries_disability_type
  ON beneficiaries(disability_type);

CREATE INDEX idx_analyses_beneficiary_id
  ON analyses(beneficiary_id);

CREATE INDEX idx_analyses_created_at
  ON analyses(created_at DESC);

CREATE INDEX idx_programs_effectiveness
  ON programs(effectiveness_score DESC);

CREATE INDEX idx_reports_generated_at
  ON reports(generated_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_beneficiary_program
  ON beneficiary_programs(beneficiary_id, program_id);

-- Full-text search (if applicable)
CREATE INDEX idx_beneficiaries_search
  ON beneficiaries USING GIN(
    to_tsvector('english', first_name || ' ' || last_name)
  );
```

### Connection Pool Monitoring

```sql
-- Monitor active connections
SELECT datname, count(*) FROM pg_stat_activity
GROUP BY datname;

-- Monitor idle connections
SELECT pid, usename, state, state_change
FROM pg_stat_activity
WHERE state = 'idle';

-- Query performance
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🔴 Redis Cache Configuration

### Cache Settings

```javascript
const redis = require('redis');
const client = redis.createClient({
  host: 'staging-cache.example.com',
  port: 6379,
  db: 0,

  // Connection
  retry_strategy: options => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('End of retry.');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('End of retry.');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  },

  // Performance
  max_attempts: 10,
  enable_offline_queue: true,
});

// Cache patterns
const CACHE_TTL = {
  beneficiary: 300, // 5 minutes
  program: 600, // 10 minutes
  analysis: 1800, // 30 minutes
  dashboard: 60, // 1 minute
};
```

### Cache Warming Strategy

Before load test starts:

```javascript
async function warmCache() {
  // Pre-load frequently accessed data

  // Load all programs
  const programs = await getAllPrograms();
  for (const program of programs) {
    await redis.setex(
      `program:${program.id}`,
      CACHE_TTL.program,
      JSON.stringify(program)
    );
  }

  // Load beneficiary types
  const types = await getBeneficiaryTypes();
  await redis.setex(
    'beneficiary-types',
    CACHE_TTL.program,
    JSON.stringify(types)
  );

  console.log('Cache warming complete');
}
```

---

## 📊 Prometheus Metrics Configuration

### Metrics to Track

```javascript
// Application metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type'],
  buckets: [0.001, 0.01, 0.1, 1, 5],
});

const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate (0-100)',
});

const errorCount = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type'],
});
```

### Scrape Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'rehab-agi'
    static_configs:
      - targets: ['staging-api.example.com:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s
```

---

## 📈 Grafana Dashboard Configuration

### Dashboard JSON Example

```json
{
  "dashboard": {
    "title": "Rehab AGI - Performance Monitoring",
    "panels": [
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)"
          }
        ],
        "yaxes": [
          {
            "format": "ms",
            "label": "Response Time"
          }
        ]
      },
      {
        "title": "Throughput",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(errors_total[1m])"
          }
        ]
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "active_connections"
          }
        ]
      }
    ]
  }
}
```

---

## ✅ Pre-Test Checklist

Before running load tests:

```
INFRASTRUCTURE:
[ ] Staging environment deployed
[ ] Database populated with test data
[ ] Redis cache operational
[ ] Load balancer configured
[ ] Monitoring stack running
[ ] Metrics collection active

CONFIGURATION:
[ ] Database connection pool configured
[ ] Cache TTL values set
[ ] Prometheus scrape targets configured
[ ] Grafana dashboards created
[ ] Alert thresholds set

LOAD TEST SCRIPTS:
[ ] Single-user script ready
[ ] 100-user script ready
[ ] 500-user script ready
[ ] 1000-user script ready
[ ] All scripts tested locally

BASELINE DATA:
[ ] Test beneficiaries loaded (100)
[ ] Programs loaded (50)
[ ] Historical data (if needed)
[ ] Cache warmed

TEAM READY:
[ ] QA lead briefed
[ ] DevOps lead ready
[ ] Monitoring person assigned
[ ] Escalation procedures posted
[ ] Communication channel active
```

---

## 📊 Baseline Capture Commands

Run these before/after each load test:

```bash
# Capture metrics
curl -s http://prometheus:9090/api/v1/query?query=http_request_duration_seconds > metrics-before.json

# Capture system resources
top -b -n 1 > system-before.txt

# Capture database stats
psql -h staging-db -c "SELECT * FROM pg_stat_database;" > db-before.txt

# Capture cache stats
redis-cli INFO stats > cache-before.txt
```

---

## 🎯 Success Criteria

### Week 1 Baseline Targets

| Metric                   | Target        | Status |
| ------------------------ | ------------- | ------ |
| Response Time (p95)      | < 200ms       | [ ]    |
| Error Rate               | < 0.1%        | [ ]    |
| Throughput (single user) | > 100 req/sec | [ ]    |
| CPU Usage                | < 40%         | [ ]    |
| Memory Usage             | < 60%         | [ ]    |
| Database Response        | < 50ms        | [ ]    |
| Cache Hit Rate           | > 80%         | [ ]    |

---

**Version**: 1.0.0  
**Last Updated**: January 30, 2026  
**Ready for**: Week 1 Baseline Testing
