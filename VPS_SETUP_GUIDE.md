# ═══════════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — VPS Setup Guide
# ═══════════════════════════════════════════════════════════════════════════════
# 
# Complete step-by-step guide for deploying Al-Awael ERP on a fresh VPS.
# Target: Ubuntu 22.04/24.04 LTS (recommended) or Debian 12
#
# Table of Contents:
#   1. VPS Requirements
#   2. Initial Server Setup
#   3. Installing Docker & Docker Compose
#   4. Installing Nginx
#   5. Installing Node.js 20
#   6. Cloning the Repository
#   7. Environment Configuration (.env)
#   8. Docker Compose Deployment
#   9. Nginx Reverse Proxy + SSL
#   10. Firewall (UFW)
#   11. Automated Backups
#   12. Log Rotation
#   13. Monitoring (Health Check)
#   14. Troubleshooting
# ═══════════════════════════════════════════════════════════════════════════════

---

## 1. VPS Requirements

### Minimum Specifications (Development / Small Team)
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU**  | 2 vCPU  | 4 vCPU      |
| **RAM**  | 4 GB    | 8 GB        |
| **Disk** | 50 GB SSD | 100 GB SSD |
| **OS**   | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Recommended Specifications (Production / 50+ Users)
| Resource | Value |
|----------|-------|
| **CPU**  | 4–8 vCPU |
| **RAM**  | 16 GB   |
| **Disk** | 200 GB SSD (with backup space) |
| **OS**   | Ubuntu 24.04 LTS |
| **Network** | 1 Gbps, static IP |

### Domain Requirements
- A registered domain name (e.g., `alawael.org`)
- DNS A record pointing to your VPS IP
- Optional: `www` subdomain CNAME or A record

### Supported Operating Systems
- ✅ Ubuntu 22.04 LTS (Jammy Jellyfish)
- ✅ Ubuntu 24.04 LTS (Noble Numbat) — **Recommended**
- ✅ Debian 12 (Bookworm)
- ⚠️ CentOS/RHEL 9 (requires extra steps for Docker)

---

## 2. Initial Server Setup

### 2.1 Connect to Your VPS
```bash
ssh root@YOUR_VPS_IP
```

### 2.2 Create a Non-Root User (Security Best Practice)
```bash
# Create user
adduser alawael
usermod -aG sudo alawael

# Set up SSH key authentication (from your local machine)
ssh-copy-id alawael@YOUR_VPS_IP

# Disable root login and password authentication (after confirming SSH key works)
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### 2.3 Update System Packages
```bash
apt update && apt upgrade -y
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
```

### 2.4 Set Hostname & Timezone
```bash
hostnamectl set-hostname alawael-erp
 timedatectl set-timezone Asia/Riyadh
# Verify
date
```

---

## 3. Installing Docker & Docker Compose

### 3.1 Install Docker Engine
```bash
# Remove old versions (if any)
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 3.2 Configure Docker (Optional but Recommended)
```bash
# Add your user to docker group (logout/login required after)
usermod -aG docker alawael

# Enable Docker on boot
systemctl enable docker
systemctl start docker

# Configure Docker daemon for production
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

systemctl restart docker
```

---

## 4. Installing Nginx

### 4.1 Install Nginx
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 4.2 Verify Nginx is Running
```bash
systemctl status nginx
curl -I http://localhost
```

You should see `HTTP/1.1 200 OK`.

### 4.3 Remove Default Site (Optional)
```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 5. Installing Node.js 20

### 5.1 Install Node.js 20 LTS
```bash
# Using NodeSource (official)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 5.2 Install PM2 (Optional — for non-Docker deployments)
```bash
npm install -g pm2
```

---

## 6. Cloning the Repository

### 6.1 Create Application Directory
```bash
mkdir -p /opt/alawael-erp
cd /opt/alawael-erp
```

