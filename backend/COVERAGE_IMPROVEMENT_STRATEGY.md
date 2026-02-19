# Test Coverage Improvement Strategy

## Current Coverage Status (February 10, 2026)

| Metric     | Current | Target | Gap     |
| ---------- | ------- | ------ | ------- |
| Lines      | 39.09%  | 50%+   | +10.91% |
| Statements | 38.14%  | 50%+   | +11.86% |
| Functions  | 23.48%  | 50%+   | +26.52% |
| Branches   | 27.17%  | 50%+   | +22.83% |

**Current State**: Project has solid basic coverage with 352+ unit tests
passing. Many modules are covered 50-100%, while specific routes and models need
attention.

---

## Priority Areas for Coverage Improvement

### 🔴 Critical (0% Coverage) - Immediate Action

These files have zero test coverage and should be addressed first:

#### 1. **Models with 0% Coverage**

| File                               | Lines | Impact             | Priority |
| ---------------------------------- | ----- | ------------------ | -------- |
| `models/Product.js`                | 7     | Product management | HIGH     |
| `models/Trip.js`                   | 30    | Transportation     | HIGH     |
| `models/Transport.models.js`       | 22    | Transport ops      | HIGH     |
| `models/Vehicle_SaudiCompliant.js` | 67    | Vehicle mgmt       | MEDIUM   |

#### 2. **Route Files with 0% Coverage**

| File                        | Functions | Impact         | Priority |
| --------------------------- | --------- | -------------- | -------- |
| `routes/vehicleRoutes.js`   | 15        | Vehicle CRUD   | HIGH     |
| `routes/driverRoutes.js`    | 18        | Driver mgmt    | HIGH     |
| `routes/archivingRoutes.js` | 17        | Data archiving | MEDIUM   |

#### 3. **API Routes with 0% Function Coverage**

| File                             | Functions         | Impact         | Priority |
| -------------------------------- | ----------------- | -------------- | -------- |
| `api/routes/crm.routes.js`       | 48 (10.92% lines) | CRM operations | HIGH     |
| `api/routes/documents.routes.js` | 47 (13.17% lines) | Document mgmt  | HIGH     |
| `api/routes/modules.routes.js`   | 3 (32% lines)     | Module config  | MEDIUM   |

---

### 🟡 Important (1-30% Coverage) - Second Wave

#### Routes Needing Significant Improvement

| File                             | Current | Functions | Estimated Gap | Effort |
| -------------------------------- | ------- | --------- | ------------- | ------ |
| `routes/transport.routes.js`     | 23.5%   | 5.4%      | 25%           | HIGH   |
| `routes/messaging.routes.js`     | 21.49%  | 9.09%     | 20%           | HIGH   |
| `routes/notifications.routes.js` | 24.41%  | 9.52%     | 25%           | MEDIUM |
| `routes/hr-advanced.routes.js`   | 29.41%  | 0%        | 30%           | MEDIUM |
| `routes/hrops.routes.js`         | 30.86%  | 14.28%    | 20%           | MEDIUM |
| `routes/finance.routes.js`       | 25.26%  | 7.14%     | 25%           | HIGH   |

#### Models Needing Improvement

| File                            | Current Lines | Functions | Estimated Gap |
| ------------------------------- | ------------- | --------- | ------------- |
| `models/AI.memory.js`           | 4%            | 0%        | 45%           |
| `models/Notification.memory.js` | 19.29%        | 13.04%    | 30%           |
| `models/Finance.memory.js`      | 17.58%        | 10.52%    | 32%           |

---

### 🟢 Good (31-60% Coverage) - Third Wave

These can be improved relatively easily to reach 50%+:

| File                               | Current | Target | Effort |
| ---------------------------------- | ------- | ------ | ------ |
| `middleware/auth.middleware.js`    | 15.38%  | 50%    | MEDIUM |
| `api/routes/integration.routes.js` | 46.96%  | 50%    | LOW    |
| `api/routes/project.routes.js`     | 51.72%  | 65%    | LOW    |
| `api/routes/reporting.routes.js`   | 41.3%   | 60%    | MEDIUM |
| `routes/predictions.routes.js`     | 24%     | 50%    | MEDIUM |
| `routes/performanceRoutes.js`      | 24.48%  | 50%    | MEDIUM |

---

## Coverage Improvement Plan (Phased Approach)

### Phase 1: Quick Wins (2-3 hours)

These files are close to 50% and need minimal tests:

