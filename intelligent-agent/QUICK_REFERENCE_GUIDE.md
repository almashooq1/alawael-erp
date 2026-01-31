# ⚡ QUICK REFERENCE GUIDE

**Purpose**: Fast lookup for common tasks and commands  
**Updated**: January 29, 2026

---

## 📋 Essential Commands

### Kubernetes Operations

```bash
# Cluster status
kubectl cluster-info
kubectl get nodes
kubectl get pods -n production

# Deployment management
kubectl apply -f kubernetes/
kubectl rollout status deployment/intelligent-agent-backend -n production
kubectl rollout undo deployment/intelligent-agent-backend -n production

# Pod debugging
kubectl logs deployment/intelligent-agent-backend -n production -f
kubectl exec -it <pod-name> -n production -- /bin/bash
kubectl describe pod <pod-name> -n production

# Resource monitoring
kubectl top nodes
kubectl top pods -n production

# Scaling
kubectl scale deployment intelligent-agent-backend --replicas=5 -n production

# Port forwarding
kubectl port-forward svc/intelligent-agent 5000:5000 -n production
```

### Database Operations

```bash
# Connect to database
psql postgresql://user:pass@db.example.com/intelligent_agent

# Common queries
SELECT version();                              # Check version
SELECT COUNT(*) FROM users;                   # Row count
SELECT * FROM pg_stat_statements LIMIT 10;   # Slow queries
EXPLAIN ANALYZE SELECT * FROM users;         # Query plan

# Maintenance
ANALYZE;                                      # Update statistics
VACUUM;                                       # Clean dead tuples
REINDEX DATABASE intelligent_agent;          # Rebuild indexes

# Backups
pg_dump intelligent_agent > backup.sql
pg_dump intelligent_agent | gzip > backup.sql.gz
psql intelligent_agent < backup.sql           # Restore
```

### Redis Operations

```bash
# Connect to Redis
redis-cli -h redis.example.com

# Common commands
PING                    # Connection test
KEYS *                  # List all keys
GET key                 # Get value
SET key value EX 3600   # Set with expiry
DEL key                 # Delete key
FLUSHDB                 # Clear all keys
INFO                    # Statistics

# Monitoring
MONITOR                 # Watch live commands
```

### Docker Operations

```bash
# Build images
docker build -t intelligent-agent:latest ./backend
docker build -t intelligent-agent:frontend ./frontend

# Local development
docker-compose up -d
docker-compose logs -f
docker-compose down

# Image management
docker images
docker rmi <image-id>
docker tag intelligent-agent:latest ghcr.io/org/intelligent-agent:latest
docker push ghcr.io/org/intelligent-agent:latest
```

---

## 🔍 Troubleshooting Quick Fixes

### High Response Time

```bash
# 1. Check API server
kubectl logs deployment/intelligent-agent-backend -n production | grep error

# 2. Check database queries
psql intelligent_agent -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# 3. Check Redis
redis-cli PING

# 4. Check resource usage
kubectl top pods -n production | grep backend

# Solution: See TROUBLESHOOTING_GUIDE.md
```

### Pod Not Running

```bash
# 1. Check status
kubectl describe pod <pod-name> -n production

# 2. View logs
kubectl logs <pod-name> -n production --previous

# 3. Check events
kubectl get events -n production

# 4. Restart pod
kubectl delete pod <pod-name> -n production

# Solution: See TROUBLESHOOTING_GUIDE.md
```

### Database Connection Errors

```bash
# 1. Test connection
psql postgresql://user:pass@db.example.com/intelligent_agent -c "SELECT 1;"

# 2. Check connection pool
SHOW max_connections;

# 3. Check active connections
SELECT count(*) FROM pg_stat_activity;

# 4. Restart connection pool
# kubectl rollout restart deployment/pgbouncer -n production

# Solution: See TROUBLESHOOTING_GUIDE.md
```

### Memory Leak

```bash
# 1. Monitor memory usage
kubectl top pods -n production --watch

# 2. Get heap dump
kubectl exec <pod-name> -n production -- kill -USR2 1

# 3. Analyze heap
node --expose-gc app.js

# Solution: See TROUBLESHOOTING_GUIDE.md
```

---

## 📊 Monitoring URLs

| Service              | URL                                                                                             | Purpose             |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------- |
| Grafana              | https://grafana.example.com                                                                     | Dashboards & alerts |
| Prometheus           | http://prometheus:9090                                                                          | Metrics & queries   |
| API Health           | https://intelligent-agent.com/health                                                            | System status       |
| Kubernetes Dashboard | http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/ | Cluster UI          |

---

## 🚀 Deployment Commands

### Quick Deploy

```bash
# Full deployment
./scripts/deploy.sh production

# Or manually
kubectl apply -f kubernetes/
kubectl rollout status deployment/intelligent-agent-backend -n production

# Verify
curl https://intelligent-agent.com/health
```

