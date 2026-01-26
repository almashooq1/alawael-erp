# 🚀 PHASE 12 - QUICK START GUIDE

## Advanced Features & Kubernetes Deployment

**Last Updated**: 2026-01-24  
**Status**: READY FOR DEPLOYMENT

---

## ⚡ 30-Second Overview

**Phase 12 adds**:

- 🔍 Advanced Analytics Engine
- 👥 Multi-Tenancy System
- 🔒 Enterprise Security
- ☸️ Kubernetes Support
- 📊 Predictive Analytics
- 🎯 Auto-scaling (3-10 pods)

---

## 🎯 START HERE

### 1. Verify Current System

```bash
# Check backend
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000/

# View metrics
curl http://localhost:9091/metrics
```

### 2. Deploy Advanced Features

#### Option A: Docker Compose (Quick Start)

```bash
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
docker-compose up -d

# Wait 30 seconds
Start-Sleep -Seconds 30

# Test
Invoke-WebRequest http://localhost:3001/health
```

#### Option B: Kubernetes (Production)

```bash
# Apply manifests
kubectl apply -f devops/kubernetes/alawael-deployment.yaml

# Monitor rollout
kubectl rollout status deployment/alawael-backend -n alawael-erp

# Check pods
kubectl get pods -n alawael-erp
```

### 3. Access Services

| Service         | URL                   | Port |
| --------------- | --------------------- | ---- |
| **Frontend**    | http://localhost:3000 | 3000 |
| **Backend API** | http://localhost:3001 | 3001 |
| **Grafana**     | http://localhost:3005 | 3005 |
| **Prometheus**  | http://localhost:9090 | 9090 |

---

## 📊 Advanced Analytics Usage

### Track Metrics

```javascript
const { AdvancedAnalyticsEngine } = require('./utils/advanced-analytics');

const analytics = new AdvancedAnalyticsEngine();

// Track metric
analytics.trackMetric('api_response_time', 15.5, {
  endpoint: '/users',
  method: 'GET',
});

// Get statistics
const stats = analytics.getMetricStats('api_response_time');
console.log(stats);

// Get trends
const trends = analytics.getTrendAnalysis('api_response_time');
console.log(trends);

// Get dashboard
const dashboard = analytics.getRealtimeDashboard();
```

### Generate Reports

```javascript
// Generate report for last 24 hours
const startTime = Date.now() - 86400000;
const endTime = Date.now();

const report = analytics.generateReport(startTime, endTime);
console.log(report);
```

### Predictive Analytics

```javascript
const { PredictiveAnalytics } = require('./utils/advanced-analytics');

// Forecast next value
const forecast = PredictiveAnalytics.forecastValue([10, 12, 15, 18, 20]);
console.log(`Next value: ${forecast}`);

// Detect seasonality
const pattern = PredictiveAnalytics.detectSeasonality(data);

// Predict failures
const risk = PredictiveAnalytics.predictFailure(data);
```

---

## 👥 Multi-Tenancy Setup

### Create Tenant

```javascript
const { TenancyManager } = require('./features/multi-tenancy');

const tenant = await TenancyManager.createTenant({
  name: 'ACME Corporation',
  domain: 'acme.alawael.com',
  plan: 'professional',
  features: {
    api: true,
    advancedReports: true,
    customIntegrations: true,
  },
  quotas: {
    maxUsers: 100,
    maxApiCalls: 10000,
    maxStorage: 10,
    maxProjects: 5,
  },
});

console.log(`Created tenant: ${tenant.tenantId}`);
```

### Check Tenant Usage

```javascript
const usage = await TenancyManager.getTenantUsage(tenantId);
console.log(usage);

// Check specific quota
const check = await TenancyManager.checkQuotaLimit(tenantId, 'users');
console.log(`Users used: ${check.used}/${check.max}`);
```

### List All Tenants

