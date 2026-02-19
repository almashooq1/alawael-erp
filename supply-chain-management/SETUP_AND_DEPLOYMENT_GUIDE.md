# Supply Chain Management System - Complete Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Setup](#docker-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Configuration](#environment-configuration)
6. [Running Tests](#running-tests)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v16.0.0 or higher
- **NPM**: v7.0.0 or higher
- **MongoDB**: v5.0 or higher (or MongoDB Atlas account)
- **Git**: Latest version
- **Docker** (optional): For containerized deployment

### System Requirements
- **CPU**: Minimum 2 cores
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk**: Minimum 20GB free space
- **OS**: Linux, macOS, or Windows 10+

### Network Requirements
- Port 4000 available (backend)
- Port 3000 available (frontend)
- Port 27017 available (MongoDB, if local)

---

## Local Development Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/supply-chain-management.git
cd supply-chain-management
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Step 4: Database Setup

```bash
# Start MongoDB (if using local MongoDB)
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Step 5: Run Application

**Backend:**
```bash
cd backend
npm start

# Output should show:
# MongoDB connected
# Server running on port 4000
```

**Frontend (in new terminal):**
```bash
cd frontend
npm start

# Opens at http://localhost:3000
```

---

## Docker Setup

### Step 1: Build & Run with Docker Compose

```bash
# Build images
docker-compose build

# Start all services (backend, frontend, MongoDB)
docker-compose up -d

# Check status
docker-compose ps
```

### Step 2: Access Services
- **Backend API**: http://localhost:4000
- **Frontend**: http://localhost:3000
- **MongoDB**: localhost:27017

### Step 3: View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongo
```

### Step 4: Stop Services
```bash
docker-compose down

# Remove volumes
docker-compose down -v
```

---

## Database Configuration

### MongoDB Atlas (Cloud)

1. **Create Account**: https://www.mongodb.com/cloud/atlas

2. **Create Cluster**:
   - Choose free tier or paid tier
   - Select region closest to your users

3. **Get Connection String**:
   - Click "Connect"
   - Select "Connect your application"
   - Copy connection string

4. **Update .env**:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/supply_chain_db?retryWrites=true&w=majority
```

### Local MongoDB

1. **Install MongoDB**:
```bash
# macOS
brew install mongodb-community

# Linux (Ubuntu)
sudo apt-get install mongodb

# Windows
Download from https://www.mongodb.com/try/download/community
```

2. **Start MongoDB**:
```bash
mongod

# Or as service
sudo systemctl start mongod
```

3. **Set .env**:
```env
MONGODB_URI=mongodb://localhost:27017/supply_chain_db
```

### Create Database Indexes
```bash
# In MongoDB shell
use supply_chain_db

# Create indexes
db.products.createIndex({ sku: 1 }, { unique: true })
db.products.createIndex({ name: "text" })
db.suppliers.createIndex({ email: 1 }, { unique: true })
db.orders.createIndex({ status: 1, createdAt: -1 })
db.shipments.createIndex({ trackingNumber: 1 })
```

---

## Environment Configuration

### Backend .env Configuration

```env
# Server
NODE_ENV=development
PORT=4000

# Database (choose MongoDB Atlas or local)
MONGODB_URI=mongodb://localhost:27017/supply_chain_db

# JWT
JWT_SECRET=your-super-secure-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ADMIN_EMAIL=admin@example.com

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend .env Configuration

```env
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_ENV=development
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test __tests__/api.test.js

# Watch mode
npm test -- --watch
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Coverage report
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Start all services
docker-compose up -d

# Run integration tests
npm run test:integration

# Stop services
docker-compose down
```

---

## Production Deployment

### Step 1: Environment Setup

```bash
# Copy production env template
cp .env.example .env.production

# Edit with production values
nano .env.production

# Key production settings:
NODE_ENV=production
MONGODB_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/supply_chain_prod
JWT_SECRET=generate-a-strong-random-value
CORS_ORIGIN=https://yourdomain.com
```

### Step 2: Pre-Deployment Checklist

```bash
# Run tests
npm test

# Check for security vulnerabilities
npm audit

# Build frontend
cd frontend
npm run build

# Check bundle size
npm run analyze
```

### Step 3: Deployment Options

#### A. Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create supply-chain-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set JWT_SECRET=your-production-secret

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### B. Digital Ocean / VPS Deployment

```bash
# 1. SSH into server
ssh root@your-server-ip

# 2. Install Node.js and MongoDB
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install nodejs
sudo apt-get install mongodb

# 3. Clone repository
git clone your-repo
cd supply-chain-management

# 4. Install dependencies
npm install --production

# 5. Build frontend
cd frontend && npm run build

# 6. Set environment variables
export NODE_ENV=production
export MONGODB_URI=mongodb://localhost:27017/supply_chain_db
export JWT_SECRET=your-secret

# 7. Start with PM2
npm install -g pm2
pm2 start backend/index.js --name "scm-api"
pm2 save
```

#### C. AWS EC2 Deployment

```bash
# 1. Launch EC2 instance (Ubuntu 20.04)

# 2. Connect and update system
sudo apt-get update && sudo apt-get upgrade -y

# 3. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo systemctl start mongodb

# 4. Clone and setup
git clone your-repo && cd supply-chain-management
npm install --production

# 5. Use nginx as reverse proxy
sudo apt-get install nginx
# Configure /etc/nginx/sites-available/default

# 6. Setup SSL with Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com

# 7. Start application with systemd service
sudo nano /etc/systemd/system/scm.service
# Add service configuration
sudo systemctl start scm
sudo systemctl enable scm
```

#### D. Docker Deployment

```bash
# Build production image
docker build -t supply-chain-api:latest -f Dockerfile.prod .

# Push to Docker Hub
docker tag supply-chain-api:latest your-username/supply-chain-api:latest
docker push your-username/supply-chain-api:latest

# Run on server
docker run -d \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb+srv://... \
  -e JWT_SECRET=your-secret \
  your-username/supply-chain-api:latest
```

### Step 4: Post-Deployment

```bash
# Verify application
curl http://your-domain/api

# Check logs
pm2 logs
# or
docker logs container-id

# Monitor performance
pm2 monit

# Setup automatic backups
# Database backups every 6 hours
# Daily full system backup
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl http://localhost:4000/api

# Database connection
curl http://localhost:4000/api/health

# Detailed metrics
curl http://localhost:4000/api/metrics
```

### Log Rotation

```bash
# Setup logrotate
sudo nano /etc/logrotate.d/supply-chain

# Configuration:
/var/log/supply-chain/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 app app
    sharedscripts
    postrotate
        pm2 reload scm && systemctl reload nginx
    endscript
}
```

### Database Maintenance

```bash
# MongoDB backup
mongodump --uri "mongodb://localhost:27017/supply_chain_db" --out /backups/supply_chain_db

# Restore from backup
mongorestore --uri "mongodb://localhost:27017/supply_chain_db" /backups/supply_chain_db

# Enable automatic backups
# For MongoDB Atlas: Enable automated backups in console
```

### Performance Optimization

```bash
# Enable compression
npm install compression

# Enable caching
npm install redis

# Setup CDN for static assets
# Configure CloudFront/Cloudflare

# Database query optimization
# Add indexes, use explain() to analyze queries

# Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 })
```

---

## Troubleshooting

### Common Issues

#### Issue: MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions**:
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env
- Verify MongoDB Atlas IP whitelist includes your IP

#### Issue: Port Already In Use
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solutions**:
```bash
# Kill process on port 4000
lsof -i :4000
kill -9 <PID>

# Or change port in .env
PORT=5000
```

#### Issue: JWT Token Errors
```
Error: Invalid authentication token
```

**Solutions**:
- Verify JWT_SECRET matches between .env files
- Check token expiration: `JWT_EXPIRES_IN=7d`
- Ensure token is passed correctly in Authorization header

#### Issue: CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions**:
```env
# Update .env
CORS_ORIGIN=http://localhost:3000
# If multiple origins:
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

#### Issue: File Upload Fails
```
Error: File size exceeds limit
```

**Solutions**:
```env
# Increase limit in .env
MAX_FILE_SIZE=10485760  # 10MB

# Restart application
npm start
```

---

## Security Best Practices

1. **Environment Variables**:
   - Never commit `.env` to git
   - Use strong, random JWT_SECRET (32+ characters)
   - Rotate secrets regularly

2. **Database**:
   - Use MongoDB Atlas with authentication
   - Enable IP whitelist
   - Regular automated backups

3. **HTTPS**:
   - Deploy with SSL/TLS certificate
   - Use Let's Encrypt (free)
   - Force HTTPS in production

4. **Input Validation**:
   - All inputs are validated via express-validator
   - User inputs are sanitized
   - Prevent SQL/NoSQL injection

5. **Rate Limiting**:
   - Enabled on auth endpoints
   - 100 requests per 15 minutes for general API
   - 5 requests per 15 minutes for login

---

## Support & Resources

- **Documentation**: /docs/README.md
- **API Docs**: http://localhost:4000/api/docs
- **GitHub Issues**: https://github.com/your-org/supply-chain-management/issues
- **Email Support**: support@supplychainapi.local

---

## Version History

- **1.0.0** (2024-02-08): Initial release
- Enhanced error handling
- Comprehensive API documentation
- Production-grade security

---

**Last Updated**: 2024-02-08  
**Maintained By**: Development Team
