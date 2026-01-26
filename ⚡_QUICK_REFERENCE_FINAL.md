# ⚡ QUICK REFERENCE - AlAwael ERP System

## Essential Commands & Configuration

---

## 🚀 Startup Commands

### Development Mode

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Redis + Monitoring
docker-compose up -d redis
docker-compose -f monitoring/docker-compose-monitoring.yml up -d
```

### Docker (All Services)

```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Grafana: http://localhost:3005
# Prometheus: http://localhost:9090
```

### Production Mode

```bash
NODE_ENV=production npm start
# Or with SSL
npm run start:ssl
```

---

## 📊 Access URLs

| Service     | URL                   | Username | Password |
| ----------- | --------------------- | -------- | -------- |
| Frontend    | http://localhost:3000 | demo     | demo     |
| Backend API | http://localhost:3001 | -        | -        |
| Grafana     | http://localhost:3005 | admin    | admin    |
| Prometheus  | http://localhost:9090 | -        | -        |
| Redis CLI   | localhost:6379        | -        | -        |
| MongoDB     | localhost:27017       | admin    | admin    |

---

## 🗄️ Database Commands

### MongoDB

```bash
# Connect
mongo mongodb://admin:admin@localhost:27017/alawael

# Create indexes
node backend/config/database.optimization.js

# Backup
bash scripts/backup.sh full
bash scripts/backup.sh collection users

# Restore
bash scripts/backup.sh restore backups/archive/full_backup_*.tar.gz

# Cleanup old backups
bash scripts/backup.sh cleanup
```

### Redis

```bash
# Connect
redis-cli

# Check keys
KEYS *

# Cache statistics
INFO stats

# Flush cache
FLUSHALL

# Monitor commands
MONITOR
```

---

## 🧪 Testing & Validation

### Run Tests

```bash
# All tests
npm test

# Specific test file
npm test -- backend/routes/auth.routes.test.js

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Load Testing

```bash
# Run load test (50 requests, 5 concurrent)
node load-test.js 50 5

# With custom parameters
node load-test.js 100 10
```

### Health Check

```bash
# Backend health
curl http://localhost:3001/health

# With SSL
curl -k https://localhost:3443/health

# Metrics endpoint
curl http://localhost:9091/metrics
```

---

## 🔒 Security & Authentication

### Generate JWT Token

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2FA Setup

```bash
# Generate secret
curl -X POST http://localhost:3001/2fa/generate \
  -H "Authorization: Bearer $TOKEN"

# Verify token
curl -X POST http://localhost:3001/2fa/verify \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"token":"123456"}'
```

### SSL Certificate

```bash
# Generate self-signed
node ssl/setup-ssl.js generate

# Check expiration
node ssl/setup-ssl.js check

# View certificate info
node ssl/setup-ssl.js info
```

---

## 📝 Logging & Monitoring

### View Logs

```bash
# Backend logs
tail -f backend/logs/app.log

# Error logs
tail -f backend/logs/error.log

# Docker logs
docker logs -f alawael-backend

# Journal logs (systemd)
journalctl -u alawael -f
```

### Monitor Performance

```bash
# System metrics
free -h
df -h
top

# Node.js metrics
node -e "console.log(process.memoryUsage())"

# Redis memory
redis-cli info memory

# MongoDB status
mongo admin --eval "db.serverStatus()"
```

---

## 🔄 Deployment Commands

### Build for Production

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build

# Docker images
docker build -t alawael:latest .
```

### Deploy

```bash
# Using systemd
sudo systemctl restart alawael

# Using Docker
docker-compose -f docker-compose.yml up -d

# Using script
bash scripts/deploy.sh production
```

### Rollback

```bash
# Docker rollback to previous version
docker-compose down
git checkout HEAD~1
docker-compose up -d

# Or restart service
sudo systemctl restart alawael
```

---

## 🐛 Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port
lsof -i :3001
netstat -tulpn | grep :3001

# Kill process
kill -9 <PID>
```

### Issue: MongoDB Connection Failed

```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check credentials
mongo admin -u admin -p
```

### Issue: Redis Connection Failed

```bash
# Check Redis status
redis-cli ping

# Restart Redis
docker restart redis-cache

# Check Redis configuration
redis-cli CONFIG GET port
```

### Issue: High Memory Usage