```javascript
const tenants = await TenancyManager.listTenants();
console.log(tenants);

// Get statistics
const stats = await TenancyManager.getTenantStats();
console.log(stats);
```

---

## 🔒 Advanced Security Usage

### Request Signature Validation

```javascript
const {
  RequestSignatureValidator,
} = require('./middleware/advanced-security.middleware');

// Add to backend
app.use(RequestSignatureValidator.middleware);

// Client side - generate signature
const payload = {
  method: 'GET',
  path: '/api/users',
  timestamp: Date.now(),
};

const signature = RequestSignatureValidator.generateSignature(
  payload,
  process.env.API_SECRET
);

// Send request with signature
fetch('/api/users', {
  headers: {
    'X-Signature': signature,
    'X-Timestamp': Date.now(),
  },
});
```

### API Key Management

```javascript
const { APIKeyManager } = require('./middleware/advanced-security.middleware');

const keyManager = new APIKeyManager();

// Create API key
const { key, hashedKey } = keyManager.createKey('production-key', [
  'read',
  'write',
]);
console.log(`API Key: ${key}`); // Store this securely!

// Rotate API key
const { newKey } = keyManager.rotateKey(oldKey);

// Use middleware
app.use(keyManager.middleware());
```

### DDoS Protection

```javascript
const { DDoSProtection } = require('./middleware/advanced-security.middleware');

const ddos = new DDoSProtection();

// Add to backend
app.use(ddos.middleware());

// Check specific IP
const isBlocked = ddos.isIPBlocked('192.168.1.1');

// Block IP manually
ddos.blockIP('malicious.ip.com', 3600000); // 1 hour
```

---

## ☸️ Kubernetes Commands

### Deploy

```bash
# Apply manifests
kubectl apply -f devops/kubernetes/alawael-deployment.yaml

# Check namespace
kubectl get namespace alawael-erp

# Check deployments
kubectl get deployments -n alawael-erp

# Check pods
kubectl get pods -n alawael-erp
```

### Monitor

```bash
# Watch pods
kubectl get pods -n alawael-erp -w

# Check pod logs
kubectl logs -n alawael-erp -l app=alawael-backend -f

# Check resource usage
kubectl top pods -n alawael-erp

# Check auto-scaling
kubectl get hpa -n alawael-erp
```

### Scale Manually

```bash
# Scale backend to 5 replicas
kubectl scale deployment alawael-backend -n alawael-erp --replicas=5

# Check scaling
kubectl get deployment alawael-backend -n alawael-erp -w
```

### Health Checks

```bash
# Check pod health
kubectl describe pod <pod-name> -n alawael-erp

# Check readiness
kubectl logs <pod-name> -n alawael-erp

# Test endpoint
kubectl exec -n alawael-erp -it <pod-name> -- curl http://localhost:3001/health
```

### Troubleshooting

```bash
# Get events
kubectl get events -n alawael-erp

# Describe deployment
kubectl describe deployment alawael-backend -n alawael-erp

# Check resource quotas
kubectl describe resourcequota -n alawael-erp

# View YAML
kubectl get deployment alawael-backend -n alawael-erp -o yaml
```

---

## 📈 Performance Testing

### Load Testing

```bash
# Basic test (50 requests, 5 concurrent)
node load-test.js 50 5

# Heavy load (500 requests, 50 concurrent)
node load-test.js 500 50

# Stress test (1000 requests, 100 concurrent)
node load-test.js 1000 100
```

### Expected Results

```
Throughput: 245+ req/sec
Avg Response: 15-20ms
P99 Latency: <50ms
Error Rate: <0.1%
```

---

## 🔍 Monitoring & Debugging

### Access Grafana

```
URL: http://localhost:3005
Username: admin
Password: admin
```

### Available Dashboards

1. System Health (CPU, Memory, Disk)
2. Application Performance (Response times, Errors)
3. Business Metrics (Users, Transactions)
4. Cache Performance (Hit/Miss ratio)
5. Database Performance (Query times)

