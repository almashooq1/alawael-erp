# 🗄️ DATABASE MIGRATION GUIDE

**Version:** 1.0  
**Last Updated:** February 20, 2026  
**Status:** Ready for Implementation

---

## 📋 TABLE OF CONTENTS

1. [System Architecture](#system-architecture)
2. [Current State vs Target State](#current-state-vs-target-state)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Validation Procedures](#validation-procedures)
6. [Rollback Strategy](#rollback-strategy)
7. [Post-Migration Tasks](#post-migration-tasks)

---

## 🏗️ SYSTEM ARCHITECTURE

### Current Architecture: Mock Database

```
Frontend (React 18)
       ↓
Frontend API Service (Axios)
       ↓
Express.js Backend (Port 3001)
       ↓
In-Memory Mock Database
       ↓
Session Storage
```

### Target Architecture: MongoDB

```
Frontend (React 18)
       ↓
Frontend API Service (Axios)
       ↓
Express.js Backend (Port 3001)
       ↓
Mongoose ORM (Database Abstraction)
       ↓
MongoDB (Atlas or Self-Hosted)
       ↓
Persistent Document Storage
```

---

## 📊 CURRENT STATE VS TARGET STATE

### Current Mock Database Implementation

✅ **Advantages:**

- Zero dependency management
- Fast setup and development
- No external service required
- Good for testing and prototyping
- Memory efficient for small datasets

❌ **Limitations:**

- Data lost on server restart
- Single-instance only (no clustering)
- Not suitable for production workloads
- No transaction support
- Limited query capabilities
- No authentication/security at database level

### Target MongoDB Implementation

✅ **Advantages:**

- Persistent data storage
- Scalability (horizontal and vertical)
- Rich query language
- Transaction support (ACID in replica sets)
- Automatic backups
- Built-in authentication and authorization
- Excellent for production

### Migration Path

```
Phase 1: Preparation (This Week)
  ├─ Create MongoDB cluster
  ├─ Design database schema
  ├─ Create indexes
  └─ Set up connection pool

Phase 2: Parallel Running (Week 2)
  ├─ Enable Mongoose in backend
  ├─ Sync data between mock and MongoDB
  ├─ Test read/write operations
  └─ Validate data integrity

Phase 3: Migration (Week 3)
  ├─ Cutover to MongoDB (blue-green)
  ├─ Monitor closely (first 24 hours)
  ├─ Run smoke tests
  └─ Verify all operations

Phase 4: Cleanup (Week 4)
  ├─ Remove mock database code
  ├─ Clean up temporary tables
  ├─ Finalize configuration
  └─ Document final state
```

---

## ✅ PRE-MIGRATION CHECKLIST

### Database Preparation

```
MONGODB SETUP
☐ MongoDB Atlas cluster created or self-hosted instance running
☐ Admin user created with strong password
☐ Network access configured (whitelist IP addresses)
☐ Backup automation enabled
☐ Replica set configuration (for production)
☐ Connection string obtained and tested

DATABASE SCHEMA
☐ All collections designed
☐ Indexes identified and created
☐ Relationships defined (references)
☐ Validation rules configured
☐ TTL (time-to-live) settings configured if needed
☐ Sharding strategy defined (if needed)

CODE CHANGES
☐ Mongoose models created for all entities
☐ Migration scripts written
☐ Data transformation logic tested
☐ Error handling added
☐ Logging configured
☐ Tests updated for MongoDB
```

### Infrastructure Preparation

```
ENVIRONMENT
☐ MongoDB URI added to .env.production
☐ MongoDB user and database created
☐ Connection pool size configured (50-100 connections)
☐ Timeout settings configured (30 seconds default)
☐ Retry logic implemented
☐ Circuit breaker pattern added

MONITORING
☐ Database monitoring enabled
☐ Alerts configured for:
   ☐ Connection failures
   ☐ Query performance degradation
   ☐ Disk space usage
   ☐ Replica set health
☐ Logging aggregation setup
☐ Metrics collection enabled

TESTING
☐ Unit tests updated to use MongoDB
☐ Integration tests against real MongoDB
☐ Load testing with production-like data volume
☐ Failover testing
☐ Backup/restore testing
```

---

## 🔄 STEP-BY-STEP MIGRATION

### Step 1: Prepare MongoDB Connection

**File:** `backend/config/database.js`

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/erp-db';

    const conn = await mongoose.connect(mongoURI, {
      // Connection options
      maxPoolSize: process.env.DB_POOL_SIZE || 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority',
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Run migrations
    await runMigrations();

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Step 2: Create Mongoose Models

**File:** `backend/models/User.js`

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email',
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    firstName: String,
    lastName: String,
    roles: [
      {
        type: String,
        enum: ['admin', 'manager', 'user', 'viewer'],
        default: 'user',
      },
    ],
    permissions: [
      {
        type: String,
        enum: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'MANAGE'],
        default: 'READ',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Create indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
```

### Step 3: Create Data Migration Script

**File:** `backend/scripts/migrate-to-mongodb.js`

```javascript
const mongoose = require('mongoose');
const mockDB = require('../db/mock');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

async function migrateData() {
  try {
    console.log('🔄 Starting data migration to MongoDB...\n');

    // Migrate Users
    console.log('📦 Migrating users...');
    const users = mockDB.users || [];
    let migratedUsers = 0;

    for (const userData of users) {
      try {
        const user = new User({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roles: userData.roles || ['user'],
          permissions: userData.permissions || ['READ'],
          status: userData.status || 'active',
        });

        await user.save();
        migratedUsers++;
      } catch (error) {
        console.error(`   ❌ Error migrating user ${userData.username}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migratedUsers} users\n`);

    // Migrate Products
    console.log('📦 Migrating products...');
    const products = mockDB.products || [];
    let migratedProducts = 0;

    for (const productData of products) {
      try {
        const product = new Product({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          quantity: productData.quantity,
          category: productData.category,
        });

        await product.save();
        migratedProducts++;
      } catch (error) {
        console.error(`   ❌ Error migrating product ${productData.name}:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migratedProducts} products\n`);

    // Migrate Orders
    console.log('📦 Migrating orders...');
    const orders = mockDB.orders || [];
    let migratedOrders = 0;

    for (const orderData of orders) {
      try {
        // Find corresponding user
        const user = await User.findOne({ username: orderData.username });

        const order = new Order({
          userId: user._id,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          status: orderData.status || 'pending',
          shippingAddress: orderData.shippingAddress,
        });

        await order.save();
        migratedOrders++;
      } catch (error) {
        console.error(`   ❌ Error migrating order:`, error.message);
      }
    }
    console.log(`   ✅ Migrated ${migratedOrders} orders\n`);

    console.log('✨ Migration completed successfully!');
    console.log(`   Total Users: ${migratedUsers}`);
    console.log(`   Total Products: ${migratedProducts}`);
    console.log(`   Total Orders: ${migratedOrders}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  const connectDB = require('../config/database');

  connectDB()
    .then(async () => {
      await migrateData();
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = migrateData;
```

### Step 4: Update Backend Configuration

**File:** `backend/server.js`

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Choose database based on environment variable
const useMongoDB = process.env.USE_MOCK_DB === 'false';

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
let dbConnection;
if (useMongoDB) {
  // MongoDB
  const connectDB = require('./config/database');
  connectDB().then(conn => {
    dbConnection = conn;
    console.log('✅ MongoDB connected');
  });
} else {
  // Mock Database
  const mockDB = require('./db/mock');
  dbConnection = mockDB;
  console.log('✅ Mock database initialized');
}

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = app;
```

---

## ✅ VALIDATION PROCEDURES

### Pre-Migration Validation

```bash
# 1. Verify MongoDB connection
npm run db:verify

# 2. Test connection string
npm run db:test-connection

# 3. Validate schema
npm run db:validate-schema

# 4. Check data volume
npm run db:check-size
```

### Post-Migration Validation

```bash
# 1. Count records in both databases
npm run db:compare-counts

# 2. Verify data integrity
npm run db:validate-data

# 3. Check for orphaned records
npm run db:check-orphans

# 4. Verify indexes are created
npm run db:verify-indexes

# 5. Test all API endpoints
npm run test:integration

# 6. Load test with MongoDB
npm run test:load
```

### Data Integrity Checks

```javascript
// Validation queries
db.users.find().count() === mongoUsers.length;
db.products.find().count() === mongoProducts.length;
db.orders.find().count() === mongoOrders.length;

// Check references
db.orders.find({ userId: { $exists: false } }).count() === 0;

// Verify no duplicate keys
db.users.find().count() === db.users.distinct('username').length;
```

---

## 🔙 ROLLBACK STRATEGY

### Automatic Rollback (< 10 minutes)

If critical issues detected:

1. **Immediate Actions:**

   ```javascript
   // In environment, switch back
   USE_MOCK_DB=true
   // Restart backend service
   service restart backend
   ```

2. **Data Validation:**
   - Check mock database integrity
   - Verify all services responding
   - Run smoke tests
   - Check no data loss occurred

3. **Communication:**
   - Notify team of rollback
   - Document issue for root cause analysis
   - Schedule retry after fix

### Manual Rollback (If Needed)

> **Estimated Recovery Time:** 30 minutes

1. **Backup MongoDB Data:**

   ```bash
   mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net" \
             --out=/backups/mongo-$(date +%Y%m%d)
   ```

2. **Restore Previous State:**

   ```bash
   # Update .env file
   echo "USE_MOCK_DB=true" >> .env

   # Restart services
   pm2 restart backend
   ```

3. **Verify Restoration:**
   ```bash
   npm run test:integration
   npm run test:e2e
   ```

---

## 📋 POST-MIGRATION TASKS

### Immediate (First 24 hours)

- [ ] Monitor database performance (CPU, memory, disk)
- [ ] Check error logs for any issues
- [ ] Verify all API endpoints working
- [ ] Monitor user reports
- [ ] Check backup jobs running

### Short-term (First week)

- [ ] Analyze query patterns
- [ ] Optimize slow queries
- [ ] Review connection pool usage
- [ ] Fine-tune memory settings
- [ ] Document lessons learned

### Long-term (Ongoing)

- [ ] Schedule regular backups
- [ ] Monitor replica set health
- [ ] Plan for scaling
- [ ] Update disaster recovery plan
- [ ] Review security settings quarterly

---

## 📊 MIGRATION TEMPLATE CHECKLIST

```
PHASE 1: PREPARATION
  ☐ MongoDB cluster setup
  ☐ Schema design completed
  ☐ Mongoose models created
  ☐ Migration scripts written and tested
  ☐ Connection pool configured
  ☐ Backup strategy finalized
  ☐ Team trained on new database

PHASE 2: TESTING
  ☐ Unit tests updated to use MongoDB
  ☐ Integration tests pass 100%
  ☐ E2E tests pass 100%
  ☐ Load tests completed successfully
  ☐ Data integrity verified
  ☐ Rollback procedure tested
  ☐ Stakeholders approve

PHASE 3: MIGRATION
  ☐ Maintenance window scheduled
  ☐ Backup of mock database taken
  ☐ Data migrated to MongoDB
  ☐ Migration verified and validated
  ☐ Application switched to MongoDB
  ☐ Services restarted
  ☐ Health checks passed

PHASE 4: POST-MIGRATION
  ☐ Performance monitoring active
  ☐ Error logs reviewed
  ☐ User acceptance testing passed
  ☐ Issues documented
  ☐ Optimization completed
  ☐ Mock database removed
  ☐ Documentation updated
```

---

## 🎯 SUCCESS CRITERIA

✅ **Migration is successful when:**

- All 22 API endpoints responding correctly
- Data integrity 100% verified
- Performance metrics: P95 < 200ms, throughput > 1000 req/s
- Zero data loss
- All tests passing (100%)
- Zero security issues
- Automatic backups running
- Team confident and trained

---

**Migration Guide Version:** 1.0  
**Last Updated:** February 20, 2026  
**Next Review:** March 20, 2026
