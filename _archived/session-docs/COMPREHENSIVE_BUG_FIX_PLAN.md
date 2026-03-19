# 🔧 Comprehensive Bug Fix Plan - ERP System

## 📊 Summary of Issues Found

| Issue | Count | Severity | Status |
|-------|-------|----------|--------|
| Duplicate Mongoose Indexes | 10 files | 🔴 High | ⏳ Ready to Fix |
| MongoDB Timeout | 1 file | 🔴 High | ✅ FIXED |
| Reserved Keywords | Multiple | 🟠 Medium | ⏳ Ready to Fix |
| Missing Dependencies | 1 | 🟢 Low | ℹ️ Optional |

---

## ✅ Completed Fixes

### 1. MongoDB Connection Timeout ✓
**File**: `config/database.js`
**Changes**:
- ✅ Increased `serverSelectionTimeoutMS` from 5000ms to 16000ms (development)
- ✅ Added `socketTimeoutMS: 45000` for connection stability
- ✅ Added `connectTimeoutMS: 10000` for initial handshake
- ✅ Added connection pooling: `maxPoolSize: 10`, `minPoolSize: 5`
- ✅ Applied to all environments: development, production, test

**Impact**: Eliminates buffering timeouts on scheduled notifications job

---

## ⏳ Remaining Issues to Fix

### 2. Duplicate Mongoose Indexes (10 Files)

#### Files Requiring Fixes:

1. **advanced_attendance.model.js** (6 duplicate fields)
   ```
   Fields: employeeId, date, attendanceStatus, checkInTime, checkOutTime, isDeleted
   ```

2. **attendance_rules.model.js** (3 duplicate fields)
   ```
   Fields: ruleName, isActive, isDeleted
   ```

3. **LicenseAlert.js** (4 duplicate fields)
   ```
   Fields: licenseId, licenseNumber, type, priority
   ```

4. **LicenseAuditLog.js** (4 duplicate fields)
   ```
   Fields: licenseId, licenseNumber, action, user.userId
   ```

5. **LicenseEnhanced.js** (3 duplicate fields)
   ```
   Fields: licenseNumber, licenseType, status
   ```

6. **mfa.models.js** (3+ duplicate fields)
   ```
   Fields: userId, sessionId, otherFields
   ```

7. **KnowledgeBase.js** (4 duplicate fields)
   ```
   Fields: createdAt, title, category, status
   ```

8. **ELearning.js** (4 duplicate fields)
   ```
   Fields: title, category, tags, course
   ```

9. **Notification.js** (3 duplicate fields)
   ```
   Fields: userId, isRead, expiresAt
   ```

10. **Leave.js** (1 duplicate field)
    ```
    Fields: status
    ```

#### Fix Pattern:

**Remove**: `index: true` from field definition
**Keep**: `schema.index()` call for the same field

```javascript
// ❌ BEFORE (Wrong)
const schema = new Schema({
  userId: { type: String, index: true }  // ← Remove
});
schema.index({ userId: 1 });  // ← Keep

// ✅ AFTER (Correct)
const schema = new Schema({
  userId: { type: String }  // ← Removed index
});
schema.index({ userId: 1 });  // ← Kept
```

---

### 3. Reserved Mongoose Keywords

**Severity**: 🟢 Low (Warning only, functionality not broken)

**Issue**: Field named `errors` triggers Mongoose warning:
```
`errors` is a reserved schema pathname and may break some functionality
```

**Solution Options**:
- Option A: Rename fields from `errors` to `validationErrors` or `errorMessages`
- Option B: Add schema option: `suppressReservedKeysWarning: true`

**Recommendation**: Option A (safer long-term)

---

## 🚀 Step-by-Step Fix Instructions

### Phase 1: Backup & Preparation
```bash
# 1. Create backup
cp -r models models.backup

# 2. Create new branch (if using git)
git checkout -b fix/duplicate-indexes

# 3. Verify script available
ls -la fix-duplicate-indexes.js
```

### Phase 2: Manual Index Fixes (Recommended)

For each file in the list above:

