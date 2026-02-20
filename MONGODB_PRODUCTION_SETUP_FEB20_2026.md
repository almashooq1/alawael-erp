# MongoDB Production Setup & Migration Guide
**Date:** February 20, 2026  
**Status:** Implementation Ready  
**Environment:** Production-Grade Setup

---

## 🎯 Overview

This guide provides complete MongoDB production setup with:
- ✅ Cloud deployment (MongoDB Atlas recommended)
- ✅ Local development setup (optional)
- ✅ Migration from mock database
- ✅ Schema validation and indexing
- ✅ Backup and disaster recovery
- ✅ Performance optimization
- ✅ Security hardening

**Timeline:** 2-3 hours for complete setup

---

## 🚀 Phase 1: MongoDB Cloud Setup (30 minutes)

### Step 1: Create MongoDB Atlas Account
```bash
# Visit: https://www.mongodb.com/cloud/atlas
# Free tier: 512MB storage, perfect for testing

Steps:
1. Sign up at mongodb.com/cloud/atlas
2. Create new organization
3. Create new project "AlAwael-ERP"
4. Choose free tier (M0)
5. Select AWS region closest to you
6. Create cluster
```

### Step 2: Create Database User
```bash
# In MongoDB Atlas Console:

1. Go to Database Access
2. Add New User:
   - Username: alawael_user
   - Password: [Generate strong password - save this!]
   - Role: Atlas Admin (for setup), then reduce to readWrite after
3. Create user
```

### Step 3: Whitelist IP & Get Connection String
```bash
# In MongoDB Atlas Console:

1. Go to Network Access
2. Add IP Address:
   - For production: Add your server IP
   - For development: Add 0.0.0.0/0 (not recommended for prod)
3. Click "Connect" → "Connect your application"
4. Copy connection string:
   mongodb+srv://alawael_user:password@cluster0.xxxxx.mongodb.net/alawael?retryWrites=true&w=majority
```

### Step 4: Create Database & Collections
```bash
# In MongoDB Atlas Console:
# Go to Databases → Collections → Add My Own Data

Create database: alawael_production

Create collections (will auto-create with schema):
- users
- products
- orders
- analytics
- notifications
- featureFlags
- caches
- sessions
- logs
- auditTrail
```

---

## 🔧 Phase 2: Local Development Setup (Optional - 20 minutes)

### Option A: Docker (Recommended)
```bash
# Install Docker if not already installed
# Then run:

docker run -d \
  --name mongodb \
  --restart always \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:6.0

# Verify running:
docker ps | grep mongodb

# Connection string:
mongodb://root:password123@localhost:27017/alawael?authSource=admin
```

### Option B: Local Installation
```bash
# Windows: Download MongoDB Community Server
# https://www.mongodb.com/try/download/community

# Or use Chocolatey:
choco install mongodb-community

# Start service:
net start MongoDB

# Connection string:
mongodb://localhost:27017/alawael

# If authentication enabled:
mongodb://user:password@localhost:27017/alawael?authSource=admin
```

### Option C: Cloud Development (MongoDB Atlas)
Use same setup as production but on free tier

---

## 📝 Phase 3: Environment Configuration

### Update .env for Production Database
```env
# ============================================
# DATABASE - MONGODB (PRODUCTION)
# ============================================
USE_MOCK_DB=false
MONGODB_URI=mongodb+srv://alawael_user:PASSWORD@cluster0.xxxxx.mongodb.net/alawael_production?retryWrites=true&w=majority
MONGODB_USER=alawael_user
MONGODB_PASSWORD=your_secure_password_here
MONGODB_AUTH_SOURCE=admin
MONGODB_POOL_SIZE=10
MONGODB_TIMEOUT=30000
MONGODB_DEBUG=false

# ============================================
# DATABASE - BACKUP
# ============================================
MONGODB_BACKUP_ENABLED=true
MONGODB_BACKUP_INTERVAL=86400000
MONGODB_BACKUP_RETENTION_DAYS=30
MONGODB_BACKUP_PATH=./backups/mongodb

# ============================================
# MIGRATION
# ============================================
MIGRATION_ENABLED=true
MIGRATION_RUN_ON_START=false
MIGRATION_DRY_RUN=true
MIGRATION_BATCH_SIZE=100
```

---

## 📊 Phase 4: Schema Definition & Indexing

