# 🚀 Production Deployment Guide - AlAwael ERP v2.0.0

## 📋 Pre-Deployment Checklist

- [ ] Docker Desktop installed and running
- [ ] Git repository up to date
- [ ] All tests passing (395/395 backend)
- [ ] Environment variables configured
- [ ] Backups created
- [ ] Domain and SSL certificates ready
- [ ] Monitoring tools configured
- [ ] Database backups in place

---

## 🔧 Step 1: Environment Setup

### 1.1 Copy Environment Template
```bash
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
cp .env.production.template .env.production
```

### 1.2 Edit Environment Variables
**Critical Variables to Update**:
```bash
# Security Secrets (DO NOT USE DEFAULTS)
JWT_SECRET=<generate-random-64-char-string>
JWT_REFRESH_SECRET=<generate-random-64-char-string>
SESSION_SECRET=<generate-random-64-char-string>

# Database Credentials
MONGODB_PASSWORD=<strong-password-min-16-chars>

# API URLs
API_BASE_URL=https://api.alawael.com  # or your domain
FRONTEND_URL=https://alawael.com

# Email Configuration (if using)
SMTP_PASSWORD=<app-specific-password>

# SMS Configuration (if using)
SMS_ACCOUNT_SID=<your-account-id>
SMS_AUTH_TOKEN=<your-auth-token>
```

### 1.3 Generate Secure Secrets
```powershell
# Generate random secrets (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (Get-Random))) | Select-Object -First 1

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🐳 Step 2: Docker Build & Deployment

### 2.1 Build Docker Images
```bash
# Navigate to project root
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666

# Build all services
docker-compose -f docker-compose.unified.yml build

# Expected output:
# ✓ mongodb pulled
# ✓ redis built
# ✓ api built (from Dockerfile.unified)
```

### 2.2 Start Services
```bash
# Start all services in background
docker-compose -f docker-compose.unified.yml up -d

# Container startup sequence:
# 1. MongoDB starts first
# 2. Redis starts concurrently
# 3. API starts after dependencies ready (10-15 seconds)
```

### 2.3 Verify Services Running
```bash
# Check container status
docker-compose -f docker-compose.unified.yml ps

# Expected output:
# NAME                      STATUS
# alawael-erp-api          Up (healthy)
# alawael-erp-mongodb      Up
# alawael-erp-redis        Up
```

---

## ✅ Step 3: Health Checks

### 3.1 API Health Check
```bash
# Test API endpoint
curl http://localhost:3000/health

# Expected response (200 OK):
# {
#   "status": "healthy",
#   "timestamp": "2026-02-22T...",
#   "services": {
#     "database": "connected",
#     "redis": "connected",
#     "api": "running"
#   }
# }
```

### 3.2 Database Connectivity
```bash
# Test MongoDB connection
docker exec alawael-erp-mongodb mongosh -u admin -p <password> --eval "db.adminCommand('ping')"

# Expected: { ok: 1 }
```

### 3.3 Redis Connectivity
```bash
# Test Redis connection
docker exec alawael-erp-redis redis-cli ping

# Expected: PONG
```

### 3.4 View Logs
```bash
# Real-time API logs
docker-compose -f docker-compose.unified.yml logs -f api

# Tail last 100 lines
docker-compose -f docker-compose.unified.yml logs --tail=100 api

# View specific service logs
docker-compose -f docker-compose.unified.yml logs mongodb
docker-compose -f docker-compose.unified.yml logs redis
```

---

## 🧪 Step 4: Smoke Tests

### 4.1 Basic Connectivity Test
```bash
# Test main endpoints
$endpoints = @(
    'http://localhost:3000/health',
    'http://localhost:3000/api/v1/users',
    'http://localhost:3000/api/v1/reports',
    'http://localhost:3000/api/v1/finance'
)

foreach ($endpoint in $endpoints) {
    $start = Get-Date
    $response = Invoke-WebRequest -Uri $endpoint -ErrorAction SilentlyContinue
    $duration = (Get-Date) - $start
    Write-Host "$endpoint : $($response.StatusCode) ($($duration.TotalMilliseconds)ms)"
}
```

### 4.2 Integration Smoke Test
```bash
# Run Postman collection against deployed API
newman run ./postman/unified-api-collection.json \
  --environment ./postman/production.environment.json \
  --reporters cli,json \
  --reporter-json-export smoke-test-results.json

# Or use JavaScript
node smoke-tests.js
```

### 4.3 Database Operations Test
```javascript
// Quick database test
const mongoose = require('mongoose');