1. Open file in VS Code
2. Search for `index: true` on the duplicate fields
3. Remove `index: true` from field definition
4. Verify `schema.index()` exists below
5. Save file

**Example for advanced_attendance.model.js**:
```javascript
// Before
const attendanceSchema = new Schema({
  employeeId: { type: String, index: true },         // ← Remove index
  date: { type: Date, index: true },                 // ← Remove index
  attendanceStatus: { type: String, index: true },   // ← Remove index
  checkInTime: { type: Date, index: true },
  checkOutTime: { type: Date, index: true },
  isDeleted: { type: Boolean, index: true }
});

// These are defined correctly, keep them:
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, attendanceStatus: 1 });
attendanceSchema.index({ employeeId: 1, attendanceStatus: 1 });

// After fix
const attendanceSchema = new Schema({
  employeeId: { type: String },                    // ← Fixed
  date: { type: Date },                            // ← Fixed
  attendanceStatus: { type: String },              // ← Fixed
  checkInTime: { type: Date, index: true },        // ← Keep (no schema.index for this)
  checkOutTime: { type: Date, index: true },       // ← Keep (no schema.index for this)
  isDeleted: { type: Boolean, index: true }        // ← Keep (no schema.index for this)
});

// Keep these:
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, attendanceStatus: 1 });
attendanceSchema.index({ employeeId: 1, attendanceStatus: 1 });
```

### Phase 3: Verification

```bash
# Test the fixes
npm test

# Check for warnings
npm start 2>&1 | grep -i "duplicate\|mongoose warning"
```

### Phase 4: Cleanup (Optional)

```bash
# Remove backup if all tests pass
rm -rf models.backup

# Delete fix script after use
rm fix-duplicate-indexes.js
```

---

## 📋 Testing Checklist

- [ ] All files backed up
- [ ] MongoDB timeout values updated
- [ ] Duplicate indexes removed (Phase 2)
- [ ] No "Duplicate schema index" warnings in npm start
- [ ] No "errors is reserved" warnings (or suppressed)
- [ ] npm test passes successfully
- [ ] All API endpoints respond correctly
- [ ] Connection to MongoDB stable
- [ ] No timeout errors after 2 minutes of operation

---

## 🆘 Rollback Plan

If something goes wrong:

```bash
# Restore from backup
rm -rf models
cp -r models.backup models

# Restart
npm install
npm start
```

---

## 📞 Support & Documentation

### Useful Links:
- [Mongoose Indexes Guide](https://mongoosejs.com/docs/api/schema.html#Schema.prototype.index())
- [MongoDB Index Best Practices](https://docs.mongodb.com/manual/indexes/)
- [Mongoose Schema Options](https://mongoosejs.com/docs/guide.html#options)

### Common Issues & Solutions:

| Issue | Solution |
|-------|----------|
| Timeout still occurs | Increase serverSelectionTimeoutMS further (to 30000ms) |
| Duplicate warnings persist | Use suppressReservedKeysWarning in schema options |
| Tests fail after fix | Check that schema.index() calls are still present |
| MongoDB won't connect | Use Mock DB: `USE_MOCK_DB=true` in .env |

---

## ⏱️ Estimated Time

| Phase | Time | Notes |
|-------|------|-------|
| Phase 1 (Backup) | 5 min | Quick |
| Phase 2 (Manual fixes) | 45-60 min | 10 files × 5 min each |
| Phase 3 (Testing) | 10-15 min | Run tests and verify |
| Phase 4 (Cleanup) | 5 min | Optional |
| **Total** | **65-85 min** | ~1.5 hours |

---

## 🎯 Success Criteria

**All of the following should be true:**
- ✓ No "Duplicate schema index" warnings in console
- ✓ No connection timeout errors
- ✓ `npm test` passes with all tests
- ✓ Server starts cleanly without errors
- ✓ MongoDB operations stable for 5+ minutes

---

**Generated**: February 20, 2026
**Status**: Ready for Implementation
**Priority**: High
**Estimated Completion**: 65-85 minutes