### Create MongoDB Schema File
```javascript
// backend/config/mongodb-schema.js

const mongooseSchemas = {
  users: {
    email: { type: String, unique: true, required: true, index: true },
    username: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    role: { type: String, enum: ['user', 'admin', 'super-admin'], index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
  },

  products: {
    sku: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true, index: true },
    description: String,
    price: { type: Number, required: true },
    category: { type: String, index: true },
    stock: { type: Number, default: 0 },
    images: [String],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },

  orders: {
    orderNumber: { type: String, unique: true, required: true, index: true },
    userId: { type: String, required: true, index: true },
    items: [{
      productId: String,
      quantity: Number,
      price: Number,
    }],
    totalAmount: Number,
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], index: true },
    shippingAddress: String,
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },

  analytics: {
    endpoint: { type: String, index: true },
    method: String,
    statusCode: Number,
    duration: Number,
    userId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    tags: [String],
  },

  notifications: {
    userId: { type: String, required: true, index: true },
    title: String,
    message: String,
    channels: [String],
    status: { type: String, enum: ['pending', 'sent', 'failed'], index: true },
    sentAt: Date,
    createdAt: { type: Date, default: Date.now, index: true },
  },

  featureFlags: {
    name: { type: String, unique: true, required: true, index: true },
    enabled: Boolean,
    percentage: Number,
    updatedAt: { type: Date, default: Date.now, index: true },
  },

  sessions: {
    userId: { type: String, required: true, index: true },
    token: { type: String, unique: true, required: true, index: true },
    expiresAt: { type: Date, index: true },
    createdAt: { type: Date, default: Date.now },
  },

  auditTrail: {
    action: String,
    userId: { type: String, index: true },
    resourceType: String,
    resourceId: String,
    changes: Object,
    timestamp: { type: Date, default: Date.now, index: true },
  },
};

module.exports = mongooseSchemas;
```

### Create Compound Indexes for Performance
```javascript
// backend/config/mongodb-indexes.js

const indexes = [
  // Users indexes
  { collection: 'users', fields: { email: 1, isActive: 1 } },
  { collection: 'users', fields: { role: 1, createdAt: -1 } },
  
  // Orders indexes
  { collection: 'orders', fields: { userId: 1, createdAt: -1 } },
  { collection: 'orders', fields: { status: 1, updatedAt: -1 } },
  
  // Analytics indexes
  { collection: 'analytics', fields: { endpoint: 1, timestamp: -1 } },
  { collection: 'analytics', fields: { userId: 1, timestamp: -1 } },
  
  // Notifications indexes
  { collection: 'notifications', fields: { userId: 1, createdAt: -1 } },
  { collection: 'notifications', fields: { status: 1, createdAt: -1 } },
  
  // Audit trail indexes
  { collection: 'auditTrail', fields: { userId: 1, timestamp: -1 } },
  { collection: 'auditTrail', fields: { resourceType: 1, resourceId: 1 } },
];

module.exports = indexes;
```

---

## 🔄 Phase 5: Data Migration

### Create Migration Script
```javascript
// backend/scripts/migrate-to-mongodb.js

const mongoose = require('mongoose');
const mockDatabase = require('../utils/mockDatabase');

const migrationScript = {
  async connect() {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  },

  async migrateUsers() {
    const mockUsers = mockDatabase.getAllUsers();
    const User = mongoose.model('User');
    
    for (const user of mockUsers) {
      const existing = await User.findOne({ email: user.email });
      if (!existing) {
        await User.create(user);
        console.log(`✅ Migrated user: ${user.email}`);
      }
    }
    console.log(`✅ Users migration complete: ${mockUsers.length} users`);
  },

  async migrateProducts() {
    const mockProducts = mockDatabase.getAllProducts();
    const Product = mongoose.model('Product');
    
    for (const product of mockProducts) {
      const existing = await Product.findOne({ sku: product.sku });
      if (!existing) {
        await Product.create(product);
        console.log(`✅ Migrated product: ${product.sku}`);
      }
    }
    console.log(`✅ Products migration complete: ${mockProducts.length} products`);
  },

  async migrateOrders() {
    const mockOrders = mockDatabase.getAllOrders();
    const Order = mongoose.model('Order');
    
    for (const order of mockOrders) {
      const existing = await Order.findOne({ orderNumber: order.orderNumber });
      if (!existing) {
        await Order.create(order);
      }
    }
    console.log(`✅ Orders migration complete: ${mockOrders.length} orders`);
  },

  async run() {
    try {
      await this.connect();
      await this.migrateUsers();
      await this.migrateProducts();
      await this.migrateOrders();
      console.log('✅ All migrations completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  },
};

if (require.main === module) {
  migrationScript.run();
}

module.exports = migrationScript;
```

### Run Migration
```bash
# From backend directory
MIGRATION_DRY_RUN=true node scripts/migrate-to-mongodb.js

# If dry run looks good:
MIGRATION_DRY_RUN=false node scripts/migrate-to-mongodb.js
```

---

## 🔒 Phase 6: Security Hardening

