# 🚀 Priority 5: Production Deployment Complete Guide

## Overview

Deploy Alawael ERP System to production with full monitoring, scaling, and reliability.

---

## Part 1: Server Setup

### Option A: VPS (DigitalOcean, Linode, AWS EC2)

**Instance Specifications:**

- OS: Ubuntu 22.04 LTS
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 100GB+ SSD
- Network: 1Gbps

**Initial Setup:**

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install MongoDB (optional, if not using Atlas)
sudo apt-get install -y mongodb

# Install SSL tools
sudo apt-get install -y certbot python3-certbot-nginx

# Install monitoring
sudo apt-get install -y htop iotop nethogs
```

---

## Part 2: Application Deployment

### Step 1: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/yourusername/alawael-erp.git
cd alawael-erp
sudo chown -R $USER:$USER .
```

### Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

### Step 3: Configure Environment

```bash
# backend/.env (Production)
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
USE_MOCK_DB=false
JWT_SECRET=your_super_secret_key_here
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### Step 4: Setup PM2

**File: ecosystem.config.js**

```javascript
module.exports = {
  apps: [
    {
      name: 'alawael-backend',
      script: './backend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 'max',
      exec_mode: 'cluster',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      node_args: '--max_old_space_size=4096',
    },
    {
      name: 'alawael-frontend',
      script: './frontend/serve.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      autorestart: true,
      watch: false,
    },
  ],
};
```

**Start Services:**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Part 3: Nginx Configuration

**File: /etc/nginx/sites-available/alawael-erp**

```nginx
upstream backend {
    server localhost:3001;
    server localhost:3001 backup;
    keepalive 64;
}

upstream frontend {
    server localhost:3002;
    keepalive 64;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=20r/s;

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name alawael-erp.com www.alawael-erp.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name alawael-erp.com www.alawael-erp.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/alawael-erp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alawael-erp.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Logging
    access_log /var/log/nginx/alawael-access.log combined;
    error_log /var/log/nginx/alawael-error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/javascript application/json application/javascript;

    # Client upload size
    client_max_body_size 100M;

    # Frontend (React)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Cache static assets
        expires 1y;
    }

    # Backend API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://backend;
    }
}
```

**Enable Site:**

```bash
sudo ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Part 4: Monitoring & Logging

### PM2 Monitoring

```bash
# Install PM2 Plus
pm2 plus

# View dashboard
pm2 dashboard

# View logs
pm2 logs
pm2 logs alawael-backend
pm2 logs alawael-frontend
```

### File: /etc/logrotate.d/alawael

```
/var/log/nginx/alawael-* {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}

/var/www/alawael-erp/logs/* {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    size 10M
}
```

### Monitoring Script

```bash
#!/bin/bash
# monitor.sh

while true; do
    echo "=== System Status ==="
    echo "Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $3"/"$2}')"
    echo ""
    echo "=== Services ==="
    pm2 status
    sleep 5
done
```

---

## Part 5: Backup & Recovery

### Automated Backups

```bash
# Daily backup script
#!/bin/bash
# /usr/local/bin/backup-alawael.sh

BACKUP_DIR="/backups/alawael"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net" \
  --out $BACKUP_DIR/mongo-$DATE

# Backup application
tar -czf $BACKUP_DIR/app-$DATE.tar.gz /var/www/alawael-erp

# Upload to S3
aws s3 cp $BACKUP_DIR s3://alawael-backups/ --recursive

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -mtime +30 -delete
```

**Cron Schedule:**

```bash
# /etc/cron.d/alawael-backup
0 2 * * * root /usr/local/bin/backup-alawael.sh
```

---

## Part 6: Security Hardening

```bash
# Firewall Configuration
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp  # Backend (internal only)
sudo ufw allow 3002/tcp  # Frontend (internal only)

# Fail2Ban (Brute force protection)
sudo apt-get install -y fail2ban

# File Permissions
sudo chown -R www-data:www-data /var/www/alawael-erp
sudo chmod -R 755 /var/www/alawael-erp
sudo chmod -R 755 /var/log/nginx

# SSH Hardening
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

---

## Part 7: Performance Optimization

### Database Indexing

```javascript
// Create indexes for better performance
db.organizations.createIndex({ email: 1 });
db.organizations.createIndex({ createdAt: -1 });
db.employees.createIndex({ organizationId: 1 });
db.employees.createIndex({ status: 1 });
```

### Caching Strategy

```javascript
// Redis caching in Express
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
});

// Cache middleware
app.use((req, res, next) => {
  if (req.method === 'GET') {
    client.get(req.originalUrl, (err, data) => {
      if (data) {
        res.send(JSON.parse(data));
      } else {
        next();
      }
    });
  } else {
    next();
  }
});
```

---

## Part 8: Deployment Checklist

- [ ] Domain registered and DNS configured
- [ ] SSL certificate installed and valid
- [ ] Server fully patched and updated
- [ ] Node.js and dependencies installed
- [ ] MongoDB configured (Atlas or local)
- [ ] Environment variables set
- [ ] PM2 configured and running
- [ ] Nginx configured and proxying correctly
- [ ] SSL auto-renewal configured
- [ ] Backups automated and tested
- [ ] Monitoring active (PM2, system logs)
- [ ] Firewall properly configured
- [ ] Health checks passing
- [ ] Performance optimized
- [ ] Documentation updated

---

## Part 9: Post-Deployment Testing

```bash
# Test endpoints
curl -I https://alawael-erp.com
curl -I https://alawael-erp.com/api/health
curl -I https://alawael-erp.com/api/backup/list

# SSL test
openssl s_client -connect alawael-erp.com:443 -showcerts

# Load testing
ab -n 1000 -c 100 https://alawael-erp.com/

# Monitor performance
htop
iotop
nethogs
```

---

**Status**: ⏳ Ready for implementation
**Time**: ~90 minutes
**Difficulty**: Hard
**Cost**: $5-20/month (depending on provider)
