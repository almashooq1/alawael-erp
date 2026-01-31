# 🔧 Test Environment Setup Guide

دليل إعداد بيئة الاختبار

**Document Type**: Setup Guide  
**Version**: 1.0.0  
**Created**: January 30, 2026  
**Owner**: DevOps Lead

---

## 🎯 Purpose

Provide step-by-step instructions to configure the test environment (Staging)
for Phase 4 testing activities. This guide covers infrastructure, databases,
services, monitoring, and data seeding.

---

## 📋 Prerequisites

```
[ ] Access to cloud platform (AWS/Azure)
[ ] Docker installed on local machine
[ ] kubectl configured for Kubernetes cluster
[ ] Database admin access
[ ] Monitoring tools access (Prometheus, Grafana)
[ ] Network connectivity to staging environment
```

---

## 🏗️ Infrastructure Setup

### Step 1: Kubernetes Cluster Configuration

**1.1 Verify Cluster Status**

```bash
kubectl cluster-info
kubectl get nodes -o wide
```

Expected output:

- 3+ nodes in Ready state
- Kubernetes version 1.25+
- Storage class configured

**1.2 Create Namespaces**

```bash
# Create namespaces for test environment
kubectl create namespace scm-staging
kubectl create namespace scm-monitoring
kubectl create namespace scm-databases

# Verify
kubectl get namespaces
```

**1.3 Set Resource Limits**

```bash
# Save as namespaces.yaml
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: scm-staging-quota
  namespace: scm-staging
spec:
  hard:
    requests.cpu: "16"
    requests.memory: "32Gi"
    limits.cpu: "24"
    limits.memory: "48Gi"
    pods: "100"
    services: "20"
EOF
```

**Pass Criteria**:

- ✅ Cluster accessible
- ✅ 3+ nodes ready
- ✅ Namespaces created
- ✅ Resource limits applied

---

### Step 2: Database Setup (PostgreSQL)

**2.1 Deploy PostgreSQL to Kubernetes**

```bash
# Create persistent volume
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: scm-databases
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
EOF

# Deploy PostgreSQL
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install postgres bitnami/postgresql \
  --namespace scm-databases \
  --set auth.postgresPassword=testpass123 \
  --set primary.persistence.enabled=true \
  --set primary.persistence.size=100Gi \
  --set primary.resources.requests.memory="4Gi" \
  --set primary.resources.requests.cpu="2"
```

**2.2 Create Database and Schema**

```bash
# Port forward to access database
kubectl port-forward -n scm-databases svc/postgres-postgresql 5432:5432 &

# Connect to PostgreSQL
psql -h localhost -U postgres -d postgres

# Run schema initialization
\c postgres

-- Create SCM database
CREATE DATABASE scm_staging;

-- Connect to new database
\c scm_staging

-- Apply schema (from schema.sql)
\i /path/to/schema.sql

-- Create indexes for performance
CREATE INDEX idx_beneficiary_email ON beneficiaries(email);
CREATE INDEX idx_program_status ON programs(status);
CREATE INDEX idx_analysis_created ON analyses(created_at DESC);

-- Verify schema
\dt
```

**2.3 Configure Connection Pooling**

```bash
# Create PgBouncer deployment for connection pooling
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
  namespace: scm-databases
data:
  pgbouncer.ini: |
    [databases]
    scm_staging = host=postgres-postgresql port=5432 dbname=scm_staging

    [pgbouncer]
    listen_port = 6432
    listen_addr = 0.0.0.0
    auth_type = plain
    auth_file = /etc/pgbouncer/userlist.txt
    max_client_conn = 1000
    default_pool_size = 25
    reserve_pool_size = 5
    reserve_pool_timeout = 3
    server_idle_timeout = 600
    server_lifetime = 3600
    server_connect_timeout = 15
EOF
```

**Pass Criteria**:

- ✅ PostgreSQL running
- ✅ Database created (scm_staging)
- ✅ Schema applied
- ✅ Indexes created
- ✅ Connection pooling configured

---

### Step 3: Redis Cache Setup

**3.1 Deploy Redis**

```bash
helm install redis bitnami/redis \
  --namespace scm-staging \
  --set auth.enabled=true \
  --set auth.password=redispass123 \
  --set master.persistence.enabled=true \
  --set master.persistence.size=20Gi \
  --set replica.replicaCount=2 \
  --set master.resources.requests.memory="2Gi"
```

**3.2 Configure Redis for Phase 4**

```bash
# Port forward to Redis
kubectl port-forward -n scm-staging svc/redis-master 6379:6379 &

# Connect to Redis CLI
redis-cli -h localhost -p 6379 -a redispass123

# Configure TTLs
CONFIG SET maxmemory 10gb
CONFIG SET maxmemory-policy allkeys-lru

# Set cache keys for testing
SET cache_beneficiary_ttl 3600
SET cache_program_ttl 1800
SET cache_analysis_ttl 7200
```

**Pass Criteria**:

- ✅ Redis cluster running (master + 2 replicas)
- ✅ Authentication enabled
- ✅ Memory limits configured
- ✅ Persistence enabled

---

### Step 4: Application Deployment

**4.1 Deploy Backend Service**

