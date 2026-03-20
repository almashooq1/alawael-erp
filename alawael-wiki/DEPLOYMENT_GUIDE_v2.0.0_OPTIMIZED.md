# AlAwael ERP v2.0.0 - Production Deployment Guide
**Optimized Build - February 24, 2026**

## Quick Start Deployment

### Prerequisites
```bash
Node.js 16+ installed
MongoDB 4.4+ (or use mock mode)
npm/yarn package manager
Git access to repositories
```

### 5-Minute Quick Deploy

```bash
# 1. Clone and setup
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp
git checkout master

# 2. Install dependencies
cd erp_new_system/backend
npm install --production

cd ../../supply-chain-management/frontend
npm install --production

# 3. Create environment files
cd ../../erp_new_system/backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
MONGODB_URI=mongodb://localhost:27017/alawael
JWT_SECRET=your-secure-secret-min-32-chars
DEBUG_ROUTES=false
DEBUG_RBAC=false
EOF

# 4. Start services
npm start (Backend - keep running)

# In another terminal:
cd supply-chain-management/frontend
PORT=3002 npm start

# 5. Verify deployment
curl http://localhost:3000/api/health  # Should return HTTP 200
curl http://localhost:3002              # Should load frontend
```

---

## Environment Configuration

### Backend (.env)

**Critical Variables:**
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-here (min 32 chars, random)
MONGODB_URI=mongodb://user:pass@localhost:27017/alawael
```

**Recommended Variables:**
```bash
LOG_LEVEL=info
MAX_REQUEST_SIZE=50mb
REQUEST_TIMEOUT=30000
CORS_ORIGIN=https://your-domain.com

# Dynatrace (optional monitoring)
DYNATRACE_ENABLED=true
DYNATRACE_ENDPOINT=https://your-dynatrace-instance

# Email (optional)
SMTP_HOST=your-smtp
SMTP_PORT=587
SMTP_USER=email@company.com
SMTP_PASSWORD=password

# Debug (ALWAYS disable in production)
DEBUG_ROUTES=false
DEBUG_RBAC=false
```

### Frontend (.env)

```bash
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_ENV=production
REACT_APP_VERSION=2.0.0
```

---

## Production Deployment Methods

### Method 1: Direct Node.js (Simple Deployments)

```bash
# Backend
cd erp_new_system/backend
nohup npm start > backend.log 2>&1 &

# Frontend
cd supply-chain-management/frontend
npm run build
npx serve -s build -l 3002 > frontend.log 2>&1 &
```

### Method 2: PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js in project root
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'alawael-backend',
    script: './erp_new_system/backend/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Method 3: Docker

```bash
# Build
docker build -t alawael-backend:2.0.0 ./erp_new_system/backend
docker build -t alawael-frontend:2.0.0 ./supply-chain-management/frontend

# Run
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://mongodb:27017/alawael \
  alawael-backend:2.0.0

docker run -d -p 3002:3002 alawael-frontend:2.0.0
```

### Method 4: Systemd Service

Create `/etc/systemd/system/alawael-backend.service`:

```ini
[Unit]
Description=AlAwael Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/alawael/erp_new_system/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
User=www-data

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable alawael-backend
sudo systemctl start alawael-backend
```

---

##  Nginx Reverse Proxy Configuration

```nginx
upstream backend {
    server 127.0.0.1:3000;
}

upstream frontend {
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

---

## Post-Deployment Verification

```bash
# 1. Health Check
curl -i http://localhost:3000/api/health
# Expected: HTTP 200

# 2. RBAC Check
curl http://localhost:3000/api/rbac/roles
# Expected: JSON array with roles

# 3. Frontend Check
curl http://localhost:3002
# Expected: HTTP 200

# 4. Process Check
ps aux | grep node
# Expected: 2+ node processes running

# 5. Port Check
netstat -tlnp | grep -E '3000|3002'
# Expected: Both ports LISTENING
```

---

## Database Setup

### MongoDB Initial Setup

```bash
# Connect to MongoDB
mongo

# Create database
use alawael

# Create user
db.createUser({
  user: "alawael_user",
  pwd: "secure-password",
  roles: ["readWrite", "dbAdmin"]
})

# Create indexes
db.roles.createIndex({ "name": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "userId": 1 }, { unique: true });

# Exit
exit
```

### System Works Without MongoDB

If MongoDB is not available, the system will gracefully degrade to **mock data mode**:
- All data operations use in-memory storage
- Perfect for testing and development
- No data persistence across restarts
- Set `MONGODB_URI` or system auto-detects offline mode

---

## SSL/TLS Setup (HTTPS)

### Using Let's Encrypt (Free)

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com

# Update Nginx configuration
# Add to server block:
listen 443 ssl http2;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

# Auto-renew
certbot renew --dry-run
```

---

## Monitoring & Health Checks

### Basic Health Monitoring Script

```bash
#!/bin/bash
# save as /usr/local/bin/check-alawael.sh
BACKEND="http://localhost:3000/api/health"
TIMEOUT=5

response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $BACKEND)

if [ "$response" == "200" ]; then
    echo "✅ AlAwael Backend: OK"
    exit 0
else
    echo "❌ AlAwael Backend: DOWN (HTTP $response)"
    # Send alert
    echo "AlAwael is down" | mail -s "Alert" ops@company.com
    exit 1
fi
```

Run periodically:
```bash
*/5 * * * * /usr/local/bin/check-alawael.sh
```

### Dynatrace Monitoring

1. Log in to Dynatrace
2. Create application: "AlAwael ERP Frontend"
3. Add monitoring code to frontend `index.html`
4. Set alerts:
   - Apdex < 0.8
   - Error Rate > 1%
   - Response Time p95 > 2s

---

## Performance Optimization

### Node.js Cluster Mode

```bash
# Use all CPU cores
instances: 'max'  # In PM2 config
```

### Database Indexing

```javascript
// Key indexes to create
db.users.createIndex({ email: 1 }, { unique: true });
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.audit_logs.createIndex({ timestamp: -1 });
db.roles.createIndex({ name: 1 }, { unique: true });
```

### Cache Configuration (Optional)

Enable Redis to cache:
- User roles/permissions (1 hour TTL)
- System configuration (6 hour TTL)
- API responses (5 minute TTL)

```bash
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -i :3000` then `kill -9 <PID>` |
| MongoDB connection error | Check connection string, verify MongoDB is running |
| High memory usage | Check logs for memory leaks, restart service |
| Slow frontend | Build production bundle: `npm run build` |
| CORS errors | Update `CORS_ORIGIN` in .env |
| Email not working | Verify SMTP credentials and firewall rules |

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop services
pm2 stop alawael-backend

# 2. Revert code
git checkout HEAD~1

# 3. Restart
pm2 restart alawael-backend

# 4. Verify
curl http://localhost:3000/api/health
```

---

## Support Contacts

- **Documentation:** See `FINAL_SYSTEM_OPTIMIZATION_REPORT.md`
- **GitHub Issues:** https://github.com/almashooq1/alawael-erp/issues
- **Tech Lead:** Email dev team
- **On-Call:** +966-XXXX-XXXX

---

**Version:** 2.0.0 | **Status:** Production Ready ✅ | **Last Updated:** Feb 24, 2026
