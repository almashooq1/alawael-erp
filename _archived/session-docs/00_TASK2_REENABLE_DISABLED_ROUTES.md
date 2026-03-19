# 🔌 Task 2: Re-enable Disabled Routes with RBAC Integration
**Status:** Ready for Implementation
**Duration:** 60-90 minutes
**Impact:** HIGH - Restores critical business functionality

---

## 📋 Routes Status Analysis

### Currently Disabled Routes (Located in backend/server.js)

**High Priority (Must Re-enable):**
1. ❌ `/api/hr` - HR routes (hrRoutes)
2. ❌ `/api/admin` - Admin routes (adminRoutes)
3. ❌ `/api/reports` - Reports (reportsRoutes)
4. ❌ `/api/workflow` - Workflow execution
5. ❌ `/api/dashboard` - Dashboard routes
6. ❌ `/api/search` - Search functionality
7. ❌ `/api/monitoring` - System monitoring
8. ❌ `/api/backup` - Backup & restore

**Medium Priority:**
9. ❌ `/api/email` - Email services
10. ❌ `/api/sms` - SMS notifications
11. ❌ `/api/2fa` - Two-factor authentication
12. ❌ `/api/user-profile` - User profiles
13. ❌ `/api/payments` - Payment routes
14. ❌ `/api/chatbot` - Chatbot routes

**Lower Priority (Advanced):**
15. ❌ `/api/ai` - AI routes
16. ❌ `/api/accounting` - Accounting system
17. ❌ `/api/vehicles` - Fleet management
18. ❌ `/api/rehabilitation` - Rehabilitation system

---

## 🎯 Implementation Plan

### Phase 1: Enable HR Routes (15 minutes)

**File:** `backend/server.js` (lines 516-519)

**Current (Disabled):**
```javascript
// app.use('/api/employees', hrRoutes); // TEMP: Disabled for testing
// app.use('/api/v1/employees', hrRoutes); // TEMP: Disabled for testing
```

**Action:** Already protected with RBAC ✅

**To Enable:**
```bash
# In backend/server.js, uncomment these lines:
app.use('/api/employees', hrRoutes);
app.use('/api/v1/employees', hrRoutes);

# Verify hr.routes.js has RBAC:
grep -n "createRBACMiddleware" backend/routes/hr.routes.js
```

**Permissions Required:**
- `hr:read` - View employee data
- `hr:create` - Add new employees
- `hr:update` - Modify employee info
- `hr:delete` - Remove employees
- `hr:checkin` - Clock in
- `hr:checkout` - Clock out
- `hr:leave_request` - Request leaves
- `hr:approve_leave` - Approve leaves
- `hr:payroll` - Manage payroll
- `hr:performance` - Add performance reviews

---

### Phase 2: Enable Admin Routes (20 minutes)

**File:** `backend/server.js` (lines 533-534)

**Current (Disabled):**
```javascript
// app.use('/api/admin', adminRoutes); // TEMP: Disabled for testing
```

**Status of admin.routes.js:**
- File exists: ✅
- Needs RBAC integration: ⏳

**Action Required:**
1. Check if admin.routes.js exists
2. Add RBAC middleware if missing
3. Protect sensitive endpoints

**Sample Implementation:**
```javascript
// At top of admin.routes.js
const { authenticateToken } = require('../middleware/auth');
let createRBACMiddleware;
try {
  const rbacModule = require('../rbac');
  createRBACMiddleware = rbacModule.createRBACMiddleware;
} catch (err) {
  createRBACMiddleware = permissions => (req, res, next) => next();
}

router.use(authenticateToken);

// Protect all admin operations
router.get('/', createRBACMiddleware(['admin:read']), ...);
router.post('/', createRBACMiddleware(['admin:create']), ...);
router.delete('/:id', createRBACMiddleware(['admin:delete']), ...);
```

**To Enable:**
```bash
# Uncomment in backend/server.js:
app.use('/api/admin', adminRoutes);

# Verify RBAC setup:
grep -n "createRBACMiddleware" backend/routes/admin.routes.js
```

---

### Phase 3: Enable Reports Routes (15 minutes)

**File:** `backend/server.js` (lines 527-528)

**Status:**
- File: `backend/routes/reports.routes.js` or `backend/api/routes/reporting.routes.js`
- RBAC: Need to verify

**Current (Disabled):**
```javascript
// app.use('/api/reports', reportsRoutes); // TEMP: Disabled for testing
```

**Action:**
1. Verify `reports.routes.js` has RBAC
2. Uncomment in server.js
3. Test report endpoints

**Endpoints to Expose:**
- GET `/api/reports` - List all reports
- GET `/api/reports/:id` - Get specific report
- POST `/api/reports` - Generate new report
- PUT `/api/reports/:id` - Update report
- DELETE `/api/reports/:id` - Delete report

---

### Phase 4: Enable Analytics Routes (10 minutes)

**File:** `backend/server.js` (line 596)

**Status:**
- RBAC: ✅ Already added (just completed)
- File: `backend/routes/analytics.routes.js`

**Already Protected with RBAC:**
- `analytics:read` - View metrics
- `analytics:update` - Change metric values

**Action:**
```bash
# Uncomment in backend/server.js:
app.use('/api/analytics', analyticsRoutes);

# Verify it's mounted:
grep -n "app.use('/api/analytics" backend/server.js
```

---

### Phase 5: Enable Dashboard Routes (15 minutes)

**File:** `backend/server.js` (line 536)

