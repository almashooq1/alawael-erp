# Phase 13 Week 1: Staging Deployment Package

## 📋 Deployment Overview

**Target Environment:** Staging
**Deployment Date:** March 2, 2026
**Phase:** 13 - Week 1 (RBAC & Audit)
**Status:** Ready for Deployment

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [x] All 73 tests passing (100% pass rate)
- [x] Code coverage 83.78% (above 80% threshold)
- [x] No critical bugs or errors
- [x] RBAC middleware fully implemented
- [x] Audit logging fully implemented
- [x] React components complete (5 components)
- [x] React hooks complete (3 hooks)

### Documentation
- [x] API Reference complete
- [x] Backend Implementation Guide complete
- [x] Security Best Practices documented
- [x] Integration Guide complete

### Security
- [ ] JWT secret configured (256-bit minimum)
- [ ] HTTPS certificates installed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Audit log directory created with permissions
- [ ] Environment variables secured

### Infrastructure
- [ ] Database backup completed
- [ ] Staging server ready
- [ ] Docker containers tested
- [ ] Network firewall configured
- [ ] Monitoring tools configured

---

## 🐳 Docker Deployment

### 1. Updated docker-compose.yml

```yaml
version: '3.8'

services:
  # Backend API Server
  backend:
    build:
      context: ./erp_new_system/backend
      dockerfile: Dockerfile
    container_name: alawael-backend-staging
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=staging
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=1h
      - AUDIT_DIR=/app/logs/audit
      - AUDIT_RETENTION_DAYS=90
      - CORS_ORIGIN=https://staging.alawael.com
      - RATE_LIMIT_MAX=100
      - RATE_LIMIT_WINDOW=15
    volumes:
      - ./erp_new_system/backend:/app
      - audit-logs:/app/logs/audit
      - node_modules:/app/node_modules
    networks:
      - alawael-network
    depends_on:
      - database
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend React App
  frontend:
    build:
      context: ./erp_new_system/frontend
      dockerfile: Dockerfile
    container_name: alawael-frontend-staging
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=https://api-staging.alawael.com
      - REACT_APP_ENV=staging
    volumes:
      - ./erp_new_system/frontend:/app
      - /app/node_modules
    networks:
      - alawael-network
    depends_on:
      - backend
    restart: unless-stopped

  # PostgreSQL Database
  database:
    image: postgres:15-alpine
    container_name: alawael-db-staging
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=alawael_erp_staging
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - alawael-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: alawael-redis-staging
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - alawael-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: alawael-nginx-staging
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    networks:
      - alawael-network
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  audit-logs:
    driver: local
  node_modules:
    driver: local

networks:
  alawael-network:
    driver: bridge
```

---

### 2. Backend Dockerfile

```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create audit log directory
RUN mkdir -p /app/logs/audit && \
    chmod 700 /app/logs/audit

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

---

### 3. Frontend Dockerfile

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔐 Environment Variables

### .env.staging (Backend)

```bash
# Application
NODE_ENV=staging
PORT=3001

# Database
DATABASE_URL=postgresql://alawael_user:CHANGE_ME@database:5432/alawael_erp_staging
DB_HOST=database
DB_PORT=5432
DB_NAME=alawael_erp_staging
DB_USER=alawael_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# JWT Authentication
JWT_SECRET=CHANGE_ME_256_BIT_SECRET_KEY_HERE
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=CHANGE_ME_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d

# RBAC & Audit
AUDIT_DIR=/app/logs/audit
AUDIT_RETENTION_DAYS=90
ENABLE_AUDIT_LOGGING=true

# CORS
CORS_ORIGIN=https://staging.alawael.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Email (for security alerts)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@alawael.com
SMTP_PASSWORD=CHANGE_ME_SMTP_PASSWORD
SECURITY_ALERT_EMAIL=security@alawael.com

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### .env.staging (Frontend)

```bash
REACT_APP_API_URL=https://api-staging.alawael.com
REACT_APP_ENV=staging
REACT_APP_VERSION=1.0.0-staging
REACT_APP_ENABLE_LOGGING=true
```

---

## 🚀 Deployment Scripts

### deploy-staging.sh