### MongoDB Security Configuration
```javascript
// backend/config/mongodb-security.js

const securityConfig = {
  // Connection string should never have credentials hardcoded
  uri: process.env.MONGODB_URI,

  // TLS/SSL Configuration
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,

  // Authentication
  authSource: 'admin',
  authMechanism: 'SCRAM-SHA-256',

  // Pool Management
  maxPoolSize: 10,
  minPoolSize: 2,

  // Connection Timeout
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,

  // Retry Logic
  retryWrites: true,
  retryReads: true,

  // Connection Monitoring
  logAll: true,
  logger: (msg, context) => {
    if (context.type === 'error') {
      console.error('[MongoDB]', msg, context);
    } else {
      console.debug('[MongoDB]', msg);
    }
  },
};

module.exports = securityConfig;
```

### MongoDB Atlas Security Best Practices
```
✅ DO:
  - Use strong passwords (20+ chars, mixed case, numbers, symbols)
  - Enable IP whitelisting (only add necessary IPs)
  - Use VPC peering for private connections
  - Enable encryption at rest (auto on paid plans)
  - Enable encryption in transit (TLS required)
  - Regular backups (enabled by default)
  - Monitor database access
  - Use database-level authentication
  - Rotate credentials regularly
  - Enable audit logging (M10+)

❌ DON'T:
  - Store credentials in code
  - Commit .env files to git
  - Use 0.0.0.0/0 in production
  - Share passwords in emails/chat
  - Use weak passwords
  - Enable public API access
  - Store sensitive data unencrypted
  - Disable authentication
  - Use root credentials for apps
  - Skip backup verification
```

---

## 📈 Phase 7: Performance Optimization

### Database Performance Tuning
```javascript
// backend/config/mongodb-performance.js

const performanceConfig = {
  // Connection Pooling
  maxPoolSize: 50,
  minPoolSize: 10,

  // Write Concern
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000,
  },

  // Read Preference
  readPreference: 'secondary', // Read from replicas when available
  readConcern: { level: 'majority' },

  // Bulk Operations
  bulkWriteOptions: {
    ordered: false,
    batchSize: 1000,
  },

  // Query Optimization
  queryTimeout: 30000,
  allowDiskUse: true,

  // Caching
  queryCache: {
    enabled: true,
    ttl: 300000, // 5 minutes
  },
};

module.exports = performanceConfig;
```

### Index Optimization
```bash
# MongoDB Atlas Console:

1. Go to Databases → Collections
2. For each collection, click "Indexes"
3. Review and ensure compound indexes exist
4. Remove unused indexes (reduce write latency)
5. Monitor index usage in Performance Advisor

# CLI Verification:
mongosh "mongodb+srv://user:password@cluster.mongodb.net/alawael"
db.users.getIndexes()
db.orders.getIndexes()
```

---

## 💾 Phase 8: Backup & Disaster Recovery

### Enable Automated Backups
```
In MongoDB Atlas Console:

1. Go to Backup
2. Backup Schedule:
   - Frequency: Every 6 hours
   - Retention: 7 days
   - Enable point-in-time restore (M10+)

3. Backup Restore:
   - Test restore to staging environment monthly
   - Keep restore procedure documented
   - Alert on failed backups
```

### Local Backup Script
```bash
#!/bin/bash
# backup-mongodb.sh

BACKUP_DIR="./backups/mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="alawael_production"

mkdir -p $BACKUP_DIR

# Backup command
mongodump \
  --uri="$MONGODB_URI" \
  --out=$BACKUP_DIR/$TIMESTAMP

# Compress backup
cd $BACKUP_DIR
tar -czf $TIMESTAMP.tar.gz $TIMESTAMP
rm -rf $TIMESTAMP

# Keep only last 7 days
find . -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR/$TIMESTAMP.tar.gz"
```

### Restoration Procedure
```bash
# List backups
ls -lh backups/mongodb/

# Extract backup
cd backups/mongodb
tar -xzf YYYYMMDD_HHMMSS.tar.gz

# Restore to MongoDB
mongorestore \
  --uri="$MONGODB_URI" \
  --dir=YYYYMMDD_HHMMSS/dump

# Verify restored data
mongosh $MONGODB_URI
use alawael_production
db.users.countDocuments()
db.orders.countDocuments()
```

---

## ✅ Phase 9: Verification Checklist

