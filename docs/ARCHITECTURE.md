# Architecture — Al-Awael ERP v3.1.0

> الوثيقة الهندسية الشاملة لنظام إدارة مراكز الأوائل للرعاية النهارية

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Database Design](#5-database-design)
6. [Security Architecture](#6-security-architecture)
7. [Rehabilitation System Module](#7-rehabilitation-system-module)
8. [Branch Management System](#8-branch-management-system)
9. [API Design Principles](#9-api-design-principles)
10. [Key Design Decisions](#10-key-design-decisions)

---

## 1. System Overview

Al-Awael ERP is a **monorepo** enterprise resource planning system built for day care centers for people with disabilities. It manages 12 branches + 1 HQ with a full suite of operational, clinical, HR, and financial modules.

| Dimension       | Scale                                      |
|-----------------|--------------------------------------------|
| API Modules     | 200+ route modules (36+ phases)            |
| Mongoose Models | 350+ schemas                               |
| Services        | 400+ business logic services               |
| Frontend Pages  | 90+ React pages                            |
| Tests           | 9,409 passing (Jest + Cypress)             |
| Branches        | 12 + HQ Riyadh                             |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│   Browser (React SPA)    │    Mobile (React Native)             │
└──────────────┬───────────┴──────────────────────────────────────┘
               │  HTTPS
┌──────────────▼───────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                            │
│   SSL Termination │ Static Files │ Load Balancing │ Rate Limit   │
└──────────────┬───────────────────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│  Express.js │  │  Express.js │  ← PM2 Cluster (2 processes/core)
│  API Server │  │  API Server │
└──────┬──────┘  └──────┬──────┘
       └────────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼────────┐
│MongoDB│  │ Redis │  │  Socket.IO  │
│Primary│  │Cache  │  │  Real-time  │
└───────┘  └───────┘  └────────────┘
```

### Traffic Flow

```
Request → Nginx → Rate Limiter → Auth Middleware (JWT) → RBAC Check
       → Controller → Service Layer → Repository/Model → MongoDB
       → Response ← Controller ← Service
```

---

## 3. Backend Architecture

### Directory Structure

```
backend/
├── api/routes/              # Core API routes (auth, users, modules, CRM)
├── archive/                 # Electronic archive system
├── auth/                    # Authentication utilities
├── communication/           # WhatsApp, admin communications
├── config/
│   ├── cache.config.js      # Redis client factory (DISABLE_REDIS guard)
│   ├── cache.advanced.js    # Advanced cache with circuit breaker
│   ├── database.js          # MongoDB connection + slow query monitoring
│   └── redis.config.js      # Redis connection manager
├── controllers/             # HTTP request handlers (thin — delegate to services)
│   └── rehabilitationPlan.controller.js
├── middleware/
│   ├── auth.js              # JWT verification → authenticateToken
│   ├── rbac.js              # Role-based + permission-based access control
│   ├── errorHandler.js      # Global error handler
│   ├── rateLimiter.js       # Express-rate-limit (tiered)
│   └── validation.js        # Joi schema validation middleware
├── models/                  # Mongoose schemas (350+)
│   ├── RehabilitationPlan.js
│   ├── Branch.js
│   ├── Camera.js
│   ├── advanced.models.js   # Finance, analytics, reporting models
│   ├── comprehensive.models.js
│   └── Zakat.model.js
├── rehabilitation-services/ # Rehabilitation business logic (8 services)
│   ├── individualized-rehabilitation-plan-service.js
│   ├── ai-assessment-service.js
│   ├── alerts-notifications-service.js
│   ├── rehabilitation-reports-service.js
│   ├── tele-rehabilitation-service.js
│   ├── therapist-dashboard-service.js
│   ├── quality-assurance-service.js
│   └── smart-scheduling-service.js
├── routes/
│   ├── _registry.js         # Central route mounting (ALL routes registered here)
│   ├── rehabilitationPlan.routes.js
│   └── branch.routes.js     # Branch management (12 branches + HQ)
├── services/                # General business logic services
├── utils/
│   ├── logger.js            # Winston logger (structured JSON)
│   ├── safeError.js         # Safe error serialization
│   └── apiResponse.js       # Standardized API response helpers
└── app.js                   # Express app factory
```

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Routes (_registry.js)       │  ← URL mapping only
├─────────────────────────────────────┤
│           Controllers               │  ← Request/response handling + validation
├─────────────────────────────────────┤
│            Services                 │  ← Business logic + orchestration
├─────────────────────────────────────┤
│        Models (Mongoose)            │  ← Data access + schema validation
├─────────────────────────────────────┤
│         MongoDB Atlas               │  ← Persistent storage
└─────────────────────────────────────┘
```

### Route Registry Pattern

All 200+ routes are registered in a single file `routes/_registry.js` using two helpers:

```javascript
// دوال التحميل
dualMount(app, 'path', handler)   // Mounts on /api/path AND /api/v1/path
safeMount(app, paths, modulePath) // Graceful — logs error instead of crashing
```

This ensures:
- Zero crashes on missing route modules (safeMount)
- Automatic `/api/v1/` versioning
- Centralized route health tracking (`routeHealth.summary`)

---

## 4. Frontend Architecture

### Directory Structure

```
frontend/src/
├── components/
│   ├── common/              # Shared: ErrorBoundary, LoadingSpinner, etc.
│   ├── layout/              # App shell: Sidebar, Header, Footer
│   └── [feature]/           # Feature-specific components
├── pages/
│   ├── RehabDashboard.jsx   # Rehabilitation plans dashboard (+ ErrorBoundary)
│   ├── Sessions/
│   │   └── index.jsx        # Therapy sessions (+ ErrorBoundary)
│   └── SpecializedRehab/    # 6 specialized rehabilitation pages
├── routes/
│   └── RehabRoutes.jsx      # Lazy-loaded rehab module routes
├── services/                # API client layer (axios/fetch wrappers)
├── contexts/                # React contexts (Auth, Theme, Notifications)
└── utils/                   # Helpers (date formatting, validation, etc.)
```

### Key Patterns

#### Error Boundary Pattern (Every major page)
```jsx
class PageErrorBoundary extends Component {
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[Page]', error, info); }
  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

export default function Page() {
  return <PageErrorBoundary><PageInner /></PageErrorBoundary>;
}
```

#### Lazy Loading Pattern
```jsx
const RehabDashboard = lazyWithRetry(() => import('./pages/RehabDashboard'));
```

#### API Service Pattern
```javascript
const apiCall = async (path, options = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error((await res.json()).message || res.statusText);
  return res.json();
};
```

---

## 5. Database Design

### Core Models Hierarchy

```
Organization
└── Branch (12 + HQ)
    ├── Staff (Users — RBAC roles)
    ├── Beneficiaries (patients/students)
    │   ├── RehabilitationPlan (WHO-ICF standards)
    │   │   ├── SmartGoal (SMART framework)
    │   │   ├── PlanService
    │   │   │   └── SessionRecord
    │   │   ├── AIAssessment (v6.0 ML)
    │   │   ├── TeleSession (Zoom/Teams)
    │   │   └── PlanReview (midpoint/final)
    │   └── IndividualizedEducationPlan (IEP)
    ├── Finance (invoices, payments, budgets)
    └── HR (attendance, payroll, leave)
```

### Index Strategy

```javascript
// RehabilitationPlan — compound indexes for common query patterns
RehabilitationPlanSchema.index({ beneficiary: 1, status: 1 });      // Patient's active plans
RehabilitationPlanSchema.index({ primaryTherapist: 1, status: 1 }); // Therapist's workload
RehabilitationPlanSchema.index({ branch: 1, status: 1 });           // Branch reports
RehabilitationPlanSchema.index({ startDate: 1, endDate: 1 });       // Date range queries
RehabilitationPlanSchema.index({ planCode: 1 }, { unique: true, sparse: true });
```

### Schema Validation Rules

All enum fields **must** have `type: String` explicitly:
```javascript
// ✅ Correct
status: { type: String, enum: ['active', 'inactive'], default: 'active' }

// ❌ Wrong (Mongoose ignores enum without type)
status: { enum: ['active', 'inactive'], default: 'active' }
```

`timestamps: true` goes in **schema options**, not inside the schema body:
```javascript
// ✅ Correct
new Schema({ ... }, { timestamps: true })

// ❌ Wrong (treated as a regular field)
new Schema({ timestamps: true, ... })
```

---

## 6. Security Architecture

### Authentication Flow

```
Client → POST /api/auth/login
       → validateCredentials()
       → bcrypt.compare(password, hash)
       → jwt.sign({ id, role, branchId }, JWT_SECRET, { expiresIn: '8h' })
       → { token, refreshToken, user }

Subsequent requests:
Client → Authorization: Bearer <token>
       → authenticateToken middleware
       → jwt.verify(token, JWT_SECRET)
       → req.user = { id, role, branchId, permissions }
       → next()
```

### RBAC Matrix (Branch System)

| Role              | Scope           | Key Permissions                               |
|-------------------|-----------------|-----------------------------------------------|
| hq_super_admin    | All branches    | Full CRUD, override, emergency controls       |
| hq_admin          | All branches    | Read-write, no override                       |
| branch_manager    | Own branch      | Full branch CRUD, staff management            |
| therapist         | Own patients    | Clinical data, plans, sessions                |
| receptionist      | Own branch      | Scheduling, basic beneficiary data            |
| driver            | Assigned routes | Transport schedule, check-in/out              |

### Security Middleware Stack

```javascript
app.use(helmet())              // Security headers (CSP, HSTS, etc.)
app.use(mongoSanitize())       // NoSQL injection prevention
app.use(xssFilter())           // XSS prevention
app.use(csrf())                // CSRF protection
app.use(rateLimiter)           // Global rate limiting
app.use(authRoutes, authRateLimiter)  // Auth-specific rate limit
```

---

## 7. Rehabilitation System Module

### Module Overview

```
/api/rehab-plans (rehabilitationPlan.routes.js)
├── GET    /templates                              # Available plan templates
├── GET    /goal-bank?domain=motorSkills           # Goal bank by domain
├── GET    /dashboard/:therapistId                 # Therapist AI dashboard
├── POST   /                                       # Create new plan
├── GET    /beneficiary/:id                        # Get all plans for beneficiary
├── POST   /beneficiary/:id/ai-assessment          # Run AI assessment
├── POST   /beneficiary/:id/predict                # Predict outcomes
├── GET    /:planId                                # Get single plan
├── POST   /:planId/review                         # Submit plan review
├── GET    /:planId/report                         # Generate progress report
├── GET    /:planId/quality                        # Quality metrics
├── POST   /:planId/tele-session                   # Schedule tele-session
├── POST   /:planId/goals                          # Add SMART goal
├── PUT    /:planId/goals/:goalId/progress         # Update goal progress
├── POST   /:planId/services                       # Add service to plan
└── POST   /:planId/services/:serviceId/sessions   # Record therapy session
```

### AI Assessment Pipeline (v6.0)

```
Beneficiary Data → AI Assessment Service
                 → Risk Scoring (0-100)
                 → Outcome Prediction (0-100%)
                 → Recommendations Generation
                 → Alert if risk > threshold
                 → Update latestRiskLevel + latestPredictedOutcome
```

### Field Normalization (Frontend ↔ Service)

| Frontend Field      | Service Field       | Notes                          |
|---------------------|---------------------|--------------------------------|
| `beneficiary`       | `beneficiaryId`     | May be name or ObjectId        |
| `primaryDiagnosis`  | `disabilityType`    | Clinical diagnosis text        |
| `disabilityCategory`| `disabilityType`    | Fallback if no primaryDiagnosis|
| `templateUsed`      | `templateType`      | Plan template identifier       |
| `goalText`          | `description`       | SMART goal text                |

---

## 8. Branch Management System

### Branch Codes

| Code | Branch Name            | Region   |
|------|------------------------|----------|
| HQ   | المقر الرئيسي - الرياض  | Riyadh   |
| RYD1 | فرع الرياض 1 - العليا   | Riyadh   |
| JED1 | فرع جدة 1 - الروضة     | Jeddah   |
| DMM1 | فرع الدمام 1           | Dammam   |
| MKH1 | فرع مكة المكرمة 1      | Makkah   |
| MED1 | فرع المدينة 1          | Madinah  |
| ... | (12 branches total)    | ...      |

### Key Endpoints

```
GET  /api/branch-management/hq/dashboard           # HQ overview
GET  /api/branch-management/hq/cross-branch        # Cross-branch comparison
GET  /api/branch-management/:code/dashboard        # Branch dashboard
GET  /api/branch-management/:code/patients         # Branch patients
GET  /api/branch-management/:code/staff            # Branch staff
POST /api/branch-management/hq/emergency-override  # HQ emergency control
```

---

## 9. API Design Principles

### Response Format (Standardized)

```javascript
// Success
{
  success: true,
  message: "رسالة نجاح",
  data: { ... },
  timestamp: "2026-03-29T18:00:00.000Z"
}

// Error
{
  success: false,
  message: "رسالة الخطأ بالعربية",
  error: "Technical error details",
  timestamp: "2026-03-29T18:00:00.000Z"
}
```

### HTTP Status Codes

| Status | Usage                                            |
|--------|--------------------------------------------------|
| 200    | Successful GET / PUT / PATCH                     |
| 201    | Successful POST (resource created)               |
| 400    | Validation error (missing/invalid fields)        |
| 401    | Missing or invalid JWT token                     |
| 403    | Valid token but insufficient permissions          |
| 404    | Resource not found                               |
| 503    | Dependent service unavailable (graceful fallback)|

### Dual Versioning

All endpoints are available at:
- `/api/{resource}` — production path
- `/api/v1/{resource}` — versioned path (identical handler)

---

## 10. Key Design Decisions

### 1. Monorepo Structure
**Decision**: Keep all modules in one repository.
**Rationale**: Easier cross-module development, single CI pipeline, consistent tooling.
**Trade-off**: Large repo size, longer clone times.

### 2. safeMount for Route Loading
**Decision**: Use `safeMount` for optional/experimental routes.
**Rationale**: One broken route module should never crash the entire server.
**Implementation**: Catches require() errors, logs to routeHealth, continues loading.

### 3. Graceful Redis Degradation
**Decision**: `DISABLE_REDIS=true` completely skips Redis initialization.
**Rationale**: Development environments without Redis should work without NOAUTH spam.
**Implementation**: Guard check at the top of `createRedisClient()`, `initializeRedis()`, `connectRedis()`.

### 4. Field Normalization in Controllers
**Decision**: Normalize field names in controllers, not in the service layer.
**Rationale**: Services maintain their internal API contract; controllers adapt the HTTP interface.
**Implementation**: `normalizedBody` object created before passing to service.

### 5. Error Boundaries on Every Major Page
**Decision**: Wrap every major React page in a class-based Error Boundary.
**Rationale**: A rendering error in one page should not crash the entire SPA.
**Pattern**: Inner functional component + outer class boundary exporting the wrapped component.