```bash
#!/bin/bash

# Phase 13 Week 1 - Staging Deployment Script
# Author: DevOps Team
# Date: March 2, 2026

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Alawael ERP - Staging Deployment${NC}"
echo -e "${GREEN}  Phase 13 Week 1: RBAC & Audit${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. Pre-deployment checks
echo -e "${YELLOW}[1/10] Running pre-deployment checks...${NC}"

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo -e "${RED}ERROR: .env.staging file not found!${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running!${NC}"
    exit 1
fi

# Check if tests pass
echo -e "${YELLOW}[2/10] Running tests...${NC}"
cd erp_new_system/backend
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Tests failed! Aborting deployment.${NC}"
    exit 1
fi
cd ../..

# 2. Backup database
echo -e "${YELLOW}[3/10] Backing up database...${NC}"
BACKUP_FILE="backups/db-backup-$(date +%Y%m%d-%H%M%S).sql"
docker exec alawael-db-staging pg_dump -U alawael_user alawael_erp_staging > $BACKUP_FILE
echo -e "${GREEN}✓ Database backed up to $BACKUP_FILE${NC}"

# 3. Build Docker images
echo -e "${YELLOW}[4/10] Building Docker images...${NC}"
docker-compose -f docker-compose.staging.yml build

# 4. Stop old containers
echo -e "${YELLOW}[5/10] Stopping old containers...${NC}"
docker-compose -f docker-compose.staging.yml down

# 5. Start new containers
echo -e "${YELLOW}[6/10] Starting new containers...${NC}"
docker-compose -f docker-compose.staging.yml up -d

# 6. Wait for services to be ready
echo -e "${YELLOW}[7/10] Waiting for services to be ready...${NC}"
sleep 10

# Check backend health
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}ERROR: Backend failed to start!${NC}"
    docker-compose -f docker-compose.staging.yml logs backend
    exit 1
fi

# 7. Run database migrations
echo -e "${YELLOW}[8/10] Running database migrations...${NC}"
docker exec alawael-backend-staging npm run migrate

# 8. Run smoke tests
echo -e "${YELLOW}[9/10] Running smoke tests...${NC}"

# Test API endpoints
echo "Testing /health endpoint..."
curl -f http://localhost:3001/health || exit 1

echo "Testing /api/rbac/roles endpoint..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"admin123"}' \
  | jq -r '.token')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}ERROR: Failed to get auth token!${NC}"
    exit 1
fi

curl -f -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles || exit 1

echo -e "${GREEN}✓ Smoke tests passed${NC}"

# 9. Verify audit logging
echo -e "${YELLOW}[10/10] Verifying audit logging...${NC}"
docker exec alawael-backend-staging ls -la /app/logs/audit
AUDIT_FILE_COUNT=$(docker exec alawael-backend-staging ls /app/logs/audit | wc -l)

if [ $AUDIT_FILE_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Audit logging is working (${AUDIT_FILE_COUNT} log files)${NC}"
else
    echo -e "${YELLOW}⚠ Warning: No audit log files found yet${NC}"
fi

# 10. Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Backend:  http://localhost:3001"
echo -e "Frontend: http://localhost:3000"
echo -e "Logs:     docker-compose -f docker-compose.staging.yml logs -f"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test RBAC permissions in UI"
echo "2. Verify audit logs are being written"
echo "3. Run integration tests"
echo "4. Monitor application for 30 minutes"
echo ""
```

### rollback-staging.sh

```bash
#!/bin/bash

# Staging Rollback Script
set -e

echo "========================================="
echo "  Rolling back to previous version"
echo "========================================="

# Stop current containers
echo "[1/4] Stopping current containers..."
docker-compose -f docker-compose.staging.yml down

# Restore database from backup
echo "[2/4] Restoring database from backup..."
LATEST_BACKUP=$(ls -t backups/db-backup-*.sql | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found!"
    exit 1
fi

echo "Restoring from: $LATEST_BACKUP"
docker exec -i alawael-db-staging psql -U alawael_user alawael_erp_staging < $LATEST_BACKUP

# Checkout previous Git commit
echo "[3/4] Reverting code to previous commit..."
git revert HEAD --no-edit

# Rebuild and restart
echo "[4/4] Rebuilding and restarting..."
docker-compose -f docker-compose.staging.yml build
docker-compose -f docker-compose.staging.yml up -d

echo "Rollback complete!"
```

---

## 🔍 Post-Deployment Verification

### Manual Tests

