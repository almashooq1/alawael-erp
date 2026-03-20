# 🚀 ALAWAEL ERP Deployment & Operations Guide

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Local Setup](#local-setup)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)
8. [Scaling & Performance](#scaling--performance)

---

## Quick Start

### 1️⃣ Clone & Setup (5 minutes)
```bash
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# Copy environment file
cp .env.example .env

# Install dependencies
npm install
```

### 2️⃣ Start Services (3 minutes)
```bash
# Option A: Docker Compose (recommended)
docker-compose up -d

# Option B: Manual start
cd backend && npm start &
cd frontend && npm start &
```

### 3️⃣ Access Application
- **Frontend:** http://localhost:5173 or http://localhost:3001
- **Backend API:** http://localhost:3000/api
- **API Docs:** http://localhost:3000/api/docs

---

## Prerequisites

### System Requirements
- **OS:** Linux, macOS, or Windows (with WSL2)
- **CPU:** 2+ cores minimum, 4+ cores recommended
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 20GB available space

### Software Requirements
```
Node.js:        18.x or 20.x LTS
npm:            8.x or higher
MongoDB:        5.0 or higher
Redis:          6.0 or higher
Docker:         20.10+ (optional)
Docker Compose: 2.0+ (optional)
Git:            2.25+
```

### Installation

#### macOS
```bash
# Using Homebrew
brew install node@20
brew install mongodb-community
brew install redis
brew install docker
```

#### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y mongodb
sudo apt-get install -y redis-server
sudo apt-get install -y docker.io docker-compose
```

#### Windows
```powershell
# Using Chocolatey
choco install nodejs
choco install mongodb
choco install redis
choco install docker-desktop
```

---

## Local Setup

### Step 1: Environment Configuration

```bash
# Copy template
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required Variables:**
```env
# Backend
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/alawael
REDIS_URL=redis://localhost:6379

# Frontend
REACT_APP_API_URL=http://localhost:3000/api

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRE=24h

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 2: Database Setup

```bash
# Start MongoDB
mongod --dbpath ./data/mongodb

# In new terminal, seed database
cd backend
npm run seed

# Or manually:
node scripts/seedDatabase.js
```

### Step 3: Install Dependencies

```bash
# Root dependencies
npm install

# Backend
cd backend
npm install

# Frontend
cd frontend
npm install

# Mobile (optional)
cd mobile
npm install
```

### Step 4: Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Redis (if not running)
redis-server

# Terminal 4: Mobile (optional)
cd mobile
npm start
```

### Step 5: Verify Installation

```bash
# Test backend
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost:5173

# View logs
pm2 logs backend
pm2 logs frontend
```

---

## Docker Deployment

### Single Command Setup

```bash
# Clone and setup
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Docker Compose Configuration

The project includes `docker-compose.yml` with:
- **Backend Container** (Node.js + Express)
- **Frontend Container** (React + Nginx)
- **MongoDB Container** (Database)
- **Redis Container** (Cache)
- **Nginx Container** (Reverse Proxy)

### Services
```yaml
Services:
  - backend:3000
  - frontend:80 (proxied via nginx)
  - mongodb:27017
  - redis:6379
  - nginx:80, 443 (reverse proxy)
```

### Useful Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build --no-cache

# Remove volumes
docker-compose down -v

# Execute command in container
docker-compose exec backend npm test

# Scale service
docker-compose up -d --scale backend=3
```

---

## Production Deployment

### Option 1: Ubuntu VPS (DigitalOcean, Linode, AWS)

```bash
# 1. Connect to VPS
ssh root@your-ip

# 2. Update system
apt-get update && apt-get upgrade -y

# 3. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs mongodb redis-server docker.io

# 4. Clone repository
git clone https://github.com/almashooq1/alawael-erp.git /opt/alawael
cd /opt/alawael

# 5. Configure environment
nano .env
# Set NODE_ENV=production

# 6. Start services
docker-compose -f docker-compose.prod.yml up -d

# 7. Setup SSL (Let's Encrypt)
apt-get install -y certbot python3-certbot-nginx
certbot certonly --standalone -d your-domain.com

# 8. Configure Nginx
cp deployment/nginx/nginx.prod.conf /etc/nginx/sites-available/alawael
ln -s /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Option 2: Kubernetes Deployment

```bash
# 1. Setup Kubernetes cluster
# (AWS EKS, Google GKE, Azure AKS, or local minikube)

# 2. Create namespace
kubectl create namespace alawael

# 3. Create secrets
kubectl create secret generic alawael-secrets \
  --from-literal=mongodb-uri=mongodb://... \
  --from-literal=jwt-secret=... \
  -n alawael

# 4. Deploy using Helm
helm install alawael ./deployment/helm \
  -n alawael \
  -f ./deployment/helm/values.prod.yaml

# 5. Verify deployment
kubectl get pods -n alawael
kubectl get services -n alawael

# 6. Check logs
kubectl logs -f deployment/alawael-backend -n alawael
```

### Option 3: Cloud Platforms

#### AWS Elastic Beanstalk
```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize
eb init -p docker alawael-erp

# 3. Create environment
eb create alawael-prod

# 4. Deploy
eb deploy

# 5. Monitor
eb status
eb logs
```

#### Google Cloud Run
```bash
# 1. Build Docker image
docker build -t gcr.io/PROJECT_ID/alawael-backend ./backend

# 2. Push to Registry
docker push gcr.io/PROJECT_ID/alawael-backend

# 3. Deploy
gcloud run deploy alawael-backend \
  --image gcr.io/PROJECT_ID/alawael-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars MONGODB_URI=... JWT_SECRET=...

# 4. Monitor
gcloud run services list
gcloud run services describe alawael-backend
```

#### Azure App Service
```bash
# 1. Create Resource Group
az group create --name alawael-rg --location eastus

# 2. Create App Service Plan
az appservice plan create \
  --name alawael-plan \
  --resource-group alawael-rg \
  --sku B2 --is-linux

# 3. Deploy
az webapp up \
  --resource-group alawael-rg \
  --name alawael-api \
  --runtime "NODE|20-lts" \
  --startup-file "npm start"
```

---

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/api/health

# Detailed system stats
curl http://localhost:3000/api/system/stats

# Cache statistics
curl http://localhost:3000/api/cache-stats

# Database connection
curl http://localhost:3000/api/system/health
```

### Expected Responses
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2026-02-24T10:30:00Z",
  "services": {
    "database": "connected",
    "cache": "connected",
    "memory": "healthy"
  }
}
```

### System Monitoring

#### Using PM2 (Recommended for Linux)
```bash
# Install PM2
npm install -g pm2

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'alawael-backend',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs
```

#### Using Docker Stats
```bash
# Real-time resource usage
docker stats

# Container logs
docker logs -f alawael-backend

# Inspect container
docker inspect alawael-backend
```

### Logging & Logs

```bash
# Backend logs location
tail -f ./backend/logs/error.log
tail -f ./backend/logs/access.log

# Frontend logs (browser console)
# Open DevTools (F12) and check Console tab

# System logs
journalctl -u docker -f  # Docker daemon
syslog                    # System events
```

### Performance Monitoring

```bash
# CPU & Memory Usage
docker stats alawael-backend

# Request performance
curl -w "@curl-format.txt" http://localhost:3000/api/health

# Database performance
mongodb-compass  # GUI for MongoDB

# Redis performance
redis-cli INFO stats
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

#### 2. MongoDB Connection Error
```bash
# Check MongoDB is running
systemctl status mongod

# Start MongoDB
systemctl start mongod

# Check connection
mongo mongodb://localhost:27017/alawael
```

#### 3. Redis Connection Error
```bash
# Check Redis is running
systemctl status redis

# Start Redis
systemctl start redis-server
redis-cli ping

# Should return: PONG
```

#### 4. High Memory Usage
```bash
# Restart services
docker-compose restart

# Check for memory leaks
node --inspect ./backend/server.js

# Enable garbage collection
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

#### 5. Slow API Responses
```bash
# Check database indexes
db.collection('users').getIndexes()

# Monitor slow queries
db.setProfilingLevel(1)

# Check Redis cache
redis-cli INFO stats
```

#### 6. SSL Certificate Issues
```bash
# Renew Let's Encrypt certificate
certbot renew --dry-run

# Or force renewal
certbot renew --force-renewal

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/domain.com/cert.pem -noout -dates
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=alawael:* npm start

# Verbose output
NODE_DEBUG=http,net npm start

# Chrome DevTools
node --inspect --inspect-brk ./backend/server.js
# Then visit chrome://inspect
```

---

## Scaling & Performance

### Horizontal Scaling

```bash
# Docker Compose scale
docker-compose up -d --scale backend=3

# Kubernetes autoscaling
kubectl autoscale deployment alawael-backend \
  --min=3 --max=10 --cpu-percent=80

# Load balancing
# Nginx distributes traffic between instances
```

### Performance Optimization

```bash
# Enable compression
COMPRESSION_LEVEL=6 npm start

# Optimize database
db.collection('orders').createIndex({ status: 1 })
db.collection('users').createIndex({ email: 1 }, { unique: true })

# Cache strategy
CACHE_TTL=300 npm start  # 5 minute cache

# Connection pooling
MAX_POOL_SIZE=20 npm start

# Memory optimization
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 50 http://localhost:3000/api/health

# Using wrk
wrk -t12 -c400 -d30s http://localhost:3000/api/health

# Using hey
hey -n 10000 -c 100 http://localhost:3000/api/health
```

---

## 🎓 Next Steps

1. ✅ Deploy application
2. ✅ Setup monitoring
3. ✅ Configure alerts
4. ✅ Regular backups
5. ✅ Security hardening
6. ✅ Performance tuning
7. ✅ Documentation updates

---

## 📞 Support & Resources

- **GitHub:** https://github.com/almashooq1/alawael-erp
- **Issues:** GitHub Issues section
- **Documentation:** See `/docs` folder
- **API Docs:** `/api/docs` endpoint

---

**Last Updated:** February 24, 2026  
**Status:** ✅ Production Ready

