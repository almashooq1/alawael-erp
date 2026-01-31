# 🏥 Rehab AGI - System Architecture

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  (Web, Mobile, Desktop, ERP Systems)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  (Express.js + CORS, Authentication, Rate Limiting)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌────────┐   ┌──────────┐   ┌───────────┐
    │  AGI   │   │   ERP    │   │ Utilities │
    │ Engine │   │Integration│   │  & Auth   │
    └────┬───┘   └─────┬────┘   └─────┬─────┘
         │             │              │
         └─────────────┼──────────────┘
                       ▼
         ┌─────────────────────────────┐
         │     Service Layer           │
         │ (Business Logic & Rules)    │
         └────────────┬────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    ┌────────┐   ┌─────────┐  ┌──────────┐
    │Database│   │  Cache  │  │ Queue    │
    │ (PgSQL)│   │(Redis)  │  │(if used) │
    └────────┘   └─────────┘  └──────────┘
```

## 🏗️ Component Architecture

### 1. **Presentation Layer**

- REST API Endpoints
- Request/Response Validation
- Error Handling
- Logging & Monitoring

### 2. **Business Logic Layer**

- AI Algorithms
- ERP Integration Logic
- Data Processing
- Rules Engine

### 3. **Data Layer**

- PostgreSQL Database
- Redis Cache
- File Storage
- Data Models

### 4. **Integration Layer**

- ERP Connectors
- External APIs
- Message Queues
- Webhooks

## 🔄 Data Flow

### Example: Beneficiary Analysis

```
Client Request
    │
    ▼
API Endpoint (/api/rehab-agi/analyze)
    │
    ├─ Validate Input
    │
    ▼
Check Cache (Redis)
    │
    ├─ Cache Hit? Return cached result
    │
    ▼
Retrieve Beneficiary Data (PostgreSQL)
    │
    ▼
Run AI Analysis Engine
    ├─ Assess Progress
    ├─ Analyze Patterns
    ├─ Generate Insights
    │
    ▼
Store Result in Cache
    │
    ▼
Return Response to Client
```

## 📊 Database Schema (Key Tables)

```
beneficiaries
├─ id (PK)
├─ name
├─ disabilityType
├─ enrollmentDate
├─ status
└─ metadata

programs
├─ id (PK)
├─ name
├─ type
├─ description
└─ objectives

progress_reports
├─ id (PK)
├─ beneficiaryId (FK)
├─ programId (FK)
├─ date
├─ metrics
└─ notes

schedules
├─ id (PK)
├─ beneficiaryId (FK)
├─ programId (FK)
├─ startDate
├─ endDate
└─ frequency

erp_operations
├─ id (PK)
├─ operationType
├─ entityType
├─ entityId
├─ status
└─ timestamp
```

## 🔌 API Layer Structure

```
Routes
├─ /api/rehab-agi/
│  ├─ analyze (POST)
│  ├─ recommend (POST)
│  ├─ predict (POST)
│  ├─ programs (GET)
│  ├─ schedule (POST)
│  ├─ report (POST)
│  └─ capabilities (GET)
│
├─ /api/erp/
│  ├─ sync (POST)
│  ├─ status (GET)
│  └─ operations (GET)
│
├─ /health (GET)
├─ /metrics (GET)
└─ /dashboard (GET)
```

## 🔐 Security Architecture

```
Request
  │
  ▼
CORS Check
  │
  ├─ Rejected if not allowed
  │
  ▼
Authentication (JWT)
  │
  ├─ Extract token from header
  ├─ Verify signature
  ├─ Check expiration
  │
  ▼
Authorization (Role-based)
  │
  ├─ Check user permissions
  ├─ Verify resource access
  │
  ▼
Rate Limiting
  │
  ├─ Check request count
  ├─ Block if exceeded
  │
  ▼
Input Validation
  │
  ├─ Sanitize inputs
  ├─ Check payload size
  │
  ▼
Process Request
```

## 📈 Scaling Strategy

### Horizontal Scaling

```
Load Balancer
    │
    ├─ App Server 1
    ├─ App Server 2
    ├─ App Server 3
    └─ App Server N

Shared Resources:
├─ PostgreSQL (with read replicas)
├─ Redis (cluster mode)
└─ File Storage (S3/Azure Blob)
```

### Vertical Scaling

- Increase server CPU/RAM
- Optimize database queries
- Implement caching strategies
- Use CDN for static content

## 🔄 Integration Points

### ERP Systems

```
Rehab AGI ◄──────► ERP System
         │
         ├─ REST API
         ├─ SOAP Web Services
         ├─ Scheduled Sync
         └─ Real-time Webhooks
```

### External Services

```
Rehab AGI ◄──────► Third-party Services
         │
         ├─ SMS Gateway
         ├─ Email Service
         ├─ Cloud Storage
         └─ Analytics Platform
```

## 📊 Monitoring Architecture

```
Application
    │
    ├─ Logs → Elastic Stack (ELK)
    ├─ Metrics → Prometheus
    ├─ Traces → Jaeger/Zipkin
    └─ Errors → Sentry
         │
         ▼
    Grafana Dashboards
         │
    Email/Slack Alerts
```

## 🚀 Deployment Architecture

```
Development
    │
    ▼
Staging (Docker Compose)
    │
    ├─ Unit Tests
    ├─ Integration Tests
    ├─ Load Testing
    │
    ▼
Production
    │
    ├─ Kubernetes (optional)
    ├─ Docker Swarm
    └─ Traditional Servers
```

---

**Last Updated**: January 30, 2026
