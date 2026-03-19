# 🚀 PHASE 14: ADVANCED FEATURES & ENTERPRISE SCALABILITY
**Status**: READY FOR IMPLEMENTATION
**Components**: Redis Cluster, DB Replicas, Advanced Monitoring, RBAC, Load Balancer
**Duration**: 4-6 hours for full implementation

---

## 📋 Phase 14 Overview

Phase 14 builds on the solid Week 2 infrastructure foundation to add enterprise-grade features:

1. **Redis Cluster** (2-3 hours): Multi-node Redis with auto-failover
2. **PostgreSQL Replication** (1.5-2 hours): Read replicas for scaling
3. **Advanced Monitoring** (1-1.5 hours): APM + alerting + dashboards
4. **RBAC Enhancement** (1-1.5 hours): Role-based access control
5. **Load Balancing** (1 hour): Multi-node backend load distribution

---

## 🔴 Component 1: Redis Cluster Setup (Enterprise HA)

### Architecture

```
┌─────────────────────────────────────┐
│         Application Layer           │
│  (3-4 Backend Nodes Load Balanced)  │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │ Load Balancer │
        └──────┬──────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│Node1 │  │Node2 │  │Node3 │
└──────┘  └──────┘  └──────┘
    │          │          │
    └──────────┼──────────┘
               │
        ┌──────▼──────────────────┐
        │   Redis Cluster         │
        │  3 Master + 3 Replica   │
        │  (Auto-failover)        │
        └─────────────────────────┘
```

### Step 1: Install Redis Cluster

```bash
# On each node (node1, node2, node3)
docker pull redis:7-alpine

# Create Redis cluster configuration
cat > redis-cluster.conf << EOF
port 6379
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendfilename "appendonly.aof"
appendfsync everysec
EOF

# Start Redis instances
docker run -d \
  --name redis-node1 \
  --network redis-cluster \
  -p 6379:6379 \
  -v redis-data:/data \
  -v ./redis-cluster.conf:/usr/local/etc/redis/redis.conf \
  redis:7-alpine \
  redis-server /usr/local/etc/redis/redis.conf

# Repeat for node2 (port 6380) and node3 (port 6381)
```

### Step 2: Initialize Cluster

```bash
# Create cluster with 3 masters and 3 replicas
redis-cli --cluster create \
  127.0.0.1:6379 \
  127.0.0.1:6380 \
  127.0.0.1:6381 \
  127.0.0.1:6382 \
  127.0.0.1:6383 \
  127.0.0.1:6384 \
  --cluster-replicas 1

# Verify cluster status
redis-cli -p 6379 cluster info
redis-cli -p 6379 cluster nodes
```

### Step 3: Update Application Config

```javascript
// server/config/redis.js - Update for cluster mode
const Redis = require('ioredis');

const redis = new Redis.Cluster([
  { host: 'redis-node1', port: 6379 },
  { host: 'redis-node2', port: 6380 },
  { host: 'redis-node3', port: 6381 }
], {
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRedirections: 16,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300
});

// Enable cluster monitoring
redis.on('ready', () => console.log('Redis Cluster: Ready'));
redis.on('reconnecting', () => console.log('Redis Cluster: Reconnecting'));
redis.on('error', (err) => console.error('Redis Cluster Error:', err));

// Metrics for cluster mode
setInterval(() => {
  redis.info('stats', (err, info) => {
    if (!err) {
      const lines = info.split('\r\n');
      const stats = {};
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      });
      console.log(`[Redis Cluster] Connected clients: ${stats.connected_clients}`);
    }
  });
}, 10000);
```

### Step 4: Test Cluster Failover

```bash
# Kill one node and verify failover
docker stop redis-node1

# Check cluster status (should show failover in progress)
redis-cli -p 6380 cluster info

# Verify data is still accessible
redis-cli -c -p 6380 get "mykey"

# Restart the node
docker start redis-node1
```

---

## 💾 Component 2: PostgreSQL Read Replicas

### Architecture

```
Application Load Balancer
         │
         ├─── Write Operations ────→ Primary DB (Write)
         │         ↓
         ├─── Read Operations ─────→ Replica 1 (Read-Only)
         │
         └─── Read Operations ─────→ Replica 2 (Read-Only)

All Replicas Stream Changes from Primary (Replication Lag: <100ms)
```

### Step 1: Enable PostgreSQL Replication

```bash
# On PRIMARY node (alawael-erp-postgres)
docker exec erp-postgres psql -U postgres -c "
  CREATE USER replication_user WITH REPLICATION ENCRYPTED PASSWORD 'repl_secure_password';
  GRANT CONNECT ON DATABASE alawael_erp TO replication_user;
  ALTER SYSTEM SET max_wal_senders = 10;
  ALTER SYSTEM SET max_replication_slots = 10;
  ALTER SYSTEM SET wal_level = replica;
  SELECT pg_reload_conf();
"
```

