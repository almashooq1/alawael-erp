# ERP System - Docker Setup & Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for containerizing and deploying the ERP system using Docker and Docker Compose.

**Architecture:**
- **Backend API** (Port 3001): Express.js REST API for supply chain management
- **SSO Server** (Port 3002): Authentication and authorization service
- **Frontend** (Port 3000): React.js web application
- **MongoDB** (Port 27017): Document database for application data
- **Nginx** (Ports 80/443): Reverse proxy and load balancer

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Verify installations
docker --version          # Docker >= 20.10
docker-compose --version  # Docker Compose >= 1.29
```

### 2. Environment Setup

```bash
# Create environment file from template
cp .env.docker.example .env.docker

# Edit with your configuration
# Edit .env.docker with production values
```

### 3. Development Setup

```bash
# Build and start services (includes hot reload)
docker-compose up --build

# Services will be available at:
# - Frontend:  http://localhost:3000
# - API:       http://localhost:3001/api
# - SSO:       http://localhost:3002
# - Mongo:     mongodb://admin:secure_password@localhost:27017
```

### 4. Production Setup

```bash
# Use production configuration
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Verify services
docker-compose ps
docker-compose logs -f backend
```

---

## 🏗️ Project Structure

```
project-root/
├── docker-compose.yml                 # Base configuration
├── docker-compose.override.yml        # Development overrides (auto-loaded)
├── docker-compose.production.yml      # Production overrides
├── .env.docker.example               # Environment template
├── .dockerignore                     # Docker build exclusions
├── Dockerfile                         # Container image definition
└── erp_new_system/
    ├── backend/
    │   ├── Dockerfile
    │   ├── src/
    │   ├── package.json
    │   └── server.js / sso-server.js
    └── frontend/
        ├── Dockerfile
        ├── src/
        ├── public/
        └── package.json
```

---

## 📝 Docker Configuration Files

### docker-compose.yml
**Base production-ready configuration**
- MongoDB service with persistent volumes
- Backend API service (port 3001)
- SSO Server service (port 3002)
- Frontend service (port 3000)
- Nginx reverse proxy (ports 80/443)
- Custom bridge network: 172.25.0.0/16
- Health checks for all services

### docker-compose.override.yml
**Development-specific overrides (auto-loaded)**
- Hot reload volumes for src code
- Debug ports (9229 for backend, 9230 for SSO)
- npm install command execution
- Localhost binding for security
- Debug logging enabled

### docker-compose.production.yml
**Production overrides**
- Resource limits and reservations
- Always restart policy
- Advanced logging configuration
- JSON file logging with rotation
- Security options applied
- Separate production network
- DB volume binding to host path

### .env.docker.example
**Environment variables template**
- MongoDB credentials and connection
- API port and host configuration
- JWT and security settings
- CORS and frontend URL settings
- Logging configuration
- Database pool settings

---

## 🔧 Common Tasks

### Start Services

```bash
# Development (with hot reload)
docker-compose up --build

# Production
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Background mode
docker-compose up -d

# Specific service
docker-compose up backend
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Follow logs (tail)
docker-compose logs -f backend

# Last N lines
docker-compose logs --tail=50 backend
```

### Execute Commands

```bash
# Enter backend container shell
docker-compose exec backend sh

# Run npm command
docker-compose exec backend npm test

# MongoDB shell
docker-compose exec mongodb mongosh

# View environment
docker-compose exec backend env
```

### Database Operations

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out=/tmp/backup

# Restore MongoDB
docker-compose exec mongodb mongorestore /tmp/backup

# Connect to MongoDB
docker-compose exec mongodb mongosh "mongodb://admin:secure_password@localhost:27017"

# Run initialization
docker-compose exec backend node seeds/initDatabase.js
```

### Rebuild Services

```bash
# Rebuild all
docker-compose down
docker-compose up --build

# Rebuild specific service
docker-compose up --build --no-deps backend

# Force rebuild without cache
docker-compose build --no-cache
```

### Network Management

```bash
# View network
docker network ls
docker network inspect erp-network

# Test connectivity between services
docker-compose exec backend ping mongodb
docker-compose exec frontend ping backend
```

### Performance Tuning

```bash
# Check resource usage
docker stats

# Monitor in real-time
docker stats --no-stream

# View container details
docker-compose ps --all
```

---

## ⚠️ Troubleshooting

### MongoDB Connection Issues

**Problem:** `MongoNetworkError: connect ECONNREFUSED`

```bash
# Solution 1: Check MongoDB is running
docker-compose ps mongodb

# Solution 2: Wait for MongoDB to be healthy
docker-compose ps --all  # Check (healthy) status

# Solution 3: Check MongoDB logs
docker-compose logs mongodb

# Solution 4: Test connection directly
docker-compose exec backend mongo mongodb://admin:secure_password@mongodb:27017
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE :::3001`

```bash
# View what's using the port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux

# Solution 1: Change port in .env.docker
PORT=3001  # Change to different port

# Solution 2: Stop conflicting service
Get-Process -Id <PID> | Stop-Process  # Windows
kill -9 <PID>                         # Mac/Linux

# Solution 3: Use different compose file
docker-compose -f docker-compose.yml up
```

### Frontend Can't Connect to API

**Problem:** `Failed to fetch from http://localhost:3001/api`

```bash
# Solution 1: Check backend is running
docker-compose logs backend

# Solution 2: Verify CORS settings
# Check .env.docker: CORS_ORIGIN=http://localhost:3000

# Solution 3: Check network connectivity
docker-compose exec frontend curl http://backend:3001/health

# Solution 4: Update frontend environment
REACT_APP_API_URL=http://localhost:3001/api
```