### Prometheus Queries

```
# API request rate
rate(http_request_duration_seconds_count[5m])

# Cache hit rate
cache_operations_total{result="hit"}

# Active connections
socket_io_connections

# Memory usage
memory_usage_bytes
```

---

## 🧪 Testing Advanced Features

### Test Multi-Tenancy

```bash
# Create two tenants
curl -X POST http://localhost:3001/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tenant A",
    "domain": "tenant-a.local"
  }'

# Access with tenant header
curl http://localhost:3001/users \
  -H "X-Tenant-ID: tenant_1"
```

### Test Security

```bash
# Without API key (should fail)
curl http://localhost:3001/admin

# With API key
curl http://localhost:3001/admin \
  -H "X-API-Key: your-api-key"

# Test rate limiting (make 101 requests)
for i in {1..101}; do
  curl http://localhost:3001/health
done
```

### Test Analytics

```bash
# Track metrics
curl -X POST http://localhost:3001/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "page_view",
    "value": 1,
    "metadata": {"page": "/dashboard"}
  }'

# Get report
curl http://localhost:3001/api/analytics/report \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Checklist

### Before Deployment

- [ ] Review Phase 12 code
- [ ] Run test suite
- [ ] Execute load tests
- [ ] Verify security
- [ ] Test tenant isolation
- [ ] Validate K8s manifests

### Deployment

- [ ] Build images
- [ ] Push to registry
- [ ] Deploy K8s
- [ ] Verify pods
- [ ] Check connectivity
- [ ] Monitor metrics

### Post-Deployment

- [ ] Smoke tests
- [ ] Monitor errors
- [ ] Check performance
- [ ] Test auto-scaling
- [ ] Verify failover
- [ ] Document issues

---

## 🆘 Troubleshooting

### Pod won't start

```bash
# Check logs
kubectl logs <pod-name> -n alawael-erp

# Check events
kubectl describe pod <pod-name> -n alawael-erp

# Check resources
kubectl top nodes
```

### High memory usage

```bash
# Check pod resource usage
kubectl top pods -n alawael-erp

# Restart pod
kubectl delete pod <pod-name> -n alawael-erp

# Increase limits
# Edit alawael-deployment.yaml and reapply
```

### Service not responding

```bash
# Check service
kubectl get svc -n alawael-erp

# Port forward for testing
kubectl port-forward svc/alawael-backend-service 3001:3001 -n alawael-erp

# Test locally
curl http://localhost:3001/health
```

---

## 📞 Support

| Issue                   | Solution                         |
| ----------------------- | -------------------------------- |
| **Pod crash**           | Check logs: `kubectl logs <pod>` |
| **Slow response**       | Check metrics in Grafana         |
| **Auth failed**         | Verify API key in secrets        |
| **Multi-tenancy error** | Check X-Tenant-ID header         |
| **OOM killer**          | Increase memory limits           |

---

## 🎯 Next Steps

1. **Deploy** - Use K8s manifests for production
2. **Monitor** - Watch Grafana dashboards
3. **Test** - Run load tests regularly
4. **Optimize** - Tune based on metrics
5. **Scale** - Auto-scaling handles load

---

## 📚 Documentation References

- [Phase 12 Completion Report](📊_PHASE_12_COMPLETION_REPORT.md)
- [Production Deployment Guide](⚡_PRODUCTION_DEPLOYMENT_COMPLETE.md)
- [Advanced Analytics Guide](backend/utils/advanced-analytics.js)
- [Multi-Tenancy Setup](backend/features/multi-tenancy.js)
- [Security Middleware](backend/middleware/advanced-security.middleware.js)
- [Kubernetes Manifests](devops/kubernetes/alawael-deployment.yaml)

---

_Quick Start Version_: 1.0  
_Updated_: 2026-01-24  
_Status_: READY FOR DEPLOYMENT
