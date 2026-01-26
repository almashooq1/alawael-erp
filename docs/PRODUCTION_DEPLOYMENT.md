# 🚀 PRODUCTION DEPLOYMENT GUIDE

# دليل النشر الإنتاجي

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Checklist](#pre-deployment)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [SSL/TLS Configuration](#ssl-tls)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment)
7. [Monitoring & Maintenance](#monitoring)
8. [Rollback Procedures](#rollback)
9. [Troubleshooting](#troubleshooting)

---

## 🔍 PRE-DEPLOYMENT CHECKLIST {#pre-deployment}

### ✅ Code Quality

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed
- [ ] No console.log statements in production code
- [ ] No hardcoded credentials
- [ ] Git branch merged to main
- [ ] Version bumped in package.json

### ✅ Security Review

- [ ] Security audit completed
- [ ] OWASP Top 10 verified
- [ ] Encryption keys configured
- [ ] SSL certificates ready
- [ ] Database credentials secured
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints

### ✅ Infrastructure

- [ ] Production database provisioned
- [ ] Redis cache configured
- [ ] AWS S3 bucket created
- [ ] CDN configured
- [ ] Load balancer setup
- [ ] Domain name resolved
- [ ] SSL certificates obtained

### ✅ Backup & Recovery

- [ ] Backup strategy documented
- [ ] Backup automation configured
- [ ] Recovery procedures tested
- [ ] Backup retention policy set
- [ ] Disaster recovery plan documented

### ✅ Monitoring & Alerts

- [ ] Monitoring dashboards created
- [ ] Log aggregation configured
- [ ] Alert rules configured
- [ ] Incident response plan ready
- [ ] Team notified and trained

---

## 🔧 ENVIRONMENT SETUP {#environment-setup}

### Step 1: Production Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install SSL Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Create Application User

```bash
# Create non-root user
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG sudo appuser

# Create application directory
sudo mkdir -p /var/www/erp-system
sudo chown appuser:appuser /var/www/erp-system
```

### Step 3: Environment Variables Configuration

```bash
# Create .env.production file
cat > /var/www/erp-system/.env.production << 'EOF'
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/erp_db
MONGODB_ATLAS_URI=mongodb+srv://user:pass@cluster.mongodb.net/erp_db
MONGODB_REPLICA_SET=rs0
MONGODB_BACKUP_PATH=/backups/mongodb

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key_32_chars
ENCRYPTION_IV=your_initialization_vector

# Email (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=erp-system-backups

# Admin
ADMIN_EMAIL=admin@company.com
ADMIN_PHONE=+1234567890

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Backup
BACKUP_STORAGE_PATH=/backups
BACKUP_RETENTION_DAYS=30
EOF

# Secure permissions
chmod 600 /var/www/erp-system/.env.production
```

---

## 🗄️ DATABASE MIGRATION {#database-migration}

### Step 1: Backup Existing Data (if applicable)

```bash
# Create backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/erp_db" \
  --archive=backup-$(date +%Y%m%d-%H%M%S).archive

# Verify backup
ls -lh backup-*.archive
```

### Step 2: Create Indexes

```bash
# Connect to MongoDB Atlas
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/erp_db"

# Create critical indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 });
db.users.createIndex({ createdAt: -1 });

db.orders.createIndex({ orderId: 1 }, { unique: true });
db.orders.createIndex({ userId: 1, createdAt: -1 });

db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ name: "text" });

# Verify indexes
db.users.getIndexes();
```

### Step 3: Run Database Migrations

```bash
# From application directory
npm run migrate:latest
npm run seed:production  # If applicable
```

---

## 🔐 SSL/TLS CONFIGURATION {#ssl-tls}

### Step 1: Obtain SSL Certificate

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Verify certificate
sudo ls -la /etc/letsencrypt/live/your-domain.com/
```

### Step 2: Configure Nginx

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/erp-system > /dev/null << 'EOF'
upstream erp_app {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_comp_level 6;

    # Proxy Settings
    location / {
        proxy_pass http://erp_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://erp_app;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/erp-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🚀 DEPLOYMENT STEPS {#deployment-steps}

### Step 1: Deploy Application

```bash
# Navigate to app directory
cd /var/www/erp-system

# Clone/pull repository
git clone your-repo-url .
# or
git pull origin main

# Install dependencies
npm ci --only=production

# Build frontend (if applicable)
npm run build

# Set permissions
sudo chown -R appuser:appuser /var/www/erp-system
```

### Step 2: Configure PM2

```bash
# Create PM2 ecosystem file
cat > /var/www/erp-system/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'erp-system',
      script: './server.js',
      instances: 4,
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js --name erp-system

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u appuser --hp /home/appuser
```

### Step 3: Setup Automated Backups

```bash
# Create backup script
cat > /var/www/erp-system/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p $BACKUP_DIR

# Perform backup
mongodump --uri="$MONGODB_URI" --archive="$BACKUP_FILE.archive"

# Compress
gzip "$BACKUP_FILE.archive"

# Upload to S3
aws s3 cp "$BACKUP_FILE.archive.gz" "s3://erp-backups/$TIMESTAMP/"

# Cleanup old backups (30+ days)
find $BACKUP_DIR -name "backup_*.archive.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.archive.gz"
EOF

chmod +x /var/www/erp-system/scripts/backup.sh

# Schedule cron job (daily at 2 AM)
(crontab -l; echo "0 2 * * * /var/www/erp-system/scripts/backup.sh") | crontab -
```

---

## ✅ POST-DEPLOYMENT VERIFICATION {#post-deployment}

### Step 1: Health Checks

```bash
# Check application status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check logs
pm2 logs erp-system

# Test API endpoint
curl -X GET https://your-domain.com/api/health \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-20T10:00:00Z"
# }
```

### Step 2: Performance Testing

```bash
# Test response time
time curl https://your-domain.com/

# Load testing (using Apache Bench)
ab -n 1000 -c 100 https://your-domain.com/

# Monitor real-time
watch -n 1 'pm2 status'
watch -n 1 'netstat -tulpn | grep :3000'
```

### Step 3: Security Verification

```bash
# Test SSL/TLS
openssl s_client -connect your-domain.com:443

# Check security headers
curl -I https://your-domain.com/

# Verify certificate
sudo certbot certificates
```

---

## 📊 MONITORING & MAINTENANCE {#monitoring}

### Real-time Monitoring Dashboard

```javascript
// Setup monitoring in dashboard
- System metrics (CPU, Memory, Disk)
- Database performance
- API response times
- Error rates
- Active users
- Request volume
```

### Log Management

```bash
# View logs
pm2 logs erp-system
pm2 logs erp-system --lines 100

# Setup log rotation
cat > /etc/logrotate.d/erp-system << 'EOF'
/var/www/erp-system/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        pm2 reload erp-system
    endscript
}
EOF
```

---

## 🔄 ROLLBACK PROCEDURES {#rollback}

### Quick Rollback (Last 5 minutes)

```bash
# Get previous version
pm2 restart erp-system

# If restart doesn't work, use git
cd /var/www/erp-system
git revert HEAD
npm ci
pm2 reload erp-system
```

### Full Rollback

```bash
# Stop application
pm2 stop erp-system

# Restore from backup
mongorestore --uri="$MONGODB_URI" --archive=backup_previous.archive

# Restore code
git checkout previous-tag
npm ci
pm2 restart erp-system
```

---

## 🐛 TROUBLESHOOTING {#troubleshooting}

### Application Won't Start

```bash
# Check logs
pm2 logs erp-system

# Verify environment
cat /var/www/erp-system/.env.production

# Check dependencies
npm list

# Rebuild modules
rm -rf node_modules package-lock.json
npm ci
```

### Database Connection Issues

```bash
# Test connection
mongosh "$MONGODB_URI"

# Check network connectivity
ping cluster.mongodb.net

# Verify IP whitelist in Atlas
# Check Atlas → Network Access → IP Whitelist
```

### Performance Issues

```bash
# Check system resources
free -m
df -h
top

# Monitor process
pm2 monit erp-system

# Check database indexes
db.users.getIndexes()
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Manual renewal
sudo certbot certonly --force-renewal -d your-domain.com

# Check expiration
sudo certbot certificates
```

---

## 📞 SUPPORT & ESCALATION

- **Critical Issues**: Page on-call engineer
- **High Priority**: Create incident ticket
- **Medium Priority**: Create task ticket
- **Low Priority**: Document for next sprint

---

**Last Updated**: January 2024 **Version**: 1.0 **Maintained By**: DevOps Team
