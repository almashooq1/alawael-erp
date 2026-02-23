# 🚀 Phase 2 Implementation Plan - API Route Development

**Priority:** HIGH  
**Timeline:** 4-6 hours  
**Status:** Ready to Start

---

## Overview

Phase 2 focuses on implementing the 30+ missing API endpoints that are currently returning 404 or causing test failures. This is a systematic implementation that will gradually bring the system from 34.71% coverage to 60%+ coverage.

---

## Missing Endpoints By Category

### 1. Disability Rehabilitation Module (11 endpoints) 🏥
**Base Path:** `/api/v1/disability-rehabilitation`

#### Programs Management (4 endpoints)
```
POST   /api/v1/disability-rehabilitation/programs
GET    /api/v1/disability-rehabilitation/programs
GET    /api/v1/disability-rehabilitation/programs/:programId
PUT    /api/v1/disability-rehabilitation/programs/:programId
DELETE /api/v1/disability-rehabilitation/programs/:programId
```

#### Sessions Management (3 endpoints)
```
POST   /api/v1/disability-rehabilitation/sessions
GET    /api/v1/disability-rehabilitation/sessions
GET    /api/v1/disability-rehabilitation/sessions/:sessionId
PUT    /api/v1/disability-rehabilitation/sessions/:sessionId
```

#### Goals & Assessment (4 endpoints)
```
POST   /api/v1/disability-rehabilitation/goals
GET    /api/v1/disability-rehabilitation/goals/:goalId
POST   /api/v1/disability-rehabilitation/assessments
GET    /api/v1/disability-rehabilitation/assessments/:assessmentId
```

#### Performance Tracking (Optional)
```
GET    /api/v1/disability-rehabilitation/performance/:beneficiaryId
```

### 2. Maintenance Module (3+ endpoints) 🔧
**Base Path:** `/api/v1/maintenance`

#### Currently Failing
```
GET    /api/v1/maintenance/schedules       (404)
POST   /api/v1/maintenance/schedules       (404)
GET    /api/v1/maintenance/predict/:vehicleId (404)
```

#### Additional Required
```
PUT    /api/v1/maintenance/schedules/:scheduleId
DELETE /api/v1/maintenance/schedules/:scheduleId
POST   /api/v1/maintenance/records
GET    /api/v1/maintenance/records/:recordId
```

### 3. Webhooks Module (4 endpoints) 📡
**Base Path:** `/api/webhooks`

#### Currently Failing
```
POST   /api/webhooks/register              (404)
POST   /api/webhooks/:webhookId/trigger    (404)
DELETE /api/webhooks/:webhookId            (404)
```

#### Additional
```
GET    /api/webhooks
GET    /api/webhooks/:webhookId
PUT    /api/webhooks/:webhookId
POST   /api/webhooks/:webhookId/test
```

### 4. Additional Integration Endpoints (12+ endpoints)

#### Coming from partial implementations that need completion:
- Asset Management (missing full CRUD)
- Schedule Management (missing deletion)
- Performance Analytics (missing aggregations)
- Report Exports (missing batch operations)
- Integration Management (missing secret management)

---

## Implementation Strategy

### Step 1: Create Route Files (30 minutes)
```
1. routes/disability-rehabilitation.js        (11 endpoints)
2. routes/maintenance.js                      (8 endpoints)
3. routes/webhooks.js                         (5 endpoints)
4. routes/integrations-advanced.js            (6 endpoints)
```

### Step 2: Create Service Layer (1-2 hours)
```
1. services/disabilityRehabilitationService.js
2. services/maintenanceService.js
3. services/webhookService.js
4. services/integrationAdvancedService.js
```

### Step 3: Create MongoDB Models (30 minutes)
```
1. models/disability/Program.model.js
2. models/disability/Session.model.js
3. models/disability/Goal.model.js
4. models/disability/Assessment.model.js
5. models/Maintenance.model.js
6. models/Webhook.model.js
```

