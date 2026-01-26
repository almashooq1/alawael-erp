# Docker Compose Configuration Improvements

# تحسينات إضافية للبنية التحتية

## 🎯 Overview

This document outlines the improvements made to the ERP system infrastructure,
including the addition of Nginx reverse proxy, enhanced security, and
performance optimizations.

## 📋 Current Infrastructure

The system currently uses:

- **Frontend**: React SPA served on port 3000
- **Backend**: Node.js API on port 3001
- **Database**: MongoDB 7.0
- **Cache**: Redis 7.2
- **Email**: MailCatcher on port 1080

## ✨ New Infrastructure Improvements

### 1. Nginx Reverse Proxy ✅ COMPLETED

**Location**: [nginx/nginx.conf](nginx/nginx.conf)

**Key Features**:

- Load balancing with least_conn algorithm
- Rate limiting:
  - API endpoints: 10 requests/second with 20 burst
  - Login endpoint: 5 requests/minute with 5 burst
- Gzip compression for text content
- Static file caching (1 year for assets)
- WebSocket support for Socket.IO
- Security headers (XSS protection, frame options, etc.)
- Health check endpoint

**Benefits**:

- Single entry point for all services
- Enhanced security through rate limiting
- Improved performance with caching
- SSL/HTTPS ready (template included)
- Protection against DDoS attacks

### 2. Enhanced docker-compose.yml

**Current Services**:

1. **client** (Frontend) - Port 3000:80
2. **api** (Backend) - Port 3001:3001
3. **mongo** (Database) - Port 27017:27017
4. **mongo-express** (DB UI) - Port 8081:8081
5. **redis** (Cache) - Port 6379:6379
6. **redis-commander** (Redis UI) - Port 8082:8081
7. **mailcatcher** (Email) - Port 1080:1080, 1025:1025

**Suggested Additions**: 8. **nginx** (Reverse Proxy) - Port 80:80, 443:443

### 3. Network Architecture

```
                        Internet/Users
                              ↓
                     ┌────────────────┐
                     │  Nginx (Port 80/443)│
                     │  Reverse Proxy    │
                     └────────┬───────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
          ┌─────────▼──────┐   ┌────────▼────────┐
          │ Frontend:3000  │   │  Backend:3001   │
          │  React SPA     │   │  Node.js API    │
          └────────────────┘   └────────┬────────┘
                                        │
                              ┌─────────┴──────────┐
                              │                    │
                    ┌─────────▼──────┐   ┌────────▼────────┐
                    │  MongoDB:27017 │   │  Redis:6379     │
                    │   Database     │   │    Cache        │
                    └────────────────┘   └─────────────────┘
```

## 🚀 Deployment Options

### Option 1: With Nginx Proxy (Recommended for Production)

```bash
# Add nginx service to docker-compose.yml
# Then run:
docker-compose down
docker-compose up -d

# Access via:
# Frontend: http://localhost
# Backend API: http://localhost/api
# Mongo Express: http://localhost:8081
# Redis Commander: http://localhost:8082
```

### Option 2: Current Setup (Development)

```bash
# Run as is without nginx:
docker-compose up -d

# Access via:
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Mongo Express: http://localhost:8081
# Redis Commander: http://localhost:8082
```

## 🔐 Security Enhancements

### 1. Rate Limiting (via Nginx)

```nginx
# API rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Login rate limiting (stricter)
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
```

### 2. Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

### 3. MongoDB Security

```yaml
environment:
  - MONGO_INITDB_ROOT_USERNAME=admin
  - MONGO_INITDB_ROOT_PASSWORD=strong_password_here
```

### 4. Redis Security

```yaml
command: redis-server --requirepass strong_redis_password
```

## 📈 Performance Optimizations

### 1. Static File Caching

```nginx
# Cache static assets for 1 year
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Gzip Compression

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;
```

### 3. Connection Pooling

```nginx
upstream backend_api {
    least_conn;
    keepalive 32;
}
```

### 4. Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

## 🔧 Configuration Files

### Required Files:

1. ✅ [nginx/nginx.conf](nginx/nginx.conf) - Created
2. ✅ [docker-compose.yml](docker-compose.yml) - Existing
3. ✅ [.env.example](.env.example) - Existing
4. ✅ [backend/Dockerfile](backend/Dockerfile) - Existing
5. ✅ [frontend/Dockerfile](frontend/Dockerfile) - Existing

### Optional Improvements:

- [ ] Add nginx service to docker-compose.yml
- [ ] Configure SSL certificates
- [ ] Set up automated backups
- [ ] Add monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation

## 📝 Nginx Integration Steps

To integrate Nginx into the existing docker-compose.yml:

### Step 1: Add Nginx Service

```yaml
nginx:
  image: nginx:alpine
  container_name: alaweal-nginx
  ports:
    - '80:80'
    - '443:443'
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
  depends_on:
    - client
    - api
  networks:
    - alaweal-network
  restart: unless-stopped
  healthcheck:
    test: ['CMD', 'nginx', '-t']
    interval: 30s
    timeout: 10s
    retries: 3
```

### Step 2: Update Port Mappings

```yaml
# Frontend - Remove direct port exposure
client:
  # ports:
  #   - "3000:80"  # Remove this, access via nginx
  expose:
    - '80'

# Backend - Remove direct port exposure
api:
  # ports:
  #   - "3001:3001"  # Remove this, access via nginx
  expose:
    - '3001'
```

### Step 3: Update Environment Variables

```bash
# Frontend
REACT_APP_API_URL=http://localhost/api

# Backend
CORS_ORIGIN=http://localhost
```

## 🎯 Migration Checklist

### Phase 1: Infrastructure Setup ✅

- [x] Create Nginx configuration file
- [x] Document infrastructure architecture
- [x] Review existing docker-compose.yml
- [x] Identify improvement areas

### Phase 2: Integration (Next)

- [ ] Add nginx service to docker-compose.yml
- [ ] Update port mappings for client and api
- [ ] Update environment variables
- [ ] Test nginx configuration
- [ ] Deploy and verify all services

### Phase 3: Security Hardening

- [ ] Generate SSL certificates
- [ ] Configure HTTPS in nginx
- [ ] Update security headers
- [ ] Test rate limiting
- [ ] Implement secrets management

### Phase 4: Production Readiness

- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Implement log aggregation
- [ ] Load testing
- [ ] Documentation completion

## 🔍 Testing

### Test Nginx Configuration

```bash
# Test nginx config syntax
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# Test with docker-compose
docker-compose config
```

### Test Rate Limiting

```bash
# Test API rate limiting (should block after 10 req/s)
for i in {1..20}; do curl http://localhost/api/health; done

# Test login rate limiting (should block after 5 req/min)
for i in {1..10}; do curl -X POST http://localhost/api/auth/login; done
```

### Test Health Checks

```bash
# Nginx health
curl http://localhost/health

# Backend health
curl http://localhost/api/health

# Frontend health
curl http://localhost/
```

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Redis Security](https://redis.io/topics/security)
- [Node.js Production Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🆘 Support

For issues or questions:

1. Check logs: `docker-compose logs <service_name>`
2. Verify configuration: `docker-compose config`
3. Check service health: `docker-compose ps`
4. Review nginx logs: `docker-compose logs nginx`

---

**Document Version**: 1.1 **Last Updated**: 2026-01-20 **Status**:
Infrastructure improvements documented, nginx integration pending