### Pre-Production Verification
```
Database Connectivity:
  [ ] Connection string working
  [ ] Authentication successful
  [ ] Network access configured
  [ ] TLS/SSL working
  [ ] Connection pooling verified

Schema & Indexing:
  [ ] All collections created
  [ ] Documents have required fields
  [ ] Indexes created (verify in Atlas)
  [ ] Compound indexes in place
  [ ] No duplicate/unused indexes

Data Migration:
  [ ] All users migrated
  [ ] All products migrated
  [ ] All orders migrated
  [ ] Record counts match
  [ ] Data integrity verified
  [ ] No data loss

Security:
  [ ] Credentials in .env only
  [ ] IP whitelisting configured
  [ ] TLS enabled
  [ ] Authentication working
  [ ] Audit logging enabled (if available)

Performance:
  [ ] Query performance acceptable (<100ms)
  [ ] Slow query log reviewed
  [ ] Indexes helping (analyzed in Profiler)
  [ ] Connection pool working
  [ ] No timeouts in logs

Backup:
  [ ] Automated backups enabled
  [ ] Manual backup script working
  [ ] Restoration tested
  [ ] Retention policy set
  [ ] Backup monitoring enabled
```

---

## 🚀 Phase 10: Production Deployment

### Switch from Mock to Real Database
```javascript
// backend/app.js

// Current (mock mode):
const useDatabase = process.env.USE_MOCK_DB === 'true';

// Change to:
const useDatabase = process.env.USE_MOCK_DB !== 'true'; // Real DB by default

// Or set environment:
NODE_ENV=production
USE_MOCK_DB=false
MONGODB_URI=mongodb+srv://...
```

### Deployment Steps
```bash
# 1. Backup current mock data (if needed)
npm run backup:mock

# 2. Set production environment
export NODE_ENV=production
export USE_MOCK_DB=false
export MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/alawael

# 3. Run migrations
npm run migrate:mongodb

# 4. Verify connection
npm run verify:database

# 5. Start backend
npm start

# 6. Monitor logs
tail -f logs/mongodb.log

# 7. Health check
curl http://localhost:3001/api/health
```

---

## 📊 Monitoring & Maintenance

### Setup Monitoring Alerts
```
In MongoDB Atlas → Alerts:

Configure alerts for:
- Connection count > 40
- Query performance > 1000ms
- CPU utilization > 80%
- Disk usage > 80%
- Replication lag > 10s
- Failed authentications
- Backup failures
```

### Regular Maintenance Tasks
```
Daily:
  - Check monitoring dashboard
  - Review error logs
  - Verify backups completed

Weekly:
  - Analyze slow queries
  - Review index usage
  - Check disk usage trend

Monthly:
  - Test backup restoration
  - Update indexes if needed
  - Review security settings
  - Performance optimization review
```

---

## 🔄 Rollback Plan

If production MongoDB has issues:

```bash
# 1. Switch back to mock database immediately
export USE_MOCK_DB=true
npm restart

# 2. Investigate issue
tail -f logs/error.log

# 3. If data corrupted, restore from backup:
mongorestore --uri="$MONGODB_URI" --dir=backup/YYYYMMDD_HHMMSS

# 4. Once fixed, switch back to production
export USE_MOCK_DB=false
npm restart

# 5. Post-incident review and documentation
```

---

## ⏱️ Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Cloud Setup | 30 min | ⏳ Next |
| 2. Local Dev Setup | 20 min | Optional |
| 3. Environment Config | 10 min | ⏳ Next |
| 4. Schema Definition | 15 min | ⏳ Next |
| 5. Data Migration | 30 min | ⏳ Next |
| 6. Security Hardening | 15 min | ⏳ Next |
| 7. Performance Tuning | 15 min | ⏳ Next |
| 8. Backup Setup | 15 min | ⏳ Next |
| 9. Verification | 30 min | ⏳ Next |
| 10. Deployment | 20 min | ⏳ Next |

**Total: ~3 hours for complete production setup**

---

## 📞 Troubleshooting

### Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:27017
Solution: MongoDB not running or wrong URI in .env

Error: authentication failed
Solution: Check username/password/authSource in connection string

Error: IP not whitelisted
Solution: Add your IP in MongoDB Atlas → Network Access
```

### Migration Issues
```
Error: Document too large
Solution: Split large documents or increase server limits

Error: Duplicate key error
Solution: Set allowDiskUse=true in migration script

Error: Timeout during migration
Solution: Increase MONGODB_TIMEOUT and use batch processing
```

### Performance Issues
```
Slow queries:
Solution: Review slow query log, add appropriate indexes

High CPU:
Solution: Check for full collection scans, optimize queries

Connection pool exhausted:
Solution: Increase maxPoolSize, reduce query timeout
```

---

## 📚 Additional Resources

- MongoDB Documentation: https://docs.mongodb.com
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Performance Optimization: https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/
- Security Best Practices: https://docs.mongodb.com/manual/security/

---

**Next Steps:** Execute Phase 1 - MongoDB Atlas setup (30 minutes)

Generated: February 20, 2026  
Status: ✅ Ready for Implementation  
Environment: Production-Grade

