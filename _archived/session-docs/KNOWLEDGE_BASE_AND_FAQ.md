# 📚 Knowledge Base & FAQ

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** Production Ready

---

## 🎯 Quick Start FAQ

### Q: How do I start the application?

**A:** Three options:

```bash
# Option 1: Docker Compose (Easiest)
cd alawael-unified
docker-compose up -d
# Access at http://localhost:3000

# Option 2: Local Installation
cd alawael-unified/backend
npm install
npm start
# In another terminal:
cd alawael-unified/frontend
npm install
npm start

# Option 3: Kubernetes
kubectl apply -f deployment/kubernetes/
```

---

### Q: What are the system requirements?

**A:**

```
Minimum Requirements:
  CPU: 2 cores
  RAM: 4GB
  Storage: 20GB SSD
  OS: Linux, macOS, or Windows

Recommended:
  CPU: 4+ cores
  RAM: 8GB+
  Storage: 50GB SSD
  OS: Linux (Ubuntu 20.04+)

Docker Requirements:
  Docker: v20.10+
  Docker Compose: v1.29+
```

---

### Q: How do I reset the database?

**A:**

```bash
# WARNING: This deletes all data!

# Option 1: Docker
docker-compose exec postgres psql -U postgres -c "DROP DATABASE alawael; CREATE DATABASE alawael;"

# Option 2: Direct PostgreSQL
psql -U postgres -c "DROP DATABASE alawael; CREATE DATABASE alawael;"

# Then run migrations:
npm run migrate
npm run seed  # Optional: seed with test data
```

---

### Q: How do I check if the system is running?

**A:**

```bash
# Check API health
curl http://localhost:5000/api/health

# Check all services
curl http://localhost:5000/api/system/health | jq

# Check Docker containers
docker-compose ps

# Check logs
docker-compose logs -f app
```

---

### Q: Where are the logs?

**A:**

```
Docker Logs:
  • Application: docker-compose logs app
  • Database: docker-compose logs postgres
  • Redis: docker-compose logs redis

File Logs:
  • Application: /var/log/alawael/app.log
  • Error: /var/log/alawael/error.log
  • Access: /var/log/alawael/access.log

Real-time:
  docker-compose logs -f app
```

---

### Q: How do I change the configuration?

**A:**

```bash
# 1. Edit environment variables
nano .env

# 2. Key variables:
DATABASE_URL=postgresql://user:pass@localhost/alawael
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.example.com
API_PORT=5000

# 3. Restart application
docker-compose restart app
npm restart  # or this if not using Docker
```

---

### Q: How do I add a new user?

**A:**

```bash
# Via API
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "User Name",
    "role": "user"
  }'

# Via Dashboard
1. Login to http://localhost:3000
2. Admin → Users
3. Click "Add User"
4. Fill form
5. Click "Create"
```

---

### Q: How do I reset my password?

**A:**

```bash
# Via API
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Check email for reset link

# Via Database (Admin only)
psql -U postgres -d alawael -c "
  UPDATE users 
  SET password = crypt('NewPassword123!', gen_salt('bf'))
  WHERE email = 'user@example.com';
"
```

---

### Q: How do I export data?

**A:**

```bash
# Export database
pg_dump -U postgres alawael > backup.sql

# Export as CSV (specific table)
psql -U postgres -d alawael -c "\COPY users TO 'users.csv' WITH CSV HEADER"

# Export via API
curl -X GET "http://localhost:5000/api/export/users?format=csv" \
  -H "Authorization: Bearer TOKEN" \
  -o users.csv
```

---

### Q: How do I import data?

**A:**

```bash
# Via API (Recommended)
curl -X POST http://localhost:5000/api/import/users \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@users.csv"

# Via Database
psql -U postgres -d alawael -c "\COPY users FROM 'users.csv' WITH CSV HEADER"

# Via migration file
npm run migrate:custom -- --file=data-migration.js
```

---

## 🔐 Security FAQ

### Q: How do I secure the application?

**A:**

```
Essential Security Steps:

1. Change default credentials
   [ ] Admin password
   [ ] Database password
   [ ] Redis password
   [ ] JWT secret

2. Enable HTTPS
   [ ] Get SSL certificate (Let's Encrypt)
   [ ] Configure NGINX
   [ ] Redirect HTTP → HTTPS
   [ ] Enable HSTS header

3. Configure firewall
   [ ] Allow only needed ports
   [ ] Restrict database access
   [ ] Restrict Redis access
   [ ] Enable rate limiting

4. Enable authentication
   [ ] 2FA for admin
   [ ] Strong password policy
   [ ] Account lockout
   [ ] Session timeout

5. Regular updates
   [ ] Update dependencies
   [ ] Update OS
   [ ] Update Docker images
   [ ] Security patches
```

