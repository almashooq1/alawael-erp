# 📦 Production Deployment Guide - Complete Checklist

**Date**: February 20, 2026 | **Version**: 1.0

---

## Executive Summary

Complete step-by-step guide for deploying the ERP System to production. Includes backend (Node.js/Express), frontend (React), database setup, and security configuration.

---

## 📋 Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing: Backend & Frontend
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] Security audit completed
- [ ] Dependencies up to date

### Environment Validation

- [ ] Node.js v20+ installed
- [ ] npm v11+ installed
- [ ] MongoDB configured (or use mock DB)
- [ ] Redis configured (optional)
- [ ] SSL certificates ready

### Business Requirements

- [ ] Feature complete per specification
- [ ] User acceptance testing passed
- [ ] Documentation complete
- [ ] Training materials prepared
- [ ] Support team briefed

---

## 🔧 Deployment Environment Setup

### Step 1: Server Preparation

#### Hardware Requirements

```
Minimum:
- CPU: 2 cores @ 2.0 GHz
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 1 Mbps stable connection

Recommended:
- CPU: 4+ cores @ 2.4+ GHz
- RAM: 8+ GB
- Storage: 50+ GB SSD
- Network: 10 Mbps+
```

#### Operating System

```bash
# Supported OS
- Ubuntu 20.04 LTS (Recommended)
- Ubuntu 22.04 LTS
- Debian 11+
- Windows Server 2019+
- CentOS 8+

# Required packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

#### Node.js Installation

```bash
# Using NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

source ~/.bashrc
nvm install 20
nvm use 20

# Verify
node --version    # v20.x.x
npm --version     # 11.x.x
```

### Step 2: Database Setup

#### Option A: MongoDB (Recommended for Production)

```bash
# Install MongoDB Community Edition
# Ubuntu/Debian
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongo --version
```

#### Option B: Mock Database (for testing/demo)

```bash
# No installation needed
# Set in backend/.env:
USE_MOCK_DB=true
```

#### MongoDB Configuration

```javascript
// backend/.env
MONGODB_URI=mongodb://localhost:27017/erp_system
USE_MOCK_DB=false
```

#### Create Database & Collections

```bash
# Connect to MongoDB
mongosh

# In MongoDB shell
> use erp_system
> db.users.createIndex({ email: 1 }, { unique: true })
> db.products.createIndex({ sku: 1 }, { unique: true })
> db.orders.createIndex({ orderNumber: 1 }, { unique: true })
> exit
```

### Step 3: Redis Setup (Optional, for Caching)

```bash
# Install Redis
sudo apt install -y redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping  # Should return PONG
```

---

## 🚀 Backend Deployment

### Step 1: Clone Repository

```bash
cd /opt
git clone <repository-url> erp-system
cd erp-system/erp_new_system/backend
```

### Step 2: Install Dependencies

```bash
npm ci  # Use package-lock.json instead of package.json
npm dedupe  # Remove duplicate packages
```

### Step 3: Environment Configuration

**Create `.env` file**:

```bash
touch .env
```

**Content** (production):

```env
# Server
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://username:password@mongodb-host:27017/erp_system
USE_MOCK_DB=false
DATABASE_NAME=erp_system

# Security
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_EXPIRY=7d
NODE_TLS_REJECT_UNAUTHORIZED=1

# CORS (Production domains)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=/var/data/erp/uploads
EXPORT_DIR=/var/data/erp/exports

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/erp

# Cache
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=secure-redis-password

# Monitoring
ENABLE_MONITORING=true
MONITORING_PORT=9090
```

### Step 4: Create Required Directories

```bash
# Create data directories
sudo mkdir -p /var/data/erp/{uploads,exports}
sudo mkdir -p /var/log/erp

# Set permissions
sudo chown -R node:node /var/data/erp
sudo chown -R node:node /var/log/erp
sudo chmod 755 /var/data/erp
sudo chmod 755 /var/log/erp
```

### Step 5: Build Backend

```bash
# Clean build
rm -rf node_modules package-lock.json
npm ci
npm run build  # if build script exists
```

### Step 6: Start Backend Service

#### Option A: Using systemd (Recommended)

```bash
# Create systemd service file
sudo tee /etc/systemd/system/erp-backend.service > /dev/null <<EOF
[Unit]
Description=ERP System Backend
After=network.target mongodb.service redis.service