### Rollback

```bash
# Show history
kubectl rollout history deployment/intelligent-agent-backend -n production

# Rollback to previous
kubectl rollout undo deployment/intelligent-agent-backend -n production

# Verify
kubectl rollout status deployment/intelligent-agent-backend -n production
```

---

## 📈 Load Testing

```bash
# Run all tests
./load-tests/run-load-tests.sh all

# Run only API tests
./load-tests/run-load-tests.sh api

# Run only frontend tests
./load-tests/run-load-tests.sh frontend

# Custom configuration
BASE_URL=https://api.example.com ./load-tests/run-load-tests.sh api

# Results in: load-test-results/
```

---

## 🔐 Security Checks

```bash
# Scan Docker image
trivy image ghcr.io/intelligent-agent/backend:latest

# Check for exposed secrets
grep -r "password\|secret\|token" kubernetes/ --include="*.yaml" | grep -v secretName

# Verify pods run as non-root
kubectl get pod -A -o json | jq '.items[] | select(.spec.securityContext.runAsNonRoot != true)'

# Check RBAC permissions
kubectl auth can-i get pods --as=system:serviceaccount:production:backend-sa
```

---

## 📅 Common Operations

### Scale Up/Down

```bash
# Immediate scaling
kubectl scale deployment intelligent-agent-backend --replicas=5 -n production

# Edit HPA limits
kubectl patch hpa backend-hpa -n production -p '{"spec":{"maxReplicas":20}}'

# Check HPA status
kubectl get hpa -n production -w
```

### Update Configuration

```bash
# Edit ConfigMap
kubectl edit configmap app-config -n production

# Edit Secrets
kubectl edit secret app-secrets -n production

# Pods automatically pick up changes if using mounted volumes
```

### Manual Backup

```bash
# Database backup
pg_dump intelligent_agent | gzip > backup-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://backups-encrypted/
```

---

## 🆘 Emergency Procedures

### System Down - Emergency Recovery

```bash
# 1. Triage
kubectl get nodes              # Are nodes healthy?
kubectl get pods -n production # Are pods running?

# 2. Restart services
kubectl rollout restart deployment/intelligent-agent-backend -n production
kubectl rollout restart deployment/intelligent-agent-frontend -n production

# 3. If still down
kubectl delete pods -n production -l app=intelligent-agent  # Force recreate

# 4. Check database
psql intelligent_agent -c "SELECT 1;"  # Is database up?

# 5. If database down
# See TROUBLESHOOTING_GUIDE.md > "Database Down"
```

### Database Connection Pool Exhausted

```bash
# 1. Check connections
SELECT count(*) FROM pg_stat_activity;

# 2. Kill idle connections (CAREFUL!)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE usename = 'app_user' AND state = 'idle' AND state_change < now() - interval '15 minutes';

# 3. Restart connection pooler
kubectl rollout restart deployment/pgbouncer -n production
```

### Out of Disk Space

```bash
# 1. Check disk usage
df -h /

# 2. Find large files
du -sh /* | sort -h

# 3. Clean logs
kubectl logs --tail=0 -n production -l app=intelligent-agent
docker system prune -a  # Remove unused images

# 4. Clean old backups
rm -f /backups/database/*-*-*-*-*-*.sql.gz  # Keep last 30 days
```

---

## 📞 Quick Contacts

| Role           | Contact              | Phone       |
| -------------- | -------------------- | ----------- |
| On-Call        | oncall@company.com   | +1-555-0150 |
| DevOps Lead    | devops@company.com   | +1-555-0160 |
| Database Admin | dba@company.com      | +1-555-0170 |
| Security Lead  | security@company.com | +1-555-0180 |

---

## 📚 Documentation Links

- **Full Deployment Guide**: [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md)
- **Troubleshooting**: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
- **Operations Manual**: [OPERATIONS_MANUAL.md](OPERATIONS_MANUAL.md)
- **Performance Tuning**:
  [PERFORMANCE_OPTIMIZATION_GUIDE.md](PERFORMANCE_OPTIMIZATION_GUIDE.md)
- **Security**:
  [SECURITY_HARDENING_CHECKLIST.md](SECURITY_HARDENING_CHECKLIST.md)
- **Cost Optimization**:
  [COST_OPTIMIZATION_GUIDE.md](COST_OPTIMIZATION_GUIDE.md)

---

## ✅ Pre-Incident Checklist

Before declaring an incident:

- [ ] Have you checked the [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)?
- [ ] Have you checked Grafana dashboards?
- [ ] Have you checked application logs?
- [ ] Have you tried the "Emergency Procedures" section above?
- [ ] Have you verified the issue is reproducible?

If still unresolved → Page on-call engineer

---

**Questions?** See the full documentation or contact #operations on Slack.

**This is a living document. Update as procedures change.**
