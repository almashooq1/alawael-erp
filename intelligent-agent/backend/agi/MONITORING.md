# 📊 AGI Monitoring System

Comprehensive monitoring and observability for the AGI system.

---

## 🎯 Features

### 📈 Performance Monitoring

- Request tracking (total, success, errors)
- Response time metrics
- Throughput measurement
- Success/error rates

### 💾 Resource Monitoring

- Memory usage tracking
- CPU usage monitoring
- Heap analysis
- System uptime

### 🧩 Component Monitoring

- Per-component call tracking
- Average execution time
- Operation-specific metrics
- Memory size tracking (Learning component)

### 🏥 Health Checks

- System health status (healthy/degraded/unhealthy)
- Component availability
- Resource threshold monitoring
- Automated health checks

### 📊 Data Export

- Prometheus-compatible metrics
- JSON API endpoints
- Text-based reports
- Real-time dashboard

---

## 🚀 Quick Start

### 1. Start AGI Server

```bash
cd intelligent-agent/backend/agi
npm install
npm run dev
```

Server starts on: `http://localhost:5001`

### 2. Access Monitoring Dashboard

Open in browser:

```
http://localhost:5001/dashboard/dashboard.html
```

### 3. View Metrics

**JSON Status:**

```bash
curl http://localhost:5001/api/agi/status
```

**Prometheus Metrics:**

```bash
curl http://localhost:5001/api/agi/metrics
```

**Text Report:**

```bash
curl http://localhost:5001/api/agi/report
```

---

## 📡 API Endpoints

### GET /api/agi/status

Get comprehensive system status including:

- Health status
- Performance metrics
- Resource usage
- Component status
- Component-specific metrics

**Response:**

```json
{
  "status": "active",
  "health": {
    "status": "healthy",
    "timestamp": "2026-01-22T...",
    "uptime": 3600,
    "version": "1.0.0",
    "components": {
      "reasoning": true,
      "learning": true,
      "decision": true,
      "creativity": true,
      "planning": true,
      "context": true
    },
    "metrics": {
      "performance": {
        "requests": 150,
        "avgResponseTime": 45.2,
        "successRate": 98.5,
        "errorRate": 1.5,
        "throughput": 2.5
      },
      "resources": {
        "cpuUsage": 0.5,
        "memoryUsage": 52428800,
        "memoryTotal": 134217728,
        "memoryPercentage": 39.1,
        "uptime": 3600
      }
    }
  },
  "componentMetrics": {
    "reasoning": {
      "totalCalls": 45,
      "avgTime": 23.5,
      "methods": {
        "deductive": 20,
        "inductive": 15,
        "abductive": 10
      }
    }
    // ... other components
  }
}
```

### GET /api/agi/health

Dedicated health check endpoint for load balancers.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "uptime": 3600,
  "version": "1.0.0",
  "timestamp": "2026-01-22T..."
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "error": "High memory usage"
}
```

### GET /api/agi/metrics

Prometheus-compatible metrics export.

**Response (text/plain):**

```
# HELP agi_requests_total Total number of requests
# TYPE agi_requests_total counter
agi_requests_total 150

# HELP agi_response_time_avg Average response time in ms
# TYPE agi_response_time_avg gauge
agi_response_time_avg 45.2

# HELP agi_memory_usage Memory usage in bytes
# TYPE agi_memory_usage gauge
agi_memory_usage 52428800
```

### GET /api/agi/report

Human-readable monitoring report.

**Response (text/plain):**

```
============================================================
📊 AGI MONITORING REPORT
============================================================

Status: ✅ HEALTHY
Uptime: 1h 0m
Version: 1.0.0

📈 PERFORMANCE
------------------------------------------------------------
Total Requests: 150
Success Rate: 98.50%
Error Rate: 1.50%
Avg Response Time: 45.20ms
Throughput: 2.50 req/s

💾 RESOURCES
------------------------------------------------------------
Memory: 50.00 MB / 128.00 MB (39.10%)
CPU: 0.50s

🧠 COMPONENTS
------------------------------------------------------------
✅ REASONING
   Calls: 45
   Avg Time: 23.50ms

✅ LEARNING
   Calls: 30
   Avg Time: 18.20ms
   Memory Size: 150
```

---

## 📊 Monitoring Dashboard

### Features

1. **Real-time Updates** - Auto-refresh every 5 seconds
2. **Visual Status Indicators** - Color-coded health status
3. **Performance Metrics** - Charts and graphs
4. **Resource Usage** - Memory and CPU tracking
5. **Component Status** - Individual component health
6. **Beautiful UI** - Modern gradient design with Arabic support

### Screenshot

```
┌─────────────────────────────────────────┐
│  🧠 AGI Monitoring Dashboard            │
│  Real-time monitoring                    │
│  Last updated: 12:30:45                  │
├─────────────────────────────────────────┤
│  Status: ✅ HEALTHY  | Uptime: 1h 30m   │
│  Requests: 250       | Success: 98.5%   │
├─────────────────────────────────────────┤
│  📈 Performance      │  💾 Resources    │
│  Avg Time: 45ms     │  Memory: 50 MB   │
│  Error Rate: 1.5%   │  CPU: 0.5s       │
├─────────────────────────────────────────┤
│  🧩 Components                           │
│  ✅ Reasoning  ✅ Learning              │
│  ✅ Decision   ✅ Creativity            │
│  ✅ Planning   ✅ Context               │
└─────────────────────────────────────────┘
```

---

## 🔧 Integration

### Express Middleware

```typescript
import { monitoringMiddleware } from './monitoring';