---

### Q: How do I rotate API keys?

**A:**

```bash
# List API keys
curl http://localhost:5000/api/admin/api-keys \
  -H "Authorization: Bearer TOKEN"

# Generate new key
curl -X POST http://localhost:5000/api/admin/api-keys \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "New Key", "scopes": ["read", "write"]}'

# Revoke old key
curl -X DELETE http://localhost:5000/api/admin/api-keys/{key_id} \
  -H "Authorization: Bearer TOKEN"

# Wait: Update client applications with new key
# Then: Delete old key when safe
```

---

### Q: How do I audit access logs?

**A:**

```bash
# View recent access logs
tail -100 /var/log/alawael/access.log

# Find specific user
grep "user@example.com" /var/log/alawael/access.log

# Find failed logins
grep "401\|403" /var/log/alawael/access.log

# Search by date
grep "2026-02-24" /var/log/alawael/access.log

# Export to file
grep "2026-02-24" /var/log/alawael/access.log > audit_2026-02-24.log
```

---

## ⚙️ System Configuration FAQ

### Q: How do I change the port?

**A:**

```bash
# Edit environment
API_PORT=8000  # Change from 5000

# Or in docker-compose.yml
services:
  app:
    ports:
      - "8000:5000"  # External:Internal

# Restart
docker-compose restart app
```

---

### Q: How do I enable debug mode?

**A:**

```bash
# Set environment variable
DEBUG=*  # or DEBUG=app:*

# Or in .env
DEBUG=app:*:*

# Start with debug
DEBUG=app:* npm start

# View debug output
docker-compose logs app | grep DEBUG
```

---

### Q: How do I increase the request size limit?

**A:**

```bash
# Edit backend config
# File: config/express.js

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Restart
docker-compose restart app
```

---

### Q: How do I configure email notifications?

**A:**

```bash
# Set SMTP environment variables
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@alawael.com

# For Gmail: Use app-specific password
# Go to: myaccount.google.com/apppasswords

# Test email
npm run test:email

# Restart
docker-compose restart app
```

---

## 🐛 Troubleshooting FAQ

### Q: Database connection refused error?

**A:**

```bash
# Check if database is running
docker-compose ps postgres

# If not running:
docker-compose start postgres

# Check connection string
echo $DATABASE_URL

# Test connection directly
psql $DATABASE_URL -c "SELECT 1"

# Check database logs
docker-compose logs postgres | tail -50

# If persistent:
docker-compose down
docker volume prune  # WARNING: Deletes data!
docker-compose up -d
npm run migrate
```

---

### Q: API returning 500 errors?

**A:**

```bash
# 1. Check application logs
docker-compose logs app | grep -i error

# 2. Check specific error
curl -i http://localhost:5000/api/failing-endpoint

# 3. Enable debug mode
DEBUG=app:* npm start

# 4. Check database
psql -c "SELECT 1"

# 5. Check cache
redis-cli ping

# 6. Review recent code changes
git log --oneline -10

# 7. Clear cache and restart
redis-cli FLUSHDB
docker-compose restart app
```

---

### Q: Frontend not connecting to API?

**A:**

```bash
# 1. Check API is running
curl http://localhost:5000/api/health

# 2. Check frontend environment
cat .env  # or .env.local

# 3. Check API URL in frontend config
grep -r "API_URL" frontend/

# 4. Browser console for CORS errors
# F12 → Console → Check for CORS errors

# 5. Check CORS in backend
# File: config/express.js
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

# 6. Restart frontend
docker-compose restart frontend
```

---

### Q: Out of memory error?

**A:**

```bash
# Check memory usage
docker stats

# Restart service
docker-compose restart app

# Increase memory limit (docker-compose.yml)
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

# Apply
docker-compose up -d

# Check heap dump
npm run debug:heapdump
```

---

### Q: Rate limiting blocking my requests?

**A:**

```bash
# Temporary: Disable rate limiting
# File: middleware/rateLimiter.js
// Comment out or remove rate limiter

// Or: Check your IP
curl http://ipinfo.io

// Then: Whitelist IP
RATE_LIMIT_WHITELIST=192.168.1.100

// Restart
docker-compose restart app
```

---

## 📊 Performance FAQ

### Q: How do I check performance metrics?

**A:**

```bash
# Via API
curl http://localhost:5000/api/system/metrics | jq

# Dashboard
open http://localhost:3000/admin/metrics

# Database performance
psql -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor in real-time
docker stats  # for container stats
top  # for system stats
```

