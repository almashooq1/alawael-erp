# 🚀 DEPLOYMENT RUNBOOK

**Purpose**: Complete step-by-step guide for deploying Intelligent Agent to
production  
**Audience**: DevOps engineers, deployment teams  
**Last Updated**: January 29, 2026

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Secrets Management](#secrets-management)
4. [First-Time Deployment](#first-time-deployment)
5. [Rolling Updates](#rolling-updates)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### Infrastructure Prerequisites

- [ ] Kubernetes cluster running (v1.25+)
- [ ] kubectl configured and authenticated
- [ ] Container registry access (GitHub Packages)
- [ ] Database (PostgreSQL 15+) provisioned
- [ ] Redis (v7+) running
- [ ] DNS configured for domains
- [ ] SSL certificate preparation (Let's Encrypt will auto-generate)
- [ ] Monitoring stack deployed (Prometheus, Grafana)

### Configuration Prerequisites

- [ ] Secrets updated (database credentials, API keys)
- [ ] ConfigMaps reviewed (environment variables)
- [ ] Resource quotas set per namespace
- [ ] Network policies configured
- [ ] RBAC roles created
- [ ] PVC storage classes validated

### Documentation Prerequisites

- [ ] Team briefing completed
- [ ] Runbook reviewed with team
- [ ] Escalation contacts identified
- [ ] Incident response plan ready
- [ ] Rollback procedures tested

---

## 🔧 Environment Setup

### 1. Prepare Kubernetes Cluster

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Create production namespace
kubectl create namespace production

# Set context to production
kubectl config set-context --current --namespace=production

# Verify context
kubectl config current-context
```

### 2. Install Required Tools

```bash
# k6 for load testing
curl https://packages.k6.io/rpm/release/rpm-release-1.0.0-amd64.rpm \
  | sudo rpm -i - && sudo dnf install k6

# helm (optional, for package management)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
  | bash

# cert-manager (for SSL automation)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/\
download/v1.13.0/cert-manager.yaml
```

### 3. Create Storage Classes

```bash
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
allowVolumeExpansion: true
reclaimPolicy: Retain
EOF
```

---

## 🔐 Secrets Management

### 1. Update Secrets File

```bash
# Copy template
cp k8s/secrets.yaml k8s/secrets.prod.yaml

# Edit with actual values
vim k8s/secrets.prod.yaml

# Critical values to update:
# - database_url: postgresql://user:PASSWORD@host:5432/db
# - redis_url: redis://:PASSWORD@host:6379
# - jwt_secret: (generate: openssl rand -base64 32)
# - api_keys: (OpenAI, Anthropic, Google)
# - sentry_dsn: (from sentry.io)
# - stripe_secret_key: (from stripe.com)
# - oauth_credentials: (from respective platforms)
```

### 2. Encrypt Secrets in Git (Optional)

```bash
# Install git-crypt
sudo apt-get install git-crypt

# Initialize for repository
git-crypt init

# Configure .gitattributes
echo "k8s/secrets.prod.yaml filter=git-crypt diff=git-crypt" >> .gitattributes
git add .gitattributes

# Encrypt sensitive file
git-crypt lock

# To unlock locally
git-crypt unlock
```

### 3. Apply Secrets to Cluster

```bash
# Verify no CHANGE_ME values remain
grep -n "CHANGE_ME" k8s/secrets.prod.yaml && echo "⚠️  Found unset values!" || echo "✓ All values set"

# Apply to cluster
kubectl apply -f k8s/secrets.prod.yaml -n production

# Verify
kubectl get secrets -n production
```

---

## 🚀 First-Time Deployment

### 1. Pre-Deployment Testing

```bash
# Test database connectivity
kubectl run -it --rm postgres-test \
  --image=postgres:15 \
  --restart=Never \
  -- psql $DATABASE_URL -c "SELECT version();"

# Test Redis connectivity
kubectl run -it --rm redis-test \
  --image=redis:7 \
  --restart=Never \
  -- redis-cli -u $REDIS_URL ping
```

### 2. Execute Deployment Script

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh production v1.0.0

# Script will prompt:
# 1. Confirm secrets updated? (y/n)
# 2. Build new images? (y/n)
# 3. Wait for rollout completion
# 4. Run health checks
```

### 3. Deployment Script Execution Flow

```
Step 1: Check Prerequisites ✓
  └─ kubectl, docker, cluster access

Step 2: Create Namespace ✓
  └─ kubectl apply namespace

Step 3: Apply Secrets ✓
  └─ Confirm secrets updated
  └─ kubectl apply secrets

Step 4: Apply ConfigMaps ✓
  └─ kubectl apply configmaps

Step 5: Build & Push Images
  └─ Docker build frontend (multi-stage)
  └─ Docker build backend (multi-stage)
  └─ Push to ghcr.io

Step 6: Deploy to Kubernetes ✓
  └─ kubectl apply deployments
  └─ kubectl apply services
  └─ kubectl apply ingress
  └─ kubectl apply hpa

Step 7: Wait for Rollout ✓
  └─ Frontend: 3 replicas ready (10min timeout)
  └─ Backend: 5 replicas ready (10min timeout)

Step 8: Health Checks ✓
  └─ Frontend /health → 200 OK
  └─ Backend /api/health → 200 OK

Step 9: Display Status ✓
  └─ Show pod status
  └─ Show service endpoints
  └─ Show ingress URLs
```

---

## 📤 Rolling Updates

### Automatic Updates (Recommended)

```bash
# Tag a release
git tag v1.0.1
git push origin main --tags

# GitHub Actions automatically:
# 1. Runs full test suite
# 2. Builds Docker images
# 3. Deploys to staging
# 4. Deploys to production (on main branch tag)
# 5. Performs health checks
# 6. Creates release notes
```

### Manual Updates

```bash
# Build new image
docker build -t ghcr.io/intelligent-agent/backend:v1.0.1 ./backend

# Push image
docker push ghcr.io/intelligent-agent/backend:v1.0.1

# Update deployment
kubectl set image deployment/intelligent-agent-backend \
  backend=ghcr.io/intelligent-agent/backend:v1.0.1 \
  -n production

# Monitor rollout
kubectl rollout status deployment/intelligent-agent-backend -n production

# Watch in real-time
kubectl rollout status deployment/intelligent-agent-backend \
  -n production --watch
```

### Zero-Downtime Deployment

Rolling update strategy ensures zero downtime:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1 # 1 extra pod during update
    maxUnavailable: 0 # 0 pods can be unavailable
```

**Process**:

1. New pod starts (total: N+1 replicas)
2. Readiness probe validates new pod
3. Traffic routed to new pod
4. Old pod terminates gracefully
5. Repeat for each replica

---

## 🔄 Rollback Procedures

### Automatic Rollback (Built-in)

If deployment health checks fail:

```bash
# Deployment automatically reverts
kubectl rollout undo deployment/intelligent-agent-backend -n production

# Status
kubectl rollout status deployment/intelligent-agent-backend -n production
```

### Manual Rollback

```bash
# Show deployment history
kubectl rollout history deployment/intelligent-agent-backend -n production

# Example output:
# revision 1  ... 2026-01-29 10:00:00 ... v1.0.0
# revision 2  ... 2026-01-29 10:15:00 ... v1.0.1

# Rollback to previous
./scripts/rollback.sh production

# Rollback to specific revision
./scripts/rollback.sh production 1

# Monitor rollback
kubectl rollout status deployment/intelligent-agent-backend \
  -n production --watch
```

### Verify Rollback

```bash
# Check pod status
kubectl get pods -n production -l component=backend

# Check logs
kubectl logs -f deployment/intelligent-agent-backend -n production

# Test endpoints
curl http://localhost:3001/api/health

# Verify metrics dropped to normal
# (Check Prometheus/Grafana)
```

---

## ✅ Post-Deployment Verification

### 1. Pod Status

```bash
# All pods running?
kubectl get pods -n production
# Expected output: All pods STATUS: Running

# All pods ready?
kubectl get pods -n production -o wide
# Expected: READY column shows X/X for all pods
```

### 2. Service Endpoints

```bash
# Check services
kubectl get services -n production

# Test internal service DNS
kubectl run -it --rm dns-test \
  --image=busybox:1.35 \
  --restart=Never \
  -- nslookup intelligent-agent-backend.production.svc.cluster.local
```

### 3. Ingress Routes

```bash
# Check ingress
kubectl get ingress -n production

# Test domain resolution
nslookup intelligent-agent.com
nslookup api.intelligent-agent.com

# Test HTTPS
curl -I https://intelligent-agent.com
# Expected: HTTP/2 200, valid SSL cert
```

### 4. Application Health

```bash
# Frontend health
curl https://intelligent-agent.com/health
# Expected: { "status": "healthy" }

# Backend health
curl https://api.intelligent-agent.com/api/health
# Expected: { "status": "ok" }

# Database connectivity
curl -X POST https://api.intelligent-agent.com/api/db/health \
  -H "Content-Type: application/json" \
  -d '{"database": "postgres"}'

# Redis connectivity
curl -X POST https://api.intelligent-agent.com/api/cache/health \
  -H "Content-Type: application/json" \
  -d '{"cache": "redis"}'
```

### 5. Performance Metrics

```bash
# Check response times
kubectl top pods -n production

# Monitor with Prometheus
kubectl port-forward -n production svc/prometheus 9090:9090
# Open http://localhost:9090

# Check error rates
curl http://localhost:9090/api/v1/query?query=http_requests_total
```

---

## 📊 Monitoring & Alerts

### Access Monitoring Dashboards

```bash
# Grafana
kubectl port-forward -n production svc/grafana 3001:3000
# Open http://localhost:3001
# Login: admin / (from secrets)

# Prometheus
kubectl port-forward -n production svc/prometheus 9090:9090
# Open http://localhost:9090

# Alertmanager
kubectl port-forward -n production svc/alertmanager 9093:9093
# Open http://localhost:9093
```

### Key Metrics to Monitor

- **Response Time**: p95 < 2s, p99 < 3s
- **Error Rate**: < 5% (adjust per SLA)
- **Pod CPU**: < 70%
- **Pod Memory**: < 80%
- **Database Connections**: < 80% of max
- **Disk Space**: > 15% available
- **SSL Certificate**: Expiry > 30 days

### Alert Rules Active

```
✓ Application Down (2min)
✓ High Error Rate (5% for 5min)
✓ High Response Time (p95 >2s for 10min)
✓ High CPU Usage (80% for 10min)
✓ High Memory Usage (85% for 5min)
✓ Database Down (2min)
✓ Redis Down (2min)
✓ Low Disk Space (<15%)
✓ SSL Cert Expiring (< 30 days)
✓ Pod Crash Looping
```

---

## 🛠️ Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production --previous

# Common causes:
# - ImagePullBackOff: Registry credentials issue
# - CrashLoopBackOff: Application error
# - Pending: Resource constraints

# Solution examples:
# ImagePull: kubectl create secret docker-registry ghcr-secret \
#   --docker-server=ghcr.io \
#   --docker-username=<username> \
#   --docker-password=<token>

# CrashLoop: Check app logs, fix issue, rebuild image
# Pending: Add node, reduce resource requests
```

### High Latency

```bash
# Check pod resources
kubectl top pods -n production

# If CPU/Memory high:
# - Scale pods: kubectl scale deployment intelligent-agent-backend --replicas=10
# - Increase limits: Edit deployment, update resource limits
# - Optimize code: Profile with pprof/flamegraph

# Check network
kubectl exec -it <pod-name> -n production -- netstat -an | grep ESTABLISHED

# Check database
kubectl exec -it postgres-pod -n production -- psql -c "SELECT * FROM pg_stat_activity;"
```

### Database Connection Errors

```bash
# Test connectivity
kubectl run -it --rm db-test \
  --image=postgres:15 \
  --restart=Never \
  -- psql $DATABASE_URL -c "SELECT version();"

# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Check for max_connections exceeded
# Solution: Increase max_connections in PostgreSQL config
# Or reduce application connection pool size

kubectl set env deployment/intelligent-agent-backend \
  DB_POOL_MAX=5 -n production
```

### Memory Leaks

```bash
# Monitor memory over time
kubectl top pods -n production --containers

# If steadily increasing:
# 1. Get heap dump
kubectl exec -it <pod-name> -n production -- \
  node -e "require('heapdump').writeSnapshot()"

# 2. Copy dump
kubectl cp production/<pod-name>:/path/to/dump.heapsnapshot ./dump.heapsnapshot

# 3. Analyze with Chrome DevTools
# Open chrome://inspect → Load dump

# 4. Fix memory leak in code
# 5. Rebuild and redeploy
```

### Network Connectivity

```bash
# Test DNS
kubectl run -it --rm debug \
  --image=nicolaka/netshoot \
  --restart=Never \
  -- nslookup intelligent-agent-backend.production

# Test connectivity
kubectl run -it --rm debug \
  --image=nicolaka/netshoot \
  --restart=Never \
  -- curl -v http://intelligent-agent-backend:5000/health

# Check network policies
kubectl get networkpolicies -n production
kubectl describe networkpolicy <policy-name> -n production
```

---

## 📞 Escalation Procedures

### Level 1: Automated Recovery (0-5 min)

1. Monitoring detects issue
2. Alert fires
3. Auto-rollback triggered (if applicable)
4. Health checks verify recovery
5. Incident resolved automatically

### Level 2: Manual Intervention (5-30 min)

1. On-call receives alert
2. Reviews dashboards (Prometheus/Grafana)
3. Checks logs (pod logs, application logs)
4. Attempts manual rollback
5. Escalates if issue persists

### Level 3: Deep Investigation (30+ min)

1. Escalate to senior DevOps/SRE
2. Access production database
3. Review application code
4. Analyze memory/CPU profiling
5. Determine root cause
6. Implement fix
7. Test in staging
8. Deploy to production

### Critical Incident Response

```bash
# 1. Immediate actions
kubectl scale deployment intelligent-agent-backend --replicas=1 -n production
# This reduces load, may prevent cascading failures

# 2. Collect diagnostics
kubectl describe all -n production > diagnostics.txt
kubectl logs -l app=intelligent-agent -n production > logs.txt
kubectl top nodes > node-resources.txt

# 3. Notify stakeholders
# - Slack: #incidents
# - Email: team@intelligent-agent.com
# - Page: Senior on-call engineer

# 4. Implement workaround
# - Use read-only mode
# - Divert traffic to backup
# - Reduce feature set

# 5. Root cause analysis
# - Post-mortem meeting
# - Identify why automated recovery failed
# - Implement preventative measures
```

---

## 📚 Quick Reference

### Common Commands

```bash
# Deployment management
kubectl rollout status deployment/intelligent-agent-backend -n production
kubectl rollout history deployment/intelligent-agent-backend -n production
kubectl rollout undo deployment/intelligent-agent-backend -n production

# Pod management
kubectl get pods -n production -l component=backend
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production -f
kubectl exec -it <pod-name> -n production -- /bin/bash

# Resource usage
kubectl top pods -n production
kubectl top nodes

# Debugging
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash
kubectl port-forward svc/intelligent-agent-backend 5000:5000 -n production

# Scaling
kubectl scale deployment intelligent-agent-backend --replicas=10 -n production

# Configuration
kubectl get configmaps -n production
kubectl edit configmap intelligent-agent-config -n production

# Secrets
kubectl get secrets -n production
kubectl describe secret intelligent-agent-secrets -n production
```

---

## ✨ Success Criteria

✓ All pods running and ready  
✓ Health checks passing (frontend + backend)  
✓ Ingress routes working (all domains)  
✓ SSL certificates valid  
✓ Performance metrics within SLA  
✓ Error rate < 5%  
✓ Database connectivity confirmed  
✓ Cache connectivity confirmed  
✓ Monitoring dashboards populated  
✓ Alerts functioning

**Deployment is successful when all criteria are met! 🎉**
