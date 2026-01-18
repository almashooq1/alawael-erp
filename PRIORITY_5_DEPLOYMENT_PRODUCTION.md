# 🚀 PRIORITY 5: PRODUCTION DEPLOYMENT - COMPREHENSIVE GUIDE

**Status Date:** 18 January 2026  
**Estimated Time:** 90 minutes  
**Difficulty:** Advanced

---

## 📋 OVERVIEW

Complete guide to deploy Alawael ERP to production:

- VPS Setup (DigitalOcean/Linode/AWS)
- Application Deployment
- Process Management (PM2)
- Reverse Proxy (Nginx)
- Security Hardening
- Monitoring & Logging

---

## 🎯 OBJECTIVES

By the end of this guide:

- ✅ VPS provisioned and configured
- ✅ Application deployed
- ✅ PM2 process management active
- ✅ Nginx reverse proxy configured
- ✅ SSL/HTTPS enabled
- ✅ Monitoring & alerts working
- ✅ Backups automated
- ✅ 99.9% uptime target achieved

---

## ⏱️ TIMELINE

| Phase     | Task                  | Time       | Status   |
| --------- | --------------------- | ---------- | -------- |
| 1         | VPS Provisioning      | 10 min     | TODO     |
| 2         | Environment Setup     | 15 min     | TODO     |
| 3         | Application Deploy    | 15 min     | TODO     |
| 4         | PM2 Configuration     | 10 min     | TODO     |
| 5         | Nginx Setup           | 15 min     | TODO     |
| 6         | SSL/HTTPS             | 10 min     | TODO     |
| 7         | Monitoring Setup      | 10 min     | TODO     |
| 8         | Final Testing         | 5 min      | TODO     |
| **Total** | **Production Deploy** | **90 min** | **TODO** |

---

## 💰 COST BREAKDOWN

| Service            | Monthly  | Annual     | Specs           |
| ------------------ | -------- | ---------- | --------------- |
| **VPS Server**     | $10-50   | $120-600   | 2 CPU, 2GB RAM  |
| **MongoDB Atlas**  | $57-400+ | $684-4800+ | Cloud Database  |
| **Domain**         | $1       | $10-15     | alawael-erp.com |
| **SSL Cert**       | $0       | $0         | Let's Encrypt   |
| **Email Service**  | $0-29    | $0-348     | SendGrid/AWS    |
| **Backups**        | $5-20    | $60-240    | S3/Backblaze    |
| **Monitoring**     | $10-29   | $120-348   | Uptime Robot    |
| **CDN (Optional)** | $20+     | $240+      | Cloudflare      |
| **TOTAL MIN**      | ~$103    | ~$1,234    | Basic Setup     |

---

## 🖥️ PHASE 1: VPS PROVISIONING (10 minutes)

### Option A: DigitalOcean (Recommended)

1. Go to https://www.digitalocean.com
2. Sign up with email/GitHub
3. Create new Droplet:
   - **OS:** Ubuntu 22.04 LTS
   - **Size:** $6-12/month (2GB RAM, 1 CPU)
   - **Region:** Choose closest to your users
   - **SSH Key:** Generate & save locally
4. Record IP address
5. Add to DNS records

### Option B: Linode

1. Go to https://www.linode.com
2. Create Linode:
   - **Image:** Ubuntu 22.04 LTS
   - **Size:** Linode 4GB ($20/month)
   - **Region:** Closest region
3. Boot Linode
4. Record IP address

### Option C: AWS EC2

1. Go to https://aws.amazon.com
2. EC2 Dashboard → Launch Instance
   - **AMI:** Ubuntu 22.04 LTS
   - **Type:** t3.micro (free tier) or t3.small ($8/month)
   - **Storage:** 30GB
3. Configure Security Groups (allow ports 22, 80, 443)
4. Create key pair & save
5. Launch instance

### Recommended Specs

```
OS:           Ubuntu 22.04 LTS
CPU:          2 vCPU (min)
RAM:          2GB (min)
Storage:      20GB SSD (min)
Bandwidth:    1TB/month (min)
Cost:         $10-20/month
```

---

## 🔧 PHASE 2: ENVIRONMENT SETUP (15 minutes)

### Step 1: Initial Server Setup

```bash
# SSH into server
ssh -i your_key.pem root@YOUR_SERVER_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version   # v18.x.x
npm --version    # 9.x.x
```