async function testDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('✓ Database connected');
    console.log('✓ Collections:', collections.map(c => c.name));
  } catch (err) {
    console.error('✗ Database error:', err.message);
  }
}

testDB();
```

---

## 📊 Step 5: Performance Verification

### 5.1 Response Time Baseline
```bash
# Measure response times (before optimization)
# Expected: < 100ms for simple endpoints

ab -n 100 -c 10 http://localhost:3000/health

# Output analysis:
# - Requests per second: > 100
# - Mean time per request: < 100ms
# - Failed requests: 0
```

### 5.2 Load Testing Baseline
```bash
# Light load test (10 concurrent users, 100 requests)
artillery quick --count 10 --num 100 http://localhost:3000/health

# Expected:
# - 0 errors
# - Response time p99 < 500ms
# - Throughput > 50 req/sec
```

### 5.3 Memory & CPU Monitoring
```bash
# Monitor container resources
docker stats --no-stream

# Expected for single API instance:
# - CPU: < 25%
# - Memory: < 300MB
# - Network I/O: minimal when idle
```

---

## 🔒 Step 6: Security Verification

### 6.1 Check Security Headers
```bash
# Verify security headers present
curl -I http://localhost:3000/health

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000
```

### 6.2 Test Authentication
```bash
# Attempt unauthorized access
curl http://localhost:3000/api/v1/admin

# Expected: 401 Unauthorized

# Login and get token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"password"}'

# Expected response includes JWT token
```

### 6.3 Verify CORS
```bash
# Test CORS headers
curl -H "Origin: http://localhost:3001" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3000/api/v1/users -v

# Expected: Access-Control-Allow-Origin header present
```

---

## 📈 Step 7: Monitoring & Logging

### 7.1 Enable Live Monitoring Dashboard
```bash
# Start monitoring dashboard
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
node live-monitoring.js

# Dashboard shows:
# - Request count and rate
# - Response times (min/avg/max)
# - Memory usage
# - Error rates
# - Active connections
```

### 7.2 Setup Log Aggregation (Optional)
```bash
# View logs from all containers
docker-compose -f docker-compose.unified.yml logs --follow

# Filter for errors
docker-compose -f docker-compose.unified.yml logs | grep -i error

# Export logs
docker-compose -f docker-compose.unified.yml logs > deployment.log
```

### 7.3 Database Monitoring
```bash
# MongoDB simple monitoring
docker exec alawael-erp-mongodb mongosh -u admin -p <password> --eval "
  db.adminCommand('serverStatus')
" | head -20

# Monitor connection count
docker logs alawael-erp-api | grep -i "connected"
```

---

## 🔄 Step 8: Post-Deployment Tasks

### 8.1 Backup Creation
```bash
# Backup MongoDB data
docker exec alawael-erp-mongodb mongodump \
  --username=admin \
  --password='<password>' \
  --authenticationDatabase=admin \
  --out=/backups/$(date +%Y%m%d_%H%M%S)

# Backup Redis data
docker exec alawael-erp-redis redis-cli BGSAVE
```

### 8.2 Initialize Admin User
```bash
# Connect to API and create admin user
curl -X POST http://localhost:3000/api/v1/admin/init \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@alawael.com",
    "password": "strong-password-here",
    "role": "Admin"
  }'
```

### 8.3 Verify Data Migration (if applicable)
```bash
# Check collection counts
docker exec alawael-erp-mongodb mongosh -u admin -p <password> \
  --authenticationDatabase=admin \
  alawael-erp \
  --eval "
    db.users.estimatedDocumentCount();
    db.reports.estimatedDocumentCount();
    db.finance.estimatedDocumentCount();
  "
```

### 8.4 Create Deployment Record
```bash
# Log deployment details
Write-Host "=== DEPLOYMENT COMPLETED ===" | Tee-Object -FilePath deployment-$(Get-Date -Format yyyyMMdd_HHmmss).log
Write-Host "Date: $(Get-Date)"
Write-Host "Version: v2.0.0"
Write-Host "Commit: 26bc5aea / ff1b1fb"
Write-Host "Environment: production"
Write-Host "Database: MongoDB 7.0"
Write-Host "Cache: Redis 7"
Write-Host "API Status: Healthy"
Write-Host "Auth: Verified"
```

---

## 🛑 Step 9: Scaling & Load Balancing

### 9.1 Scale API Instances
```bash
# Run multiple API instances (if needed)
docker-compose -f docker-compose.unified.yml up -d --scale api=3