**Status:**
- File: `backend/routes/dashboard*`
- RBAC: Need to add

**Current (Disabled):**
```javascript
// app.use('/api/dashboard', dashboardRoutes); // TEMP: Disabled for testing
```

**Action:**
1. Find dashboard routes file
2. Add RBAC middleware
3. Uncomment in server.js

**Common Dashboard Endpoints:**
```javascript
GET /api/dashboard/summary - Dashboard summary
GET /api/dashboard/widgets - Available widgets
GET /api/dashboard/custom - User custom dashboard
POST /api/dashboard/custom - Save custom dashboard
```

---

## 🛠️ Implementation Steps

### Step 1: Backup server.js
```bash
cp backend/server.js backend/server.js.backup
```

### Step 2: Check Which Routes Have RBAC
```bash
# Routes already with RBAC:
grep -l "createRBACMiddleware" backend/routes/*.js
grep -l "createRBACMiddleware" backend/api/routes/*.js
```

**Expected Output (Already Done):**
- ✅ backend/api/routes/users.routes.js
- ✅ backend/api/routes/modules.routes.js
- ✅ backend/routes/finance.routes.unified.js
- ✅ backend/routes/hr.routes.js
- ✅ backend/routes/notifications.routes.js
- ✅ backend/routes/analytics.routes.js
- ✅ backend/api/routes/documents.routes.js
- ✅ backend/routes/inventory.routes.js
- ✅ backend/routes/ecommerce.routes.js

### Step 3: Add RBAC to Remaining Routes
**Routes needing RBAC:**
- admin.routes.js (if exists)
- dashboard.routes.js (if exists)
- workflow.routes.js (if exists)
- search.routes.js (if exists)

### Step 4: Uncomment in server.js

**Search for disabled route:**
```bash
grep "// app.use" backend/server.js | head -20
```

**Uncomment pattern:**
```javascript
// BEFORE:
// app.use('/api/hr', hrAdvancedRoutes); // TEMP: Disabled for testing

// AFTER:
app.use('/api/hr', hrAdvancedRoutes); // HR Management - RBAC Protected
```

### Step 5: Verify Routes Load Without Errors
```bash
cd backend
npm start 2>&1 | grep -E "(ERROR|route mounted|✅)"
```

**Expected:**
```
✅ HR Routes mounted
✅ Admin Routes mounted
✅ Reports Routes mounted
✅ Analytics Routes mounted
✅ Dashboard Routes mounted
```

### Step 6: Test Each Endpoint
```bash
# Test with authentication token:
TOKEN="your-jwt-token"

# Test HR endpoint
curl -X GET http://localhost:3001/api/employees \
  -H "Authorization: Bearer $TOKEN"

# Test Admin endpoint
curl -X GET http://localhost:3001/api/admin \
  -H "Authorization: Bearer $TOKEN"

# Test Reports endpoint
curl -X GET http://localhost:3001/api/reports \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Re-enablement Checklist

| Route | File | RBAC Status | To Enable | Test |
|-------|------|-----------|-----------|------|
| /api/employees | hr.routes.js | ✅ Done | Uncomment | ⏳ Pending |
| /api/admin | admin.routes.js | ⏳ Pending | Add RBAC + Uncomment | ⏳ Pending |
| /api/reports | reports.routes.js | ⏳ Pending | Add RBAC + Uncomment | ⏳ Pending |
| /api/analytics | analytics.routes.js | ✅ Done | Uncomment | ⏳ Pending |
| /api/dashboard | dashboard.routes.js | ⏳ Pending | Add RBAC + Uncomment | ⏳ Pending |
| /api/search | search.routes.js | ⏳ Pending | Add RBAC + Uncomment | ⏳ Pending |
| /api/workflow | workflow.routes.js | ⏳ Pending | Add RBAC + Uncomment | ⏳ Pending |
| /api/monitoring | monitoring.routes.js | ⏳ Pending | Add RBAC + Uncomment | ⏳ Pending |

---

## ⚠️ Important Notes

1. **Authentication Required:** All re-enabled routes require valid JWT token
2. **RBAC Validation:** Routes protected with createRBACMiddleware validate permissions
3. **Error Handling:** Missing middleware will cause 500 errors - ensure RBAC module loaded
4. **Testing:** Test with different user roles to verify permission enforcement

---

## 🧪 Testing Re-enabled Routes

### Minimal Test Suite
```bash
#!/bin/bash
TOKEN="your-auth-token"
BASE_URL="http://localhost:3001"

# Test each re-enabled route
echo "Testing re-enabled routes..."

curl -s -X GET $BASE_URL/api/employees \
  -H "Authorization: Bearer $TOKEN" | jq '.success'

curl -s -X GET $BASE_URL/api/admin \
  -H "Authorization: Bearer $TOKEN" | jq '.success'

curl -s -X GET $BASE_URL/api/reports \
  -H "Authorization: Bearer $TOKEN" | jq '.success'

curl -s -X GET $BASE_URL/api/analytics \
  -H "Authorization: Bearer $TOKEN" | jq '.success'

echo "All tests completed!"
```

---

## 📈 Expected Outcomes

After completion:
- ✅ 8-12 previously disabled routes are now active
- ✅ All routes protected with RBAC middleware
- ✅ Proper error handling for permission denials
- ✅ Full backend functionality restored
- ✅ System ready for integration testing

---

**Next Step:** After enabling routes, proceed with Task 5: Execute Integration Tests

---
