# MongoDB Setup Guide for AlAwael ERP Backend

This guide provides instructions for setting up MongoDB for development,
testing, and production environments.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Integration Testing Setup](#integration-testing-setup)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Node.js v16 or higher
- MongoDB Community Server OR MongoDB Atlas account
- npm or yarn package manager

### Option 1: Local MongoDB Installation

#### Windows Installation

1. **Download MongoDB Community Server**
   - Visit: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI file format
   - Download the latest stable version

2. **Run the Installer**

   ```bash
   # Double-click the downloaded .msi file
   # Follow the installation wizard
   # Choose "Install MongoDB as a Service" option
   # Complete the installation
   ```

3. **Verify Installation**

   ```powershell
   # Open PowerShell and verify MongoDB is installed
   mongod --version
   mongo --version
   ```

4. **Start MongoDB Service**

   ```powershell
   # Start MongoDB service (should auto-start)
   net start MongoDB

   # Verify it's running
   mongosh   # Should connect to localhost:27017
   ```

#### macOS Installation

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection
mongosh
```

#### Linux Installation (Ubuntu/Debian)

```bash
# Add MongoDB repository
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify connection
mongosh
```

### Option 2: MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account**
   - Visit: https://www.mongodb.com/cloud/atlas
   - Sign up for a free account
   - Create a new project

2. **Create a Database Cluster**
   - Click "Create" on your project
   - Select "Shared Clusters" (Free tier) or "Dedicated Clusters" (Paid)
   - Choose a cloud provider and region
   - Select M0 (free tier) for development
   - Create cluster (takes 5-10 minutes)

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username and password (save these!)
   - Add privileges: "Read and write to any database"

4. **Get Connection String**
   - Click "Connect" on your cluster
   - Select "Connect with MongoDB for VS Code" OR "Connect your application"
   - Copy the connection string
   - Replace `<username>` and `<password>` with your credentials
   - Example:
     `mongodb+srv://admin:password123@cluster0.mongodb.net/alawael-db?retryWrites=true&w=majority`

5. **Network Access**
   - Go to "Network Access" (left sidebar)
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add specific IP addresses only

---

## Integration Testing Setup

### Using MongoDB Memory Server (Recommended for CI/CD)

The project uses `mongodb-memory-server` for automated testing. This provides:

- ✅ **All tests run in-memory** - no external MongoDB required
- ✅ **Isolated test environments** - each test gets fresh database
- ✅ **Fast execution** - runs locally without network calls
- ✅ **CI/CD friendly** - works in containerized environments

**Current Implementation:**

Tests are automatically gated by environment flag:

```bash
# Run core unit tests (no MongoDB needed)
npm test -- --testPathPattern="\.unit\.test\.js"
# ✅ 352 tests pass

# Run all tests with environment flag for integration tests
RUN_INTEGRATION_TESTS=true npm test
```

### Local MongoDB for Integration Testing

If you prefer to test against a real MongoDB instance:

1. **Start Local MongoDB**

   ```powershell
   # Windows
   net start MongoDB
   mongosh   # Should show: test>
   ```

2. **Set Environment Variable**

   ```powershell
   # Windows PowerShell
   $env:MONGODB_URI="mongodb://localhost:27017/alawael-test"
   $env:RUN_INTEGRATION_TESTS="true"
   $env:NODE_ENV="test"
   npm test
   ```

   ```bash
   # macOS/Linux
   export MONGODB_URI="mongodb://localhost:27017/alawael-test"
   export RUN_INTEGRATION_TESTS="true"
   export NODE_ENV="test"
   npm test
   ```

3. **Verify Connection**
   ```bash
   mongosh --eval "db.adminCommand('ping')"
   # Should output: { ok: 1 }
   ```

---

## Environment Configuration

### .env.development (Local Development)

```env
# Server
NODE_ENV=development
PORT=3001
HOSTNAME=localhost
LOG_LEVEL=debug

# MongoDB - Local Development
MONGODB_URI=mongodb://localhost:27017/alawael-dev
# OR MongoDB Atlas
MONGODB_URI=mongodb+srv://admin:password@cluster0.mongodb.net/alawael-dev?retryWrites=true&w=majority

USE_MOCK_DB=false

# Security (Development - change for production!)
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_EXPIRY=7d

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Testing
RUN_INTEGRATION_TESTS=false
RUN_PERF_TESTS=false
```

### .env.test (Automated Testing)

```env
# Server
NODE_ENV=test
PORT=3001
HOSTNAME=localhost
LOG_LEVEL=error

# MongoDB - Automatically handled by mongodb-memory-server
# Do NOT set MONGODB_URI for automated tests
USE_MOCK_DB=false

# Security (Test)
JWT_SECRET=test-secret-key
JWT_REFRESH_SECRET=test-refresh-secret
JWT_EXPIRY=7d

# Testing
RUN_INTEGRATION_TESTS=false
RUN_PERF_TESTS=false
```

### .env.production (Production)

```env
# Server
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
LOG_LEVEL=warn

# MongoDB - MUST be MongoDB Atlas or managed service
MONGODB_URI=mongodb+srv://prod_user:secure_password@prod-cluster.mongodb.net/alawael-prod?retryWrites=true&w=majority&ssl=true
USE_MOCK_DB=false

# Security - MUST be strong random keys
JWT_SECRET=<generate_with_crypto.randomBytes(32)>
JWT_REFRESH_SECRET=<generate_with_crypto.randomBytes(32)>
JWT_EXPIRY=7d

# Frontend
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Testing
RUN_INTEGRATION_TESTS=false
RUN_PERF_TESTS=false
```

---

## MongoDB Connection String Format

### Local MongoDB

```
mongodb://localhost:27017/database-name
```

### MongoDB Atlas

```
mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```

### MongoDB with Authentication

```
mongodb://username:password@host:port/database-name?authSource=admin
```

### Connection String Options

| Option             | Purpose                          | Default |
| ------------------ | -------------------------------- | ------- |
| `retryWrites=true` | Automatic retry on write failure | false   |
| `w=majority`       | Write concern level              | 1       |
| `ssl=true`         | Enable SSL/TLS encryption        | false   |
| `authSource=admin` | Authentication database          | default |

---

## Troubleshooting

### Issue: MongoDB Connection Timeout

**Error:** `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**

```powershell
# Check if MongoDB is running
net start MongoDB  # Windows
brew services start mongodb-community  # macOS
sudo systemctl start mongod  # Linux

# Verify connection
mongosh
```

### Issue: MongoDB Atlas Connection Denied

**Error:** `MongoDB connection failed: authentication failed`

**Solutions:**

1. Verify username and password in connection string
2. Check IP whitelist in MongoDB Atlas > Network Access
3. Ensure database user has proper permissions
4. Try "Allow Access from Anywhere" (0.0.0.0/0) for testing

### Issue: Tests Failing with Connection Errors

**Error:** Integration tests timeout or fail to connect

**Solution:**

- Tests use `mongodb-memory-server` by default (no connection needed)
- For real MongoDB:
  ```bash
  RUN_INTEGRATION_TESTS=true npm test
  ```

### Issue: Slow MongoDB Performance

**Solutions:**

- Add indexes: `db.collections.createIndex({ email: 1 })`
- Check MongoDB logs: View in Compass or Atlas dashboard
- Use profiling: `db.setProfilingLevel(1)`
- Optimize queries in application code

---

## Test Execution Summary

### Default Test Execution

```bash
npm test
```

✅ Runs 352+ unit tests with in-memory database ✅ No MongoDB required ✅
Execution time: ~3 seconds

### With Integration Tests (Requires MongoDB)

```bash
RUN_INTEGRATION_TESTS=true npm test
```

✅ Runs all unit tests + integration tests ⚠️ Requires MongoDB instance (local
or Atlas)

### With Performance Tests (Requires Complete Schemas)

```bash
RUN_PERF_TESTS=true npm test
```

✅ Runs all unit, integration, and performance tests ⚠️ Requires MongoDB +
complete model schemas

---

## Database Backup and Recovery

### Backup Local MongoDB

```bash
# Export all data
mongodump --uri="mongodb://localhost:27017/alawael-db" --out=./backup

# Export specific collection
mongodump --uri="mongodb://localhost:27017/alawael-db" --collection=users --out=./backup
```

### Restore from Backup

```bash
# Restore all data
mongorestore --uri="mongodb://localhost:27017/alawael-db" ./backup/alawael-db

# Restore specific collection
mongorestore --uri="mongodb://localhost:27017/alawael-db" --collection=users ./backup/alawael-db/users.bson
```

### MongoDB Atlas Backup

- Automatic daily backups included in M0+ clusters
- Manual snapshots available in Atlas console
- Restore to specific point in time

---

## Performance Optimization

### Database Indexes

```javascript
// Add indexes for frequently queried fields
db.users.createIndex({ email: 1 }, { unique: true });
db.employees.createIndex({ employeeId: 1 }, { unique: true });
db.payments.createIndex({ status: 1, createdAt: -1 });
db.auditlogs.createIndex({ userId: 1, createdAt: -1 });
```

### Connection Pooling

```javascript
// mongoose automatically manages connection pools
// Default pool size: 10 connections
// Adjust in .env if needed:
MONGODB_URI=mongodb://localhost:27017/alawael?maxPoolSize=20
```

### Query Optimization

```javascript
// Good: Efficient query with index
await User.find({ email: 'user@example.com' }).lean();

// Bad: Full collection scan
await User.find({ name: { $exists: true } });

// Better: Use proper filtering
await User.find({ status: 'active' }).select('name email');
```

---

## Quick Start Commands

```bash
# 1. Development Setup (Local MongoDB)
npm install
mongod                    # Start MongoDB in one terminal
npm start                 # Start server in another

# 2. Development Testing (In-Memory)
npm test                  # All unit tests (352+ tests, fast)
npm test -- --watch      # Watch mode for development

# 3. Integration Testing (Local MongoDB)
# Start MongoDB first
$env:MONGODB_URI="mongodb://localhost:27017/alawael-test"
$env:RUN_INTEGRATION_TESTS="true"
npm test

# 4. Production Deployment
# Update .env.production with real credentials
# Run all tests first
npm test
# Deploy to server
```

---

## Getting Help

- **MongoDB Documentation:** https://docs.mongodb.com
- **Mongoose Documentation:** https://mongoosejs.com
- **MongoDB Atlas Help:** https://www.mongodb.com/cloud/atlas/help
- **Project Issues:** Check GitHub Issues
- **Installation Issues:** Run
  `node -e "console.log(process.platform, process.arch)"`

---

**Last Updated:** February 10, 2026 **Version:** 1.0.0
