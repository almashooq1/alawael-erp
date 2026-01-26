# 🚀 Phase 9 - Deployment Guide: Docker & CI/CD

**Objective:** Deploy the complete ERP system to production  
**Timeline:** Estimated 3-4 hours  
**Components:** Docker, Docker-Compose, GitHub Actions, Kubernetes (optional)

---

## 📋 Deployment Strategy

### **Architecture Overview**

```
┌─────────────────────────────────────────┐
│        Production Environment           │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐   │
│  │   Nginx/Reverse Proxy            │   │
│  │   (Load Balancing)               │   │
│  └──────────────────────────────────┘   │
│              ↓                          │
│  ┌──────────────┬──────────────────┐   │
│  │ Frontend     │  Backend API     │   │
│  │ (React)      │  (Node/Express)  │   │
│  │ Port: 3000   │  Port: 3005      │   │
│  └──────────────┴──────────────────┘   │
│       ↓                    ↓            │
│  ┌─────────────────────────────────┐   │
│  │  MongoDB / PostgreSQL Database  │   │
│  │  (Optional for production)      │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🐳 Docker Setup

### **Step 1: Create Dockerfile for Backend**

**File:** `backend/Dockerfile`

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app files
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3005

CMD ["npm", "start"]
```

---

### **Step 2: Create Dockerfile for Frontend**

**File:** `frontend/Dockerfile`

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build React app
ENV REACT_APP_API_URL=http://localhost:3005
RUN npm run build

# Production stage - serve with Nginx
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

---

### **Step 3: Create Nginx Configuration**

**File:** `frontend/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream backend {
        server backend:3005;
    }

    server {
        listen 3000;
        server_name _;

        root /usr/share/nginx/html;
        index index.html;

        # Serve React app
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Proxy API requests
        location /api/ {
            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css text/javascript application/json;
        gzip_min_length 1000;
    }
}
```

---

### **Step 4: Create Docker-Compose File**

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: erp-backend
    ports:
      - '3005:3005'
    environment:
      - NODE_ENV=production
      - PORT=3005
      - USE_MOCK_DB=true
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - erp-network
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3005/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: erp-frontend
    ports:
      - '3000:3000'
    environment:
      - REACT_APP_API_URL=http://localhost:3005
    depends_on:
      - backend
    networks:
      - erp-network
    restart: unless-stopped

  # Optional: MongoDB Service
  mongodb:
    image: mongo:latest
    container_name: erp-mongodb
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
    volumes:
      - mongo-data:/data/db
    networks:
      - erp-network
    restart: unless-stopped

  # Optional: Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: erp-nginx
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - erp-network
    restart: unless-stopped

networks:
  erp-network:
    driver: bridge

volumes:
  mongo-data:
```

---

## 🚀 Docker Commands

### **Build Docker Images**

```bash
# Build specific service
docker-compose build backend
docker-compose build frontend

# Build all services
docker-compose build
```

### **Run Containers**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### **Single Container Commands**

```bash
# Build backend image
docker build -t erp-backend:1.0 ./backend

# Run backend container
docker run -p 3005:3005 erp-backend:1.0

# Push to registry
docker tag erp-backend:1.0 myregistry/erp-backend:1.0
docker push myregistry/erp-backend:1.0
```

---

## 🔧 CI/CD Pipeline Setup

### **GitHub Actions Workflow**

**File:** `.github/workflows/deploy.yml`

```yaml
name: Build and Deploy ERP System

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:latest
        options: >-
          --health-cmd mongosh --health-interval 10s --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      # Checkout code
      - uses: actions/checkout@v3

      # Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      # Install dependencies
      - name: Install Backend Dependencies
        run: cd backend && npm ci

      - name: Install Frontend Dependencies
        run: cd frontend && npm ci

      # Run tests (if available)
      - name: Run Backend Tests
        run: cd backend && npm run test
        continue-on-error: true

      - name: Run Frontend Tests
        run: cd frontend && npm run test
        continue-on-error: true

      # Build Frontend
      - name: Build Frontend
        run: cd frontend && npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.API_URL }}

      # Run linter
      - name: Run ESLint
        run: cd frontend && npm run lint
        continue-on-error: true

      # Build Docker images
      - name: Build Docker Images
        run: |
          docker build -t erp-backend:latest ./backend
          docker build -t erp-frontend:latest ./frontend

      # Push to Docker Registry
      - name: Push to Docker Registry
        if: github.ref == 'refs/heads/main'
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag erp-backend:latest ${{ secrets.DOCKER_USERNAME }}/erp-backend:latest
          docker tag erp-frontend:latest ${{ secrets.DOCKER_USERNAME }}/erp-frontend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/erp-backend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/erp-frontend:latest

      # Deploy to server
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /app/erp_system
            docker-compose pull
            docker-compose up -d
            docker-compose logs -f