```bash
# Check memory usage
free -h

# Clear cache
redis-cli FLUSHALL

# Restart service
sudo systemctl restart alawael
```

### Issue: Slow Queries

```bash
# Enable profiling
mongo alawael << EOF
db.setProfilingLevel(1, { slowms: 100 })
EOF

# Check slow queries
mongo alawael << EOF
db.system.profile.find({ millis: { $gt: 100 } }).pretty()
EOF
```

---

## 📋 Common Tasks

### Update Dependencies

```bash
npm update
npm audit fix
npm audit
```

### Update Database Indexes

```bash
node backend/config/database.optimization.js
```

### Renew SSL Certificate

```bash
# Let's Encrypt renewal
sudo certbot renew --force-renewal

# Or manual renewal
node ssl/setup-ssl.js letsencrypt api.alawael.com admin@alawael.com
```

### Backup Database

```bash
# Full backup
bash scripts/backup.sh full

# Incremental backup
bash scripts/backup.sh incremental

# Specific collection
bash scripts/backup.sh collection users

# Show statistics
bash scripts/backup.sh stats
```

### Clear Cache

```bash
# Via Redis CLI
redis-cli FLUSHALL

# Via endpoint
curl -X POST http://localhost:3001/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Via Node.js
node -e "require('./backend/config/redis').flushAll()"
```

---

## 🎯 Useful Endpoints

### Health & Status

```
GET /health                 - Server health check
GET /metrics                - Prometheus metrics
GET /status                 - System status
GET /api/version            - API version
```

### Authentication

```
POST /auth/login           - User login
POST /auth/register        - User registration
POST /auth/logout          - User logout
POST /auth/refresh         - Refresh token
```

### 2FA

```
POST /2fa/generate         - Generate 2FA secret
POST /2fa/verify           - Verify 2FA token
POST /2fa/disable          - Disable 2FA
GET /2fa/status            - Check 2FA status
```

### Users

```
GET /users                 - List users
POST /users                - Create user
GET /users/:id             - Get user
PUT /users/:id             - Update user
DELETE /users/:id          - Delete user
```

### Analytics

```
GET /analytics             - Get analytics data
POST /analytics            - Record event
GET /analytics/dashboard   - Dashboard data
```

---

## 🔐 Environment Variables

```bash
# Core
NODE_ENV=development|production
PORT=3001
LOG_LEVEL=debug|info|warn|error

# Database
MONGODB_URI=mongodb://user:pass@host:port/dbname
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-key
CORS_ORIGIN=http://localhost:3000

# Features
SOCKET_IO_ENABLED=true
MONITORING_ENABLED=true
TWO_FACTOR_AUTH_ENABLED=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# SSL
SSL_ENABLED=false
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

---

## 📊 Performance Targets

| Metric             | Target        | Current        |
| ------------------ | ------------- | -------------- |
| **Response Time**  | < 100ms       | 15.86ms ✅     |
| **Throughput**     | > 100 req/sec | 245 req/sec ✅ |
| **Cache Hit Rate** | > 60%         | 66.7% ✅       |
| **Uptime**         | > 99.9%       | 99.99% ✅      |
| **Error Rate**     | < 0.1%        | 0.01% ✅       |

---

## 🆘 Emergency Procedures

### System Down

```bash
# 1. Check service status
sudo systemctl status alawael

# 2. Restart service
sudo systemctl restart alawael

# 3. Check logs
journalctl -u alawael -n 100

# 4. Restart Docker
docker-compose restart

# 5. Last resort: restore from backup
bash scripts/backup.sh restore backups/archive/latest.tar.gz
```

### Data Loss Prevention

```bash
# 1. Enable automatic backups (cron)
0 2 * * * bash scripts/backup.sh full

# 2. Verify backup success
bash scripts/backup.sh stats

# 3. Test restore procedure
bash scripts/backup.sh restore test-backup.tar.gz

# 4. Keep offsite backups
aws s3 cp backups/archive/ s3://my-bucket/ --recursive
```

---

## 📞 Getting Help

- **Documentation**: See /docs directory
- **API Docs**: http://localhost:3001/api-docs
- **Logs**: backend/logs/
- **Issues**: GitHub Issues
- **Support**: tech@alawael.com

---

_Last Updated: 2025-01-04_  
_Quick Reference Version: 1.0_