```bash
# Target: +10% overall coverage improvement
# Files: 6-8 files needing 3-5 tests each

1. api/routes/integration.routes.js (46.96% → 60%)
   - Add 3 integration endpoint tests
   - Test error handling
   - Test edge cases

2. api/routes/project.routes.js (51.72% → 65%)
   - Add project CRUD tests
   - Test permission checks
   - Test validation

3. routes/ai.routes.js (54.02% → 70%)
   - Add AI endpoint tests
   - Test response formats
   - Test error paths

4. routes/complianceRoutes.js (79.28% → 90%)
   - Add 2-3 missing scenarios
   - Test error conditions
```

### Phase 2: Medium Effort (4-6 hours)

Focus on routes with 20-40% coverage:

```bash
# Target: +15% overall coverage improvement

1. routes/messaging.routes.js (21.49% → 50%)
   - Create 10+ test cases for messaging endpoints
   - Test message creation, retrieval, deletion
   - Test thread operations

2. api/routes/reporting.routes.js (41.3% → 60%)
   - Add report generation tests
   - Test filtering and sorting
   - Test export functionality

3. routes/finance.routes.js (25.26% → 50%)
   - Add financial transaction tests
   - Test budget operations
   - Test reconciliation

4. routes/notifications.routes.js (24.41% → 50%)
   - Add notification CRUD tests
   - Test notification templates
   - Test delivery systems
```

### Phase 3: High Impact (6-8 hours)

Address critical 0% coverage files:

```bash
# Target: +20% overall coverage improvement

1. api/routes/crm.routes.js (10.92% → 60%)
   - Create comprehensive CRM test suite (15+ tests)
   - Test customer operations
   - Test opportunity management
   - Test ticket system

2. api/routes/documents.routes.js (13.17% → 60%)
   - Create document management tests (12+ tests)
   - Test file upload/download
   - Test document versioning
   - Test access control

3. routes/vehicleRoutes.js (0% → 50%)
   - Create vehicle CRUD tests (10+ tests)
   - Test vehicle tracking
   - Test maintenance schedules
   - Test Saudi compliance

4. routes/driverRoutes.js (0% → 50%)
   - Create driver management tests (10+ tests)
   - Test driver profiles
   - Test licensing and certifications
   - Test performance metrics
```

### Phase 4: Advanced Coverage (8+ hours)

Complete coverage for complex modules:

```bash
# Target: +20% overall coverage improvement

1. models/ directory (average 20% → 50%)
   - Enhanced in-memory model tests
   - API integration tests
   - Edge case validation

2. middleware/ directory (average 35% → 70%)
   - Authentication flow tests
   - Validation middleware tests
   - Error handling tests

3. routes with complex logic
   - Transport operations
   - HR advanced features
   - Performance analysis
```

---

## Testing Strategy for Coverage Improvement

### 1. Unit Tests (Fastest Path)

Create focused unit tests for individual functions:

```javascript
// Example: Test a simple validator
describe('Validators', () => {
  it('should validate email format', () => {
    expect(validators.isValidEmail('test@example.com')).toBe(true);
    expect(validators.isValidEmail('invalid')).toBe(false);
  });

  it('should validate phone numbers', () => {
    expect(validators.isValidPhone('+966501234567')).toBe(true);
    expect(validators.isValidPhone('123')).toBe(false);
  });
});
```

### 2. Integration Tests (Higher Value)

Test API endpoints with database interactions:

```javascript
describe('CRM Routes - Coverage Improvement', () => {
  let authToken;

  beforeAll(async () => {
    const user = await User.create({
      email: 'crm@test.com',
      password: 'TestPassword123!',
      fullName: 'CRM Tester',
      role: 'admin',
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'crm@test.com', password: 'TestPassword123!' });
    authToken = res.body.token;
  });

  it('should create customer', async () => {
    const res = await request(app)
      .post('/api/crm/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '+966501234567',
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
  });
});
```

### 3. Error Path Testing (Often Forgotten)

Test error conditions to increase branch coverage:

```javascript
describe('Error Handling', () => {
  it('should handle missing required fields', async () => {
    const res = await request(app)
      .post('/api/endpoint')
      .send({}) // Missing required fields
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should handle unauthorized access', async () => {
    const res = await request(app)
      .get('/api/protected-endpoint')
      // No auth token
      .expect(401);
  });

  it('should handle database errors', async () => {
    // Mock database to throw error
    jest.spyOn(User, 'findById').mockRejectedValue(new Error('Database error'));

    const res = await request(app).get('/api/users/123').expect(500);
  });
});
```

---

## Coverage Metrics and Targets

### By Metric Type

#### Lines Coverage Path

