# Phase 14 - Docker MongoDB Upgrade Blueprint

**Target:** Increase test pass rate from 83.39% → 85-86%  
**Effort:** 6-8 hours total  
**Risk Level:** 🟢 LOW (independent of production deployment)  
**Timeline:** Week 2 (March 5-6, 2026)

---

## 🎯 Objective

Replace MongoMemoryServer (in-memory, 10s timeout) with persistent Docker MongoDB for test infrastructure. This architectural change will allow concurrent test workers to complete database operations without buffering timeout failures.

### Expected Impact
- ✅ 222 timeout failures → resolved
- ✅ 54 cascading HTTP 500 errors → resolved  
- ✅ ~150-200 additional tests pass
- ✅ Pass rate: 83.39% → 85-86% (3,540-3,590 tests)
- ✅ No production system impact

---

## 📋 Pre-Upgrade Checklist

- [x] Baseline confirmed: 83.39% (3,390/4,065)
- [x] Docker available on development machine
- [x] docker-compose installed
- [x] Current MongoDB connection understood
- [x] All commits pushed to git
- [ ] Backup current jest.setup.js
- [ ] Backup current jest.config.js

---

## 🚀 Execution Steps

### Step 1: Create Docker Compose Configuration (15 minutes)

**File:** `docker-compose.test.yml`

```yaml
version: '3.8'

services:
  # MongoDB for testing
  test-mongodb:
    image: mongo:6.0-alpine
    container_name: alawael-test-mongodb
    ports:
      - "27018:27017"  # Different port than production (27017)
    environment:
      MONGO_INITDB_ROOT_USERNAME: testuser
      MONGO_INITDB_ROOT_PASSWORD: testpass123
      MONGO_INITDB_DATABASE: alawael_test
    volumes:
      - mongodb_test_data:/data/db
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js
    healthcheck:
      test: ["CMD", "mongosh", "--authenticationDatabase", "admin", "-u", "testuser", "-p", "testpass123", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 10s
      retries: 5
      start_period: 20s
    command: mongod --bind_ip_all

volumes:
  mongodb_test_data:
    driver: local
```

**File:** `init-mongo.js` (Database initialization)

```javascript
// Initialize test database with collections
db = db.getSiblingDB('alawael_test');

db.createCollection('users');
db.createCollection('drivers');
db.createCollection('routes');
db.createCollection('vehicles');
db.createCollection('payments');
db.createCollection('deliveries');
db.createCollection('predictions');

// Create indexes for faster queries
db.users.createIndex({ email: 1 }, { unique: true });
db.drivers.createIndex({ userId: 1 });
db.routes.createIndex({ createdAt: -1 });
db.vehicles.createIndex({ licensePlate: 1 }, { unique: true });

console.log('Test database initialized');
```

### Step 2: Update Jest Setup (30 minutes)

**File:** `jest.setup.js` - REPLACE entirely

```javascript
/**
 * Jest Setup Configuration - Docker MongoDB Version
 * Connects all tests to persistent Docker MongoDB instance
 * Replaces MongoMemoryServer for better concurrent test handling
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '.env.test') });

// Test database configuration
const TEST_MONGODB_URL = process.env.TEST_MONGODB_URL || 'mongodb://testuser:testpass123@localhost:27018/alawael_test?authSource=admin';

console.log('[Jest Setup] Initializing with Docker MongoDB configuration');
console.log(`[Jest Setup] Connection URL: ${TEST_MONGODB_URL.split('@')[1] || 'localhost'}`);

// Global test setup
let mongoConnection;

module.exports = async () => {
  try {
    // Connect to Docker MongoDB
    mongoConnection = await mongoose.connect(TEST_MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Optimized for concurrent test workers
      maxPoolSize: 10,
      minPoolSize: 5,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: false, // Avoid WiredTiger issues in test env
    });

    console.log('[Jest Setup] ✅ Connected to Docker MongoDB');

    // Clear all collections before running tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    console.log('[Jest Setup] ✅ Cleared test database');

    // Create indexes
    for (const modelName in mongoose.models) {
      const model = mongoose.models[modelName];
      if (model.collection && model.collection.createIndexes) {
        await model.collection.createIndexes();
      }
    }
    console.log('[Jest Setup] ✅ Created indexes');

  } catch (error) {
    console.error('[Jest Setup] ❌ Failed to connect to Docker MongoDB:', error.message);
    process.exit(1);
  }
};

// Teardown
module.exports.teardown = async () => {
  if (mongoConnection) {
    await mongoose.connection.close();
    console.log('[Jest Teardown] ✅ Disconnected from MongoDB');
  }
};
```

