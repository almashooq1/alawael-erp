# 🚀 PHASE 2 INFRASTRUCTURE SETUP GUIDE
**Complete End-to-End Production Infrastructure Deployment**

**Start Date:** February 20, 2026  
**Target Completion:** February 23-25, 2026 (3-5 days)  
**Status:** 🟡 **EXECUTION STARTING NOW**

---

## 📋 TABLE OF CONTENTS

1. [Pre-Flight Checklist](#pre-flight-checklist)
2. [Step 1: MongoDB Setup](#step-1-mongodb-setup)
3. [Step 2: Redis Cache Setup](#step-2-redis-cache-setup)
4. [Step 3: Email Service Setup](#step-3-email-service-setup)
5. [Step 4: Monitoring Setup](#step-4-monitoring-setup)
6. [Step 5: Security & SSL/TLS](#step-5-security--ssltls)
7. [Step 6: Configuration & Validation](#step-6-configuration--validation)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Success Metrics](#success-metrics)
10. [Completion Checklist](#completion-checklist)

---

## ✅ PRE-FLIGHT CHECKLIST

Before starting Phase 2, verify you have:

```
REQUIRED ITEMS:
☐ Valid credit card (for cloud services if choosing managed options)
☐ Computer with internet connection
☐ Access to your domain registrar
☐ Team members assigned to each task
☐ 3-5 hours available today for Setup Day 1
☐ Backup of current .env.staging file
☐ Git repository access with push permissions
☐ Current staging deployment running (verified working)
☐ Phase 1 documentation reviewed

OPTIONAL ITEMS:
☐ Docker Desktop installed (if self-hosting option chosen)
☐ Docker Compose v2.0+ (if self-hosting option chosen)
☐ kubectl (if Kubernetes deployment planned)
☐ VPN access (if company requires)
```

**Verification Command:**
```powershell
# Check current staging status
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend
npm start  # Should show "Server running on port 3001"
```

---

# STEP 1: MONGODB SETUP

**Objective:** Establish production database with automatic backups  
**Time Required:** 1-2 hours  
**Difficulty:** Easy  
**Success Indicator:** Can connect from backend and verify collections

## 🎯 Option A: MongoDB Atlas (RECOMMENDED FOR PRODUCTION)

### Why MongoDB Atlas?
- ✅ Managed service (no DevOps overhead)
- ✅ Automatic daily backups
- ✅ 99.99% uptime SLA
- ✅ Built-in monitoring
- ✅ Scales horizontally
- ✅ Free tier available (512 MB storage)
- ✅ Transparent pricing

### Step 1A.1: Create MongoDB Atlas Account

1. **Visit:** https://www.mongodb.com/cloud/atlas
2. **Click:** "Try Free"
3. **Sign Up With:**
   - Google account OR
   - Email (recommended)
4. **Verify Email** (check spam folder)
5. **Accept Terms of Service**
6. **Set Organization Name:** `Alawael-ERP`
7. **Set Project Name:** `Alawael-Production`
8. **Click:** Create Project

**🟢 Status:** Account created

### Step 1A.2: Create Database Cluster

1. **Click:** "Build a Cluster"
2. **Select Cloud Provider:**
   - Provider: AWS (or your preferred region)
   - Region: us-east-1 (or closest to your users)
   - Tier: M10 (production) or M0 (testing/free)
   
   > **Production Recommendation:** M10 cluster ($57/month)
   > - 10 GB storage
   > - 40,000 IOPS
   > - 2 GB RAM per node
   > - 3-node replica set
   > 
   > **Testing Recommendation:** M0 (Free tier)
   > - 512 MB storage
   > - No replication
   > - Limited performance

3. **Click:** "Create Cluster"
4. **Wait:** 5-10 minutes for cluster to initialize

**🟢 Status:** Cluster provisioning

### Step 1A.3: Create Database User

1. **In Atlas Dashboard, go to:** Security > Database Access
2. **Click:** "Add New Database User"
3. **Fill Form:**
   - Username: `alawael_prod_user`
   - Password: **Generate Secure Password**
     ```
     ✓ Use MongoDB's password generator
     ✓ Copy and save in secure location
     ✓ Minimum 32 characters
     ```
   - Database User Privileges: `Read and write to any database`
4. **Click:** "Add User"

**🟢 Status:** User created

### Step 1A.4: Configure IP Whitelist

1. **Go to:** Security > Network Access
2. **Click:** "Add IP Address"
3. **Choose Option:**
   - **For Testing:** `0.0.0.0/0` (allow all - ⚠️ not for production)
   - **For Production:** Add your company's IP address(es)
   - **For Cloud Deployment:** Add your cloud provider's IP range
4. **Click:** "Confirm"

**🟢 Status:** Network access configured

### Step 1A.5: Get Connection String

1. **Go to:** Clusters > Connect
2. **Click:** "Connect your application"
3. **Select:**
   - Language: Node.js
   - Driver: 3.12 or later
4. **Copy Connection String:**
   ```
   mongodb+srv://alawael_prod_user:<password>@alawael-cluster.mongodb.net/alawael_production?retryWrites=true&w=majority
   ```
5. **Replace:**
   - `<password>` with your actual password
   - Keep your password secure!

**🟢 Status:** Connection string obtained

### Step 1A.6: Initialize Collections

1. **In Atlas Dashboard, go to:** Clusters > Collections
2. **Click:** "Create Database"
3. **Database Name:** `alawael_production`
4. **Collection Name:** `orders`
5. **Click:** "Create"
6. **Repeat for each collection:**
   - `products`
   - `customers`
   - `users`
   - `notifications`
   - `analytics`
   - `audit_logs`

**🟢 Status:** Collections initialized

---

## 🎯 Option B: Self-Hosted MongoDB (Docker)

### When to Use Self-Hosted?
- Testing/development environments
- Low traffic applications
- Organizations with DevOps teams
- Custom deployment requirements

### Step 1B.1: Create Docker Container

```powershell
# Navigate to project directory
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666

# Create data volume directory
mkdir -p mongo-data
mkdir -p mongo-logs

# Run MongoDB container
docker run -d `
  --name mongodb-production `
  --restart always `
  -p 27017:27017 `
  -e MONGO_INITDB_ROOT_USERNAME=alawael_prod_user `
  -e MONGO_INITDB_ROOT_PASSWORD=YOUR_SECURE_PASSWORD_HERE `
  -v $PWD/mongo-data:/data/db `
  -v $PWD/mongo-logs:/var/log/mongodb `
  mongo:latest

# Verify container is running
docker ps | findstr mongodb-production
```

### Step 1B.2: Initialize Databases

```powershell
# Connect to MongoDB
docker exec -it mongodb-production mongosh -u alawael_prod_user -p YOUR_PASSWORD --authenticationDatabase admin

# In MongoDB shell, create databases:
use alawael_production
db.createCollection("orders")
db.createCollection("products")
db.createCollection("customers")
db.createCollection("users")
db.createCollection("notifications")
db.createCollection("analytics")
db.createCollection("audit_logs")

# Exit shell
exit
```

### Step 1B.3: Connection String

```
mongodb://alawael_prod_user:YOUR_PASSWORD@localhost:27017/alawael_production?authSource=admin
```

---

## ✅ VERIFICATION: MongoDB is Working

**Test 1: Connection from Backend**

1. Update `erp_new_system/backend/.env.production`:
   ```env
   MONGODB_URL=mongodb+srv://alawael_prod_user:YOUR_PASSWORD@alawael-cluster.mongodb.net/alawael_production?retryWrites=true&w=majority
   ```

2. Test connection:
   ```powershell
   cd erp_new_system/backend
   npm test 2>&1 | findstr "MongoDB\|Connected\|succ"
   ```

3. **Expected Output:**
   ```
   ✓ MongoDB connection successful
   ✓ Collections initialized
   ✓ Indexes created
   ```

**Test 2: Insert & Retrieve Sample Data**

```powershell
# Using mongosh or MongoDB Compass
db.products.insertOne({
  name: "Test Product",
  price: 99.99,
  created_at: new Date()
})

# Should return: { acknowledged: true, insertedId: ObjectId(...) }
```

**Test 3: Verify Backup Schedule**

Atlas automatically creates daily backups. Verify:
1. **In Atlas Dashboard:** Clusters > Backups
2. **Check:** Green checkmark visible
3. **Next backup:** Shows scheduled time

---

# STEP 2: REDIS CACHE SETUP

**Objective:** Deploy caching layer for 90-95% performance improvement  
**Time Required:** 30 minutes  
**Difficulty:** Very Easy  
**Success Indicator:** Cache hit ratio > 80%, latency < 1ms

## 🎯 Option A: Redis Cloud (RECOMMENDED)

### Why Redis Cloud?
- ✅ Free tier with 30 MB
- ✅ Automatic failover
- ✅ Built-in persistence
- ✅ 99.99% uptime SLA
- ✅ Easy scaling
- ✅ Transparent pricing

### Step 2A.1: Create Redis Cloud Account

1. **Visit:** https://redis.com/try-free/
2. **Click:** "Get Started"
3. **Sign Up:**
   - Google account OR
   - Email
4. **Agree to Terms**
5. **Create Account**

**🟢 Status:** Account created

### Step 2A.2: Create Redis Database

1. **In Dashboard, click:** "New Database"
2. **Select:**
   - Cloud: AWS
   - Region: us-east-1
   - Tier: Free (30 MB) or Fixed (100 MB+)
3. **Name:** `alawael-cache`
4. **Click:** "Activate database"
5. **Wait:** 2-3 minutes

**🟢 Status:** Database provisioned

### Step 2A.3: Get Connection Details

1. **In Database view, find:**
   - Public endpoint: `redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com:12345`
   - Default user password: ✓ Shown in credentials

2. **Connection URL:**
   ```
   redis://:YOUR_PASSWORD@redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com:12345
   ```

**🟢 Status:** Connection details obtained

---

## 🎯 Option B: Redis Docker (Self-Hosted)

### Step 2B.1: Create Redis Container

```powershell
# Create Redis container with password protection
docker run -d `
  --name redis-production `
  --restart always `
  -p 6379:6379 `
  redis:latest `
  redis-server --requirepass YOUR_SECURE_PASSWORD_HERE

# Verify it's running
docker ps | findstr redis-production
```

### Step 2B.2: Connection String

```
redis://:YOUR_PASSWORD@localhost:6379
```

---

## ✅ VERIFICATION: Redis is Working

**Test 1: Test Connection**

```powershell
# For Redis Cloud, use redis-cli or test from backend
# Create a test script:

# test-redis.js
const redis = require('redis');

const client = redis.createClient({
  host: 'redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com',
  port: 12345,
  password: 'YOUR_PASSWORD'
});

client.on('connect', () => {
  console.log('✓ Redis connected');
  client.set('test_key', 'test_value', (err) => {
    if (!err) console.log('✓ Can write to Redis');
  });
  client.get('test_key', (err, reply) => {
    if (reply === 'test_value') console.log('✓ Can read from Redis');
    process.exit(0);
  });
});

# Run test
node test-redis.js
```

**Expected Output:**
```
✓ Redis connected
✓ Can write to Redis
✓ Can read from Redis
```

---

# STEP 3: EMAIL SERVICE SETUP

**Objective:** Configure multi-channel notification delivery (Email, SMS, Push)  
**Time Required:** 45 minutes  
**Difficulty:** Easy  
**Success Indicator:** Test email arrives in inbox within 2 seconds

## 🎯 Option A: SendGrid (RECOMMENDED - Professional)

### Why SendGrid?
- ✅ Best-in-class delivery (99.1% average)
- ✅ Free tier: 100 emails/day
- ✅ Detailed analytics
- ✅ Template support
- ✅ Webhook integration
- ✅ $20/month for 40k emails

### Step 3A.1: Create SendGrid Account

1. **Visit:** https://sendgrid.com/
2. **Click:** "Free"
3. **Sign Up:**
   - Email
   - Password
   - Company name: "Alawael"
4. **Verify Email**
5. **Complete Setup Wizard**

**🟢 Status:** Account created

### Step 3A.2: Verify Sender Email

1. **Go to:** Settings > Sender Authentication
2. **Click:** "Verify a Single Sender"
3. **Fill Form:**
   - From Email: `noreply@alawael-erp.com`
   - From Name: `Alawael ERP System`
   - Reply To: `support@alawael-erp.com`
4. **Click:** "Create"
5. **Check Email** for verification link
6. **Click Link** to verify

**🟢 Status:** Sender verified

### Step 3A.3: Create API Key

1. **Go to:** Settings > API Keys
2. **Click:** "Create API Key"
3. **Name:** `Production-API-Key`
4. **Permissions:** Full Access
5. **Click:** "Create & View"
6. **Copy Key:**
   ```
   SG.YOUR_API_KEY_HERE_STARTS_WITH_SG
   ```
   **⚠️ Keep this secure!**

**🟢 Status:** API key created

### Step 3A.4: Setup Contact Lists (Optional)

1. **Go to:** Marketing > Contacts
2. **Create Lists:**
   - `Support Subscribers`
   - `Admin Notifications`
   - `Alert Recipients`
3. **Add test email:** your@email.com

**🟢 Status:** Contact lists ready

---

## 🎯 Option B: Gmail (FREE - Simple)

### Step 3B.1: Create Gmail Account or Use Existing

1. Visit: https://gmail.com
2. Create or use existing Gmail account

### Step 3B.2: Generate App Password

1. **Go to:** Google Account > Security
2. **Enable 2-Factor Authentication** (if not already)
3. **Create App Password:**
   - Select App: Mail
   - Select Device: Windows
4. **Copy:** App password (16 characters)

### Step 3B.3: Configuration

```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM=noreply@alawael-erp.com
```

---

## 🎯 Option C: AWS SES (Enterprise)

### Step 3C.1: Create AWS Account

Visit: https://aws.amazon.com > Create Account

### Step 3C.2: Request Production Access

1. **Go to:** SES Console
2. **Request Production Sending Access**
3. **Fill Application Form:**
   - Sending use case: Transactional
   - Website: alawael-erp.com
   - Estimated volume: Start with honest estimate
4. **Wait:** 24 hours for approval

### Step 3C.3: Verify Sender Email

1. **At SES Console > Email Addresses**
2. **Verify a New Email:** `noreply@alawael-erp.com`
3. **Click verification link** sent to email
4. **Repeat for:** `support@alawael-erp.com`

---

## ✅ VERIFICATION: Email Service is Working

### SendGrid Test

```powershell
# Create test-email.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('SG.YOUR_API_KEY_HERE');

const msg = {
  to: 'your-email@example.com',
  from: 'noreply@alawael-erp.com',
  subject: '✓ Alawael ERP - Email Test',
  text: 'If you see this, email delivery is working!',
  html: '<strong>✓ Email delivery successful!</strong>',
};

sgMail.send(msg)
  .then(() => console.log('✓ Email sent successfully'))
  .catch(error => console.error('✗ Email send failed:', error));

# Install dependency
npm install @sendgrid/mail

# Run test
node test-email.js
```

**Expected Result:**
- ✓ Email appears in inbox within 2 seconds
- ✓ Subject shows: "✓ Alawael ERP - Email Test"
- ✓ Email comes from: noreply@alawael-erp.com

---

# STEP 4: MONITORING SETUP

**Objective:** Setup real-time monitoring, dashboards, and alerting  
**Time Required:** 1-2 hours  
**Difficulty:** Medium  
**Success Indicator:** Dashboard shows live metrics, alerts configured

## 🎯 Option A: Azure Application Insights (EASIEST - RECOMMENDED)

### Why Application Insights?
- ✅ Free tier: 5 GB/month
- ✅ No setup required with Azure
- ✅ Auto-instrumentation
- ✅ Smart alerts
- ✅ Works with any Node.js app
- ✅ Deep integration with Azure

### Step 4A.1: Create Azure Account

1. **Visit:** https://azure.microsoft.com/free
2. **Click:** "Start Free"
3. **Sign Up:**
   - Microsoft account OR
   - Create new
4. **Add Payment Method** (no charge for free tier)
5. **Complete Setup**

**🟢 Status:** Azure account created

### Step 4A.2: Create Application Insights Resource

1. **In Azure Portal, click:** "+ Create a resource"
2. **Search:** "Application Insights"
3. **Click:** Create
4. **Fill Form:**
   - Name: `alawael-erp-prod`
   - Resource Group: Create new: `alawael-prod`
   - Location: East US (or nearest)
   - Platform: Node.js
5. **Click:** Review + Create > Create
6. **Wait:** Resource deployment (1-2 minutes)

**🟢 Status:** Resource created

### Step 4A.3: Get Instrumentation Key

1. **In Application Insights resource > Overview**
2. **Copy:** Instrumentation Key (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. **Save** to .env.production:
   ```env
   APPINSIGHTS_INSTRUMENTATION_KEY=your_key_here
   ```

**🟢 Status:** Instrumentation key configured

### Step 4A.4: Install SDK

```powershell
cd erp_new_system/backend

# Install Application Insights SDK
npm install applicationinsights

# Verify installation
npm list applicationinsights
```

### Step 4A.5: Initialize in Application

Add to `erp_new_system/backend/server.js` (at very top):

```javascript
// Application Insights initialization
const appInsights = require('applicationinsights');
appInsights
  .setup(process.env.APPINSIGHTS_INSTRUMENTATION_KEY || '')
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true)
  .setUseDiskRetryCaching(true)
  .start();
```

**🟢 Status:** SDK initialized

### Step 4A.6: Create Dashboards

1. **In Application Insights > Overview**
2. **Create Dashboard:**
   - Click: "Workbooks"
   - Click: "+ New"
   - Add Charts:
     - Request Rate
     - Failed Requests
     - Server Response Time
     - Dependencies
     - Exceptions
3. **Save** as "Production Dashboard"

**🟢 Status:** Dashboard created

### Step 4A.7: Setup Alerts

1. **In Application Insights > Alerts**
2. **Create Alert Rule:**
   - Condition: `Server response time > 1000ms`
   - Action: Send Email
   - Recipient: alerts@alawael-erp.com
3. **Create Another:**
   - Condition: `Failed requests > 1% of total`
   - Action: Send Email
4. **Save**

**🟢 Status:** Alerts configured

---

## 🎯 Option B: Datadog (Professional Premium)

### Step 4B.1: Create Datadog Account

1. **Visit:** https://www.datadoghq.com
2. **Sign Up:** Free trial
3. **Create Organization:** Alawael
4. **Select Region:** US

### Step 4B.2: Install Datadog Agent

```powershell
# Install Node.js package
npm install dd-trace

# Add to .env
DATADOG_API_KEY=your_api_key
DATADOG_APP_KEY=your_app_key
DATADOG_SITE=datadoghq.com
```

---

## 🎯 Option C: CloudWatch (AWS Integrated)

### Step 4C.1: Setup CloudWatch

1. **In AWS Console > CloudWatch**
2. **Create Log Group:** `/aws/alawael-erp/prod`
3. **Create Dashboards**
4. **Configure Alarms**

---

## ✅ VERIFICATION: Monitoring is Working

**For Application Insights:**

1. **In Azure Portal > Application Insights > Overview**
2. **Look for:**
   - ✓ Server response time chart
   - ✓ Failed requests section
   - ✓ Recent activity
3. **Generate Test Traffic:**
   ```powershell
   # Send 100 test requests to backend
   for ($i = 1; $i -le 100; $i++) {
     curl http://localhost:3001/api/health
   }
   ```
4. **Refresh Dashboard**
5. **Should see:** Spikes in request rate

---

# STEP 5: SECURITY & SSL/TLS

**Objective:** Implement HTTPS, encryption, and security hardening  
**Time Required:** 1-2 hours  
**Difficulty:** Medium  
**Success Indicator:** HTTPS working, Security headers present

## 5.1: Obtain SSL/TLS Certificates

### Option A: Let's Encrypt (FREE - Recommended)

```powershell
# Install Certbot
# For Windows: Download from https://certbot.eff.org/instructions?os=windows

# Generate certificate
.\certbot-auto certonly --standalone -d alawael-erp.com

# Certificates saved to: C:\Certbot\live\alawael-erp.com\
```

### Option B: Self-Signed (Development Only)

```powershell
# Generate 365-day self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# When prompted:
# Country: SA
# State: Riyadh
# City: Riyadh
# Organization: Alawael
# Common Name: alawael-erp.com
```

### Option C: Commercial Certificate

- DigiCert, GoDaddy, or other providers
- Purchase annual certificate
- Install in production environment

## 5.2: Configure HTTPS in Backend

Update `erp_new_system/backend/server.js`:

```javascript
const https = require('https');
const fs = require('fs');

// Only if HTTPS is enabled
if (process.env.SSL_ENABLED === 'true') {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  };
  
  https.createServer(options, app).listen(443, () => {
    console.log('✓ HTTPS Server running on port 443');
  });
} else {
  app.listen(PORT, () => {
    console.log(`✓ HTTP Server running on port ${PORT}`);
  });
}
```

Update `.env.production`:

```env
SSL_ENABLED=true
SSL_KEY_PATH=/etc/certs/alawael-key.pem
SSL_CERT_PATH=/etc/certs/alawael-cert.pem
HTTPS_REDIRECT=true
```

## 5.3: Security Headers

Add Helmet middleware:

```powershell
npm install helmet
```

Update `server.js`:

```javascript
const helmet = require('helmet');

app.use(helmet({
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));
```

## 5.4: Rate Limiting

Configured in `securityHardening.js` - already deployed.

Verify in `.env.production`:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

---

# STEP 6: CONFIGURATION & VALIDATION

**Objective:** Update all environment variables and validate complete system  
**Time Required:** 1 hour  
**Difficulty:** Easy  
**Success Indicator:** All tests pass, system fully operational

## 6.1: Update .env.production

### Current File Location
`erp_new_system/backend/.env.production`

### Configuration Sections to Update

#### Database Connection
```env
MONGODB_URL=mongodb+srv://alawael_prod_user:YOUR_PASSWORD@alawael-cluster.mongodb.net/alawael_production?retryWrites=true&w=majority
MONGODB_DB_NAME=alawael_production
```

#### Redis Connection
```env
REDIS_HOST=redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
```

#### Email Service
```env
SENDGRID_API_KEY=SG.YOUR_API_KEY_HERE
EMAIL_FROM=noreply@alawael-erp.com
```

#### Monitoring
```env
APPINSIGHTS_INSTRUMENTATION_KEY=YOUR_INSTRUMENTATION_KEY
```

#### Security
```env
JWT_SECRET=your-super-secret-key-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key
```

## 6.2: Environment Variable Validation Script

Create `validate-env.js`:

```javascript
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

const required = [
  'MONGODB_URL',
  'REDIS_HOST',
  'REDIS_PASSWORD',
  'SENDGRID_API_KEY',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'APPINSIGHTS_INSTRUMENTATION_KEY'
];

console.log('🔍 Validating environment variables...\n');

let valid = true;
required.forEach(key => {
  const value = process.env[key];
  if (!value || value.includes('YOUR_') || value.includes('CHANGE_')) {
    console.log(`✗ ${key}: MISSING or PLACEHOLDER`);
    valid = false;
  } else {
    const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4);
    console.log(`✓ ${key}: ${masked}`);
  }
});

console.log('\n' + (valid ? '✓ All variables configured!' : '✗ Fix missing variables!'));
process.exit(valid ? 0 : 1);
```

Run validation:

```powershell
cd erp_new_system/backend
node validate-env.js
```

## 6.3: Full System Tests

Run complete test suite:

```powershell
cd erp_new_system/backend

# Run all tests
npm test

# Or run specific test files
npm test -- tests/advanced-features.integration.test.js
npm test -- tests/mongodb.test.js
npm test -- tests/redis.test.js
```

**Expected Output:**
```
✓ MongoDB Connection Test
✓ Redis Cache Test
✓ Email Service Test
✓ Rate Limiting Test
✓ Security Headers Test
✓ JWT Authentication Test
✓ Feature Flags Test
✓ Analytics Tracking Test
✓ All 356+ tests passing
```

## 6.4: Integration Test Command

```powershell
# Test all infrastructure components
npm test 2>&1 | findstr "pass\|fail\|✓\|✗"
```

---

# TROUBLESHOOTING GUIDE

## MongoDB Issues

### Issue: "Unable to connect to MongoDB Atlas"
**Solutions:**
1. ✓ Check IP whitelist in Atlas > Network Access
2. ✓ Verify password URL-encoded if special characters
3. ✓ Confirm database user created
4. ✓ Test with MongoDB Compass (GUI tool)

### Issue: "Collections not found"
**Solutions:**
1. ✓ Verify collections created in Atlas UI
2. ✓ Check database name in connection string
3. ✓ Run initialization script again

---

## Redis Issues

### Issue: "Connection refused"
**Solutions:**
1. ✓ Verify Redis Cloud database is running (check status)
2. ✓ Confirm password is correct
3. ✓ Check IP whitelist if self-hosted

### Issue: "Cache hit ratio is low"
**Solutions:**
1. ✓ Check TTL settings (should be 3600s default)
2. ✓ Verify cache is enabled (`CACHE_ENABLED=true`)
3. ✓ Check cache key patterns are correct

---

## Email Issues

### Issue: "Emails not delivering"
**Solutions:**
1. ✓ Check sender email is verified in SendGrid
2. ✓ Verify API key is correct
3. ✓ Check spam/junk folder
4. ✓ Review SendGrid activity log

### Issue: "Authentication failed"
**Solutions:**
1. ✓ Confirm API key not expired
2. ✓ Regenerate new API key if needed
3. ✓ Check .env variable name matches

---

## Monitoring Issues

### Issue: "No data appearing in dashboards"
**Solutions:**
1. ✓ Verify instrumentation key is correct
2. ✓ Wait 2-3 minutes for data to appear
3. ✓ Generate test traffic to dashboard
4. ✓ Check SDK is initialized in server.js

### Issue: "Alerts not sending"
**Solutions:**
1. ✓ Verify alert rule is enabled
2. ✓ Confirm action group is configured
3. ✓ Test alert from portal
4. ✓ Check email recipient is correct

---

# SUCCESS METRICS

## Infrastructure Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Database Response** | < 50ms | p50 latency |
| **Cache Hit Ratio** | > 80% | Percentage |
| **API Availability** | > 99.9% | Uptime |
| **Error Rate** | < 0.5% | Percentage |
| **Response Time (p99)** | < 500ms | Backend response |
| **Memory Usage** | < 80% | System monitoring |
| **CPU Usage** | < 70% | System monitoring |
| **Disk Usage** | < 85% | Filesystem |

## Health Check Indicators

✓ **MongoDB:**
- Connection successful
- Collections accessible
- Backup scheduled
- Replication active (if M10+)

✓ **Redis:**
- Connection successful
- Key-value operations work
- TTL expiration working
- Memory under 80%

✓ **Email:**
- Test email received in < 2 seconds
- Delivery rate > 98%
- No spam folder placement

✓ **Monitoring:**
- Dashboard showing live metrics
- Alerts configured and tested
- Trace sampling at appropriate rate
- Log aggregation working

✓ **Security:**
- SSL/TLS enabled
- Headers present in responses
- Rate limiting active
- Encryption working

---

# COMPLETION CHECKLIST

## Day 1 Completion (Infrastructure Setup)

```
MONGODB ATLAS:
☐ Account created
☐ Cluster created (M10 or M0)
☐ Database user created
☐ IP whitelist configured
☐ Connection string obtained
☐ Collections initialized
☐ Connection tested from backend
☐ Backup schedule verified

REDIS CLOUD:
☐ Account created
☐ Database created
☐ Connection endpoint obtained
☐ Password configured
☐ TTL policies set
☐ Connection tested from backend
☐ Performance verified

EMAIL SERVICE (SendGrid):
☐ Account created
☐ Sender email verified
☐ API key generated
☐ Test email delivered
☐ .env variable configured
☐ Bounce handling enabled

MONITORING (Application Insights):
☐ Resource created in Azure
☐ Instrumentation key obtained
☐ SDK installed in backend
☐ Initialization code added
☐ Dashboard created
☐ Alerts configured
☐ Test traffic sent
☐ Metrics visible in dashboard

SECURITY:
☐ SSL certificates obtained
☐ HTTPS configured
☐ Security headers enabled
☐ Rate limiting verified
☐ Encryption keys configured
☐ All credentials in .env (not code)
```

## Day 2 Completion (Full Validation)

```
☐ Environment variables validated
☐ All tests passing (356+)
☐ Database performance acceptable
☐ Cache hit ratio > 80%
☐ Email delivery working
☐ Monitoring dashboards live
☐ Alerts tested and working
☐ Security scan passing
☐ Backup schedule confirmed
☐ Team trained on infrastructure
☐ Runbooks documented
☐ On-call procedures established
☐ Stakeholder approval obtained
```

## Phase 2 → Phase 3 Gate

**Approval Criteria:**

```
✅ ALL infrastructure operational and healthy
✅ Database: Connected, collections initialized, backups scheduled
✅ Cache: Hit ratio > 80%, latency < 1ms
✅ Email: Test delivery successful, < 2sec latency
✅ Monitoring: Live dashboards with alerts active
✅ Security: SSL/TLS enabled, rate limiting active, encryption working
✅ Tests: 100% pass rate (356+ tests)
✅ Team: Trained and ready
✅ Documentation: Complete with runbooks
✅ Stakeholders: Approved for production

WHEN ALL ABOVE ✅:
→ READY FOR PHASE 3 (10% Production Rollout)
```

---

## 📞 SUPPORT CONTACTS

| Issue | Contact | Response Time |
|-------|---------|---------------|
| MongoDB | alawael_prod_user @ MongoDB Atlas | 24 hours |
| Redis | support @ redis.com | 4 hours |
| SendGrid | support @ sendgrid.com | 2 hours |
| Azure | Azure Support Portal | 1 hour |
| System | DevOps Team | On-call |

---

## 📚 REFERENCE DOCUMENTATION

- MongoDB Atlas: https://docs.atlas.mongodb.com
- Redis Cloud: https://redis.com/docs/
- SendGrid: https://docs.sendgrid.com
- Application Insights: https://docs.microsoft.com/application-insights
- Node.js Best Practices: https://nodejs.org/en/docs/guides/

---

**Status:** 🟡 **READY FOR IMMEDIATE EXECUTION**

**Timeline:** 3-5 days to complete all phases  
**Next Step:** Follow Day 1 MongoDB setup above  
**Target Completion:** February 23-25, 2026

---

**Good luck with Phase 2 infrastructure setup! 🚀**