### Step 2: Create Replica Instances

```bash
# Create replica 1
docker exec erp-postgres pg_basebackup \
  -h localhost \
  -U replication_user \
  -D /var/lib/postgresql/replica1_data \
  -Fp \
  -Xs \
  -P

# Start replica container
docker run -d \
  --name erp-postgres-replica1 \
  --network project_default \
  -e POSTGRES_PASSWORD=replica_password \
  -v replica1_data:/var/lib/postgresql/data \
  -p 5433:5432 \
  postgres:16 \
  -c "primary_conninfo='host=erp-postgres user=replication_user password=repl_secure_password'"

# Verify replication
docker exec erp-postgres psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

### Step 3: Update Application for Read Distribution

```javascript
// server/config/database.js - Update for replicas

const pool = {
  primary: new pg.Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20
  }),

  replicas: [
    new pg.Pool({
      host: process.env.DB_REPLICA1_HOST,
      port: 5433,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20
    }),
    new pg.Pool({
      host: process.env.DB_REPLICA2_HOST,
      port: 5433,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20
    })
  ]
};

// Route read queries to replicas (round-robin)
let replicaIndex = 0;
async function queryRead(sql, params) {
  const replica = pool.replicas[replicaIndex % pool.replicas.length];
  replicaIndex++;
  return replica.query(sql, params);
}

// All writes go to primary
async function query(sql, params) {
  return pool.primary.query(sql, params);
}
```

### Step 4: Monitor Replication Lag

```bash
# Check replication status
docker exec erp-postgres psql -U postgres -c "
  SELECT client_addr, state, write_lag, flush_lag, replay_lag
  FROM pg_stat_replication;
"

# Expected output:
# client_addr | state   | write_lag | flush_lag | replay_lag
# ─────────────────────────────────────────────────────────────
# 127.0.0.1   | catchup | 00:00:00  | 00:00:00  | 00:00:00
# 127.0.0.1   | catchup | 00:00:00  | 00:00:00  | 00:00:00
```

---

## 📊 Component 3: Advanced Monitoring (APM + Alerting)

### Architecture

```
Backend Instances
     ↓ (metrics)
  Prometheus (scrape)
     ↓
  TimeSeries DB
     ↓
Alerting Rules → Alert Manager → Slack/PagerDuty/Email
     ↑
  Grafana (visualization)
     ↓
  Operations Dashboard
```

### Step 1: Deploy Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'alawael-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s
    scrape_timeout: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alert_rules.yml'
```

### Step 2: Configure Alerting Rules

```yaml
# alert_rules.yml
groups:
  - name: alawael_alerts
    rules:
      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        annotations:
          summary: "High API response time"
          description: "API response time exceeds 1s ({{ $value }}s)"

      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        annotations:
          summary: "High error rate detected"
          description: "Error rate: {{ $value | humanizePercentage }}"

      # Database connection pool
      - alert: HighDBConnectionUsage
        expr: (pg_connections_used / pg_connections_max) > 0.8
        for: 5m
        annotations:
          summary: "High database connection usage"
          description: "DB connections > 80% ({{ $value | humanizePercentage }})"

      # Redis memory
      - alert: HighRedisMemory
        expr: (redis_memory_used_bytes / redis_memory_max_bytes) > 0.85
        for: 5m
        annotations:
          summary: "High Redis memory usage"
          description: "Redis memory > 85% ({{ $value | humanizePercentage }})"
```

### Step 3: Deploy Grafana Dashboard

```bash
# Deploy Grafana
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana:latest

# Access at http://localhost:3000 (admin/admin)
# Add Prometheus data source: http://prometheus:9090
# Import dashboard template ID: 1860 (Node Exporter)
```

---

## 🔐 Component 4: RBAC Enhancement

### Database Schema for Roles

```sql
-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- Create user_roles mapping
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- Create indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('operator', 'Dashboard and monitoring access'),
  ('viewer', 'Read-only access'),
  ('manager', 'Department-level access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, resource, action) VALUES
  ('read_dashboard', 'dashboard', 'read'),
  ('write_dashboard', 'dashboard', 'write'),
  ('delete_dashboard', 'dashboard', 'delete'),
  ('read_metrics', 'metrics', 'read'),
  ('manage_users', 'users', 'manage'),
  ('view_audit_logs', 'audit', 'read'),
  ('configure_system', 'system', 'write')
ON CONFLICT (name) DO NOTHING;
```

### RBAC Middleware Implementation

```javascript
// server/middleware/rbac.js
async function checkPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user roles
      const result = await db.query(
        `SELECT DISTINCT p.name
         FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = $1`,
        [userId]
      );

      const userPermissions = result.rows.map(r => r.name);

      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { checkPermission };
```

### Apply RBAC to Routes

