# 🚀 ALAWAEL ERP - Quick Deployment Guide

## Phase 3: Production Deployment - Fast Track

**Date:** March 2, 2026
**Version:** 1.0.0
**Status:** ✅ Production Ready

---

## 📋 Prerequisites Checklist

Before deployment, ensure you have:

- ✅ **Docker Desktop** installed and running
- ✅ **Docker Compose** v2.0 or higher
- ✅ **PowerShell** 5.1 or higher (for scripts)
- ✅ **8GB RAM minimum** (16GB recommended)
- ✅ **20GB free disk space**
- ✅ **Ports available:** 80, 3000, 3001, 3002, 3004, 3005, 5432, 27017, 6379

---

## ⚡ 5-Minute Quick Start

### Step 1: Update Environment Variables (2 minutes)

```powershell
# Copy and edit environment file
Copy-Item .env.example .env.production
notepad .env.production
```

**Critical variables to update:**
```env
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE
MONGO_INITDB_ROOT_PASSWORD=YOUR_MONGO_PASSWORD_HERE
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_HERE
JWT_SECRET=YOUR_JWT_SECRET_MIN_32_CHARS
```

### Step 2: Deploy Full System (3 minutes)

```powershell
# Run deployment script
.\deploy-production.ps1 -Action full -Build

# Or use docker-compose directly
docker-compose -f docker-compose.fullstack.yml up -d --build
```

### Step 3: Verify System Health

```powershell
# Run health check
.\health-check.ps1

# Or check manually
.\deploy-production.ps1 -Action status
```

---

## 🎯 Access Points

After successful deployment:

| Service | URL | Purpose |
|---------|-----|---------|
| **SCM Frontend** | http://localhost:3000 | Main Supply Chain app |
| **Dashboard** | http://localhost:3005 | Analytics & Reporting |
| **Backend API** | http://localhost:3001/api/v1 | Main API endpoint |
| **SCM Backend** | http://localhost:3002/api | SCM specific APIs |
| **PostgreSQL** | localhost:5432 | Main database |
| **MongoDB** | localhost:27017 | Document storage |
| **Redis** | localhost:6379 | Cache & sessions |

---

## 📦 Deployment Options

### Option 1: Full Stack Deployment (Recommended)
```powershell
.\deploy-production.ps1 -Action full -Build
```
Deploys: All databases + All backends + All frontends + Nginx

### Option 2: Selective Service Deployment

**Databases Only:**
```powershell
.\deploy-production.ps1 -Action database
```

**Backend Services Only:**
```powershell
.\deploy-production.ps1 -Action backend -Build
```

**Frontend Services Only:**
```powershell
.\deploy-production.ps1 -Action frontend -Build
```

### Option 3: Clean Rebuild
```powershell
.\deploy-production.ps1 -Action full -Build -Clean
```
Removes all existing containers and volumes, then rebuilds from scratch.

---

## 🔍 Monitoring & Logs

### View Real-time Logs
```powershell
# All services
.\deploy-production.ps1 -Action logs

# Specific service
docker-compose -f docker-compose.fullstack.yml logs -f backend
```

### Check Container Status
```powershell
# Detailed status
.\deploy-production.ps1 -Action status

# Docker native
docker-compose -f docker-compose.fullstack.yml ps
```

### Resource Usage
```powershell
docker stats
```

---

## 🛠️ Common Operations

### Restart Services
```powershell
# All services
.\deploy-production.ps1 -Action restart

# Specific service
docker-compose -f docker-compose.fullstack.yml restart backend
```

### Stop System
```powershell
.\deploy-production.ps1 -Action stop
```

### Update Single Service
```powershell
# Rebuild and restart specific service
docker-compose -f docker-compose.fullstack.yml up -d --build backend
```

### Database Backup
```powershell
# PostgreSQL
docker exec alawael-postgres pg_dump -U alawael_user alawael_erp > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# MongoDB
docker exec alawael-mongodb mongodump --archive=backup.archive --db=alawael_scm
```

---

## 🐛 Troubleshooting

### Issue: Containers won't start

**Solution:**
```powershell
# Check Docker is running
docker version

# Clean and restart
.\deploy-production.ps1 -Action stop
.\deploy-production.ps1 -Action full -Clean -Build
```

### Issue: Port already in use

**Solution:**
```powershell
# Find process using port (example: 3001)
netstat -ano | findstr :3001

# Stop the process or change port in .env.production
```

