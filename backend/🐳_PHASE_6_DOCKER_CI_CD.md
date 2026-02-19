# Phase 6: Docker & Deployment Automation

**Date**: February 2, 2026  
**Objective**: Production-ready Docker & CI/CD pipeline  
**Technologies**: Docker, docker-compose, GitHub Actions

---

## 🐳 Docker Setup

### Dockerfile for Backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build step (if needed)
RUN npm run build || true

# Production image
FROM node:18-alpine

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app . .

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "server.js"]
```

### Dockerfile for Frontend (if applicable)

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🐳 docker-compose.yml

```yaml
version: '3.8'

services:
  # Database
  mongodb:
    image: mongo:6.0
    container_name: alawael-mongodb
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test:
        echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - alawael-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: alawael-redis
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - alawael-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: alawael-backend
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://root:${MONGO_PASSWORD}@mongodb:27017/alawael
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    networks:
      - alawael-network

  # Frontend (if applicable)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: alawael-frontend
    ports:
      - '80:80'
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - alawael-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: alawael-nginx
    ports:
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - alawael-network

volumes:
  mongodb_data:

networks:
  alawael-network:
    driver: bridge
```

---

## 🔧 GitHub Actions CI/CD Pipeline

### .github/workflows/ci-cd.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Testing
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    services:
      mongodb:
        image: mongo:6.0
        options: >-
          --health-cmd mongosh --health-interval 10s --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping" --health-interval 10s --health-timeout
          5s --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run tests
        run: |
          cd backend
          npm test -- --coverage
        env:
          MONGO_TEST_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info

  # Linting & Code Quality
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run ESLint
        run: |
          cd backend
          npm run lint || true

      - name: Run Prettier
        run: |
          cd backend
          npm run format:check || true

      - name: Security audit
        run: |
          cd backend
          npm audit --audit-level=moderate || true

  # Build Docker Images
  build:
    needs: [test, quality]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Deploy to Staging
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.STAGING_HOST }}
          DEPLOY_USER: ${{ secrets.STAGING_USER }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts
          ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST "cd /app && docker-compose pull && docker-compose up -d"

      - name: Run smoke tests
        run: |
          sleep 30
          curl -f http://staging.alawael.local/health || exit 1

  # Deploy to Production
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.PROD_HOST }}
          DEPLOY_USER: ${{ secrets.PROD_USER }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts
          ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST "cd /app && docker-compose pull && docker-compose up -d"

      - name: Verify deployment
        run: |
          sleep 30
          curl -f https://alawael.local/health || exit 1

      - name: Notify deployment
        run: |
          echo "✅ Production deployment successful!"
```

---

## 📋 Deployment Checklist

- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Set up GitHub Actions
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure health checks
- [ ] Create deployment scripts
- [ ] Test CI/CD pipeline
- [ ] Deploy to staging
- [ ] Deploy to production

---

## 🚀 Deployment Commands

### Local Testing

```bash
docker-compose up -d
docker-compose logs -f backend
docker-compose down
```

### Production Deployment

```bash
# Pull latest images
docker-compose pull

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

---

**Phase 6 Status**: READY TO EXECUTE  
**Estimated Duration**: 90 minutes  
**Next Phase**: Advanced Monitoring Setup