### 6.2 Clone from GitHub
```bash
# Replace with your actual repository URL
git clone https://github.com/YOUR_ORG/alawael-erp.git .

# Or if you already have the repo locally, use SCP/rsync from your machine
# scp -r ./alawael-erp root@YOUR_VPS_IP:/opt/alawael-erp
```

### 6.3 Set Proper Ownership
```bash
chown -R alawael:alawael /opt/alawael-erp
```

---

## 7. Environment Configuration (.env)

### 7.1 Copy Example Environment File
```bash
cd /opt/alawael-erp
cp .env.example .env
```

### 7.2 Generate Required Secrets
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate another for JWT refresh
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate setup secret key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 7.3 Edit .env with Production Values
```bash
nano /opt/alawael-erp/.env
```

**Critical variables to set:**
```bash
# Database
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=YourStrongMongoPassword123!  # CHANGE THIS

# Redis (optional, for extra security)
REDIS_PASSWORD=YourStrongRedisPassword123!

# JWT
JWT_SECRET=your-generated-64-byte-hex-secret
JWT_REFRESH_SECRET=your-generated-64-byte-hex-refresh-secret

# Admin credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourStrongAdminPassword123!

# CORS & Frontend
FRONTEND_URL=https://alawael.org
CORS_ORIGINS=https://alawael.org,https://www.alawael.org,https://alaweal.org

# Domain (for email, webhooks, etc.)
DOMAIN=alawael.org
```

### 7.4 Secure .env File
```bash
chmod 600 /opt/alawael-erp/.env
chown alawael:alawael /opt/alawael-erp/.env
```

---

## 8. Docker Compose Deployment

### 8.1 Build & Start Services
```bash
cd /opt/alawael-erp

# Build images (first time only, or after code changes)
docker compose build

# Start all services in detached mode
docker compose up -d

# Verify all containers are running
docker compose ps
```

Expected output:
```
NAME                STATUS
alawael-mongodb     running (healthy)
alawael-redis       running (healthy)
alawael-backend     running (healthy)
alawael-nginx       running (healthy)
```

### 8.2 View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f mongodb
```

### 8.3 Verify Backend Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

### 8.4 Verify via Nginx
```bash
curl http://localhost/health
```

---

## 9. Nginx Reverse Proxy + SSL

### 9.1 Install Certbot (for Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
```

### 9.2 Obtain SSL Certificate
```bash
# For alawael.org (replace with your domain)
certbot --nginx -d alawael.org -d www.alawael.org --agree-tos --non-interactive --email admin@alawael.org

# Or use the automated script:
./scripts/letsencrypt-setup.sh
```

### 9.3 Verify Auto-Renewal
```bash
# Test renewal (dry run)
certbot renew --dry-run

# Check cron job
systemctl status certbot.timer
```

### 9.4 Manual Nginx Configuration (Alternative)

If you prefer manual control over the Nginx config, create `/etc/nginx/sites-available/alawael-erp`:

