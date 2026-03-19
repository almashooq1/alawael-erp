# 🚀 Phase 11 - Quick Start Deployment Guide

**Updated**: March 2, 2026
**Status**: Ready for Production

---

## 5-Minute Quick Start

### Option 1: Docker Compose (Fastest)

```bash
# Clone and setup
cd dashboard/server

# Start entire stack
docker-compose up -d

# Wait for startup (30 seconds)
sleep 30

# Access services
echo "Frontend:  http://localhost"
echo "API:       http://localhost:3001"
echo "Grafana:   http://localhost:3000"
echo "Prometheus: http://localhost:9090"
```

**That's it!** All 7 services running with health checks.

### Option 2: Kubernetes + Helm (Recommended)

```bash
# Prerequisites: kubectl, helm configured

# Deploy
helm install alawael helm/alawael \
  --namespace alawael \
  --create-namespace

# Check status
kubectl get pods -n alawael

# Access
kubectl port-forward svc/frontend 80:80 -n alawael
kubectl port-forward svc/backend 3001:3001 -n alawael

# Frontend: http://localhost
# API: http://localhost:3001
```

### Option 3: Kubernetes Raw Manifests

```bash
# Deploy all manifests
kubectl apply -f k8s/

# Verify
kubectl get deployments -n alawael
kubectl get services -n alawael
kubectl get pods -n alawael

# Watch logs
kubectl logs -f deployment/backend -n alawael
```

---

## Service Access URLs

### Docker Compose
```
Frontend:     http://localhost
API:          http://localhost:3001/api
Health:       http://localhost:3001/health
Metrics:      http://localhost:3001/metrics/system
Cache:        http://localhost:3001/metrics/cache
Performance:  http://localhost:3001/metrics/performance

Grafana:      http://localhost:3000
Prometheus:   http://localhost:9090
pgAdmin:      http://localhost:5050
Redis:        localhost:6379
PostgreSQL:   localhost:5432
```

### Kubernetes
```
Frontend:     http://<FRONTEND_LOADBALANCER_IP>
API:          http://<BACKEND_CLUSTER_IP>:3001
Grafana:      http://<GRAFANA_CLUSTER_IP>:3000
Prometheus:   http://<PROMETHEUS_CLUSTER_IP>:9090
```

---

## API Endpoints Reference

### Health & Status
```bash
# Health check
curl http://localhost:3001/health

# Health history
curl http://localhost:3001/health/history

# System status
curl http://localhost:3001/api/status
```

### Metrics
```bash
# Performance metrics
curl http://localhost:3001/metrics/performance

# Cache statistics
curl http://localhost:3001/metrics/cache

# System metrics
curl http://localhost:3001/metrics/system
```

### Admin Operations
```bash
# Clear cache (requires API key)
curl -X POST \
  -H "X-API-Key: test-key" \
  http://localhost:3001/admin/cache/clear

# Reset metrics (requires API key)
curl -X POST \
  -H "X-API-Key: test-key" \
  http://localhost:3001/admin/metrics/reset
```

---

## Web UI Components

### 1. Health Dashboard
```
Location: Frontend Home
Features:
  - Real-time health status
  - System metrics (CPU, memory)
  - Health checks display
  - Historical tracking
  - Auto-refresh
```

### 2. Metrics Panel
```
Location: /metrics
Three tabs:
  - Performance: Slow functions, API metrics, memory
  - Cache: Hit/miss rates, cache size, statistics
  - System: CPU, memory, load averages
```

### 3. Admin Panel
```
Location: /admin
Features:
  - Cache management (clear by pattern)
  - Metrics reset controls
  - Configuration display
  - API documentation
  - Security settings review
```

---

## Environment Configuration

### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
LOG_TO_FILE=true
CACHE_ENABLED=true
CORS_ALLOWED_ORIGINS=http://localhost,http://frontend
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

### Database
```bash
PostgreSQL:
  Host: postgres
  User: alawael
  Password: alawael_secure_password_change_me
  Database: alawael

Redis:
  Host: redis
  Port: 6379
```

---

## Common Tasks

### View Logs

**Docker Compose**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Kubernetes**:
```bash
# Backend logs
kubectl logs -f deployment/backend -n alawael

# Frontend logs
kubectl logs -f deployment/frontend -n alawael

# All pod events
kubectl describe pods -n alawael
```

### Scale Services

**Docker Compose**:
```bash
# Manual scaling not supported, use Kubernetes
```

**Kubernetes**:
```bash
# Scale manually
kubectl scale deployment backend --replicas=5 -n alawael

# Check autoscaler status
kubectl get hpa -n alawael
```

