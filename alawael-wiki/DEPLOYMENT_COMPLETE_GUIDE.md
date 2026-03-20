# 🚀 Production Deployment Guide - Alawael Enterprise Platform

**Version:** 1.0.0  
**Last Updated:** February 22, 2026  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Development Setup](#local-development-setup)
3. [Docker Containerization](#docker-containerization)
4. [Cloud Deployment](#cloud-deployment)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### **Code Ready**
- [ ] All tests passing (500+ test cases)
- [ ] Code reviewed and approved
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] Documentation up to date
- [ ] Version bumped (v1.0.0+)

### **Infrastructure Ready**
- [ ] MongoDB 7.0+ installed and configured
- [ ] Redis 7+ installed and configured
- [ ] Node.js 18+ installed
- [ ] Git configured
- [ ] SSH keys generated

### **Credentials & Secrets**
- [ ] `.env.production` configured
- [ ] Database credentials secured
- [ ] API keys generated
- [ ] JWT secret configured
- [ ] SSL certificates ready

### **Monitoring Setup**
- [ ] Sentry initialized
- [ ] Monitoring dashboards created
- [ ] Alert thresholds configured
- [ ] Log aggregation setup
- [ ] Health check endpoints verified

---

## 🛠️ Local Development Setup

### **Requirements**
```bash
Node.js 18+
npm or yarn 8+
MongoDB 7.0+
Redis 7+
Git 2.30+
```

### **Step 1: Clone Repository**
```bash
git clone https://github.com/almashooq1/alawael-backend.git
cd alawael-backend
git checkout main
```

### **Step 2: Install Dependencies**
```bash
npm install
# Or with yarn
yarn install
```

### **Step 3: Configure Environment**
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required Environment Variables:**
```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
MONGODB_URI=mongodb://localhost:27017/alawael
MONGODB_OPTIONS_POOL_SIZE=10

# Cache
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password

# Authentication
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# 2FA
OTP_WINDOW=6
TOTP_WINDOW=1

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# API Keys
STRIPE_SECRET_KEY=
STRIPE_PUBLIC_KEY=

# External Services
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### **Step 4: Start Development Server**
```bash
npm run dev
# Server listening on http://localhost:3000
```

### **Step 5: Run Tests**
```bash
# Run all tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Specific test file
npm test -- tests/services/mlService.test.js
```

---

## 🐳 Docker Containerization

### **Build Docker Image**
```bash
# Development image
docker build -t alawael-backend:dev -f Dockerfile.dev .

# Production image
docker build -t alawael-backend:latest -f Dockerfile .
```

### **Docker Compose Setup**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: alawael-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    networks:
      - alawael-network

  redis:
    image: redis:7-alpine
    container_name: alawael-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - alawael-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: alawael-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/alawael
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - alawael-network

volumes:
  mongodb_data:
  redis_data:

networks:
  alawael-network:
    driver: bridge
```

### **Run with Docker Compose**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

---

## ☁️ Cloud Deployment

### **AWS Elastic Beanstalk**

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB
eb init -p node.js-18 alawael-production

# Create environment
eb create production-env

# Deploy
git push
# Or manual deploy
eb deploy

# View logs
eb logs

# Monitor
eb open
```

### **Heroku**

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create alawael-production
heroku addons:create mongolab:sandbox
heroku addons:create heroku-redis:premium-0

# Deploy
git push heroku main

# View logs
heroku logs --tail

# Configure env vars
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
```

### **Azure App Service**

```bash
# Create resource group
az group create --name alawael-rg --location eastus

# Create App Service plan
az appservice plan create \
  --name alawael-plan \
  --resource-group alawael-rg \
  --sku B2

# Create web app
az webapp create \
  --resource-group alawael-rg \
  --plan alawael-plan \
  --name alawael-api \
  --runtime "node|18.0"

# Deploy code
git push azure main
```

### **Google Cloud Run**

```bash
# Create Dockerfile
# (ensure Dockerfile exists)

# Build image
gcloud builds submit --tag gcr.io/PROJECT_ID/alawael

# Deploy
gcloud run deploy alawael \
  --image gcr.io/PROJECT_ID/alawael \
  --platform managed \
  --region us-central1
```

---

## 🗄️ Database Setup

### **MongoDB Replica Set (Production)**

```bash
# Start MongoDB with replica set
mongod --replSet rs0 --dbpath /data/db

# Initialize replica set (in mongo shell)
rs.initiate()
rs.add("mongo2:27017")
rs.add("mongo3:27017")

# Create admin user
db.createUser({
  user: "admin",
  pwd: "strong-password",
  roles: ["root"]
})

# Create application user
db.createUser({
  user: "alawael_app",
  pwd: "app-password",
  roles: [
    { role: "readWrite", db: "alawael" },
    { role: "readWrite", db: "alawael_backups" }
  ]
})
```

### **Create Indexes**

```javascript
// Run in MongoDB
use alawael

// Users
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 })
db.users.createIndex({ createdAt: -1 })

// Products
db.products.createIndex({ name: "text" })
db.products.createIndex({ category: 1 })
db.products.createIndex({ price: 1, category: 1 })
db.products.createIndex({ inventory: 1 })

// Orders
db.orders.createIndex({ userId: 1, createdAt: -1 })
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ createdAt: -1 })

// Transactions
db.transactions.createIndex({ userId: 1 })
db.transactions.createIndex({ timestamp: -1 })
```

---

## 🔐 Environment Configuration

### **Production `.env`**
```bash
# Security
NODE_ENV=production
JWT_SECRET=use-strong-random-string-min-32-chars
JWT_EXPIRY=7d
SECURITY_LOG_LEVEL=info

# Database - MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/alawael?retryWrites=true&w=majority

# Redis - Elasticache or equivalent
REDIS_URL=redis://:password@redis-instance.region.cache.amazonaws.com:6379

# Server
PORT=3000
CORS_ORIGIN=https://yourdomain.com

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_FROM=noreply@yourdomain.com

# Payment Gateway
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxx

# Cloud Storage
AWS_S3_BUCKET=alawael-storage
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/project-id
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_TTL=3600
SESSION_SECRET=random-session-secret
```

---

## 📊 Monitoring & Logging

### **Setup Sentry (Error Tracking)**
```bash
npm install @sentry/node @sentry/tracing

# Initialize in app.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV
});
```

### **Setup Morgan (HTTP Logging)**
```bash
npm install morgan

const morgan = require('morgan');
app.use(morgan('combined'));
```

### **Setup Winston (Application Logging)**
```bash
npm install winston

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### **Health Check Endpoint**
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    versions: {
      node: process.version,
      app: '1.0.0'
    }
  });
});
```

---

## 💾 Backup & Recovery

### **MongoDB Backup**
```bash
# Full backup
mongodump \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/alawael" \
  --out=/backups/$(date +%Y%m%d_%H%M%S)

# Restore from backup
mongorestore \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/alawael" \
  /backups/20260222_120000
```

### **Automated Backup Script**

Create `scripts/backup-mongodb.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/alawael"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="alawael"

mongodump \
  --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR/backup_$TIMESTAMP"

# Keep last 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} +

# Upload to S3
aws s3 sync $BACKUP_DIR s3://alawael-backups/

echo "Backup completed: $TIMESTAMP"
```

---

## 🔧 Troubleshooting

### **High Memory Usage**
```bash
# Check memory usage
free -h

# Check Node process
ps aux | grep node

# Restart with different memory limit
NODE_MEMORY_LIMIT=2048 npm start
```

### **Database Connection Issues**
```bash
# Test MongoDB connection
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/alawael"

# Check connection pools
db.serverStatus().connections
```

### **Redis Connection Problems**
```bash
# Test Redis
redis-cli ping
redis-cli info

# Check memory
redis-cli info memory
```

---

## 📝 Deployment Sign-Off

**Status:** ✅ Ready for Production  
**Version:** v1.0.0  
**Date:** February 22, 2026

---

**Next Review:** March 22, 2026