```nginx
server {
    listen 80;
    server_name alawael.org www.alawael.org;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name alawael.org www.alawael.org;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/alawael.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alawael.org/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/alawael.org/chain.pem;

    # Modern TLS (A+ rating)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:20m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Proxy to Docker Nginx (or directly to backend)
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://localhost:80/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
ln -sf /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 10. Firewall (UFW)

### 10.1 Install & Configure UFW
```bash
apt install -y ufw

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (before enabling!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Docker Compose internal ports (optional — only if exposing directly)
# ufw allow 3001/tcp   # Backend (not recommended — use Nginx proxy)
# ufw allow 27017/tcp  # MongoDB (never expose to internet)
# ufw allow 6379/tcp   # Redis (never expose to internet)

# Enable firewall
ufw --force enable
```

### 10.2 Verify UFW Status
```bash
ufw status verbose
```

Expected:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

### 10.3 (Alternative) Using iptables
If you prefer iptables over UFW:
```bash
# Flush existing rules
iptables -F
iptables -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH, HTTP, HTTPS
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules
iptables-save > /etc/iptables/rules.v4
```

---

## 11. Automated Backups

### 11.1 Daily MongoDB Backup Cron

Create backup script:
```bash
mkdir -p /opt/backups
```

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2:00 AM
0 2 * * * /opt/alawael-erp/scripts/backup.sh mongo-only local >> /var/log/alawael-backup.log 2>&1
```

### 11.2 Manual Backup
```bash
# Full backup (MongoDB + Redis + uploads)
./scripts/backup.sh full local

# MongoDB only
./scripts/backup.sh mongo-only local

# With S3 upload
./scripts/backup.sh full s3
```

### 11.3 Backup Retention
The backup script automatically cleans up backups older than 30 days (configurable via `BACKUP_RETENTION_DAYS`).

### 11.4 Restore from Backup
```bash
# Restore MongoDB from backup
mongorestore --uri="mongodb://admin:PASSWORD@localhost:27017/alawael-erp?authSource=admin" \
  --gzip /opt/backups/YYYYMMDD_HHMMSS/mongo

# Or use the restore script
./scripts/restore.sh /opt/backups/YYYYMMDD_HHMMSS
```

---

## 12. Log Rotation

### 12.1 Configure Logrotate for Docker Logs
```bash
cat > /etc/logrotate.d/alawael-erp <<'EOF'
/opt/alawael-erp/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 alawael alawael
    sharedscripts
    postrotate
        # Signal containers to reopen logs if needed
        /usr/bin/docker kill --signal=HUP alawael-backend 2>/dev/null || true
    endscript
}
EOF
```

### 12.2 Configure Docker Log Rotation
Already configured in `/etc/docker/daemon.json` (see Section 3.2):
```json
{
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 12.3 Configure Nginx Log Rotation
```bash
cat > /etc/logrotate.d/alawael-nginx <<'EOF'
/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
EOF
```

### 12.4 Test Logrotate
```bash
logrotate -d /etc/logrotate.d/alawael-erp   # Dry run
logrotate -f /etc/logrotate.d/alawael-erp   # Force rotate
```

---

## 13. Monitoring (Health Check)

### 13.1 Run Manual Health Check
```bash
cd /opt/alawael-erp
./scripts/health-check.sh
```

### 13.2 Schedule Automated Health Checks
```bash
# Add to crontab for every 5 minutes
crontab -e

*/5 * * * * /opt/alawael-erp/scripts/health-check.sh >> /var/log/alawael-health.log 2>&1 || \
  echo "[$(date)] Health check failed" >> /var/log/alawael-health.log
```

### 13.3 Set Up Alerting (Optional)
Create a simple alert script:
```bash
cat > /opt/alawael-erp/scripts/alert-on-failure.sh <<'EOF'
#!/bin/bash
if ! /opt/alawael-erp/scripts/health-check.sh >/dev/null 2>&1; then
    echo "Al-Awael ERP health check failed at $(date)" | \
    mail -s "ERP Alert: Health Check Failed" admin@yourdomain.com
fi
EOF
chmod +x /opt/alawael-erp/scripts/alert-on-failure.sh
```

### 13.4 System Monitoring (Optional)
Install `netdata` for real-time monitoring:
```bash
wget -O /tmp/netdata-kickstart.sh https://get.netdata.cloud/kickstart.sh
sh /tmp/netdata-kickstart.sh --stable-channel --disable-telemetry
# Access at http://YOUR_VPS_IP:19999
```

---

## 14. Troubleshooting

### 14.1 Docker Containers Won't Start
```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Check for port conflicts
ss -tlnp | grep -E '3001|27017|6379|80|443'

# Restart services
docker compose down
docker compose up -d

# Force rebuild
docker compose down
docker compose up -d --build
```

### 14.2 MongoDB Connection Errors
```bash
# Check MongoDB container status
docker exec alawael-mongodb mongosh --eval "db.adminCommand('ping')" --quiet

# Check credentials in .env
cat /opt/alawael-erp/.env | grep MONGO

# Reset MongoDB (⚠️ DATA LOSS)
docker compose down -v  # Removes volumes
docker compose up -d     # Recreates with new credentials
```

### 14.3 Backend Returns 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:3001/health

# Check backend logs
docker compose logs backend

# Restart backend only
docker compose restart backend

# Check Nginx error logs
docker compose logs nginx
tail -50 /var/log/nginx/error.log
```

### 14.4 SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew --force-renewal

# Check certificate expiry
echo | openssl s_client -servername alawael.org -connect alawael.org:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### 14.5 High Memory Usage
```bash
# Check memory usage per container
docker stats --no-stream

# Check system memory
free -h

# Restart memory-intensive services
docker compose restart backend

# Add swap space (if not enough RAM)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 14.6 Disk Space Full
```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df -v

# Clean up unused Docker resources
docker system prune -a --volumes

# Clean old backups
find /opt/backups -type d -mtime +30 -exec rm -rf {} +

# Resize Docker volumes (if needed)
```

### 14.7 Application Not Accessible from Internet
```bash
# Check UFW status
ufw status

# Check if Nginx is listening on all interfaces
ss -tlnp | grep nginx

# Check if Docker ports are mapped correctly
docker compose ps

# Test from outside
curl -I http://YOUR_VPS_IP
```

### 14.8 Database Backup Fails
```bash
# Check backup directory permissions
ls -la /opt/backups

# Check MongoDB is running
docker exec alawael-mongodb mongosh --eval "db.adminCommand('ping')" --quiet

# Test manual backup
mongodump --uri="mongodb://admin:PASSWORD@localhost:27017/alawael-erp?authSource=admin" --out=/tmp/test-backup --gzip
```

### 14.9 Cron Jobs Not Running
```bash
# Check cron logs
grep CRON /var/log/syslog | tail -20

# Check user crontab
crontab -l

# Test a script manually
/opt/alawael-erp/scripts/backup.sh mongo-only local
```

### 14.10 Useful Docker Commands
```bash
# Enter a running container
docker exec -it alawael-backend /bin/sh

# Check running processes inside container
docker exec alawael-backend ps aux

# Copy files from/to container
docker cp alawael-backend:/app/logs ./local-logs
docker cp ./local-file alawael-backend:/app/uploads/

# Inspect container config
docker inspect alawael-backend

# Resource usage
docker stats
```

---

## Quick Reference — One-Liner Commands

| Task | Command |
|------|---------|
| **Start** | `cd /opt/alawael-erp && docker compose up -d` |
| **Stop** | `cd /opt/alawael-erp && docker compose down` |
| **Restart** | `cd /opt/alawael-erp && docker compose restart` |
| **Rebuild** | `cd /opt/alawael-erp && docker compose up -d --build` |
| **Logs** | `cd /opt/alawael-erp && docker compose logs -f` |
| **Health** | `cd /opt/alawael-erp && ./scripts/health-check.sh` |
| **Backup** | `cd /opt/alawael-erp && ./scripts/backup.sh full local` |
| **Update** | `cd /opt/alawael-erp && git pull && docker compose up -d --build` |
| **SSL Renew** | `certbot renew` |
| **Firewall** | `ufw status` |
| **Disk** | `df -h && docker system df` |
| **Memory** | `free -h && docker stats --no-stream` |

---

## Support & Resources

- **Project Issues:** Check the GitHub Issues page
- **Docker Docs:** https://docs.docker.com/
- **Nginx Docs:** https://nginx.org/en/docs/
- **Certbot Docs:** https://eff-certbot.readthedocs.io/
- **MongoDB Docs:** https://www.mongodb.com/docs/

---

*Last updated: 2025-06-28*
*Al-Awael ERP — Production Deployment Guide*