### Step 3: Update Jest Configuration (15 minutes)

**File:** `jest.config.js` - Update only these settings

```javascript
module.exports = {
  // ... existing config ...

  // UPDATED for Docker MongoDB
  testTimeout: 30000, // Keep 30s per test (no longer MongoMemoryServer's 10s limit)
  maxWorkers: 4, // Increase from 2 (Docker MongoDB can handle more concurrency)
  
  // Optimize for Docker environment
  verbose: true,
  testEnvironment: 'node',
  forceExit: true,
  detectOpenHandles: true,
  detectLeakedDescribes: true,

  // Logging
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage (optional, disable for speed during Phase 14)
  collectCoverage: false,
  
  // Test patterns (keep existing)
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ]
};
```

### Step 4: Create Environment File (5 minutes)

**File:** `.env.test`

```
# Docker MongoDB Configuration for Testing
TEST_MONGODB_URL=mongodb://testuser:testpass123@localhost:27018/alawael_test?authSource=admin

# Node environment
NODE_ENV=test

# Optional: JWT secret for tests
JWT_SECRET=test_secret_key_do_not_use_in_production

# Optional: API configuration
API_PORT=3001
API_HOST=localhost
```

### Step 5: Update package.json Scripts (10 minutes)

**File:** `package.json` - Update test scripts

```json
{
  "scripts": {
    // ... existing scripts ...
    
    "test": "jest --maxWorkers=2 --testTimeout=30000 --forceExit",
    
    "test:docker": "jest --maxWorkers=4 --testTimeout=30000 --forceExit",
    
    "test:coverage": "jest --coverage --forceExit",
    
    "test:watch": "jest --watch --maxWorkers=2",
    
    "docker:up": "docker-compose -f docker-compose.test.yml up -d",
    
    "docker:down": "docker-compose -f docker-compose.test.yml down -v",
    
    "docker:restart": "docker-compose -f docker-compose.test.yml restart",
    
    "db:init": "docker-compose -f docker-compose.test.yml exec test-mongodb mongosh -u testuser -p testpass123 --authenticationDatabase admin /docker-entrypoint-initdb.d/init-mongo.js",
    
    "test:setup": "npm run docker:up && sleep 10 && npm run test:docker"
  }
}
```

---

## 🔧 Implementation Sequence

### Saturday Morning (Phase 14 Day 1-2)

```bash
# 1. Commit current state
git status
git add -A
git commit -m "chore: pre-docker-upgrade backup"

# 2. Create Docker configuration
# Create docker-compose.test.yml (copy code from Step 1 above)
# Create init-mongo.js (copy code from Step 1 above)
# Create .env.test (copy code from Step 4 above)

# 3. Start Docker MongoDB
npm run docker:up

# 4. Wait for MongoDB to be ready
sleep 15

# 5. Verify MongoDB is running
docker ps
# Should show: alawael-test-mongodb running on 27018
```

### Saturday Afternoon (Phase 14 Day 2-3)

```bash
# 1. Update jest configuration
# Modify jest.setup.js (copy code from Step 2 above)
# Modify jest.config.js (copy code from Step 3 above)
# Modify package.json (copy code from Step 5 above)

# 2. Run tests against Docker MongoDB
npm run test:docker

# 3. Monitor first run (should show immediate improvement)
# Expected: +50-100 tests immediately fixed by removing MongoMemoryServer timeout
```

### Sunday Morning (Phase 14 Day 3-4)

