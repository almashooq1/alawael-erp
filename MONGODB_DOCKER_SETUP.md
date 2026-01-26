# 🚀 PRODUCTION SETUP - MongoDB Atlas + Docker

# الإعداد الإنتاجي - MongoDB Atlas + Docker

# Date: January 22, 2026

---

## 📋 CRITICAL SETUP STEPS

### Step 1: MongoDB Atlas - Create Cluster

```bash
URL: https://www.mongodb.com/cloud/atlas

1. Sign Up / Login
2. Create Project: "ERP-System"
3. Create Cluster:
   - Provider: AWS
   - Region: us-east-1 (or Middle East)
   - Tier: M0 (Free)
   - Name: "erp-production"
4. Wait 10 minutes for cluster creation
```

### Step 2: Database User Creation

```bash
1. Go to: Security > Database Access
2. Add Database User:
   - Username: erp_user
   - Password: [Auto-generate strong password]
   - Copy the password: e.g., 7xK#pQ9$mL8@wN3vH
   - Roles: Read and write to any database
3. Click "Add User"
```

### Step 3: Get Connection String

```bash
1. Click "Connect" on your cluster
2. Select "Connect Your Application"
3. Driver: Node.js, Version: 3.0+
4. Copy connection string:
   mongodb+srv://erp_user:7xK#pQ9$mL8@wN3vH@erp-prod-xxxxx.mongodb.net/erp_production?retryWrites=true&w=majority
```

### Step 4: IP Whitelist

```bash
Go to: Network Access
Add IP Address:
- For Development: 0.0.0.0/0
- For Production: Only your server IP (from Hostinger)
  Example: 45.138.145.200
```

---

## 🔧 UPDATE .env.production

```bash
# File: erp_new_system/backend/.env.production

PORT=3001
NODE_ENV=production

# ⚠️ REPLACE with your MongoDB connection string
MONGODB_URL=mongodb+srv://erp_user:7xK#pQ9$mL8@wN3vH@erp-prod-xxxxx.mongodb.net/erp_production?retryWrites=true&w=majority

USE_MOCK_DB=false
USE_MOCK_CACHE=false

# JWT - Generate strong secrets!
JWT_SECRET=prod_jwt_secret_key_minimum_32_characters_very_secure_key_here_2024
JWT_REFRESH_SECRET=prod_refresh_secret_key_minimum_32_characters_very_secure_key_here_2024

# CORS - Update with your domain
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 🐳 DOCKER DEPLOYMENT

### Option 1: Manual Docker Commands

```bash
# Build Backend Image
cd erp_new_system/backend
docker build -t erp-backend:latest .

# Test on Development
docker run -p 3001:3001 \
  -e NODE_ENV=development \
  -e MONGODB_URL=mongodb://host.docker.internal:27017/erp_dev \
  erp-backend:latest

# Production Deployment
docker run -d -p 3001:3001 \
  -e NODE_ENV=production \
  -e MONGODB_URL=mongodb+srv://erp_user:password@cluster.mongodb.net/erp_prod \
  --name erp-backend \
  erp-backend:latest
```

### Option 2: Docker Compose (Recommended)

#### A. Create docker-compose.yml

```yaml
# File: erp_new_system/docker-compose.yml

version: '3.8'

services:
  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: erp-backend
    ports:
      - '3001:3001'
    environment:
      NODE_ENV: production
      PORT: 3001
      MONGODB_URL: mongodb+srv://erp_user:7xK#pQ9$mL8@wN3vH@erp-prod-xxxxx.mongodb.net/erp_production
      JWT_SECRET: prod_jwt_secret_key_minimum_32_characters_very_secure_key_here_2024
      JWT_REFRESH_SECRET: prod_refresh_secret_key_minimum_32_characters_very_secure_key_here_2024
      CORS_ORIGIN: https://yourdomain.com
      USE_MOCK_DB: 'false'
      USE_MOCK_CACHE: 'false'
      LOG_LEVEL: info
    restart: unless-stopped
    networks:
      - erp-network
    volumes:
      - ./logs:/app/logs
      - ./backups:/app/backups
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend React App
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: erp-frontend
    ports:
      - '3002:3002'
    environment:
      REACT_APP_API_URL: https://yourdomain.com/api
      REACT_APP_WS_URL: wss://yourdomain.com
      NODE_ENV: production
    restart: unless-stopped
    networks:
      - erp-network
    depends_on:
      backend:
        condition: service_healthy