### Update Configuration

**Docker Compose**:
```bash
# Edit docker-compose.yml
vi docker-compose.yml

# Restart services
docker-compose restart backend
```

**Kubernetes**:
```bash
# Update ConfigMap
kubectl edit configmap backend-config -n alawael

# Restart deployments
kubectl rollout restart deployment/backend -n alawael
```

### Check Health

**Quick Test**:
```bash
# All services
curl http://localhost:3001/health && echo "✅ Backend healthy"
curl http://localhost && echo "✅ Frontend healthy"
```

**Detailed Check**:
```bash
# Get all resources
kubectl get all -n alawael

# Check PersistentVolumes
kubectl get pvc -n alawael

# View events
kubectl get events -n alawael --sort-by='.lastTimestamp'
```

---

## Troubleshooting

### Service Not Accessible

**Docker Compose**:
```bash
# Check if containers running
docker ps | grep alawael

# Check service status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend
```

**Kubernetes**:
```bash
# Check pod status
kubectl get pods -n alawael

# Describe failing pod
kubectl describe pod <pod-name> -n alawael

# Check service endpoints
kubectl get endpoints -n alawael
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Database connections
psql -h postgres -U alawael -d alawael -c "SELECT count(*) FROM pg_stat_activity;"

# Redis memory
redis-cli info memory

# Backend metrics
curl http://localhost:3001/metrics/performance
```

### Database Connection Issues

```bash
# Test PostgreSQL
psql -h localhost -U alawael -d alawael -c "SELECT 1"

# Test Redis
redis-cli ping

# Check Kubernetes service
kubectl get svc postgres -n alawael
kubectl describe svc postgres -n alawael
```

---

## Backup & Recovery

### Docker Compose Data
```bash
# Backup database
docker exec alawael-postgres pg_dump -U alawael alawael > backup.sql

# Restore database
docker exec -i alawael-postgres psql -U alawael alawael < backup.sql

# Backup volumes
docker run --rm -v alawael_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz -C / data
```

### Kubernetes Persistent Volumes
```bash
# List all PVCs
kubectl get pvc -n alawael

# Backup PVC data
kubectl exec <postgres-pod> -n alawael -- pg_dump -U alawael alawael > backup.sql

# Check volume status
kubectl describe pvc <pvc-name> -n alawael
```

---

## Security Checklist

Before Production:

- [ ] Change default PostgreSQL password
- [ ] Change default API keys
- [ ] Change Grafana admin password (admin/admin)
- [ ] Configure SSL/TLS certificates
- [ ] Set CORS allowed origins correctly
- [ ] Update environment variables in secrets
- [ ] Configure firewall rules
- [ ] Enable authentication for admin endpoints
- [ ] Review network policies
- [ ] Enable log rotation
- [ ] Set up backup procedures
- [ ] Configure monitoring alerts

---

## Performance Tips

1. **Enable Caching**
   - Set `CACHE_ENABLED=true`
   - Configure cache TTL based on data freshness

2. **Scale Replicas**
   - Start with 3-5 backend replicas
   - Use HPA for auto-scaling

3. **Database Optimization**
   - Create indexes on frequently queried columns
   - Enable connection pooling
   - Archive old data regularly

4. **Redis Utilization**
   - Use for session storage
   - Cache API responses
   - Message queue for async tasks

5. **Monitoring**
   - Set up Prometheus alerts
   - Create Grafana dashboards
   - Monitor database query performance

---

## Next Steps

1. **Test the System**
   - Deploy using one of the three methods
   - Run smoke tests
   - Load test with realistic traffic

2. **Customize Configuration**
   - Set appropriate resource limits
   - Configure auto-scaling policies
   - Set up monitoring alerts

3. **Secure the System**
   - Generate SSL certificates
   - Configure authentication
   - Set up backup procedures

4. **Monitor & Maintain**
   - Set up log aggregation
   - Configure alerts
   - Regular backup testing

---

## Support & Documentation

Full documentation available in:
- `/docs/PRODUCTION_ENHANCEMENTS_GUIDE.md` - Complete feature guide
- `/dashboard/server/README_v2.0.md` - Server API documentation
- `/k8s/` - All Kubernetes manifests with comments
- `/helm/alawael/` - Helm chart with values documentation

---

**Status**: 🟢 **READY FOR PRODUCTION**

Need help? Check the detailed documentation or run the smoketest:
```bash
./tests/smoketest.sh
```

Happy deploying! 🚀