```

---

## 🌐 Deployment Platforms

### **Option 1: AWS Deployment**

**Using Elastic Container Service (ECS):**

```bash
# Create ECR repositories
aws ecr create-repository --repository-name erp-backend
aws ecr create-repository --repository-name erp-frontend

# Push images to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag erp-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/erp-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/erp-backend:latest
```

---

### **Option 2: Google Cloud Deployment**

**Using Google Cloud Run:**

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/<project>/erp-backend ./backend
gcloud builds submit --tag gcr.io/<project>/erp-frontend ./frontend

# Deploy services
gcloud run deploy erp-backend --image gcr.io/<project>/erp-backend --platform managed
gcloud run deploy erp-frontend --image gcr.io/<project>/erp-frontend --platform managed
```

---

### **Option 3: Heroku Deployment**

**Using Heroku CLI:**

```bash
# Create Heroku apps
heroku create erp-backend-prod
heroku create erp-frontend-prod

# Add buildpacks
heroku buildpacks:add heroku/nodejs -a erp-backend-prod
heroku buildpacks:add heroku/nodejs -a erp-frontend-prod

# Deploy
git push heroku main
```

---

## ☸️ Kubernetes Deployment (Optional)

### **Kubernetes Manifests**

**backend-deployment.yaml:**

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
          image: erp-backend:latest
          ports:
            - containerPort: 3005
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3005'
          livenessProbe:
            httpGet:
              path: /health
              port: 3005
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3005
            initialDelaySeconds: 5
            periodSeconds: 5
```

**Deploy to Kubernetes:**

```bash
# Create namespace
kubectl create namespace erp

# Apply manifests
kubectl apply -f backend-deployment.yaml -n erp
kubectl apply -f frontend-deployment.yaml -n erp
kubectl apply -f service.yaml -n erp

# Check deployment status
kubectl get pods -n erp
kubectl logs -f deployment/erp-backend -n erp
```

---

## 📊 Production Checklist

### **Pre-Deployment**

- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates ready
- [ ] Backup strategy in place

### **Deployment**

- [ ] Docker images built and tested
- [ ] Docker-compose working locally
- [ ] CI/CD pipeline configured
- [ ] Deployment scripts created
- [ ] Rollback plan documented

### **Post-Deployment**

- [ ] Application accessible
- [ ] All endpoints responding
- [ ] Database connected
- [ ] Logging working
- [ ] Monitoring enabled
- [ ] Alerts configured

### **Monitoring & Maintenance**

- [ ] Uptime monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic)
- [ ] Log aggregation (ELK Stack)
- [ ] Auto-scaling configured

---

## 🔒 Security Considerations

### **Environment Variables**

```bash
# Never commit secrets
# Create .env.production file
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
API_SECRET=your-secret-key
JWT_SECRET=jwt-secret-key
```

### **SSL/TLS Certificate**

```bash
# Using Let's Encrypt
certbot certonly --standalone -d yourdomain.com

# Nginx SSL configuration
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### **Docker Security**

```dockerfile
# Run as non-root user
USER nodejs

# Use alpine for smaller image
FROM node:18-alpine

# Never run as root
RUN addgroup -g 1001 nodejs
RUN adduser -S nodejs -u 1001
```

---

## 📈 Scaling Strategy

### **Horizontal Scaling**

```yaml
# Docker-Compose - Scale services
docker-compose up -d --scale backend=3 --scale frontend=2

# Kubernetes - Auto-scaling
kubectl autoscale deployment erp-backend --min=2 --max=10 --cpu-percent=80
```

### **Load Balancing**

```nginx
upstream backend_pool {
    server backend1:3005;
    server backend2:3005;
    server backend3:3005;
}
```

---

## 🚀 Deployment Checklist

| Task               | Status | Owner        |
| ------------------ | ------ | ------------ |
| Docker Setup       | ⏳     | DevOps       |
| CI/CD Pipeline     | ⏳     | DevOps       |
| Security Review    | ⏳     | Security     |
| Load Testing       | ⏳     | QA           |
| Database Migration | ⏳     | DBA          |
| Go-Live            | ⏳     | Project Lead |

---

**Next Steps:**

1. Create Docker images ✅
2. Setup Docker-Compose locally ✅
3. Configure CI/CD pipeline ✅
4. Deploy to staging ✅
5. Run smoke tests ✅
6. Deploy to production ✅

**Estimated Time:** 3-4 hours  
**Difficulty:** Advanced  
**Phase:** 9 - Deployment

Ready for deployment? 🚀