### Step 2: Install Dependencies

```bash
# Git
sudo apt install -y git

# Nginx
sudo apt install -y nginx

# PM2 (Process Manager)
sudo npm install -g pm2

# MongoDB CLI (optional, for backups)
sudo apt install -y mongodb-mongosh
```

### Step 3: Create Application User

```bash
# Create new user (not root)
sudo useradd -m -s /bin/bash alawael

# Add sudo privileges
sudo usermod -aG sudo alawael

# Switch to new user
sudo su - alawael
```

### Step 4: Clone Application

```bash
# Clone repository
git clone https://github.com/yourusername/alawael-erp.git
cd alawael-erp

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build
```

---

## 📤 PHASE 3: APPLICATION DEPLOYMENT (15 minutes)

### Step 1: Prepare Backend

```bash
cd /home/alawael/alawael-erp/backend

# Create production .env
nano .env
```

**Production .env:**

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://alawael_admin:Admin%402026@cluster0.5njwaqd.mongodb.net/alawael-erp
USE_MOCK_DB=false
JWT_SECRET=your_secret_key_here_change_this
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### Step 2: Prepare Frontend

```bash
cd /home/alawael/alawael-erp/frontend

# Create .env.production
echo "REACT_APP_API_URL=https://alawael-erp.com/api" > .env.production

# Build already done
# Build exists in: /frontend/build
```

### Step 3: Setup PM2

Create: `/home/alawael/alawael-erp/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'alawael-backend',
      script: '/home/alawael/alawael-erp/backend/server.js',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/home/alawael/logs/backend-error.log',
      out_file: '/home/alawael/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

### Step 4: Start Application

```bash
# Create logs directory
mkdir -p /home/alawael/logs

# Start with PM2
cd /home/alawael/alawael-erp
pm2 start ecosystem.config.js

# Setup PM2 startup
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs
```

---

## ⚙️ PHASE 4: PM2 CONFIGURATION (10 minutes)

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop all

# Restart application
pm2 restart all

# View logs
pm2 logs alawael-backend

# Monitor in real-time
pm2 monit

# View process details
pm2 show alawael-backend

# Setup auto-restart on reboot
pm2 startup ubuntu -u alawael --hp /home/alawael
pm2 save

# Monitor memory & CPU
pm2 plus
```

### PM2 Monitoring

```bash
# Email alerts
pm2 link [SECRET_KEY] [PUBLIC_KEY]

# Monitor dashboard
# https://app.pm2.io

# Real-time alerts
pm2 plus
```

---

## 🌍 PHASE 5: NGINX CONFIGURATION (15 minutes)

### Step 1: Disable Default Site

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Step 2: Create Nginx Config

Create: `/etc/nginx/sites-available/alawael`

```nginx
upstream backend {
  server localhost:3001;
  keepalive 64;
}

# HTTP redirect to HTTPS
server {
  listen 80;
  listen [::]:80;
  server_name alawael-erp.com www.alawael-erp.com;

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    return 301 https://$server_name$request_uri;
  }
}

# HTTPS main server
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name alawael-erp.com www.alawael-erp.com;

  # SSL Certificates (from Let's Encrypt/Cloudflare)
  ssl_certificate /etc/letsencrypt/live/alawael-erp.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/alawael-erp.com/privkey.pem;

  # SSL Security
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;
  ssl_stapling on;
  ssl_stapling_verify on;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css text/xml text/javascript
             application/x-javascript application/xml+rss
             application/javascript application/json;
  gzip_min_length 1000;
  gzip_disable "msie6";

  # Static files
  location ~* ^/(?:build|static)/ {
    root /home/alawael/alawael-erp/frontend;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  # Frontend SPA
  location / {
    root /home/alawael/alawael-erp/frontend;
    try_files $uri $uri/ /index.html;
    expires -1;
  }

  # Backend API
  location /api/ {
    proxy_pass http://backend;
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

  # Health check
  location /health {
    access_log off;
    proxy_pass http://backend;
  }

  # Rate limiting
  limit_req zone=api burst=20 nodelay;
  limit_req_status 429;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### Step 3: Enable Nginx

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable on boot
sudo systemctl enable nginx
```

---

## 🔐 PHASE 6: SSL/HTTPS (10 minutes)

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d alawael-erp.com -d www.alawael-erp.com