[Service]
Type=simple
User=node
WorkingDirectory=/opt/erp-system/erp_new_system/backend
Environment="NODE_ENV=production"
ExecStart=/usr/local/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable erp-backend
sudo systemctl start erp-backend

# Verify status
sudo systemctl status erp-backend
```

#### Option B: Using PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
tee ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'erp-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/erp/error.log',
    out_file: '/var/log/erp/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save  # Save configuration
```

#### Option C: Using Docker

```bash
# Build Docker image
docker build -t erp-backend:1.0 .

# Run container
docker run -d \
  --name erp-backend \
  --restart always \
  -p 3001:3001 \
  -v /var/data/erp/uploads:/app/uploads \
  -v /var/data/erp/exports:/app/exports \
  -v /var/log/erp:/app/logs \
  --env-file .env \
  erp-backend:1.0

# Verify
docker logs erp-backend
curl http://localhost:3001/health
```

### Step 7: Verify Backend

```bash
# Health check
curl http://localhost:3001/health

# Expected response
{"status":"healthy","timestamp":"...","uptime":"..."}

# Check logs
journalctl -u erp-backend -f    # systemd
pm2 logs erp-backend             # PM2
docker logs -f erp-backend       # Docker
```

---

## 🎨 Frontend Deployment

### Step 1: Clone Repository

```bash
cd /opt/erp-system/supply-chain-management/frontend
```

### Step 2: Install Dependencies

```bash
npm ci
```

### Step 3: Environment Configuration

**Update `.env` file**:

```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production
REACT_APP_DEBUG=false
GENERATE_SOURCEMAP=false
```

### Step 4: Build Frontend

```bash
npm run build

# Output will be in ./build directory
# This is a static optimized build (60+ MB reduction via minification)
```

### Step 5: Deploy Build

#### Option A: Using Nginx (Recommended)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/erp-frontend > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;

    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    root /opt/erp-system/supply-chain-management/frontend/build;

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/erp-frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### Option B: Using Apache

```bash
# Install Apache
sudo apt install -y apache2 mod-rewrite

# Create Apache config
sudo tee /etc/apache2/sites-available/erp-frontend.conf > /dev/null <<EOF
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    DocumentRoot /opt/erp-system/supply-chain-management/frontend/build

    <Directory /opt/erp-system/supply-chain-management/frontend/build>
        Options -MultiViews
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ index.html [QSA,L]
    </Directory>

    # API Proxy
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
</VirtualHost>
EOF

# Enable modules
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod proxy

# Enable site
sudo a2dissite 000-default
sudo a2ensite erp-frontend

# Test Apache config
sudo apachectl configtest

# Restart Apache
sudo systemctl enable apache2
sudo systemctl restart apache2
```

#### Option C: Using Docker

```bash
# Build Nginx image
docker build -f Dockerfile.production -t erp-frontend:1.0 .

# Run container
docker run -d \
  --name erp-frontend \
  --restart always \
  -p 80:80 \
  -p 443:443 \
  -v /path/to/ssl/certs:/etc/nginx/certs \
  erp-frontend:1.0

# Verify
curl http://localhost
```

### Step 6: Setup SSL/TLS (Using Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx python3-certbot-apache

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Step 7: Verify Frontend

```bash
# Test HTTPS
curl https://yourdomain.com

# Check response
# Should return HTML with React app
```

---

## 🔐 Security Configuration

### 1. SSL/TLS Certificate

```bash
# Verify certificate validity (90 days with renewal)
curl -vI https://yourdomain.com

# Expected: 200 OK with SSL/TLS handshake
```

### 2. Firewall Configuration

```bash
# UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable
```

### 3. Environment Variables Security

```bash
# Create .env file with restricted permissions
touch .env
chmod 600 .env

# Never commit .env to git
echo ".env" >> .gitignore
```

### 4. Database Security