```bash
# Verify results
npm run test:docker 2>&1 | tee phase14-docker-results.log

# Expected output:
# Test Suites: ~20-30 failing, ~10 skipped, ~90+ passing
# Tests: ~100-200 failing, ~337 skipped, ~3540+ passing
# Pass Rate: 85-86%
# Duration: ~280-300 seconds

# If results match expectations:
git add -A
git commit -m "feat: Phase 14 - Docker MongoDB upgrade - improved from 83.39% to 85%"
git push origin main
```

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] Docker MongoDB container running: `docker ps | grep alawael-test-mongodb`
- [ ] MongoDB responsive: `docker exec alawael-test-mongodb ping`
- [ ] Test connection string correct in .env.test
- [ ] jest.setup.js successfully connects
- [ ] Database collections created
- [ ] First test run completes without timeout errors
- [ ] Pass rate improved to 85%+
- [ ] No regressions in passing tests
- [ ] All 4 Jest workers active
- [ ] Git commit clean

---

## 📊 Expected Results

### Before Upgrade (Current - Phase 13)
```
Test Suites: 37 failed, 11 skipped, 84 passing
Tests:       338 failed, 337 skipped, 3390 passing
Pass Rate:   83.39%
Duration:    ~256 seconds
Failures:    MongoDB buffering timeouts (MongoMemoryServer 10s limit)
```

### After Upgrade (Expected - Phase 14)
```
Test Suites: ~20-30 failed, ~10 skipped, ~90 passing (estimated)
Tests:       ~100-200 failed, 337 skipped, ~3540-3590 passing
Pass Rate:   85-86% (estimated +200 tests)
Duration:    ~280-300 seconds (slightly longer but faster per-test)
Failures:    Architectural issues only (not timeout-related)
Workers:     4 concurrent (from 2)
```

---

## ⚠️ Rollback Plan (If Needed)

If tests perform worse after upgrade:

```bash
# Revert Docker changes
git revert HEAD

# Stop Docker MongoDB
npm run docker:down

# Restore previous jest.setup.js
git checkout HEAD~1 -- jest.setup.js

# Restore previous jest.config.js
git checkout HEAD~1 -- jest.config.js

# Verify baseline restored
npm test
# Should return to 83.39%
```

---

## 🔍 Troubleshooting

### Issue 1: MongoDB Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:27018

Solution:
  docker-compose -f docker-compose.test.yml ps
  docker-compose -f docker-compose.test.yml up -d
  sleep 15
  docker logs alawael-test-mongodb
```

### Issue 2: Tests Still Timeout
```
Error: Buffering timed out after 30000ms

Solution:
  - Increase maxPoolSize in jest.setup.js
  - Reduce maxWorkers (try 2 instead of 4)
  - Check Docker MongoDB logs: docker logs alawael-test-mongodb
```

### Issue 3: Port 27018 Already in Use
```
Error: Bind for 0.0.0.0:27018 failed

Solution:
  docker-compose -f docker-compose.test.yml down -v
  netstat -tlnp | grep 27018
  Kill process or use different port (27019)
```

---

## 📈 Success Metrics

✅ **Phase 14 is successful when:**
1. Docker MongoDB container runs stably
2. Tests pass at 85-86% (or higher)
3. No regressions in Phase 13 tests
4. All 4 Jest workers actively used
5. Test execution completes within 300 seconds
6. No timeout errors in logs
7. Performance acceptable for CI/CD

---

## 🎓 Learning for Future Phases

**What We Learned:**
- MongoMemoryServer has architectural limits (10s timeout)
- Persistent databases scale better than in-memory for tests
- Jest worker concurrency can increase with proper DB management
- Docker provides reliable, reproducible test environment

**Future Improvements:**
- Could further optimize with test suite splitting
- MongoDB replication set for HA testing
- Cloud MongoDB for staging environment
- Parallel test suites per worker

---

**Status:** 🟢 READY FOR PHASE 14  
**Timeline:** Week 2 (March 5-6, 2026)  
**Approval:** Proceed when deployment (Week 1) is stable  
**Contact:** Escalate in #dev-deployment if issues