# Auto-renewal
sudo certbot renew --dry-run

# Setup renewal cron
sudo crontab -e
# Add: 0 3 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

### Verify SSL

```bash
# Check certificate
sudo certbot certificates

# Test SSL configuration
# https://www.ssllabs.com/ssltest/analyze.html?d=alawael-erp.com
```

---

## 📊 PHASE 7: MONITORING SETUP (10 minutes)

### Option 1: PM2 Plus

```bash
# Link to PM2 dashboard
pm2 link [SECRET_KEY] [PUBLIC_KEY]

# Real-time monitoring
# https://app.pm2.io/dashboard
```

### Option 2: Uptime Robot

1. Go to https://uptimerobot.com
2. Sign up (free)
3. Create monitors:
   - **API:** https://alawael-erp.com/health
   - **Frontend:** https://alawael-erp.com
4. Set alert email

### Option 3: Server Monitoring

```bash
# Install Netdata (lightweight monitoring)
wget -O /tmp/netdata-kickstart.sh https://get.netdata.cloud/kickstart.sh
sh /tmp/netdata-kickstart.sh --stable-channel --disable-telemetry

# Access: http://YOUR_IP:19999
```

---

## 🔄 AUTOMATED BACKUPS

Create: `/home/alawael/backup.sh`

```bash
#!/bin/bash

BACKUP_DIR="/home/alawael/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# Create backups directory
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_FILE \
  /home/alawael/alawael-erp/backend/.env \
  /home/alawael/logs/ \
  /home/alawael/alawael-erp/

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://your-bucket/backups/

# Cleanup old backups (keep last 7)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Setup cron:

```bash
# Run daily at 2 AM
0 2 * * * bash /home/alawael/backup.sh >> /home/alawael/logs/backup.log 2>&1
```

---

## 🧪 FINAL TESTING (5 minutes)

### Test Endpoints

```bash
# Health check
curl https://alawael-erp.com/health

# Frontend
curl -I https://alawael-erp.com

# API
curl https://alawael-erp.com/api/users

# Should all return 200 OK
```

### Performance Test

```bash
# Install Apache Bench
sudo apt install -y apache2-utils

# Test throughput
ab -n 1000 -c 10 https://alawael-erp.com/

# Expected: >90 requests/sec
```

---

## 📝 DEPLOYMENT CHECKLIST

- [ ] VPS provisioned & running
- [ ] Node.js installed
- [ ] Dependencies installed
- [ ] Application cloned
- [ ] Backend built & configured
- [ ] Frontend built & configured
- [ ] PM2 started & configured
- [ ] PM2 startup enabled
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Nginx restarted
- [ ] Health check passing
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Domain DNS pointing to server
- [ ] HTTPS working
- [ ] Performance optimized

---

## ✅ SUCCESS CRITERIA

After deployment:

- ✅ Application accessible at https://alawael-erp.com
- ✅ HTTPS with valid SSL certificate
- ✅ Response time <500ms
- ✅ 99.9% uptime
- ✅ Automatic backups working
- ✅ Monitoring active
- ✅ Logs accessible
- ✅ Process management automated
- ✅ Auto-restart on crash
- ✅ Auto-start on reboot

---

## 🚨 TROUBLESHOOTING

| Issue                    | Solution                           |
| ------------------------ | ---------------------------------- |
| Application not starting | Check logs: `pm2 logs`             |
| Port already in use      | Kill process: `sudo lsof -i :3001` |
| Nginx error              | Test config: `sudo nginx -t`       |
| SSL certificate error    | Verify paths in Nginx config       |
| High CPU usage           | Check logs, optimize queries       |
| Low memory               | Increase swap or upgrade VPS       |
| Domain not resolving     | Check DNS propagation              |

---

## 📞 SUPPORT & RESOURCES

- **DigitalOcean:** https://www.digitalocean.com/docs/
- **Nginx:** https://nginx.org/en/docs/
- **PM2:** https://pm2.keymetrics.io/
- **Let's Encrypt:** https://letsencrypt.org/
- **Certbot:** https://certbot.eff.org/

---

## 🎊 PRODUCTION READY!

After completing this guide:

- ✅ Production server configured
- ✅ Application deployed
- ✅ SSL/HTTPS enabled
- ✅ Monitoring active
- ✅ Backups automated
- ✅ Ready for users

**🚀 Alawael ERP is now LIVE in production!**