```bash
# Create MongoDB user
mongosh
> use admin
> db.createUser({
  user: "erp_user",
  pwd: passwordPrompt(),
  roles: ["readWrite", { db: "erp_system" }]
})

# Update .env
MONGODB_URI=mongodb://erp_user:password@localhost:27017/erp_system
```

### 5. JWT Secret Key

```bash
# Generate strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Update .env
JWT_SECRET=<generated-secret>
```

---

## 📊 Monitoring & Logging

### 1. Backend Logs

```bash
# View logs
tail -f /var/log/erp/error.log
tail -f /var/log/erp/out.log

# Or with journalctl
journalctl -u erp-backend -f
```

### 2. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Or visit monitoring endpoint
curl http://localhost:9090/metrics
```

### 3. System Monitoring

```bash
# Install Glances (system monitor)
sudo pip3 install glances

# Run
glances

# Or use standard tools
top
htop
df -h
du -sh /var/data/erp/*
```

### 4. Log Rotation

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/erp > /dev/null <<EOF
/var/log/erp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 node node
    sharedscripts
    postrotate
        systemctl reload erp-backend > /dev/null 2>&1 || true
    endscript
}
EOF
```

---

## ✅ Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl -s http://localhost:3001/health | jq

# Frontend health
curl -s https://yourdomain.com | head -20

# Database connection
mongosh --eval "db.adminCommand('ping')"
```

### Test API Endpoints

```bash
# Generate test token
TOKEN=$(node -e "console.log(Buffer.from(JSON.stringify({id:'test',role:'admin',exp:Math.floor(Date.now()/1000)+86400})).toString('base64'))")

# Test API
curl -H "Authorization: Bearer $TOKEN" \
     https://yourdomain.com/api/export/status/test
```

### Performance Testing

```bash
# Install Apache Bench
sudo apt install -y apache2-utils

# Load test
ab -n 100 -c 10 https://yourdomain.com

# Or use wrk for better results
# brew install wrk (macOS)
wrk -t4 -c100 -d30s https://yourdomain.com
```

---

## 🚨 Troubleshooting

| Issue                        | Solution                                                  |
| ---------------------------- | --------------------------------------------------------- |
| Port already in use          | `lsof -i :3001` then kill process                         |
| Permission denied on uploads | `sudo chown -R node:node /var/data/erp`                   |
| CORS errors                  | Update CORS_ORIGIN in backend .env                        |
| SSL certificate error        | Run `certbot renew --dry-run`                             |
| 502 Bad Gateway              | Check if backend is running: `curl localhost:3001/health` |
| Database connection failed   | Verify MongoDB running: `mongosh --eval "db.version()"`   |

---

## 📈 Performance Optimization

### 1. Code Optimization

```bash
# Minify frontend assets
npm run build  # Already optimized

# Analyze bundle size
npm install -g webpack-bundle-analyzer
npm run analyze  # if configured
```

### 2. Database Optimization

```bash
# Create indexes
mongosh
> db.users.createIndex({ email: 1 })
> db.orders.createIndex({ createdAt: -1 })
> db.products.createIndex({ sku: 1, status: 1 })
```

### 3. Caching Strategy

```javascript
// Backend:
REDIS_URL=redis://localhost:6379

// Frontend:
// Browser caching configured in Nginx/Apache
```

### 4. Load Balancing

```bash
# Nginx upstream (for multiple backend instances)
upstream backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

location /api/ {
    proxy_pass http://backend;
}
```

---

## 🎯 Rollback Plan

```bash
# Keep previous version
mv /opt/erp-system /opt/erp-system-v2-prod
git checkout v1-prod  # or previous tag

# Restore database if needed
mongorestore --archive=backup.archive

# Restart service
sudo systemctl restart erp-backend
```

---

## 📋 Deployment Checklist (Final)

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database setup complete
- [ ] Backend running and healthy
- [ ] Frontend built and deployed
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] Monitoring and logging active
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team trained
- [ ] Rollback plan ready

---

## 📞 Support

For issues or questions:

1. Check logs: `/var/log/erp/`
2. Verify health: `curl http://localhost:3001/health`
3. Check database: `mongosh --eval "db.version()"`
4. Review configuration: `cat backend/.env`

---

**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT  
**Version**: 1.0  
**Last Updated**: February 20, 2026