```bash
# 1. Check container status
docker ps

# Expected: All 5 containers running (backend, frontend, database, redis, nginx)

# 2. Check backend health
curl http://localhost:3001/health

# Expected: {"status":"ok","timestamp":"2026-03-02T..."}

# 3. Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"admin123"}'

# Expected: {"token":"eyJhbGc...", "user":{...}}

# 4. Test RBAC endpoints
TOKEN="<your_token_here>"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/rbac/roles

# Expected: {"success":true,"roles":[...]}

# 5. Verify audit logs are being written
docker exec alawael-backend-staging cat /app/logs/audit/audit-$(date +%Y-%m-%d).jsonl

# Expected: JSON Lines with audit events

# 6. Check database connection
docker exec alawael-db-staging psql -U alawael_user -d alawael_erp_staging -c "SELECT COUNT(*) FROM users;"

# Expected: Query result with user count

# 7. Check Redis connection
docker exec alawael-redis-staging redis-cli -a <redis_password> PING

# Expected: PONG
```

### Integration Tests

```bash
# Run integration test suite
cd erp_new_system/backend
npm test -- --testPathPattern=integration

# Run frontend tests
cd ../frontend
npm test
```

---

## 📊 Monitoring

### Health Checks

```bash
# Backend health
watch -n 5 'curl -s http://localhost:3001/health | jq'

# Container stats
docker stats

# Audit log growth
watch -n 60 'du -sh erp_new_system/backend/logs/audit'
```

### Logs

```bash
# All services
docker-compose -f docker-compose.staging.yml logs -f

# Backend only
docker logs -f alawael-backend-staging

# Database only
docker logs -f alawael-db-staging

# Nginx access logs
docker exec alawael-nginx-staging tail -f /var/log/nginx/access.log
```

### Metrics to Monitor

- **API Response Time:** Should be < 200ms for most endpoints
- **Error Rate:** Should be < 1%
- **Authentication Success Rate:** Should be > 95%
- **Database Connections:** Should remain stable
- **Audit Log File Size:** Should grow steadily
- **Memory Usage:** Backend should use < 512MB
- **CPU Usage:** Should be < 50% average

---

## 🚨 Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker logs alawael-backend-staging

# Common issues:
# 1. Database connection failed
#    - Check DATABASE_URL in .env.staging
#    - Verify database container is running

# 2. JWT secret not set
#    - Check JWT_SECRET in .env.staging

# 3. Audit directory permission denied
#    - Check AUDIT_DIR exists and has correct permissions
```

### Audit Logs Not Writing

```bash
# 1. Check directory exists
docker exec alawael-backend-staging ls -la /app/logs/audit

# 2. Check permissions
docker exec alawael-backend-staging stat /app/logs/audit

# 3. Test manually
docker exec alawael-backend-staging node -e "
  const fs = require('fs');
  fs.writeFileSync('/app/logs/audit/test.txt', 'test');
  console.log('Write successful');
"

# 4. Check disk space
docker exec alawael-backend-staging df -h
```

### RBAC Permissions Not Working

```bash
# 1. Check user role in database
docker exec alawael-db-staging psql -U alawael_user alawael_erp_staging \
  -c "SELECT id, email, role FROM users WHERE email='test@example.com';"

# 2. Verify JWT token is valid
# Decode token at jwt.io

# 3. Check middleware is applied
# Add console.log in rbacMiddleware and restart

# 4. Test API directly
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/rbac/check-permission \
  -H "Content-Type: application/json" \
  -d '{"permission":"write:quality"}'
```

---

## 📅 Deployment Schedule

### Staging Deployment: March 2, 2026 (Today)
- **Time:** 14:00 UTC (2:00 PM)
- **Duration:** 30 minutes
- **Downtime:** ~5 minutes

### Production Deployment: March 5, 2026
- **Time:** 10:00 UTC (10:00 AM)
- **Duration:** 45 minutes
- **Downtime:** ~10 minutes
- **Requires:** Successful staging validation (48 hours)

---

## ✅ Deployment Sign-Off

### Before Deployment
- [ ] All tests passing (73/73)
- [ ] Code review approved
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Backup completed
- [ ] Team notified

### After Deployment
- [ ] Health checks passing
- [ ] Manual tests completed
- [ ] Integration tests passing
- [ ] Audit logging verified
- [ ] No critical errors in logs
- [ ] Performance metrics normal

**Deployed By:** _________________
**Date/Time:** _________________
**Verified By:** _________________
**Date/Time:** _________________

---

## 📞 Emergency Contacts

- **DevOps Lead:** +966-xxx-xxxx
- **Backend Lead:** +966-xxx-xxxx
- **Security Team:** security@alawael.com
- **Emergency Hotline:** +966-xxx-xxxx (24/7)

---

## 📚 Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Backend Implementation](./BACKEND_IMPLEMENTATION_GUIDE.md)
- [API Reference](./RBAC_AUDIT_API_REFERENCE.md)
- [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
