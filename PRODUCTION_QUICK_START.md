# 🚀 Production Deployment Quick Start
# Quick setup guide for production deployment

## Prerequisites

- Docker & Docker Compose installed
- Domain name configured
- MongoDB Atlas account
- Hostinger VPS access

---

## 1️⃣ Local Testing (10 minutes)

### Build Docker Images

```bash
cd /path/to/erp-system

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### Verify Services

```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend access
curl http://localhost:3002

# Login test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"Admin@123456"}'
```

---

## 2️⃣ MongoDB Atlas Setup (15 minutes)

### Create Cluster

```
1. https://www.mongodb.com/cloud/atlas
2. Create Project: "erp-production"
3. Create Cluster: M0 (Free) in AWS us-east-1
4. Wait 10 minutes for cluster creation
```

### Database User

```
Security > Database Access
- Username: erp_admin
- Password: [strong password]
- Roles: Read/Write to Any Database
```

### Connection String

```
Connect > Connect Your Application
Copy: mongodb+srv://erp_admin:PASSWORD@cluster.mongodb.net/erp_production?retryWrites=true&w=majority
```

### IP Whitelist

```
Security > Network Access
Add: Allow from Anywhere (or specify IP)
```

---

## 3️⃣ Environment Setup

### Create .env file

```bash
cp backend/.env.production backend/.env

# Edit with actual values
nano backend/.env
```

### Required Variables

```
# Database
MONGODB_URL=mongodb+srv://erp_admin:PASSWORD@cluster.mongodb.net/erp_production?retryWrites=true&w=majority

# Security
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# API
CORS_ORIGIN=http://localhost:3002,https://yourdomain.com

# Environment
NODE_ENV=production
PORT=3001
```

---

## 4️⃣ Hostinger Deployment (20 minutes)

### SSH Access

```bash
ssh username@yourdomain.com

# Go to project directory
cd /home/username/erp-system
```

### Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

sudo usermod -aG docker username

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Pull/Upload Code

```bash
# Option 1: Git
git clone https://github.com/your-repo/erp-system.git

# Option 2: FTP (using FileZilla)
# Upload all files to /home/username/erp-system
```

### Deploy

```bash
# Copy environment file
cp backend/.env.production backend/.env

# Update values
nano backend/.env

# Build
docker-compose build

# Start
docker-compose up -d

# Verify
docker-compose ps
docker-compose logs -f backend
```

---

## 5️⃣ SSL Setup (15 minutes)

### Install Certbot

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx -y
```

### Get Certificate

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### Certificate Location

```
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

---

## 6️⃣ Nginx Configuration

### Create Config

```bash
sudo nano /etc/nginx/sites-available/erp-production
```

### Configuration

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Enable & Reload

```bash
sudo ln -s /etc/nginx/sites-available/erp-production /etc/nginx/sites-enabled/

sudo nginx -t

sudo systemctl reload nginx
```

---

## ✅ Verification Tests

```bash
# 1. Health Check
curl -I https://yourdomain.com

# 2. API Health
curl https://yourdomain.com/api/health

# 3. Login
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"Admin@123456"}'

# 4. SSL Check
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com | grep "Verify return code"

# 5. Docker Status
docker-compose ps
docker-compose logs --tail 20 backend
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Container won't start | `docker-compose logs backend` |
| MongoDB connection error | Check MONGODB_URL and IP whitelist |
| SSL certificate expired | `sudo certbot renew` |
| Port 3001 in use | `sudo lsof -i :3001` and kill process |
| File permissions | `sudo chown -R username:username /home/username/erp-system` |

---

## 📊 Final Checklist

- [ ] Backend running (port 3001)
- [ ] Frontend running (port 3002)
- [ ] MongoDB connected
- [ ] SSL certificate valid
- [ ] Nginx reverse proxy working
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] WebSocket connected
- [ ] Database backups enabled
- [ ] Monitoring enabled

---

**Status:** ✅ Ready for Production
**Last Updated:** January 22, 2026
**Estimated Time:** ~60-90 minutes total