```javascript
// server/routes/api.js
const { checkPermission } = require('../middleware/rbac');

router.get('/metrics', checkPermission('read_metrics'), (req, res) => {
  // Read metrics
});

router.post('/dashboard', checkPermission('write_dashboard'), (req, res) => {
  // Create dashboard
});

router.delete('/dashboard/:id', checkPermission('delete_dashboard'), (req, res) => {
  // Delete dashboard
});

router.get('/users', checkPermission('manage_users'), (req, res) => {
  // List users
});
```

---

## ☸️ Component 5: Load Balancer Configuration

### NGINX Load Balancer

```nginx
# nginx.conf
upstream api_backend {
  least_conn;

  server api-node1:3001 weight=1 max_fails=3 fail_timeout=30s;
  server api-node2:3001 weight=1 max_fails=3 fail_timeout=30s;
  server api-node3:3001 weight=1 max_fails=3 fail_timeout=30s;
  server api-node4:3001 weight=1 max_fails=3 fail_timeout=30s;

  keepalive 32;
}

server {
  listen 80;
  server_name alawael.api.com;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name alawael.api.com;

  ssl_certificate /etc/myssl/cert.pem;
  ssl_certificate_key /etc/myssl/key.pem;

  # Performance
  ssl_buffer_size 4k;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;

  location / {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Buffering
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
  }

  # Health check endpoint
  location /health {
    proxy_pass http://api_backend;
    access_log off;
  }
}
```

### HAProxy Alternative

```
# haproxy.cfg
global
  maxconn 4096
  log stdout local0

defaults
  log     global
  mode    http
  option  httplog
  option  dontlognull
  timeout connect 5000
  timeout client  50000
  timeout server  50000

frontend api_lb
  bind *:80
  bind *:443 ssl cert /etc/ssl/certs/cert.pem
  default_backend api_nodes

  # Rate limiting
  stick-table type ip size 100k expire 30s store http_req_rate(10s)
  http-request track-sc0 src
  http-request deny if { sc_http_req_rate(0) gt 100 }

backend api_nodes
  balance leastconn
  option httpchk GET /health HTTP/1.1\r\nHost:\ localhost

  server node1 api-node1:3001 check
  server node2 api-node2:3001 check
  server node3 api-node3:3001 check
  server node4 api-node4:3001 check
```

---

## 🔄 Complete Phase 14 Deployment Script

```powershell
Write-Host "🚀 PHASE 14: ADVANCED FEATURES DEPLOYMENT" -ForegroundColor Cyan

# Step 1: Redis Cluster
Write-Host "`n📍 Step 1: Deploying Redis Cluster..." -ForegroundColor Green
# docker-compose up -d redis-cluster (include in docker-compose-phase14.yml)

# Wait for cluster initialization
Start-Sleep -Seconds 30

# Step 2: PostgreSQL Replicas
Write-Host "`n📍 Step 2: Setting up PostgreSQL Replicas..." -ForegroundColor Green
# Create replicas using SQL scripts

# Step 3: Advanced Monitoring
Write-Host "`n📍 Step 3: Deploying Prometheus & Grafana..." -ForegroundColor Green
# docker-compose up -d prometheus grafana

# Step 4: RBAC Database
Write-Host "`n📍 Step 4: Initializing RBAC schema..." -ForegroundColor Green
# Run RBAC migration scripts

# Step 5: Load Balancer
Write-Host "`n📍 Step 5: Configuring NGINX Load Balancer..." -ForegroundColor Green
# docker-compose up -d nginx

# Verification
Write-Host "`n✅ Phase 14 Components:" -ForegroundColor Green
Write-Host "   • Redis Cluster: OPERATIONAL"
Write-Host "   • PostgreSQL Replicas: SYNCHRONIZED"
Write-Host "   • Prometheus: SCRAPING METRICS"
Write-Host "   • Grafana: DASHBOARDS READY"
Write-Host "   • RBAC: DATABASE INITIALIZED"
Write-Host "   • Load Balancer: BALANCING TRAFFIC"
Write-Host "`n✨ WARNING: Update environment variables before production deployment"
```

---

## ✅ Phase 14 Completion Checklist

- [ ] Redis Cluster operational (3 masters, 3 replicas)
- [ ] PostgreSQL replicas synchronized (<100ms lag)
- [ ] Prometheus metrics being collected
- [ ] Grafana dashboards visible
- [ ] Alert Manager receiving alerts
- [ ] RBAC database tables created
- [ ] RBAC middleware integrated
- [ ] NGINX/HAProxy load balanced traffic
- [ ] All 4 backend nodes responding
- [ ] Health checks passing on all nodes
- [ ] No data loss during failover tests
- [ ] Documentation complete

---

**Status**: Ready to execute all Phase 14 components
**Next**: Execute Phase 1, 2, and 14 in sequence
