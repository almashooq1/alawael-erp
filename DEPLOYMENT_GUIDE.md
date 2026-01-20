# ERP System - Complete Deployment Guide

## 🚀 Quick Start with Docker

### Prerequisites

- Docker Desktop installed
- Docker Compose installed
- Port 3000, 3005, 27017, 6379 available

### One-Command Deployment

```bash
cd erp_new_system
docker-compose up -d
```

That's it! The entire system will be running in containers.

---

## 📦 Docker Services

| Service  | Port  | Description         |
| -------- | ----- | ------------------- |
| Frontend | 3000  | React UI with Nginx |
| Backend  | 3005  | Express.js API      |
| MongoDB  | 27017 | Database            |
| Redis    | 6379  | Cache (optional)    |

---

## 🔧 Docker Commands

### Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean start)
docker-compose down -v
```

### Rebuild Services

```bash
# Rebuild backend
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

### Health Checks

```bash
# Check container status
docker-compose ps

# Check backend health
curl http://localhost:3005/health

# Check MongoDB
docker exec -it erp_mongodb mongosh -u admin -p erp_password_2026
```

---

## 🌐 Production Deployment

### Option 1: AWS EC2

#### 1. Launch EC2 Instance

```bash
# t2.medium recommended (2 vCPU, 4GB RAM)
# Amazon Linux 2 or Ubuntu 20.04
```

#### 2. Install Docker

```bash
# Update system
sudo yum update -y  # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### 3. Deploy Application

```bash
# Clone repository
git clone <your-repo> erp_system
cd erp_system

# Set production environment variables
nano .env

# Start services
sudo docker-compose up -d

# Check logs
sudo docker-compose logs -f
```

#### 4. Configure Security Group

```
Inbound Rules:
- Port 80 (HTTP) - 0.0.0.0/0
- Port 443 (HTTPS) - 0.0.0.0/0
- Port 22 (SSH) - Your IP
- Port 3000 (Frontend) - 0.0.0.0/0
- Port 3005 (Backend API) - 0.0.0.0/0
```

#### 5. Setup SSL (Let's Encrypt)

```bash
# Install Certbot
sudo snap install --classic certbot

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

### Option 2: Azure App Service

#### 1. Create Resources

```bash
# Login to Azure
az login

# Create Resource Group
az group create --name erp-rg --location eastus

# Create Container Registry
az acr create --resource-group erp-rg --name erpregistry --sku Basic

# Create App Service Plan
az appservice plan create --name erp-plan --resource-group erp-rg --is-linux
```

#### 2. Build and Push Images

```bash
# Login to ACR
az acr login --name erpregistry

# Tag images
docker tag erp_backend erpregistry.azurecr.io/backend:latest
docker tag erp_frontend erpregistry.azurecr.io/frontend:latest

# Push images
docker push erpregistry.azurecr.io/backend:latest
docker push erpregistry.azurecr.io/frontend:latest
```

#### 3. Deploy to App Service

```bash
# Create Web Apps
az webapp create --resource-group erp-rg --plan erp-plan --name erp-backend --deployment-container-image-name erpregistry.azurecr.io/backend:latest

az webapp create --resource-group erp-rg --plan erp-plan --name erp-frontend --deployment-container-image-name erpregistry.azurecr.io/frontend:latest

# Configure environment variables
az webapp config appsettings set --resource-group erp-rg --name erp-backend --settings PORT=3005 NODE_ENV=production
```

---

### Option 3: Kubernetes (Production Scale)

#### 1. Create Kubernetes Manifests

**backend-deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: erp-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: erp-backend
  template:
    metadata:
      labels:
        app: erp-backend
    spec:
      containers:
        - name: backend
          image: your-registry/erp-backend:latest
          ports:
            - containerPort: 3005
          env:
            - name: PORT
              value: '3005'
            - name: NODE_ENV
              value: 'production'
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
---
apiVersion: v1
kind: Service
metadata:
  name: erp-backend-service
spec:
  type: LoadBalancer
  selector:
    app: erp-backend
  ports:
    - port: 3005
      targetPort: 3005
```

#### 2. Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f mongodb-statefulset.yaml

# Check status
kubectl get pods
kubectl get services

# Scale deployment
kubectl scale deployment erp-backend --replicas=5
```

---

## 🔐 Security Best Practices

### 1. Environment Variables