networks:
  erp-network:
    driver: bridge

volumes:
  logs:
    driver: local
  backups:
    driver: local
```

#### B. Create Backend Dockerfile

```dockerfile
# File: erp_new_system/backend/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["node", "server.js"]
```

#### C. Create Frontend Dockerfile

```dockerfile
# File: erp_new_system/frontend/Dockerfile

FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"]
```

#### D. Create nginx.conf

```nginx
# File: erp_new_system/frontend/nginx.conf

server {
    listen 3002;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 1000;

    # Cache busting for index.html
    location = /index.html {
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
    }

    # API proxy (if needed)
    location /api/ {
        proxy_pass http://backend:3001/api/;
        proxy_http_version 1.1;
    }
}
```

---

## 🚀 DEPLOYMENT COMMANDS

```bash
# 1. Navigate to project
cd erp_new_system

# 2. Build Docker images
docker-compose build

# 3. Start services (detached mode)
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f

# 6. View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# 7. Stop services
docker-compose down

# 8. Remove all (including volumes)
docker-compose down -v
```

---

## ✅ POST-DEPLOYMENT TESTS

```bash
# 1. Test Backend Health
curl http://localhost:3001/api/health

# 2. Test Frontend
curl http://localhost:3002

# 3. Test Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"Admin@123456"}'

# 4. View running containers
docker ps

# 5. Check logs for errors
docker-compose logs | grep -i error
```

---

## 🔐 SSL/HTTPS with Nginx Reverse Proxy

```bash
# 1. Create /etc/nginx/sites-available/erp-system

upstream backend {
    server localhost:3001;
}

upstream frontend {
    server localhost:3002;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# 2. Enable site
sudo ln -s /etc/nginx/sites-available/erp-system /etc/nginx/sites-enabled/

# 3. Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📊 MONITORING

```bash
# Check container stats
docker stats

# View resource usage
docker-compose ps

# Check disk space
df -h

# Check memory
free -h

# Check system logs
sudo journalctl -n 50 -f
```

---

## 🆘 TROUBLESHOOTING

### Backend not connecting to MongoDB

```bash
# Check MongoDB Atlas:
1. Network Access > Add IP: Your Server IP
2. Database Access > Verify user credentials
3. Connection string > Check URL format

# Test connection:
docker exec erp-backend npm test
```

### Port already in use

```bash
# Find and kill process
lsof -i :3001
kill -9 <PID>

# Or change port in .env
PORT=3003
```

### Docker build fails

```bash
# Clean build
docker-compose down -v
docker-compose build --no-cache

# Check logs
docker-compose build --progress=plain
```

---

## 📋 FINAL CHECKLIST

- [ ] MongoDB Atlas account created
- [ ] Database user created with strong password
- [ ] Connection string saved
- [ ] IP whitelist configured
- [ ] .env.production file updated with real credentials
- [ ] Dockerfile created for backend
- [ ] Dockerfile created for frontend
- [ ] docker-compose.yml created
- [ ] Docker images build successfully
- [ ] Containers run without errors
- [ ] Backend health check passes
- [ ] Frontend loads successfully
- [ ] Login works correctly
- [ ] Nginx reverse proxy configured (if on Hostinger)
- [ ] SSL certificates installed
- [ ] All tests pass

---

**Status: PRODUCTION READY ✅** **Last Updated: January 22, 2026** **Version:
2.0.0**
