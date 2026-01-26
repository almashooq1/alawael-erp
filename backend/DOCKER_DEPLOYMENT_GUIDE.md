ؤ# Docker Deployment Guide - AL-AWAEL ERP to Hostinger VPS

## 📋 Overview

This guide walks you through containerizing and deploying the AL-AWAEL backend
to **Hostinger VPS** via Docker.

---

## 🏗️ LOCAL SETUP (Preparation Phase)

### 1. **Verify Docker Installation Locally**

```powershell
# Check Docker version
docker --version
docker-compose --version

# Expected: Docker 20.10+ and Docker Compose 1.29+
```

### 2. **Build Docker Image Locally**

```powershell
# Navigate to backend directory
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"

# Build the image
docker build -t alawael-backend:v1 .

# Verify build
docker images | findstr alawael
```

### 3. **Test Locally with Docker Compose**

```powershell
# Start the container
docker-compose up -d

# Wait 5 seconds for startup
Start-Sleep -Seconds 5

# Test health endpoint
$health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 3
Write-Host "Health Check: $($health.status)"

# Test other endpoints
Invoke-RestMethod -Uri "http://localhost:3001/test-first" -TimeoutSec 3 | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/phases-29-33" -TimeoutSec 3 | ConvertTo-Json

# View logs
docker-compose logs -f

# Stop when done
docker-compose down
```

---

## 🚀 DOCKER HUB SETUP (Registry Phase)

### 4. **Create Docker Hub Account (if not exists)**

- Go to https://hub.docker.com
- Sign up or log in
- Create a repository named: **alawael-backend**
  - Visibility: Private (for security)

### 5. **Tag & Push Image to Docker Hub**

```powershell
# Login to Docker Hub
docker login

# When prompted:
# Username: <your-docker-hub-username>
# Password: <your-docker-hub-access-token>
# (Generate token at https://hub.docker.com/settings/security)

# Tag image
docker tag alawael-backend:v1 <your-username>/alawael-backend:v1

# Push to registry
docker push <your-username>/alawael-backend:v1

# Verify on Docker Hub dashboard
```

---

## 🖥️ HOSTINGER VPS SETUP (Deployment Phase)

### 6. **Prepare Hostinger VPS (Ubuntu 22.04)**

#### SSH into your VPS:

```bash
ssh root@<your-vps-ip>
```

#### Update system:

```bash
apt update && apt upgrade -y
```

#### Install Docker & Docker Compose:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# Log out and back in, or:
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

---

### 7. **Deploy on Hostinger VPS**

#### Create project directory:

```bash
mkdir -p /opt/alawael
cd /opt/alawael
```

#### Login to Docker Hub on VPS:

```bash
docker login
# Enter your credentials
```

#### Pull the image:

```bash
docker pull <your-username>/alawael-backend:v1
```

#### Option A: Run with Docker CLI (Simple)

```bash
docker run -d \
  --name alawael-app \
  -p 3001:3001 \
  -e PORT=3001 \
  -e NODE_ENV=production \
  -e USE_MOCK_DB=true \
  -e SKIP_SOCKET_IO=true \
  -e DISABLE_REDIS=true \
  -e SKIP_PHASE17=true \
  --restart=unless-stopped \
  <your-username>/alawael-backend:v1

# View logs
docker logs -f alawael-app
```

#### Option B: Use Docker Compose (Recommended)

Create `/opt/alawael/docker-compose.yml`:

```yaml
version: '3.9'

services:
  app:
    image: <your-username>/alawael-backend:v1
    container_name: alawael-app
    ports:
      - '3001:3001'
    environment:
      PORT: '3001'
      NODE_ENV: production
      USE_MOCK_DB: 'true'
      SKIP_SOCKET_IO: 'true'
      DISABLE_REDIS: 'true'
      SKIP_PHASE17: 'true'
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://localhost:3001/health', (r) => {if
          (r.statusCode !== 200) throw new Error(r.statusCode)})",
        ]
      interval: 30s
      timeout: 3s
      retries: 3
```

Deploy:

```bash
docker-compose up -d
docker-compose logs -f
```

---

### 8. **Setup Nginx Reverse Proxy (Production)**

#### Install Nginx:

```bash
apt install -y nginx
```

#### Configure Nginx `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (if using SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3001/health;
    }
}
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 9. **Setup SSL Certificate (Let's Encrypt)**

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal should be enabled by default
# Verify:
sudo systemctl status certbot.timer
```

---

## 📊 VERIFICATION & MONITORING

### 10. **Verify Deployment**

On VPS:

```bash
# Check running container
docker ps

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/test-first
curl http://localhost:3001/phases-29-33

# View logs
docker logs alawael-app

# Monitor resources
docker stats alawael-app
```

From local machine:

```powershell
$vpsIp = "<your-vps-ip-or-domain>"
Invoke-RestMethod -Uri "http://$vpsIp/health" -TimeoutSec 5 | ConvertTo-Json
```

---

## 🔧 MAINTENANCE COMMANDS

### Update Image:

```bash
cd /opt/alawael

# Pull latest
docker pull <your-username>/alawael-backend:v1

# Stop old container
docker-compose down

# Start with new image
docker-compose up -d
```

### View Logs:

```bash
docker logs -f alawael-app
docker-compose logs -f
```

### Stop/Restart:

```bash
# Stop
docker-compose stop

# Start
docker-compose start

# Restart
docker-compose restart

# Remove everything
docker-compose down
```

### Backup:

```bash
# Export image
docker save <your-username>/alawael-backend:v1 -o alawael-backup.tar

# Restore on another machine
docker load -i alawael-backup.tar
```

---

## 🔐 SECURITY BEST PRACTICES

1. **Use Private Docker Registry**: Only you can pull the image
2. **Use Environment Variables**: Secrets never in Dockerfile
3. **Non-Root User**: Image runs as `nodejs` user
4. **Firewall Rules**:
   ```bash
   ufw allow 22/tcp  # SSH
   ufw allow 80/tcp  # HTTP
   ufw allow 443/tcp # HTTPS
   ufw enable
   ```
5. **Regular Updates**: Keep base image updated
   ```bash
   docker pull node:18-alpine
   docker build -t alawael-backend:v2 .
   ```

---

## 🆘 TROUBLESHOOTING

| Issue                      | Solution                                   |
| -------------------------- | ------------------------------------------ |
| Container won't start      | `docker logs alawael-app` to see errors    |
| Port 3001 already in use   | `docker ps` and stop conflicting container |
| DNS resolution fails       | Check `/etc/resolv.conf` on VPS            |
| Can't connect from outside | Check firewall: `ufw status`               |
| High memory usage          | Check `docker stats` or add memory limits  |

---

## 📝 QUICK REFERENCE

**Local Testing:**

```powershell
docker-compose up -d
Start-Sleep -Seconds 5
Invoke-RestMethod http://localhost:3001/health
docker-compose down
```

**Hostinger Deployment:**

```bash
docker pull <username>/alawael-backend:v1
docker-compose up -d
curl http://localhost:3001/health
```

**Update Deployment:**

```bash
docker pull <username>/alawael-backend:v1
docker-compose down && docker-compose up -d
```

---

**Next Steps:**

1. ✅ Build & test locally
2. ✅ Push to Docker Hub
3. ✅ Deploy on Hostinger VPS
4. ✅ Configure Nginx + SSL
5. ✅ Monitor & maintain

Need help? Check Docker & Hostinger documentation.