```bash
# Never commit secrets to Git
# Use .env files (add to .gitignore)

# Production .env example
NODE_ENV=production
JWT_SECRET=<generate-strong-random-string>
DATABASE_URL=mongodb://user:password@host:27017/db
REDIS_URL=redis://host:6379
```

### 2. MongoDB Security

```bash
# Create database user
use erp_db
db.createUser({
  user: "erp_user",
  pwd: "strong_password_here",
  roles: [{ role: "readWrite", db: "erp_db" }]
})

# Enable authentication
# In mongod.conf:
security:
  authorization: enabled
```

### 3. Firewall Rules

```bash
# Ubuntu UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. SSL/TLS

- Use HTTPS in production
- Obtain SSL certificates from Let's Encrypt
- Redirect HTTP to HTTPS
- Use HSTS headers

---

## 📊 Monitoring & Logging

### 1. Application Logs

```bash
# Docker logs
docker-compose logs -f backend

# Live tail
docker-compose logs -f --tail=100 backend

# Save logs to file
docker-compose logs backend > backend.log
```

### 2. Prometheus + Grafana

```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - '9090:9090'

grafana:
  image: grafana/grafana
  ports:
    - '3001:3000'
```

### 3. Health Monitoring

```bash
# Automated health checks
*/5 * * * * curl -f http://localhost:3005/health || alert
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy.yml**

```yaml
name: Deploy ERP System

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Build Docker images
        run: |
          docker-compose build

      - name: Run tests
        run: |
          docker-compose run backend npm test

      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
```

---

## 💾 Backup Strategy

### Database Backups

```bash
# Manual backup
docker exec erp_mongodb mongodump --out=/backup

# Automated daily backup
0 2 * * * docker exec erp_mongodb mongodump --out=/backup/$(date +%Y%m%d)

# Restore from backup
docker exec erp_mongodb mongorestore /backup/20260120
```

### Volume Backups

```bash
# Backup volumes
docker run --rm -v erp_new_system_mongodb_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mongodb-backup.tar.gz /data

# Restore volumes
docker run --rm -v erp_new_system_mongodb_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/mongodb-backup.tar.gz -C /
```

---

## 🧪 Testing in Production

### Smoke Tests

```bash
# Test backend health
curl -f http://your-domain.com:3005/health || exit 1

# Test API endpoints
curl -X POST http://your-domain.com:3005/api/predictions/sales \
  -H "Content-Type: application/json" \
  -d '{"historicalData": {"jan": 50000}}'
```

### Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Run load test
ab -n 1000 -c 100 http://localhost:3005/health
```

---

## 📈 Performance Optimization

### 1. Backend Optimization

- Enable compression (gzip)
- Implement caching (Redis)
- Use connection pooling
- Optimize database queries
- Enable rate limiting

### 2. Frontend Optimization

- Code splitting
- Lazy loading
- Asset minification
- CDN for static files
- Service Worker caching

### 3. Database Optimization

```javascript
// Add indexes
db.collection.createIndex({ field: 1 });

// Use projection
db.collection.find({}, { field1: 1, field2: 1 });

// Connection pooling
mongoose.connect(url, { poolSize: 10 });
```

---

## 🚨 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Restart service
docker-compose restart backend
```

### Database connection errors

```bash
# Test MongoDB connection
docker exec -it erp_mongodb mongosh

# Check network
docker network inspect erp_new_system_erp_network
```

### Port conflicts

```bash
# Check port usage
netstat -ano | findstr :3005

# Change port in docker-compose.yml
ports:
  - "3006:3005"
```

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- [ ] Weekly security updates
- [ ] Daily database backups
- [ ] Monthly performance reviews
- [ ] Quarterly dependency updates
- [ ] Log rotation and cleanup

### Update Checklist

```bash
# 1. Backup everything
docker-compose down
# Create backups

# 2. Pull latest code
git pull origin main

# 3. Rebuild containers
docker-compose build

# 4. Run migrations
docker-compose run backend npm run migrate

# 5. Start services
docker-compose up -d

# 6. Verify health
curl http://localhost:3005/health
```

---

## 🎯 Production Checklist

- [ ] Environment variables secured
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring setup (Prometheus/Grafana)
- [ ] Log aggregation configured
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Health checks working
- [ ] Documentation complete
- [ ] CI/CD pipeline setup
- [ ] Disaster recovery plan
- [ ] Load balancing configured
- [ ] Auto-scaling setup (if needed)
- [ ] Security audit completed

---

**Deployment Status:** ✅ Ready for Production

**Last Updated:** January 20, 2026