app.use(monitoringMiddleware);
```

This automatically tracks:

- Request count
- Response times
- Success/error rates
- Endpoint-specific metrics

### Component Monitoring

```typescript
import { monitoring } from './monitoring';

// Record component operation
const start = Date.now();
const result = await someOperation();
const duration = Date.now() - start;

monitoring.recordComponentOperation('reasoning', 'deductive', duration);
```

### Decorator Pattern

```typescript
import { monitored } from './monitoring';

class MyComponent {
  @monitored('reasoning', 'deductive')
  async deductiveReason(goal: string) {
    // Automatically monitored
    return result;
  }
}
```

---

## 🎯 Prometheus Integration

### Add to Prometheus Config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'agi-system'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:5001']
    metrics_path: '/api/agi/metrics'
```

### Grafana Dashboard

Import metrics:

- `agi_requests_total` - Total requests
- `agi_response_time_avg` - Average response time
- `agi_success_rate` - Success rate percentage
- `agi_memory_usage` - Memory usage in bytes
- `agi_memory_percentage` - Memory usage percentage
- `agi_reasoning_calls` - Reasoning component calls
- `agi_learning_calls` - Learning component calls

---

## 📦 Health Status Thresholds

### Healthy

- Memory usage < 75%
- Error rate < 20%
- All components operational

### Degraded

- Memory usage 75-90%
- Error rate 20-50%
- Some components slow

### Unhealthy

- Memory usage > 90%
- Error rate > 50%
- Critical component failures

---

## 🔄 Event-Driven Monitoring

```typescript
import { monitoring } from './monitoring';

// Listen to metric events
monitoring.on('metric', metric => {
  console.log('New metric:', metric);
});

// Listen to health checks
monitoring.on('health-check', health => {
  if (health.status !== 'healthy') {
    console.warn('System health degraded:', health);
  }
});
```

---

## 🐳 Docker Monitoring

### Docker Compose with Monitoring Stack

```yaml
version: '3.8'

services:
  agi-system:
    build: .
    ports:
      - '5001:5001'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:5001/api/agi/health']
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - '9090:9090'

  grafana:
    image: grafana/grafana
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 📝 Logging Integration

### Winston Logger

```typescript
import winston from 'winston';
import { monitoring } from './monitoring';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

// Log on health degradation
monitoring.on('health-check', health => {
  if (health.status === 'degraded') {
    logger.warn('System degraded', health);
  } else if (health.status === 'unhealthy') {
    logger.error('System unhealthy', health);
  }
});
```

---

## 🔔 Alerting

### Example: Send Alerts on Issues

```typescript
import { monitoring } from './monitoring';
import { sendAlert } from './alert-service';

monitoring.on('health-check', health => {
  if (health.status === 'unhealthy') {
    sendAlert({
      severity: 'critical',
      message: 'AGI System is unhealthy',
      details: health,
    });
  }
});
```

---

## 📊 Custom Metrics

### Add Custom Metrics

```typescript
import { monitoring, MetricType } from './monitoring';

// Record custom counter
monitoring.recordMetric('custom_events', 1, MetricType.COUNTER, {
  type: 'user_action',
  action: 'button_click',
});

// Record custom gauge
monitoring.recordMetric('queue_size', 150, MetricType.GAUGE);

// Record custom histogram
monitoring.recordMetric('processing_time', 45.2, MetricType.HISTOGRAM, {
  operation: 'data_processing',
});
```

---

## 🧪 Testing

### Test Monitoring System

```typescript
import { monitoring } from './monitoring';

describe('Monitoring System', () => {
  beforeEach(() => {
    monitoring.clearMetrics();
  });

  test('should record requests', () => {
    monitoring.recordRequest(true, 50, '/api/test');

    const metrics = monitoring.getPerformanceMetrics();
    expect(metrics.requests).toBe(1);
    expect(metrics.avgResponseTime).toBe(50);
  });

  test('should detect unhealthy status', () => {
    // Simulate high memory usage
    const health = monitoring.getHealthStatus();
    // Assert health status
  });
});
```

---

## 🔐 Security

### API Key Protection

```typescript
import express from 'express';

const monitoringRouter = express.Router();

// Protect monitoring endpoints
monitoringRouter.use((req, res, next) => {
  const apiKey = req.headers['x-monitoring-key'];

  if (apiKey !== process.env.MONITORING_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});

monitoringRouter.get('/metrics', ...);
monitoringRouter.get('/report', ...);
```

---

## 📈 Performance Tips

1. **Limit Metric History** - Keep only last 1000 metrics per name
2. **Use Sampling** - Sample high-frequency metrics
3. **Batch Updates** - Batch metric updates when possible
4. **Cache Reports** - Cache generated reports (5-60 seconds)
5. **Async Processing** - Process metrics asynchronously

---

## 🎓 Best Practices

### DO ✅

- Monitor critical paths
- Set up health checks
- Use Prometheus format
- Implement alerting
- Regular health checks (60s)
- Clean metric data periodically

### DON'T ❌

- Track every single operation
- Store unlimited history
- Block main thread
- Expose sensitive data
- Ignore degraded status

---

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Express Monitoring Best Practices](https://expressjs.com/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**🎯 Start monitoring your AGI system today!**

For questions or issues, see [CONTRIBUTING.md](./CONTRIBUTING.md)