```bash
# Create namespace secret for database
kubectl create secret generic db-credentials \
  --from-literal=DB_HOST=postgres-postgresql.scm-databases \
  --from-literal=DB_USER=postgres \
  --from-literal=DB_PASSWORD=testpass123 \
  --from-literal=DB_NAME=scm_staging \
  -n scm-staging

# Deploy backend
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scm-backend
  namespace: scm-staging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scm-backend
  template:
    metadata:
      labels:
        app: scm-backend
    spec:
      containers:
      - name: backend
        image: scm:backend-phase4
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_HOST
        - name: REDIS_HOST
          value: redis-master.scm-staging
        - name: LOG_LEVEL
          value: debug
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
EOF

# Verify deployment
kubectl get pods -n scm-staging
kubectl logs -n scm-staging -l app=scm-backend
```

**4.2 Deploy Frontend Service**

```bash
# Deploy frontend
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scm-frontend
  namespace: scm-staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: scm-frontend
  template:
    metadata:
      labels:
        app: scm-frontend
    spec:
      containers:
      - name: frontend
        image: scm:frontend-phase4
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_URL
          value: http://scm-backend:3000/api
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
EOF
```

**Pass Criteria**:

- ✅ Backend deployed (3 replicas running)
- ✅ Frontend deployed (2 replicas running)
- ✅ Services accessible
- ✅ Health checks passing

---

### Step 5: Monitoring Setup

**5.1 Deploy Prometheus**

```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace scm-monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

**5.2 Deploy Grafana**

```bash
helm install grafana bitnami/grafana \
  --namespace scm-monitoring \
  --set adminPassword=grafanapass123 \
  --set persistence.enabled=true \
  --set persistence.size=10Gi
```

**5.3 Configure Dashboards**

```bash
# Port forward to Grafana
kubectl port-forward -n scm-monitoring svc/grafana 3000:3000 &

# Access: http://localhost:3000
# Login: admin / grafanapass123

# Import dashboards:
# - Kubernetes cluster monitoring
# - PostgreSQL performance
# - Redis cache metrics
# - Application performance (APM)
```

**Pass Criteria**:

- ✅ Prometheus scraping metrics
- ✅ Grafana dashboards accessible
- ✅ Historical metrics stored (30 days)
- ✅ Alerts configured

---

## 🌱 Data Seeding

### Step 1: Seed Test Data

```bash
# Run data seeding script
kubectl exec -n scm-staging deployment/scm-backend -- npm run seed:test-data

# Expected output:
# ✅ Seeded 500 beneficiaries
# ✅ Seeded 50 programs
# ✅ Seeded 100 analyses
# ✅ Seeded 1000 report records
```

### Step 2: Verify Data

```bash
# Connect to database
psql -h postgres-postgresql.scm-databases -U postgres -d scm_staging

-- Verify counts
SELECT 'beneficiaries' as table_name, COUNT(*) as count FROM beneficiaries
UNION ALL
SELECT 'programs', COUNT(*) FROM programs
UNION ALL
SELECT 'analyses', COUNT(*) FROM analyses
UNION ALL
SELECT 'reports', COUNT(*) FROM reports;

-- Expected: 500, 50, 100, 1000
```

**Pass Criteria**:

- ✅ 500+ beneficiaries
- ✅ 50+ programs
- ✅ 100+ analyses
- ✅ 1000+ report records

---

## 🔍 Environment Validation Checklist

```
[ ] Kubernetes cluster operational
[ ] PostgreSQL database ready
[ ] Redis cache running
[ ] Backend service deployed (3 replicas)
[ ] Frontend service deployed (2 replicas)
[ ] Prometheus collecting metrics
[ ] Grafana dashboards accessible
[ ] Test data seeded (500+, 50+, 100+, 1000+)
[ ] Application health checks passing
[ ] Database connectivity verified
[ ] Cache connectivity verified
[ ] Monitoring dashboards showing data
[ ] Network policies configured
[ ] SSL/TLS certificates valid
[ ] Backup/restore tested
```

---

## 🚨 Troubleshooting

**Problem**: Pods in pending state

```bash
# Check resource availability
kubectl describe pod <pod-name> -n scm-staging

# Check resource quotas
kubectl describe quota -n scm-staging
```

**Problem**: Database connection timeout

```bash
# Verify connectivity
kubectl run -it --rm debug --image=postgres --restart=Never -- \
  psql -h postgres-postgresql.scm-databases -U postgres -c "SELECT 1"
```

**Problem**: Redis memory pressure

```bash
# Check Redis memory
redis-cli -h localhost -p 6379 -a redispass123 INFO memory

# Clear cache if needed
redis-cli -h localhost -p 6379 -a redispass123 FLUSHDB
```

---

## ⏱️ Timeline

| Step      | Component          | Duration     |
| --------- | ------------------ | ------------ |
| 1         | Kubernetes Setup   | 30 min       |
| 2         | PostgreSQL         | 20 min       |
| 3         | Redis              | 15 min       |
| 4         | Application        | 20 min       |
| 5         | Monitoring         | 15 min       |
| 6         | Data Seeding       | 10 min       |
| **Total** | **Complete Setup** | **~2 hours** |

---

## ✅ Sign-Off

**DevOps Lead**: **********\_\_********** Date: **\_\_**

**Infrastructure Owner**: **********\_\_********** Date: **\_\_**

**QA Lead**: **********\_\_********** Date: **\_\_**
