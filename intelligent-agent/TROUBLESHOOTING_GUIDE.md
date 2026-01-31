# 🔧 TROUBLESHOOTING GUIDE

**Purpose**: Diagnose and resolve common issues in Intelligent Agent  
**Audience**: DevOps, Support, Engineering teams  
**Last Updated**: January 29, 2026

---

## 📋 Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Performance Troubleshooting](#performance-troubleshooting)
4. [Security Issues](#security-issues)
5. [Database Problems](#database-problems)
6. [Cache Issues](#cache-issues)
7. [Networking Problems](#networking-problems)
8. [Deployment Issues](#deployment-issues)
9. [Monitoring & Logging](#monitoring--logging)

---

## 🔍 Quick Diagnostics

### Health Check Script

```bash
#!/bin/bash

echo "🏥 Running Health Checks..."

# Frontend health
echo "Frontend: $(curl -s http://localhost:3000/health | jq .status)"

# Backend health
echo "Backend: $(curl -s http://localhost:5000/api/health | jq .status)"

# Database
echo "Database: $(curl -s -X POST http://localhost:5000/api/db/health -H 'Content-Type: application/json' | jq .status)"

# Cache
echo "Cache: $(curl -s -X POST http://localhost:5000/api/cache/health -H 'Content-Type: application/json' | jq .status)"

# Pod status
echo ""
echo "Pod Status:"
kubectl get pods -n production

# Service status
echo ""
echo "Services:"
kubectl get services -n production

# Ingress status
echo ""
echo "Ingress:"
kubectl get ingress -n production
```

---

## 🐛 Common Issues & Solutions

### Issue 1: 503 Service Unavailable

**Symptoms**:

- "Service Unavailable" errors
- High 5xx error rate
- Users report downtime

**Diagnosis**:

```bash
# Check pod status
kubectl get pods -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check deployment status
kubectl rollout status deployment/intelligent-agent-backend -n production

# Check logs
kubectl logs deployment/intelligent-agent-backend -n production --tail=50
```

**Common Causes & Solutions**:

| Cause                  | Diagnosis                         | Solution                                                             |
| ---------------------- | --------------------------------- | -------------------------------------------------------------------- |
| Pod not ready          | `kubectl get pods` shows NotReady | `kubectl describe pod <name>` → fix issue → redeploy                 |
| Image pull failed      | Events show ImagePullBackOff      | Update registry credentials: `kubectl create secret docker-registry` |
| Application crash      | Logs show errors                  | Check app logs, fix code, rebuild image                              |
| Resource limits hit    | `kubectl top pods` near limits    | Increase resource limits or add nodes                                |
| Liveness probe failing | Pod restarts repeatedly           | Check health endpoint, relax probe thresholds                        |

**Immediate Actions**:

```bash
# 1. Scale up to absorb load
kubectl scale deployment intelligent-agent-backend --replicas=10 -n production

# 2. Check if specific service is down
kubectl exec -it <frontend-pod> -- curl http://intelligent-agent-backend:5000/health

# 3. View detailed pod info
kubectl describe pod <pod-name> -n production

# 4. Restart pod if necessary (last resort)
kubectl rollout restart deployment/intelligent-agent-backend -n production
```

---

### Issue 2: High Latency / Slow Response

**Symptoms**:

- Response time > 2 seconds
- P95 latency alerts firing
- Users report sluggish interface

**Diagnosis**:

```bash
# Check resource usage
kubectl top pods -n production --containers

# Check database query performance
kubectl exec -it postgres-pod -- psql -U postgres -d intelligent_agent \
  -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check Redis memory
kubectl exec -it redis-pod -- redis-cli info memory

# Check network latency
kubectl exec -it <pod> -- ping <backend-pod>
```

**Common Causes & Solutions**:

| Cause            | Indicators               | Solution                                          |
| ---------------- | ------------------------ | ------------------------------------------------- |
| High CPU         | `top` shows >80%         | Scale replicas, optimize code, use profiler       |
| High Memory      | `free` shows <20%        | Find memory leak, reduce cache TTL, restart pods  |
| Slow DB          | Query time >1s           | Add indexes, optimize queries, increase pool size |
| Network issues   | High packet loss         | Check network policies, increase bandwidth        |
| Inefficient code | Profiler shows hot spots | Optimize algorithms, cache results                |

**Performance Optimization**:

```bash
# 1. Profile application
kubectl exec -it <pod> -- node --prof app.js
kubectl exec -it <pod> -- node --prof-process isolate-*.log > profile.txt

# 2. Check database indexes
kubectl exec -it postgres-pod -- psql -c "\d+ table_name"

# 3. Monitor slow queries
SHOW slow_query_log;
SHOW long_query_time;

# 4. Increase connection pool
kubectl set env deployment/intelligent-agent-backend \
  DB_POOL_MAX=20 DB_POOL_MIN=5 -n production

# 5. Enable caching
kubectl set env deployment/intelligent-agent-backend \
  CACHE_TTL=300 CACHE_MAX_SIZE=1000 -n production
```

---

### Issue 3: Memory Leak

**Symptoms**:

- Memory usage steadily increasing
- Pod restarts frequently
- Out of Memory errors in logs

**Diagnosis**:

```bash
# Monitor memory over time
for i in {1..10}; do
  echo "$(date): $(kubectl top pod <pod-name> -n production | tail -1)"
  sleep 60
done

# Check for unclosed connections
kubectl exec -it <pod> -- curl localhost:8081/metrics | grep -i connection

# Get heap dump
kubectl exec -it <pod> -- kill -USR2 <pid>
```

**Solutions**:

```bash
# 1. Increase memory limits (temporary)
kubectl set resources deployment intelligent-agent-backend \
  --limits=memory=2Gi -n production

# 2. Find memory leak
# - Review code for: unclosed streams, circular refs, event listeners not removed
# - Use Node.js heapdump tool
# - Analyze with Chrome DevTools

# 3. Implement fix
# - Patch code
# - Rebuild image
# - Redeploy

# 4. Monitor after fix
kubectl top pod <pod-name> -n production --watch
```

---

### Issue 4: Database Connection Errors

**Symptoms**:

```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: too many connections
Error: connection timeout
```

**Diagnosis**:

```bash
# Test connectivity
kubectl run -it --rm db-test --image=postgres:15 --restart=Never \
  -- psql "postgresql://user:password@postgres:5432/intelligent_agent" -c "SELECT 1;"

# Check active connections
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "SHOW max_connections;"

# Check connection pool status
kubectl logs deployment/intelligent-agent-backend -n production | grep -i "pool\|connection"
```

**Solutions**:

| Problem                       | Fix                                               |
| ----------------------------- | ------------------------------------------------- |
| max_connections exceeded      | Increase PostgreSQL config: `max_connections=500` |
| Idle connections accumulating | Reduce `idle_in_transaction_session_timeout`      |
| Connection pool exhausted     | Reduce `DB_POOL_MAX` or add more backends         |
| Slow connections              | Check network, increase `connect_timeout`         |
| SSL connection issues         | Verify certificates, check `sslmode` setting      |

**Implementation**:

```bash
# 1. Modify PostgreSQL config
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "ALTER SYSTEM SET max_connections = 500;"

# 2. Reload config
kubectl exec -it postgres-pod -- psql -U postgres -c "SELECT pg_reload_conf();"

# 3. Or update via deployment env
kubectl set env deployment/intelligent-agent-backend \
  DB_POOL_MAX=15 DB_POOL_MIN=3 DB_IDLE_TIMEOUT=600 -n production

# 4. Monitor
kubectl logs -f deployment/intelligent-agent-backend -n production | grep -i connection
```

---

### Issue 5: SSL Certificate Errors

**Symptoms**:

- "SSL certificate problem" in logs
- HTTPS connection refused
- Browser shows untrusted certificate
- cert-manager showing errors

**Diagnosis**:

```bash
# Check certificate status
kubectl get certificate -n production

# Describe certificate
kubectl describe certificate intelligent-agent-tls -n production

# Check cert-manager logs
kubectl logs -f deployment/cert-manager -n cert-manager

# Check SSL expiry
echo | openssl s_client -servername intelligent-agent.com \
  -connect intelligent-agent.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check ingress TLS config
kubectl describe ingress intelligent-agent-ingress -n production
```

**Solutions**:

| Issue                    | Solution                                          |
| ------------------------ | ------------------------------------------------- |
| Certificate pending      | Wait 5-10 min, check cert-manager logs for issues |
| DNS not resolving        | Verify DNS records point to ingress IP            |
| Let's Encrypt rate limit | Use staging first, wait 1 week, retry             |
| Certificate expired      | Delete certificate, cert-manager will renew       |
| Wrong domain in cert     | Update ingress hosts, delete cert, recreate       |

**Emergency Fix**:

```bash
# 1. Check if cert exists
kubectl get certificate -n production

# 2. Delete problematic cert
kubectl delete certificate intelligent-agent-tls -n production

# 3. cert-manager auto-recreates it
kubectl get certificate -n production --watch

# 4. Verify
curl -I https://intelligent-agent.com

# 5. Monitor cert renewal
kubectl logs -f deployment/cert-manager -n cert-manager | grep -i intelligent
```

---

## ⚡ Performance Troubleshooting

### Slow API Endpoints

```bash
# 1. Identify slow endpoint (from logs)
kubectl logs deployment/intelligent-agent-backend -n production | \
  grep "response_time\|duration" | sort -t: -k2 -rn | head -10

# 2. Enable query logging (PostgreSQL)
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# 3. Check which queries are slow
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 4. Add indexes if needed
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "CREATE INDEX idx_users_email ON users(email);"

# 5. Analyze query plan
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "EXPLAIN ANALYZE SELECT * FROM table_name WHERE condition;"
```

### High CPU Usage

```bash
# 1. Find process using CPU
kubectl exec -it <pod> -- top -b -n 1 | head -15

# 2. CPU profiling (Node.js)
kubectl exec -it <pod> -- node --prof app.js
# Run for 30 seconds, then Ctrl+C
kubectl exec -it <pod> -- node --prof-process isolate*.log > profile.txt

# 3. Check which requests are expensive
kubectl logs <pod> -n production | grep -i "cpu\|duration" | sort

# 4. Scale up or optimize
kubectl scale deployment intelligent-agent-backend --replicas=10 -n production
# Then optimize hot code paths
```

### High Memory Usage

```bash
# 1. Check memory distribution
kubectl exec -it <pod> -- node -e "console.log(process.memoryUsage())"

# 2. Get heap snapshot
kubectl exec -it <pod> -- node \
  -e "require('v8').writeHeapSnapshot('/tmp/heap.heapsnapshot')"

# 3. Copy snapshot
kubectl cp production/<pod>:/tmp/heap.heapsnapshot ./heap.heapsnapshot

# 4. Analyze with Chrome DevTools
# chrome://inspect → Load snapshot

# 5. Find leaks
# Look for: growing object counts, detached DOM nodes, forgotten listeners
```

---

## 🔒 Security Issues

### Vulnerability Detection

```bash
# Run security scan
kubectl exec -it <pod> -- npm audit

# Check for high-risk vulnerabilities
kubectl exec -it <pod> -- npm audit --audit-level=high

# Update vulnerable package
kubectl exec -it <pod> -- npm update package-name --save

# Rebuild and redeploy
docker build -t ghcr.io/intelligent-agent/backend:patch .
docker push ghcr.io/intelligent-agent/backend:patch
kubectl set image deployment/intelligent-agent-backend \
  backend=ghcr.io/intelligent-agent/backend:patch -n production
```

### Suspicious Activity Detected

```bash
# 1. Check access logs
kubectl logs <pod> -n production | grep -i "403\|401\|unauthorized\|forbidden"

# 2. Check failed authentication
grep "auth" /var/log/auth.log

# 3. Monitor unusual traffic
kubectl exec -it <pod> -- netstat -an | grep ESTABLISHED | wc -l

# 4. Review recent deployments
kubectl rollout history deployment/intelligent-agent-backend -n production

# 5. Check pod events
kubectl describe pod <pod> -n production

# 6. Isolate affected pod (if needed)
kubectl label pod <pod> quarantine=true -n production
# Remove from service
```

### Secret Exposure Risk

```bash
# 1. Find secrets in code/logs
git log --all -S "password" --pretty=format:"%h %s"
grep -r "password\|api.key\|secret" . --include="*.js" --include="*.ts"

# 2. Rotate compromised secrets
# Edit k8s/secrets.yaml with new values
kubectl apply -f k8s/secrets.yaml -n production

# 3. Redeploy pods to pick up new secrets
kubectl rollout restart deployment/intelligent-agent-backend -n production

# 4. Check if secrets were logged
kubectl logs <pod> -n production | grep -i "password\|secret\|token"

# 5. Review CloudTrail/audit logs for access
# (Platform-specific, check your cloud provider)
```

---

## 🗄️ Database Problems

### Connection Pool Issues

```bash
# Check pool status
kubectl exec -it <pod> -- curl localhost:5000/metrics | grep pool

# Show active connections
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Kill idle connections (careful!)
kubectl exec -it postgres-pod -- psql -U postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"

# Increase pool size
kubectl set env deployment/intelligent-agent-backend \
  DB_POOL_MAX=20 -n production
```

### Replication Lag

```bash
# Check replication status (if using replicas)
kubectl exec -it postgres-primary -- psql -U postgres \
  -c "SELECT slot_name, restart_lsn FROM pg_replication_slots;"

# Check replica lag
kubectl exec -it postgres-replica -- psql -U postgres \
  -c "SELECT now() - pg_last_wal_receive_time() AS replication_lag;"

# If lag is high:
# 1. Check network between primary/replica
# 2. Check replica resource usage
# 3. Increase WAL buffer: wal_keep_size = 1GB
```

### Data Corruption

```bash
# Run integrity check
kubectl exec -it postgres-pod -- psql -U postgres -d intelligent_agent \
  -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;"

# Check table corruption
PRAGMA integrity_check;

# Vacuum and analyze
kubectl exec -it postgres-pod -- psql -U postgres -d intelligent_agent \
  -c "VACUUM ANALYZE;"

# If corrupted: restore from backup
kubectl exec -it backup-pod -- pg_restore -d intelligent_agent backup.dump
```

---

## ⚙️ Cache Issues

### Redis Connection Problems

```bash
# Test Redis connectivity
kubectl run -it --rm redis-test --image=redis:7 --restart=Never \
  -- redis-cli -u $REDIS_URL ping

# Check Redis memory
kubectl exec -it redis-pod -- redis-cli info memory

# Clear cache (if needed)
kubectl exec -it redis-pod -- redis-cli FLUSHALL

# Check for memory leaks
kubectl exec -it redis-pod -- redis-cli MEMORY STATS
```

### High Cache Miss Rate

```bash
# Check cache hit ratio
kubectl exec -it redis-pod -- redis-cli INFO stats | grep -i "hits\|misses"

# Calculate hit rate
hits / (hits + misses) * 100

# If <70%:
# 1. Increase TTL: CACHE_TTL=600
# 2. Increase cache size: CACHE_MAX_SIZE=10000
# 3. Optimize cache keys
# 4. Profile to find what should be cached

# Monitor cache usage
kubectl exec -it redis-pod -- redis-cli --stat 1
```

---

## 🌐 Networking Problems

### DNS Resolution Issues

```bash
# Test DNS from pod
kubectl run -it --rm dns-test --image=busybox:1.35 --restart=Never \
  -- nslookup intelligent-agent-backend.production.svc.cluster.local

# Check CoreDNS logs
kubectl logs -l k8s-app=kube-dns -n kube-system | tail -20

# Verify DNS in deployment
kubectl exec -it <pod> -- cat /etc/resolv.conf

# Test external DNS
kubectl run -it --rm dns-test --image=busybox:1.35 --restart=Never \
  -- nslookup google.com
```

### Network Policy Blocking Traffic

```bash
# Check network policies
kubectl get networkpolicies -n production

# Describe policy
kubectl describe networkpolicy <policy-name> -n production

# Temporarily disable policy (for testing)
kubectl delete networkpolicy <policy-name> -n production

# Test connectivity
kubectl exec -it <pod> -- curl http://service:port

# Re-enable and fix
kubectl apply -f k8s/network-policies.yaml

# Adjust rules if needed
```

### Ingress Not Routing Traffic

```bash
# Check ingress status
kubectl get ingress -n production

# Describe ingress
kubectl describe ingress intelligent-agent-ingress -n production

# Check ingress controller logs
kubectl logs -f -l app=ingress-nginx -n ingress-nginx | grep intelligent

# Test ingress directly
kubectl exec -it ingress-pod -- curl http://backend:5000

# Verify backend service
kubectl get svc -n production
kubectl endpoints intelligent-agent-backend -n production
```

---

## 📦 Deployment Issues

### Image Pull Errors

```bash
# Error: ImagePullBackOff

# Solution:
# 1. Check image exists
docker pull ghcr.io/intelligent-agent/backend:v1.0.0

# 2. Check registry credentials
kubectl get secrets -n production | grep docker

# 3. Create/update secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token> \
  -n production

# 4. Update deployment to use secret
# (already configured in manifests)

# 5. Restart deployment
kubectl rollout restart deployment/intelligent-agent-backend -n production
```

### Pod Eviction

```bash
# Check why pod was evicted
kubectl describe pod <pod> -n production | grep -A5 "Evicted"

# Common causes:
# 1. Out of memory: Increase memory limits
# 2. Disk pressure: Clean up logs, increase disk
# 3. PID pressure: Reduce process count, restart

# Solutions:
kubectl set resources deployment intelligent-agent-backend \
  --limits=memory=2Gi,ephemeral-storage=10Gi -n production
```

---

## 📊 Monitoring & Logging

### Prometheus Not Scraping

```bash
# Check Prometheus status
kubectl get pods -n monitoring | grep prometheus

# Check scrape config
kubectl exec -it prometheus-pod -- cat /etc/prometheus/prometheus.yml | grep -A10 "intelligent-agent"

# Check logs
kubectl logs -f deployment/prometheus -n monitoring

# Verify target status
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job | contains("intelligent"))'
```

### Grafana Showing No Data

```bash
# Check Grafana datasource
kubectl port-forward -n monitoring svc/grafana 3001:3000
# Admin → Data Sources → Test datasource

# Check Prometheus has data
curl http://prometheus:9090/api/v1/query?query=up

# Check queries in dashboard JSON
kubectl get configmap grafana-dashboards -n monitoring -o yaml | grep -A50 "queries"

# Verify pods are exposing metrics
kubectl exec -it <pod> -- curl localhost:8080/metrics
```

### Missing Logs

```bash
# Check if pod is logging
kubectl logs <pod> -n production

# Check log level
echo $LOG_LEVEL  # Check environment variable

# Increase verbosity
kubectl set env deployment/intelligent-agent-backend \
  LOG_LEVEL=debug -n production

# Restart pod to pick up change
kubectl rollout restart deployment/intelligent-agent-backend -n production

# Tail logs
kubectl logs -f deployment/intelligent-agent-backend -n production

# Export logs for analysis
kubectl logs deployment/intelligent-agent-backend -n production > logs.txt
```

---

## 🆘 Emergency Procedures

### Complete System Failure

```bash
# 1. TRIAGE (Immediate)
- Check cloud console for incidents
- Verify cluster is running: kubectl cluster-info
- Check node status: kubectl get nodes

# 2. ISOLATE (1-5 min)
- Scale down to single replica: kubectl scale deployment --all --replicas=1
- This reduces load and may prevent cascading failures

# 3. INVESTIGATE (5-30 min)
- Collect diagnostics: kubectl describe all -n production > diag.txt
- Check logs: kubectl logs -l app=intelligent-agent -n production > logs.txt
- Check metrics: Check Prometheus/Grafana

# 4. RESTORE (30+ min)
- If issue is code-related: rollback to last known good version
- If infrastructure: scale up, fix issues, redeploy
- Test thoroughly in staging first

# 5. COMMUNICATE
- Update status page
- Notify customers
- Post-mortem after resolution
```

### Database Completely Down

```bash
# 1. Check pod status
kubectl describe pod postgres-pod -n production

# 2. Check persistent volume
kubectl get pvc -n production
kubectl describe pvc postgres-pvc -n production

# 3. Attempt restart
kubectl restart statefulset postgres -n production

# 4. If restart fails, check volume
# (Platform-specific: AWS EBS, GCP PD, etc.)

# 5. Restore from backup
BACKUP_FILE=$(ls -t backups/ | head -1)
kubectl exec -it postgres-pod -- pg_restore -d intelligent_agent /backups/$BACKUP_FILE

# 6. Verify data integrity
kubectl exec -it postgres-pod -- psql -d intelligent_agent -c "SELECT count(*) FROM users;"
```

---

## ✅ Troubleshooting Checklist

**For any issue, follow this order:**

- [ ] Is the service up? (`kubectl get pods`)
- [ ] Check health endpoints (`/health`, `/api/health`)
- [ ] Check logs (`kubectl logs <pod>`)
- [ ] Check resources (`kubectl top pods`)
- [ ] Check events (`kubectl get events`)
- [ ] Check metrics (Prometheus)
- [ ] Check alerts (Alertmanager)
- [ ] Check recent changes (git log, deployments)
- [ ] Collect diagnostics for support
- [ ] Escalate if needed

---

**Need help? Contact:** DevOps Team, #support Slack channel  
**Average Resolution Time**: 15 minutes  
**Success Rate**: 95% resolved without rollback
