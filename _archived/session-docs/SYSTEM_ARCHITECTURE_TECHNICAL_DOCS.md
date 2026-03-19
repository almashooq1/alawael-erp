# 🏗️ SYSTEM ARCHITECTURE & TECHNICAL DOCUMENTATION
## Production-Ready System Design

**Version**: 1.0
**Created**: 25 February 2026
**Status**: 🟢 Production Ready
**Target Audience**: Architects, Developers, DevOps, Technical Leaders

---

## 📋 Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Component Details](#component-details)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Scaling Strategy](#scaling-strategy)
9. [Disaster Recovery](#disaster-recovery)

---

## 🏛️ High-Level Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
├─────────────────────────┬──────────────────────────────────┤
│                         │                                    │
│   Web Browser           │    Mobile App                      │
│   React/Vue             │    React Native                    │
│   TypeScript            │    NodeJS Backend                  │
│                         │                                    │
└──────────────┬──────────┴──────────────┬─────────────────────┘
               │                         │
        ┌──────▼─────────────────────────▼──────┐
        │      API GATEWAY / LOAD BALANCER       │
        │   (AWS ALB / CloudFlare CDN)           │
        │   - SSL/TLS Termination                │
        │   - Request Distribution                │
        │   - Rate Limiting                       │
        │   - WAF Protection                      │
        └──────┬──────────────────────────────────┘
               │
        ┌──────┴──────────────────────────┐
        │                                  │
┌───────▼────────────┐        ┌──────────▼─────────┐
│  APPLICATION TIER  │────────│  CACHE LAYER       │
│                    │        │                    │
│  Node.js Servers   │        │  Redis Cluster     │
│  ┌──────────────┐  │        │  - Session Cache   │
│  │ Express.js   │  │        │  - Query Cache     │
│  │ Middleware   │  │        │  - Pub/Sub         │
│  ├──────────────┤  │        │                    │
│  │ Controllers  │  │        └────────────────────┘
│  │ & Services   │  │
│  ├──────────────┤  │
│  │ Model Layer  │  │
│  │ (Mongoose)   │  │
│  └──────────────┘  │
│                    │
│  Auto-Scale: 3-10  │
│  Replicas          │
└────────┬───────────┘
         │
    ┌────▼────────────────────────────┐
    │      DATA LAYER                  │
    │                                  │
    │  ┌──────────────────────────┐   │
    │  │ RDS PostgreSQL           │   │
    │  │ Multi-AZ Deployment      │   │
    │  │ - Transactions           │   │
    │  │ - Reporting              │   │
    │  │ - Master Data            │   │
    │  │ - Historical Data        │   │
    │  └──────────────────────────┘   │
    │                                  │
    │  ┌──────────────────────────┐   │
    │  │ MongoDB (Optional)        │   │
    │  │ - Document Storage       │   │
    │  │ - Unstructured Data      │   │
    │  │ - Logs Collection        │   │
    │  └──────────────────────────┘   │
    │                                  │
    │  ┌──────────────────────────┐   │
    │  │ S3 Storage               │   │
    │  │ - Files/Images           │   │
    │  │ - Backups                │   │
    │  │ - Logs Archive           │   │
    │  └──────────────────────────┘   │
    │                                  │
    └────────────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │  ANCILLARY SERVICES              │
    │                                  │
    │  ┌──────────────┐                │
    │  │ Message      │                │
    │  │ Queue (SQS)  │ ← Async Jobs  │
    │  └──────────────┘                │
    │                                  │
    │  ┌──────────────┐                │
    │  │ Email        │                │
    │  │ Service (SNS)│ ← Alerts       │
    │  └──────────────┘                │
    │                                  │
    │  ┌──────────────┐                │
    │  │ Search       │                │
    │  │ (Elasticsearch) ← Indexing    │
    │  └──────────────┘                │
    │                                  │
    └────────────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │  MONITORING & LOGGING            │
    │                                  │
    │  ┌──────────────┐                │
    │  │ Datadog/     │ ← Metrics      │
    │  │ Prometheus   │   & Dashboards │
    │  └──────────────┘                │
    │                                  │
    │  ┌──────────────┐                │
    │  │ CloudWatch/  │ ← Log Assembly │
    │  │ ELK Stack    │   & Analysis   │
    │  └──────────────┘                │
    │                                  │
    │  ┌──────────────┐                │
    │  │ APM (New     │ ← Performance  │
    │  │ Relic/Datadog)  Tracing      │
    │  └──────────────┘                │
    │                                  │
    └────────────────────────────────┘
```

---

## 🔧 Component Details

### Application Server (Node.js + Express.js)

**Purpose:**
- Handle HTTP requests
- Run business logic
- Serve API endpoints
- Manage authentication & authorization

**Configuration:**
```javascript
{
  Node Version: "v22.20.0",
  Express Version: "5.2.1",
  Port: 3000 (internal),
  Replicas: 3-10 (auto-scaling),
  Memory per instance: 1-2GB,
  CPU per instance: 1-2 cores,
  Health Check: /api/health (every 30s)
}
```

**Key Middleware Stack:**
```
Request
  ↓
1. Body Parser (JSON)
  ↓
2. CORS Middleware
  ↓
3. Helmet Security Headers
  ↓
4. Request ID Generation
  ↓
5. Logging Middleware
  ↓
6. Rate Limiting
  ↓
7. Authentication (JWT)
  ↓
8. Authorization (RBAC)
  ↓
9. Input Validation & Sanitization
  ↓
10. Controllers & Routes
  ↓
11. Error Handling
  ↓
Response
```

**Auto-Scaling Policy:**
```
Metric: CPU Usage
├─ Scale UP when: Average CPU > 70% for 2 minutes
│  └─ Add 1-2 instances
├─ Scale DOWN when: Average CPU < 30% for 5 minutes
│  └─ Remove 1 instance
├─ Min replicas: 3
├─ Max replicas: 10
└─ Scaling cooldown: 3 minutes
```

### Load Balancer

**Purpose:**
- Distribute requests across servers
- Handle SSL/TLS termination
- Health checking
- Session stickiness

**Configuration:**
```
Type: AWS Application Load Balancer (ALB)
├─ Listener Port: 443 (HTTPS) & 80 (HTTP redirect)
├─ Target Groups: 3-10 app servers on port 3000
├─ Health Check: GET /api/health every 30s (2 consecutive failures = remove)
├─ Stickiness: Duration-based (24 hours)
├─ Connection Draining: 300 seconds
├─ AccessLog: Enabled (every hour to S3)
└─ WAF Rules: OWASP Top 10 + DDoS protection
```

### Cache Layer (Redis)

**Purpose:**
- Store sessions
- Cache database query results
- Rate limiting counters
- Real-time data (pub/sub)

**Configuration:**
```
Type: AWS ElastiCache (Redis)
├─ Node Type: cache.t3.small (2GB RAM)
├─ Cluster Mode: Enabled (for scale)
├─ Multi-AZ: Yes (automatic failover)
├─ Automatic Failover: Enabled
├─ Backup Retention: 7 days
├─ Encryption:
│  ├─ In Transit: TLS enabled
│  └─ At Rest: AWS-KMS enabled
├─ Replicas: 2
└─ Eviction Policy: allkeys-lru (LRU eviction)
```

**Cache Keys Strategy:**
```
Session Keys:
├─ session:{sessionId} → TTL: 24 hours
├─ user:{userId}:profile → TTL: 1 hour
└─ user:{userId}:permissions → TTL: 4 hours

Query Result Cache:
├─ reports:monthly:{date} → TTL: 24 hours
├─ products:list:{page} → TTL: 1 hour
└─ search:{term}:{page} → TTL: 30 min

Real-time:
├─ notifications:{userId} → No TTL (persistent)
└─ activity:feed → FIFO queue (last 1000 items)
```

### Database Tier

**PostgreSQL (Primary Database)**

```
Configuration:
├─ Version: PostgreSQL 14+
├─ Instance Class: db.r5.xlarge (multi-AZ)
├─ Storage: 500 GB (auto-scaling enabled)
├─ Backup Retention: 7 days automated
├─ Read Replicas: 2 (for reporting, scaling)
├─ Failover: Automatic Multi-AZ (< 2 min RTO)
├─ Encryption:
│  ├─ In Transit: SSL required
│  └─ At Rest: AWS-KMS
├─ Parameter Group: Custom (optimized for load)
│  ├─ max_connections: 150
│  ├─ shared_buffers: 25% RAM
│  ├─ effective_cache_size: 75% RAM
│  └─ work_mem: 26214 kB
└─ Monitoring: CloudWatch + custom dashboards
```

**MongoDB (Document Store - Optional)**

```
Configuration:
├─ Version: MongoDB 5.0+
├─ Deployment: AWS DocumentDB (MongoDB-compatible)
├─ Cluster Mode: Enabled (3 nodes)
├─ Multi-AZ: Yes
├─ Backup: Continuous (5-minute granularity)
├─ Encryption:
│  ├─ In Transit: TLS
│  └─ At Rest: KMS
└─ Usage:
   ├─ Unstructured logs
   ├─ Event streaming
   └─ Analytics data
```

### Storage Layer (S3)

```
Configuration:
├─ Bucket: alawael-production
├─ Versioning: Enabled
├─ Server-side Encryption: AES-256
├─ Access Control: Private (with IAM roles)
├─ Lifecycle Policy:
│  ├─ Standard (0-90 days)
│  ├─ Intelligent-Tiering (90-365 days)
│  └─ Archive (> 365 days)
├─ Replication: Cross-region to backup region
└─ Cost: ~$0.023/GB/month
```

---

## 🔄 Data Flow

### Request-Response Cycle

```
1. CLIENT SENDS REQUEST
   User Browser
   → GET /api/auth/profile
   → Headers: Authorization: Bearer {token}

2. TRAVELS THROUGH INTERNET
   → AWS ALB (load balancer)
   → SSL/TLS decryption
   → WAF checks (block malicious)
   → Rate limit check (429 if exceeded)

3. REACHES APPLICATION SERVER
   → Express middleware chain
   → Parse request body
   → Validate JWT token
   → Check user permissions (RBAC)
   → Input validation & sanitization

4. CHECK CACHE
   → Redis lookup: cache:user:{userId}:profile
   → Cache HIT: Return cached data immediately
   → Cache MISS: Continue to database

5. QUERY DATABASE
   → PostgreSQL connection pool
   → Execute SQL query
   → Result returned to application

6. PROCESS & CACHE
   → Application processes result
   → Store in Redis cache (TTL: 1 hour)
   → Transform for client consumption

7. SEND RESPONSE
   → Express serializes to JSON
   → Add security headers (Helmet)
   → Compress response (gzip)
   → ALB routes response back

8. CLIENT RECEIVES
   → Browser receives JSON
   → JavaScript processes
   → UI updates
   → User sees data

Typical timing:
├─ Cache hit: 10-50ms ✅
├─ Database query: 50-200ms
├─ Complex report: 200-500ms
└─ Slow query: 500ms+ ⚠️
```

### Authentication Flow

```
1. LOGIN REQUEST
   User submits: email + password
   → API endpoint: POST /api/auth/login

2. VALIDATION
   → Check email format valid
   → Check password strong (≥12 chars)
   → Check user exists in database
   → Compare password hash (bcrypt)

3. TOKEN GENERATION
   → Create JWT token:
      {
        "sub": "user123",
        "email": "user@example.com",
        "roles": ["user", "admin"],
        "issued_at": 1234567890,
        "expires_at": 1234571490  (1 hour)
      }
   → Sign with ECDSA private key
   → Return to client

4. CLIENT STORES TOKEN
   → Save in localStorage (vulnerable! ⚠️)
   → OR in secure httpOnly cookie ✅ (recommended)

5. SUBSEQUENT REQUESTS
   → Client sends Authorization header
   → Server verifies signature
   → Check expiration
   → Check revocation (blacklist)
   → Proceed if valid

6. TOKEN REFRESH
   → 55-minute token approaching expiration
   → Client calls POST /api/auth/refresh
   → Server issues new token
   → Cycle repeats

7. LOGOUT
   → Client deletes local token
   → Server adds token to blacklist (Redis)
   → TTL = original token expiration
```

---

## 🗄️ Database Schema

### Core Tables

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt
  full_name VARCHAR(255),
  avatar_url VARCHAR(512),
  status ENUM ('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  last_ip_address INET,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(32),
  
  -- Indexes for performance
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
);

-- Roles Table
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_name (name)
);

-- User Roles (Many-to-Many)
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (user_id, role_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role_id (role_id)
);

-- Permissions Table
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(100),  -- 'users', 'reports', etc
  action VARCHAR(20),      -- 'read', 'write', 'delete'
  description TEXT,
  
  INDEX idx_resource_action (resource, action)
);

-- Role Permissions (Many-to-Many)
CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  PRIMARY KEY (role_id, permission_id)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_resource (resource_type, resource_id)
);

-- System Settings
CREATE TABLE system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB,
  category VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);
```

### Indexes Strategy

```
HIGH PRIORITY (Create immediately):
├─ users(email) - Used in login
├─ users(status) - Used in user filtering
├─ audit_logs(timestamp DESC) - Used in reporting
├─ audit_logs(user_id) - Used in user activity

MEDIUM PRIORITY (Create next):
├─ transactions(user_id, created_at)
├─ reports(created_at DESC)
└─ feedback(status)

LOW PRIORITY (Monitor performance first):
├─ Partial indexes on specific statuses
└─ JSON indexes on feedback.data
```

---

## 🔗 API Architecture

### RESTful Endpoints Design

```
Authentication Endpoints:
POST   /api/auth/register          → Register new user
POST   /api/auth/login             → Get JWT token
POST   /api/auth/logout            → Invalidate token
POST   /api/auth/refresh           → Get new token
POST   /api/auth/forgot-password   → Send reset email
POST   /api/auth/reset-password    → Reset with token
POST   /api/auth/mfa/setup         → Enable 2FA
POST   /api/auth/mfa/verify        → Verify 2FA code

User Endpoints:
GET    /api/users                  → List users (paginated)
GET    /api/users/{id}             → Get user details
PUT    /api/users/{id}             → Update user
DELETE /api/users/{id}             → Delete user
PUT    /api/users/{id}/password    → Change password
PUT    /api/users/{id}/profile     → Update profile

System Endpoints:
GET    /api/health                 → Health check
GET    /api/metrics                → Prometheus metrics
GET    /api/status                 → System status
GET    /api/version                → API version
```

### Request/Response Format

```javascript
// SUCCESSFUL REQUEST
Request:
GET /api/users?page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Response (200 OK):
{
  "success": true,
  "data": {
    "items": [
      { "id": "123", "name": "John Doe", "email": "john@example.com" },
      { "id": "124", "name": "Jane Smith", "email": "jane@example.com" }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 50,
      "totalItems": 1000,
      "pageSize": 20
    }
  },
  "timestamp": "2026-02-25T14:30:00Z",
  "requestId": "req_abc123xyz"
}

// ERROR RESPONSE
Response (400/500):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "issue": "must be valid email"
    }
  },
  "timestamp": "2026-02-25T14:30:00Z",
  "requestId": "req_abc123xyz"
}
```

### API Versioning

```
Current: /api/v2 (v1 deprecated)

Version strategy:
├─ v1: Legacy (deprecated 2026-01-01)
├─ v2: Current (stable, in production)
├─ v3: Beta (new features, breaking changes)
└─ vfuture: Planning stage

Migration path:
v1 clients → Upgraded to v2 (Jan 2026)
v2 clients → Will upgrade to v3 (June 2026)
v3 released → Parallel with v2 for 6 months
```

---

## 🔐 Security Architecture

### Security Layers

```
Layer 1: NETWORK SECURITY
├─ DDoS Protection (CloudFlare/AWS Shield)
├─ WAF Rules (OWASP Top 10)
├─ IP Whitelisting (if government network)
└─ VPC Isolation (private subnets)

Layer 2: TRANSPORT SECURITY
├─ HTTPS/TLS 1.3 (mandatory)
├─ HSTS Headers (1 year)
├─ Certificate Pinning (mobile apps)
└─ Perfect Forward Secrecy

Layer 3: APPLICATION SECURITY
├─ JWT Authentication (HS256/RS256)
├─ RBAC Authorization
├─ Input Validation
├─ SQL Injection Prevention
├─ XSS Protection
├─ CSRF Tokens
└─ Secure Session Management

Layer 4: DATA SECURITY
├─ Encryption at Rest (AES-256)
├─ Encryption in Transit (TLS)
├─ Database Masks (PII)
├─ Audit Logging
└─ Access Control Lists

Layer 5: OPERATIONAL SECURITY
├─ Key Management (AWS Secrets Manager)
├─ Secrets Rotation (90 days)
├─ Log Retention (90 days encrypted)
├─ Backup Encryption
└─ Incident Response Plan
```

### Authentication & Authorization

```
Authentication (Who are you?):
├─ Method 1: Username/Password (bcrypt)
├─ Method 2: OAuth 2.0 (Google, Microsoft)
├─ Method 3: LDAP/Active Directory (Enterprise)
├─ Method 4: Multi-Factor (TOTP/SMS)
└─ Implemented: ✅ All methods supported

Authorization (What can you do?):
├─ RBAC: Role-Based Access Control
│  ├─ admin: Full system access
│  ├─ manager: Team/department access
│  ├─ user: Own data access
│  └─ guest: Read-only access
├─ ABAC: Attribute-Based (future)
└─ Implemented: ✅ RBAC with custom rules
```

### Data Protection

```
Sensitive Data Classification:
┌─ Level 1: PUBLIC
│  └─ No encryption needed
│     (Public company info, documentation)
│
├─ Level 2: INTERNAL
│  └─ Encryption in transit
│     (Internal reports, general user data)
│
├─ Level 3: CONFIDENTIAL
│  └─ Encryption in transit + at rest
│     (Financial records, health data)
│
└─ Level 4: RESTRICTED
   └─ Encryption + access logs + audit
      (Passwords, API keys, secrets)

Implementation:
✅ Database: All Confidential & Restricted encrypted
✅ S3: All files encrypted with AES-256
✅ Backups: Encrypted, tested quarterly
✅ Logs: Sensitive data masked before storage
```

---

## 🚀 Deployment Architecture

### CI/CD Pipeline

```
Developer commits code
        ↓
GitHub webhook triggered
        ↓
GitHub Actions starts
        ↓
1. RUN TESTS
   └─ npm test (383 tests in 45 seconds)
   └─ Coverage check (target 80%+)
   └─ Fail if any test breaks
        ↓ (if pass)
2. LINT & FORMAT
   └─ ESLint check
   └─ Prettier format
   └─ Security scan (npm audit)
        ↓ (if pass)
3. BUILD DOCKER IMAGE
   └─ docker build -t alawael:v1.2.3
   └─ Scan for vulnerabilities
        ↓ (if pass)
4. PUSH TO ECR
   └─ AWS Elastic Container Registry
   └─ Tag with commit SHA
        ↓
5. DEPLOY TO STAGING
   └─ kubectl apply (staging cluster)
   └─ Wait for health checks
   └─ Run smoke tests
        ↓ (if pass)
6. WAIT FOR APPROVAL
   └─ Human review required
   └─ Check staging thoroughly
        ↓ (if approve)
7. DEPLOY TO PRODUCTION (Canary)
   └─ Deploy to 25% → Monitor
   └─ Deploy to 50% → Monitor
   └─ Deploy to 100% → Monitor
   └─ If error rate spikes → Auto-rollback
        ↓
8. POST-DEPLOYMENT
   └─ Run smoke tests
   └─ Notify team on Slack
   └─ Watch metrics for 1 hour

Timeline: Commit to production = 30-45 minutes
```

### Infrastructure as Code

```yaml
# Example using Terraform
resource "aws_ecs_service" "alawael" {
  name            = "alawael-backend"
  cluster         = aws_ecs_cluster.production.id
  task_definition = aws_ecs_task_definition.alawael.arn
  desired_count   = 3
  
  # Auto-scaling
  autoscaling_group {
    min_size         = 3
    max_size         = 10
    desired_capacity = 5
    target_cpu       = 70
  }
  
  # Load balancer
  load_balancer {
    target_group_arn = aws_lb_target_group.alawael.arn
    container_name   = "alawael"
    container_port   = 3000
  }
  
  # Deployment strategy
  deployment_configuration {
    maximum_percent         = 150  # Allow 150% during update
    minimum_healthy_percent = 50   # Keep 50% running
  }
}
```

---

## 📈 Scaling Strategy

### Vertical Scaling (Bigger Servers)

```
When to use: When CPU is bottleneck, but requests are few

Before Scaling:
├─ Instance type: t3.large (2 vCPU, 8GB RAM)
├─ Server count: 3 instances
├─ Avg CPU: 85%
└─ Cost: $100/month

After Scaling:
├─ Instance type: r5.xlarge (4 vCPU, 32GB RAM)
├─ Server count: 3 instances
├─ Avg CPU: 45% (more headroom)
└─ Cost: $250/month

Decision: Use when application logic is expensive
Caution: Pay attention to memory usage!
```

### Horizontal Scaling (More Servers)

```
When to use: Normal scaling, add more replicas

Auto-scaling Policy:
Metric: CPU > 70% for 2 minutes
├─ Add 1 instance
├─ Wait 3 min (cooldown)
├─ Check metric again
└─ Max instances: 10

Metric: CPU < 30% for 5 minutes
├─ Remove 1 instance
├─ Keep minimum: 3
└─ Cost optimization

Benefits:
✅ Better fault tolerance
✅ Gradual scaling
✅ Cost-effective
✅ Handles traffic spikes

Process:
New server → Warm up (30 sec) → Join pool → Accept traffic
```

### Database Scaling

```
PostgreSQL:
├─ Vertical: Upgrade instance (RDS restart = 1-2 min downtime)
├─ Horizontal: Add read replicas (no downtime)
│  └─ Use for reporting, analytics, read-heavy queries
├─ Sharding: Future (if database > 100GB)
└─ Timeline: Scale vertically at 70% CPU

Redis:
├─ Vertical: Upgrade node size (brief interruption)
├─ Cluster Mode: Add partitions (online scaling)
└─ Timeline: Scale when memory > 80%

Decision Matrix:
CPU bottleneck?    → Add more app servers
Memory bottleneck? → Scale up instance size
Database slow?     → Add read replicas
Cache slow?        → Scale cache layer
```

---

## 🔄 Disaster Recovery

### RTO/RPO Targets

```
┌─────────────────┬──────────┬──────────┐
│ Scenario        │ RTO      │ RPO      │
├─────────────────┼──────────┼──────────┤
│ Single server   │ < 2 min  │ 0 min    │
│ Region failure  │ < 15 min │ < 1 hour │
│ Data corruption │ < 1 hour │ < 5 min  │
│ Security breach │ < 2 hour │ < 30 min │
│ Complete outage │ < 4 hour │ < 1 hour │
└─────────────────┴──────────┴──────────┘
```

### Backup Strategy

```
PRIMARY BACKUPS (Every 6 hours):
├─ Database: RDS automated snapshots
├─ Location: Same region as primary
├─ Retention: 7 days
└─ Recovery: < 10 minutes

SECONDARY BACKUPS (Daily):
├─ Full backup to S3
├─ Cross-region replication enabled
├─ Encryption: AES-256
├─ Retention: 30 days
└─ Recovery: 15-30 minutes

TERTIARY BACKUPS (Monthly):
├─ Cold backup to AWS Glacier
├─ Annual retention requirement
├─ For compliance/audit
└─ Recovery: 4-24 hours

Quarterly Testing:
✅ Restore from daily backup to test server
✅ Run full test suite
✅ Verify data integrity
✅ Calculate actual RTO
✅ Document restoration procedure
```

### Failover Procedures

**Database Failover (Automatic):**
```
Primary DB fails
    ↓
AWS detects health check failure (30 sec)
    ↓
Automatic failover triggered
    ↓
Replica promoted to PRIMARY (see message below) → 2-3 minutes
    ↓
Application reconnects (via RDS endpoint - automatic)
    ↓
Service restored
```

**Application Failover (Automatic):**
```
Server 1 fails
    ↓
Load Balancer detects (at health check)
    ↓
Removes from pool (30 sec)
    ↓
Traffic rerouted to Server 2 & 3
    ↓
Average impact: < 1 second (requests in flight may retry)
    ↓
Server 1 replaced by auto-scaling (5 min)
```

**Region Failover (Manual - 15 min RTO):**
```
Primary region outage detected
    ↓
Declare incident
    ↓
Prepare secondary region:
├─ Promote read replica database
├─ Update DNS to secondary ALB
├─ Update cache endpoints
└─ Switch to secondary servers
    ↓
Validate health checks pass
    ↓
Monitor for issues
    ↓
Notify customers
    ↓
Scale secondary region to full capacity

Cost of failover: ~$50/min additional (temporary)
```

---

## 📚 API Documentation

### Authentication Example

```bash
# Step 1: Register new user
curl -X POST https://api.alawael.com/api/v2/auth/register \
  -H "Content-Type: application/json" \
  -d {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "fullName": "John Doe"
  }

Response:
{
  "success": true,
  "data": {
    "userId": "user_123",
    "email": "user@example.com",
    "message": "Registration successful. Check email for verification."
  }
}

# Step 2: Verify email (link from email)
# User clicks link in email with token

# Step 3: Login
curl -X POST https://api.alawael.com/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "roles": ["user"],
      "permissions": [...]
    }
  }
}

# Step 4: Make authenticated requests
curl -X GET https://api.alawael.com/api/v2/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

Response:
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "profile": {...}
  }
}
```

---

**Version**: 1.0
**Created**: 25 February 2026
**Next Review**: 28 February 2026
**Status**: 🟢 Production Ready