# This starts 3 instances:
# - api_1 on port 3000
# - api_2 on port 3001
# - api_3 on port 3002
```

### 9.2 Setup Nginx Reverse Proxy (Optional)
```nginx
# nginx.conf load balancer configuration
upstream api_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name api.alawael.com;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📋 Step 10: Rollback Procedures

### 10.1 Rollback to Previous Version
```bash
# Stop current deployment
docker-compose -f docker-compose.unified.yml down --volumes

# Restore previous database backup
docker exec alawael-erp-mongodb mongorestore /backups/previous_backup/

# Restart with previous code
git checkout <previous-commit-hash>
docker-compose -f docker-compose.unified.yml up -d
```

### 10.2 Emergency Stop
```bash
# Immediately stop all services
docker-compose -f docker-compose.unified.yml down

# Keep data volumes
docker-compose -f docker-compose.unified.yml down --remove-orphans

# Remove everything (WARNING: deletes data)
docker-compose -f docker-compose.unified.yml down -v
```

### 10.3 Database Restore
```bash
# List available backups
ls -la /backups/

# Restore specific backup
docker exec alawael-erp-mongodb mongorestore \
  --username=admin \
  --password='<password>' \
  --authenticationDatabase=admin \
  /backups/backup_name/
```

---

## 📊 Deployment Status Dashboard

### Quick Status Check
```bash
# All-in-one status report
echo "=== DEPLOYMENT STATUS ===" && \
docker-compose -f docker-compose.unified.yml ps && \
echo "" && \
echo "=== CONTAINER RESOURCES ===" && \
docker stats --no-stream && \
echo "" && \
echo "=== API HEALTH ===" && \
curl -s http://localhost:3000/health | jq . && \
echo "" && \
echo "=== DATABASE STATUS ===" && \
docker exec alawael-erp-mongodb mongosh -u admin -p <password> --authenticationDatabase=admin --eval "db.adminCommand('ping')"
```

---

## ✅ Success Criteria

### Deployment is Successful When:
- [x] All containers are running and healthy
- [x] Health check returns 200 OK
- [x] Database connected and accessible
- [x] Redis cache working
- [x] API responds in < 100ms
- [x] 0 errors in error logs
- [x] All smoke tests passing
- [x] Security headers verified
- [x] Backups created
- [x] Monitoring dashboard active

### Deployment is Complete When:
✅ **All above criteria met**
- Deployment Time: 15-30 minutes
- Systems Operational: All 3 (API, Database, Cache)
- Test Status: 395/395 passing
- Version: v2.0.0 live on production

---

## 🆘 Troubleshooting

### Issue: Containers won't start
```bash
# Check logs
docker-compose -f docker-compose.unified.yml logs

# Rebuild images
docker-compose -f docker-compose.unified.yml build --no-cache
docker-compose -f docker-compose.unified.yml up -d
```

### Issue: Health check failing
```bash
# Verify dependencies
docker-compose -f docker-compose.unified.yml ps

# Check API logs
docker logs alawael-erp-api | tail -50

# Verify network
docker network inspect alawael-network
```

### Issue: Database connection error
```bash
# Verify MongoDB is running
docker exec alawael-erp-mongodb mongosh --version

# Check password
docker logs alawael-erp-api | grep -i "mongodb\|password\|auth"

# Rebuild database
docker-compose -f docker-compose.unified.yml down -v
docker-compose -f docker-compose.unified.yml up -d
```

### Issue: High memory usage
```bash
# Check memory usage
docker stats

# Reduce Node.js memory
# Edit Dockerfile: ENV NODE_OPTIONS=--max-old-space-size=256

# Or limit in docker-compose
# services:
#   api:
#     mem_limit: 512m
```

---

## 📞 Support Contacts

- **API Issues**: Check logs with `docker logs alawael-erp-api`
- **Database Issues**: MongoDB Documentation: https://docs.mongodb.com
- **Performance**: Run `npm run performance:test`
- **Security**: Review `SECURITY_AUDIT.md`

---

## ✨ Next Steps After Deployment

1. **Option D**: Run security audit (6-8 hours)
2. **Option E**: Setup CI/CD automation (5-7 hours)
3. **Option B**: Performance optimization (4-6 hours)
4. **Option C**: Feature development (Variable)

---

*Last Updated: February 22, 2026*  
*Version: 2.0.0*  
*Status: Ready for Production*