### Step 4: Wire Up Routes in app.js (15 minutes)
```javascript
app.use('/api/v1/disability-rehabilitation', disabilityRehabilitationRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/integrations', integrationsAdvancedRoutes);
```

### Step 5: Add Service Initialization (15 minutes)
```javascript
// server.js startup sequence
const disabilityService = new DisabilityRehabilitationService();
const maintenanceService = new MaintenanceService();
const webhookService = new WebhookService();
```

### Step 6: Run Tests & Validate (30 minutes)
```bash
npm test
# Verify new endpoints returning 200/201 instead of 404
```

---

## File Structure to Create

```
backend/
├── routes/
│   ├── disability-rehabilitation.js      (NEW)
│   ├── maintenance.js                    (NEW)
│   ├── webhooks.js                       (NEW)
│   └── integrations-advanced.js          (NEW)
│
├── services/
│   ├── disabilityRehabilitationService.js (NEW)
│   ├── maintenanceService.js             (NEW)
│   ├── webhookService.js                 (NEW)
│   └── integrationAdvancedService.js     (NEW)
│
└── models/
    ├── disability/
    │   ├── Program.model.js              (NEW)
    │   ├── Session.model.js              (NEW)
    │   ├── Goal.model.js                 (NEW)
    │   └── Assessment.model.js           (NEW)
    ├── Maintenance.model.js              (NEW)
    └── Webhook.model.js                  (NEW)
```

---

## Expected Test Results After Phase 2

**Current State:**
- Total Errors: 134
- Missing Routes: 30+ (404 errors)
- Coverage: 34.71%

**Target State:**
- Total Errors: ~50-60 (only runtime/DB integration issues)
- Missing Routes: 0 (all skeleton implemented)
- Coverage: 55-60%
- Test Pass Rate: 95%+ (up from current, minus DB integration tests)

---

## Quick Start Commands

### Phase 2 Execution (When Ready)
```bash
# 1. Create all route files
npm run create:routes

# 2. Create all service files
npm run create:services

# 3. Create all model files
npm run create:models

# 4. Register routes in app.js
npm run wire:routes

# 5. Run complete test suite
npm test
```

### Manual Kickoff
```bash
# Start from backend root directory
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend

# Run in watch mode (recommended for development)
npm test:phase2:watch

# Or full suite
npm test
```

---

## Risk Assessment

### Low Risk Items ✅
- Route skeleton implementation (standard patterns)
- Model definitions (use existing patterns from User, Budget, etc.)
- Service layer basics (follow established patterns)

### Medium Risk Items ⚠️
- Database integration (ensure proper Mongoose usage)
- Validation rules (ensure consistency with existing validations)
- Error handling (must follow security patterns)

### Mitigation Strategy
- Use existing routes as templates (copy & modify pattern)
- Follow established error handling (try-catch + logger)
- Validate against test fixtures first (before real DB)

---

## Success Criteria

**Phase 2 Complete When:**
1. ✅ All 30+ endpoint files created
2. ✅ All services instantiated and tested
3. ✅ All routes registered in app.js
4. ✅ `npm test` shows 400+ tests passing
5. ✅ No more 404 errors in test output
6. ✅ Code coverage increases to 55%+
7. ✅ All 11 test suites passing

---

## Reference Implementation

Use these existing well-implemented routes as templates:

1. **messaging.routes.js** - Good error handling + validation pattern
2. **finance.routes.js** - Good service injection pattern
3. **notifications.routes.js** - Good middleware usage pattern
4. **users.routes.js** - Good CRUD implementation pattern

---

## Next Action

✅ Phase 1 Complete  
⏳ Phase 2: Awaiting approval to proceed with route creation

**Estimated Duration:** 4-6 hours  
**Maximum Impact:** 30+ new endpoints, +20% coverage

---

*Document generated after successful Phase 1 completion*  
*Date: February 23, 2026*