### Issue: Database connection failed

**Solution:**
```powershell
# Check database container logs
docker logs alawael-postgres
docker logs alawael-mongodb

# Verify credentials in .env.production
```

### Issue: Frontend can't connect to backend

**Solution:**
1. Check API URLs in `.env.production`:
```env
REACT_APP_API_URL=http://localhost:3001/api/v1
REACT_APP_SCM_API_URL=http://localhost:3002/api
```

2. Rebuild frontend with correct environment:
```powershell
docker-compose -f docker-compose.fullstack.yml up -d --build scm-frontend
```

### Issue: Health checks failing

**Solution:**
```powershell
# Wait for services to fully initialize (can take 30-60 seconds)
Start-Sleep -Seconds 60
.\health-check.ps1

# Check individual service logs
docker logs alawael-backend
```

---

## 🔒 Security Checklist

Before production deployment:

- [ ] **Update all passwords** in `.env.production`
- [ ] **Generate strong JWT_SECRET** (min 32 characters)
- [ ] **Enable SSL/TLS** for nginx (see nginx/ssl/)
- [ ] **Configure firewall** rules
- [ ] **Set up backup schedule**
- [ ] **Review CORS settings** in backend config
- [ ] **Enable audit logging**
- [ ] **Configure rate limiting** in nginx

---

## 📊 Performance Tuning

### For Development (Lower Resources):
```yaml
# In docker-compose.fullstack.yml, reduce resource limits:
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

### For Production (High Performance):
```yaml
# Increase resources:
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
```

### Database Connection Pooling:
```env
# In .env.production
POSTGRES_MAX_CONNECTIONS=100
MONGODB_POOL_SIZE=50
```

---

## 🧪 Testing Deployment

### Basic Smoke Test
```powershell
# 1. Deploy system
.\deploy-production.ps1 -Action full -Build

# 2. Wait for initialization
Start-Sleep -Seconds 45

# 3. Run health check
.\health-check.ps1

# 4. Test endpoints
Invoke-WebRequest http://localhost:3001/health
Invoke-WebRequest http://localhost:3000
```

### Load Testing (Optional)
```powershell
# Install hey for load testing
# choco install hey

# Test backend API
hey -n 1000 -c 10 http://localhost:3001/health
```

---

## 📈 Scaling Guide

### Horizontal Scaling (Multiple Instances):
```yaml
# Modify docker-compose.fullstack.yml
services:
  backend:
    deploy:
      replicas: 3  # Run 3 backend instances
```

### Add Load Balancer:
```powershell
# Nginx already configured for load balancing
# See nginx/nginx.conf - upstream backend_api section
```

---

## 🔄 Update & Rollback

### Update to New Version:
```powershell
# 1. Pull latest code
git pull origin main

# 2. Rebuild changed services only
docker-compose -f docker-compose.fullstack.yml up -d --build backend

# 3. Verify health
.\health-check.ps1
```

### Rollback Strategy:
```powershell
# 1. Stop current containers
.\deploy-production.ps1 -Action stop

# 2. Checkout previous version
git checkout v1.0.0

# 3. Redeploy
.\deploy-production.ps1 -Action full -Build
```

---

## 📞 Support & Documentation

- **Full Documentation:** See `DOCKER_SETUP_GUIDE.md`
- **Architecture Diagram:** `00_ALAWAEL_v1.0.0_LAUNCH_MASTER_INDEX.md`
- **API Documentation:** http://localhost:3001/api-docs (when deployed)
- **Health Status:** `.\health-check.ps1`

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ All containers show "Up" status
- ✅ Health check script passes with 80%+ success rate
- ✅ SCM Frontend loads at http://localhost:3000
- ✅ Dashboard loads at http://localhost:3005
- ✅ API responds at http://localhost:3001/health
- ✅ Databases accept connections
- ✅ No critical errors in logs

---

## 🎉 Next Steps

After successful deployment:

1. **Access SCM Frontend** → http://localhost:3000
2. **Login with default credentials** (see documentation)
3. **Configure user roles** and permissions
4. **Import initial data** if needed
5. **Set up backup schedule**
6. **Enable monitoring** and alerts
7. **Review security settings**

---

**Deployment Complete! 🚀**

For issues or questions, run `.\health-check.ps1` and review logs.

---

*Last Updated: March 2, 2026*
*Version: 1.0.0*
*Status: Production Ready ✅*