### Out of Disk Space

**Problem:** `No space left on device`

```bash
# Clean up unused images and volumes
docker system prune -a

# Remove specific volume
docker volume rm erp-system_mongodb_data

# Check disk usage
docker system df

# Free up space
docker image prune
docker volume prune
```

### Health Check Failures

**Problem:** `Container is unhealthy`

```bash
# Check health status
docker-compose ps

# View health check details
docker inspect $(docker-compose ps -q backend) | grep -A 10 Health

# Check logs for errors
docker-compose logs backend

# Increase timeout
# Edit docker-compose.yml healthcheck timeout
```

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# ✓ DO: Use strong passwords
MONGO_PASSWORD=your-very-secure-password-123!@#

# ✗ DON'T: Commit .env files to git
# Add to .gitignore
echo '.env.docker' >> .gitignore
```

### Network Security

```yaml
# Use custom network (docker-compose does this automatically)
networks:
  erp-network:
    driver: bridge

# Services communicate via container names (no external exposure)
```

### Container Security

```yaml
# Disable new privileges escalation
security_opt:
  - no-new-privileges:true

# Run as non-root user
user: "node"  # Requires user setup in Dockerfile
```

---

## 📊 Monitoring & Health Checks

### Health Check Configuration

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s        # Check every 30 seconds
  timeout: 10s         # Wait 10 seconds for response
  retries: 3           # Fail after 3 retries
  start_period: 40s    # Give 40s to start before checking
```

### View Health Status

```bash
# Quick overview
docker-compose ps

# Detailed health info
docker-compose ps --all | grep -i health

# Check specific service
docker inspect $(docker-compose ps -q backend) | grep Health -A 10
```

---

## 📦 Volumes & Data Persistence

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect erp-system_mongodb_data

# Backup volume data
docker run --rm -v erp-system_mongodb_data:/data -v $(pwd)/backup:/backup \
  -w /data busybox tar czf /backup/mongodb-backup.tar.gz .

# Restore volume data
docker run --rm -v erp-system_mongodb_data:/data -v $(pwd)/backup:/backup \
  -w /data busybox tar xzf /backup/mongodb-backup.tar.gz
```

### Named Volumes

```yaml
volumes:
  mongodb_data:
    driver: local
  # Data stored in Docker's data directory
  # path: /var/lib/docker/volumes/erp-system_mongodb_data/_data
```

---

## 🚢 Production Deployment

### Pre-Deployment Checklist

```bash
# ✓ Security review
- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable SSL/TLS
- [ ] Configure CORS properly
- [ ] Review environment variables

# ✓ Performance review
- [ ] Set resource limits
- [ ] Configure health checks
- [ ] Setup logging
- [ ] Enable monitoring

# ✓ Backup strategy
- [ ] Schedule daily database backups
- [ ] Test restore procedures
- [ ] Verify data integrity
```

### Deployment Command

```bash
# Create environment file with production values
cp .env.docker.example .env.docker
# Edit .env.docker with production settings

# Deploy with production configuration
docker-compose -f docker-compose.yml \
               -f docker-compose.production.yml \
               up -d

# Verify services are healthy
docker-compose ps
docker-compose logs backend
```

### Monitoring in Production

```bash
# Setup centralized logging
# Configure Docker to use external logging driver
# Example: Splunk, ELK Stack, Datadog

# Monitor resource usage
watch docker stats

# Setup alerts
# Configure Docker events for health check failures
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Docker

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push Docker images
        run: |
          docker-compose build
          # Push to registry if needed
      
      - name: Deploy services
        run: |
          docker-compose -f docker-compose.yml \
                         -f docker-compose.production.yml \
                         up -d
      
      - name: Verify deployment
        run: |
          docker-compose ps
          docker-compose exec -T backend npm test
```

---

## 📚 Additional Resources

- **Docker Documentation:** https://docs.docker.com
- **Docker Compose Reference:** https://docs.docker.com/compose/compose-file
- **MongoDB Docker:** https://hub.docker.com/_/mongo
- **Node.js Best Practices:** https://github.com/nodejs/docker-node/blob/main/README.md

---

## 💡 Tips & Tricks

### Development Workflow

```bash
# Quick development setup
docker-compose up --build

# Code changes auto-reload
# Visit http://localhost:3000

# Debug backend
# Attach debugger to localhost:9229 in VS Code
```

### Clean Up All Docker Resources

```bash
# Remove stopped containers
docker-compose down

# Remove all unused resources
docker system prune -a

# Full cleanup
docker-compose down -v  # Remove volumes too!
```

### Performance Optimization

```bash
# Use .dockerignore to reduce build context
# Multi-stage builds to reduce image size
# Layer caching for faster builds

# Check image sizes
docker images | grep erp
```

---

## ✅ Verification Checklist

After starting services, verify:

```bash
# 1. Services running
docker-compose ps  # All services should show "Up"

# 2. Health checks
docker-compose ps  # All should be "healthy"

# 3. Port accessibility
curl http://localhost:3000      # Frontend
curl http://localhost:3001/health  # Backend
curl http://localhost:3002/health  # SSO

# 4. MongoDB connection
docker-compose exec backend npm test

# 5. Network connectivity
docker network inspect erp-network
```

---

**Last Updated:** 2025-02-23
**ERP System Version:** 1.0.0
**Docker Compose Version:** 3.9