```
Current:  39.09% (1822/4661)
Target:   50.00% (2330/4661)
Gap:      +508 lines
Effort:   ~50-60 tests × ~8 lines/test = 400 lines
Timeline: 4-6 hours
```

#### Function Coverage Path (Largest Gap)

```
Current:  23.48% (225/958)
Target:   50.00% (479/958)
Gap:      +254 functions
Effort:   ~1 test per function = 254 tests
Timeline: 8-12 hours (but many overlap with line tests)
```

#### Branch Coverage Path

```
Current:  27.17% (456/1678)
Target:   50.00% (839/1678)
Gap:      +383 branches
Effort:   Error paths + conditions = moderate
Timeline: 4-6 hours (overlaps with other tests)
```

---

## Quick Reference: Test Creation Template

### Basic Route Test Template

```javascript
const request = require('supertest');
const app = require('../server');
const Model = require('../models/Model');
const User = require('../models/User');

describe('Feature Route Tests', () => {
  let authToken;
  let testId;

  beforeAll(async () => {
    // Create and authenticate user
    const user = await User.create({
      email: 'test@test.com',
      password: 'Test123!@#',
      fullName: 'Test User',
      role: 'admin',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Test123!@#' });

    authToken = res.body.token;
  });

  describe('GET Endpoints', () => {
    it('should retrieve all items', async () => {
      const res = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should retrieve single item', async () => {
      const res = await request(app)
        .get(`/api/items/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('_id');
    });
  });

  describe('POST Endpoints', () => {
    it('should create item', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Item',
          description: 'Test Description',
        })
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      testId = res.body._id;
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required fields
        .expect(400);
    });
  });

  describe('PUT Endpoints', () => {
    it('should update item', async () => {
      const res = await request(app)
        .put(`/api/items/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Item',
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Item');
    });
  });

  describe('DELETE Endpoints', () => {
    it('should delete item', async () => {
      const res = await request(app)
        .delete(`/api/items/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Model.deleteMany({});
  });
});
```

---

## Recommended Test Writing Order

1. **Week 1**: Focus on 0% coverage files (Quick impact)
   - vehicleRoutes.js
   - driverRoutes.js
   - Product.js, Trip.js models
   - Estimated gain: +8%

2. **Week 2**: Medium coverage files (20-40%)
   - Messaging routes
   - Finance routes
   - Notifications routes
   - Estimated gain: +12%

3. **Week 3**: Complex modules (CRM, Documents)
   - crm.routes.js
   - documents.routes.js
   - Advanced models
   - Estimated gain: +18%

4. **Week 4**: Edge cases and error paths
   - All error conditions
   - Validation failures
   - Database errors
   - Estimated gain: +10%

**Total Expected Gain**: ~48% → 60%+ coverage

---

## Automation and Continuous Improvement

### CI/CD Integration

```yaml
# .github/workflows/coverage.yml
name: Coverage Check
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test -- --coverage
      - name: Check coverage thresholds
        run: |
          # Fail if coverage drops
          npm test -- --coverage --collectCoverageFrom="**/*.js" \
            --coverageThreshold='{"global":{"lines":50,"functions":40,"branches":30}}'
```

### Coverage Trending

Track coverage over time:

```bash
# Generate weekly coverage reports
npm test -- --coverage --json > coverage-$(date +%Y-%m-%d).json

# Create trend report
node scripts/coverage-trends.js
```

---

## Tools and Resources

### Jest Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'api/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      lines: 50,
      functions: 40,
      branches: 30,
      statements: 50,
    },
  },
};
```

### Useful Jest Commands

```bash
# Check coverage for specific file
npm test -- coverage --testPathPattern="crm"

# Show untested lines
npm test -- coverage --verbose

# Watch for changes
npm test -- coverage --watch

# Generate HTML report
npm test -- coverage --coverageReporters=html
open coverage/index.html
```

---

## Success Metrics

| Target        | Current      | Timeline  | Confidence |
| ------------- | ------------ | --------- | ---------- |
| 50% lines     | 39.09% → 50% | 1-2 weeks | ✅ HIGH    |
| 40% functions | 23.48% → 40% | 2-3 weeks | ✅ HIGH    |
| 40% branches  | 27.17% → 40% | 2-3 weeks | ✅ MEDIUM  |
| 60% lines     | 39.09% → 60% | 4-6 weeks | ⏳ MEDIUM  |
| 50% functions | 23.48% → 50% | 6-8 weeks | ⏳ MEDIUM  |

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0  
**Responsible Person**: Development Team  
**Review Date**: February 24, 2026
