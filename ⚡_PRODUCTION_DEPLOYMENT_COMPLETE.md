# 🚀 PRODUCTION DEPLOYMENT GUIDE

# AlAwael ERP System - Complete Production Deployment

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [System Requirements](#system-requirements)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup Configuration](#backup-configuration)
8. [Security Hardening](#security-hardening)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (npm test)
- [ ] No ESLint errors (npm run lint)
- [ ] Security scan passed (npm run security)
- [ ] Code coverage > 80%
- [ ] Documentation updated

### Environment

- [ ] .env.production created with all variables
- [ ] Database credentials secured in vault
- [ ] API keys rotated
- [ ] CORS configured for production domain
- [ ] Rate limiting configured

### Infrastructure

- [ ] Load balancer configured
- [ ] Database backups tested
- [ ] SSL certificates obtained
- [ ] Monitoring system setup
- [ ] Logging aggregation ready

### Team

- [ ] Deployment runbook reviewed
- [ ] Team trained on monitoring dashboard
- [ ] Rollback procedure documented
- [ ] On-call rotation established
- [ ] Incident response plan ready

---

## System Requirements

### Minimum

- **CPU**: 2 cores
- **Memory**: 4 GB RAM
- **Storage**: 50 GB
- **OS**: Ubuntu 20.04 LTS or Windows Server 2019+

### Recommended (High Traffic)

- **CPU**: 4+ cores
- **Memory**: 8+ GB RAM
- **Storage**: 100+ GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Load Balancer**: HAProxy or nginx
- **Reverse Proxy**: nginx

### Software

- Node.js 18.x
- MongoDB 5.0+
- Redis 6.2+
- Docker & Docker Compose
- nginx 1.20+

---

## Database Setup

### 1. MongoDB Installation

```bash
# Ubuntu/Debian
curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Initialize Database

```bash
mongo admin --eval "
db.createUser({
  user: 'admin',
  pwd: 'SecurePassword123!',
  roles: ['root']
});

db.createUser({
  user: 'alawael',
  pwd: 'AppPassword456!',
  roles: [{ role: 'readWrite', db: 'alawael' }]
});
"
```

### 3. Create Indexes

```bash
node backend/config/database.optimization.js
```

### 4. Backup Database

```bash
bash scripts/backup.sh init
bash scripts/backup.sh full
```

---

## Application Deployment

### 1. Code Deployment

```bash
# Clone repository
git clone <repo-url> /app/alawael
cd /app/alawael

# Install dependencies
npm install --production

# Build frontend
cd frontend
npm run build
cd ..

# Build backend
cd backend
npm run build
cd ..
```

### 2. Environment Configuration

```bash
# Create .env.production
cat > .env.production << EOF
# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://alawael:AppPassword456!@localhost:27017/alawael
MONGODB_POOL_SIZE=50

# Cache
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=CachePassword789!
CACHE_TTL=3600

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Features
SOCKET_IO_ENABLED=true
MONITORING_ENABLED=true
ANALYTICS_ENABLED=true
TWO_FACTOR_AUTH_ENABLED=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@alawael.com
SMTP_PASS=$SMTP_PASSWORD

# External APIs
API_KEY_WEATHER=xxx
API_KEY_GEOCODING=xxx

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF
```

### 3. Service Setup (systemd)

```bash
# Create service file
sudo tee /etc/systemd/system/alawael.service > /dev/null << EOF
[Unit]
Description=AlAwael ERP Backend
After=network.target mongodb.service redis-server.service

[Service]
Type=simple
User=alawael
WorkingDirectory=/app/alawael
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
EnvironmentFile=/app/alawael/.env.production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable alawael
sudo systemctl start alawael
```

### 4. Verify Deployment

```bash
# Check service status
sudo systemctl status alawael

# Check logs
journalctl -u alawael -f

# Test API
curl https://api.alawael.com/health
```

---

## SSL/TLS Configuration

### 1. Generate Certificates

```bash
# Using Let's Encrypt
sudo certbot certonly --standalone \
  -d api.alawael.com \
  -d alawael.com \
  -m admin@alawael.com \
  --agree-tos

# Copy certificates
sudo cp /etc/letsencrypt/live/api.alawael.com/fullchain.pem /app/alawael/ssl/
sudo cp /etc/letsencrypt/live/api.alawael.com/privkey.pem /app/alawael/ssl/
sudo chown alawael:alawael /app/alawael/ssl/*
```

### 2. Configure nginx

```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/alawael > /dev/null << 'EOF'
# HTTP redirect
server {
    listen 80;
    server_name api.alawael.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name api.alawael.com;

    ssl_certificate /app/alawael/ssl/fullchain.pem;
    ssl_certificate_key /app/alawael/ssl/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Reverse proxy
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Metrics endpoint
    location /metrics {
        proxy_pass http://localhost:9091;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Monitoring Setup

### 1. Start Monitoring Stack

```bash
docker-compose -f monitoring/docker-compose-monitoring.yml up -d
```

### 2. Configure Prometheus

```bash
# Already configured in monitoring/prometheus.yml
# Scrape targets:
# - Backend API (9091)
# - Redis (9121)
# - Node Exporter (9100)
# - MongoDB (27017)
```

### 3. Access Grafana

```
http://localhost:3005
Username: admin
Password: admin
```

### 4. Create Dashboards

- System Health (CPU, Memory, Disk)
- Application Performance (Response times, Errors)
- Business Metrics (Users, Transactions)
- Cache Performance (Hit/Miss ratio)
- Database Performance (Query times)

---

## Backup Configuration

### 1. Create Backup Schedule

```bash
# Full backup daily at 2 AM
0 2 * * * root cd /app/alawael && bash scripts/backup.sh full

# Incremental backup every 6 hours
0 */6 * * * root cd /app/alawael && bash scripts/backup.sh incremental

# Cleanup old backups weekly
0 3 * * 0 root cd /app/alawael && bash scripts/backup.sh cleanup
```

### 2. Test Restore Procedure

```bash
# Simulate restore
bash scripts/backup.sh list
bash scripts/backup.sh restore backups/archive/full_backup_*.tar.gz
```

### 3. Backup Verification

```bash
# Verify backup integrity
bash scripts/backup.sh stats
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 27017/tcp  # MongoDB (local only)
sudo ufw allow 6379/tcp   # Redis (local only)
sudo ufw enable
```

### 2. Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get autoremove -y
```

### 3. Disable Unnecessary Services

```bash
sudo systemctl disable apache2
sudo systemctl disable bluetooth
```

### 4. Enable Fail2Ban

```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 5. Password Policy

```bash
sudo apt-get install libpam-pwquality
# Configure in /etc/security/pwquality.conf
```

---

## Performance Optimization

### 1. Database Indexing

```bash
node -e "require('./backend/config/database.optimization.js').createIndexes(db)"
```

### 2. Cache Configuration

```bash
# Redis memory management
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG REWRITE
```

### 3. Connection Pooling

```javascript
// Already configured in backend/config/database.optimization.js
maxPoolSize: 50;
minPoolSize: 10;
```

### 4. Load Balancing

```bash
# HAProxy configuration
global
  maxconn 4096

backend backend_servers
  balance roundrobin
  server web1 192.168.1.10:3001 check
  server web2 192.168.1.11:3001 check
  server web3 192.168.1.12:3001 check
```

---

## Troubleshooting

### Issue: High Memory Usage

```bash
# Check memory usage
free -h

# Restart service
sudo systemctl restart alawael

# Check logs
journalctl -u alawael -n 50 --no-pager
```

### Issue: Slow Queries

```bash
# Enable MongoDB query logging
mongo admin -u admin -p << EOF
db.setProfilingLevel(1, { slowms: 100 })
EOF

# Check slow queries
mongo alawael -u alawael -p << EOF
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
EOF
```

### Issue: Cache Not Working

```bash
# Check Redis connection
redis-cli ping

# Check Redis memory
redis-cli info memory

# Flush cache if needed
redis-cli FLUSHALL
```

### Issue: SSL Certificate Expired

```bash
# Renew certificate
sudo certbot renew --force-renewal

# Restart nginx
sudo systemctl restart nginx
```

---

## Maintenance

### Daily Tasks

- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Verify backups completed

### Weekly Tasks

- [ ] Review performance metrics
- [ ] Check disk usage
- [ ] Test backup restore

### Monthly Tasks

- [ ] Security patch updates
- [ ] Database optimization
- [ ] Cache cleanup
- [ ] Certificate renewal check

---

## Contact & Support

- **Technical Lead**: tech@alawael.com
- **Operations**: ops@alawael.com
- **Security**: security@alawael.com
- **24/7 Support**: +966-XX-XXXX-XXXX

---

## Version History

| Date       | Version | Changes                             |
| ---------- | ------- | ----------------------------------- |
| 2025-01-04 | 1.0     | Initial production deployment guide |

---

_Last Updated: 2025-01-04_ _Document Version: 1.0_