---

### Q: How do I optimize database performance?

**A:**

```bash
# 1. Add missing indexes
   psql -f analysis/missing-indexes.sql

# 2. Analyze query plans
   EXPLAIN ANALYZE SELECT ...

# 3. Update statistics
   ANALYZE;
   VACUUM ANALYZE;

# 4. Check slow query log
   tail -50 /var/log/postgresql/slowquery.log

# 5. Increase cache
   shared_buffers = 256MB  # in postgresql.conf
```

---

### Q: How do I enable caching?

**A:**

```bash
# Redis is configured automatically
# Check if working:
redis-cli ping
# Should return: PONG

# Clear cache
redis-cli FLUSHDB

# Monitor cache
redis-cli MONITOR

# Check cache hit rate
curl http://localhost:5000/api/system/metrics | jq '.cache'
```

---

## 📱 API FAQ

### Q: How do I authenticate API requests?

**A:**

```bash
# 1. Get token
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"user@example.com","password":"pass"}' \
  -H "Content-Type: application/json"

# Response: { "token": "eyJhbGciOiJIUzI1NiIs..." }

# 2. Use token in requests
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 3. Token expires after 24 hours
# Refresh token:
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Authorization: Bearer OLD_TOKEN"
```

---

### Q: What are the API rate limits?

**A:**

```
Default Rate Limits:
  • Per IP: 1000 requests / minute
  • Per user: 2000 requests / minute
  • Per endpoint: Varies (check docs)

Limits by Endpoint:
  • Login: 5 attempts / minute
  • API key generation: 10 / hour
  • Emails: 100 / hour
  • Heavy operations: 10 / minute

Increase Limits:
  1. Edit config/rateLimiter.js
  2. Adjust MAX_REQUESTS_PER_MINUTE
  3. Restart application

Check remaining:
  Response headers:
    X-RateLimit-Limit: 1000
    X-RateLimit-Remaining: 999
    X-RateLimit-Reset: 1708689600
```

---

### Q: How do I handle errors?

**A:**

```javascript
// Error Response Format
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "email",
        "message": "must be a valid email"
      }
    ]
  }
}

// Common Error Codes:
// 400: BAD_REQUEST - Invalid input
// 401: UNAUTHORIZED - Missing/invalid token
// 403: FORBIDDEN - Insufficient permissions
// 404: NOT_FOUND - Resource doesn't exist
// 422: VALIDATION_ERROR - Data validation failed
// 429: RATE_LIMITED - Too many requests
// 500: INTERNAL_ERROR - Server error
// 503: SERVICE_UNAVAILABLE - Maintenance
```

---

## 🚀 Deployment FAQ

### Q: How do I deploy to production?

**A:**

See: DEPLOYMENT_PLANNING_AND_EXECUTION.md

Quick summary:
```bash
1. Review deployment checklist
2. Run smoke tests in staging
3. Create release tag
4. Deploy (blue-green)
5. Monitor closely
6. Verify success
```

---

### Q: How do I rollback a deployment?

**A:**

```bash
# If using blue-green:
# 1. Load balancer still has old version running
# 2. Shift traffic back immediately
# 3. Fix issue in new version
# 4. Re-deploy when ready

# If rolling update:
docker-compose rollback app
# or
kubectl rollout undo deployment/app

# Manual rollback:
git revert <commit>
npm run build
docker-compose restart app
```

---

### Q: How do I monitor a deployment?

**A:**

```bash
# Watch logs
docker-compose logs -f app

# Monitor metrics
curl http://localhost:5000/api/system/metrics

# Check error rate
docker-compose logs app | grep -i error | wc -l

# User sign-in tests
curl -X POST http://localhost:5000/api/auth/login -d '...'

# API functionality
curl http://localhost:5000/api/users

# Status page
open http://localhost:3000/status
```

---

## 🆘 Getting Help

### Q: Where can I get support?

**A:**

1. **Documentation**
   - Check this FAQ first
   - Read OPERATION_RUNBOOKS.md
   - See SUPPORT_AND_INCIDENT_RESPONSE.md

2. **Check Logs**
   - Application logs
   - Error logs
   - System logs

3. **Community/Issues**
   - GitHub Issues: github.com/almashooq1/alawael-erp/issues
   - Discussion: github.com/almashooq1/alawael-erp/discussions

4. **Contact**
   - Email: support@alawael.com
   - Slack: #alawael-support
   - On-call: See incident procedures

---

**Status:** Production Ready  
**Last Updated:** February 24, 2026

