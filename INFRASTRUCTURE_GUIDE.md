# ERP System Infrastructure Documentation

# تطوير البنية التحتية للنظام

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                          │
│                    Reverse Proxy & Load Balancer                 │
│  - Rate Limiting (10 req/s API, 5 req/min login)                │
│  - Static File Caching (1 year)                                 │
│  - WebSocket Support (Socket.IO)                                │
│  - Security Headers (XSS, Frame Options, etc.)                  │
└───────────────────────┬──────────────────────────┬───────────────┘
                        │                          │
            ┌───────────▼──────────┐    ┌─────────▼──────────┐
            │  Frontend (Port 3002) │    │ Backend (Port 3001)│
            │  React SPA            │    │ Node.js REST API   │
            │  - Production Build   │    │ - RBAC System      │
            │  - Nginx Server       │    │ - JWT Auth         │
            │  - Gzip Compression   │    │ - Rate Limiting    │
            └───────────────────────┘    └────────┬───────────┘
                                                   │
                        ┌──────────────────────────┼───────────────┐
                        │                          │               │
              ┌─────────▼─────────┐    ┌──────────▼──────┐  ┌────▼────┐
              │ PostgreSQL (5432) │    │  Redis (6379)   │  │ Volumes │
              │ - Primary Database│    │  - Cache Layer  │  │ - Data  │
              │ - Arabic Support  │    │  - Sessions     │  │ - Logs  │
              │ - Full-text Search│    │  - Rate Limits  │  │ - Files │
              └───────────────────┘    └─────────────────┘  └─────────┘
                        │                          │
              ┌─────────▼──────────┐    ┌─────────▼──────────┐
              │ PgAdmin (Port 5050)│    │Redis Commander     │
              │ Database Management│    │   (Port 8081)      │
              └────────────────────┘    └────────────────────┘
```

## 📦 Infrastructure Components

### 1. **Nginx Reverse Proxy** ✅ COMPLETED

**Location**: [nginx/nginx.conf](nginx/nginx.conf) **Status**: Fully configured
and production-ready **Features**:

- Load balancing with least_conn algorithm
- Rate limiting:
  - API endpoints: 10 requests/second with 20 burst
  - Login endpoint: 5 requests/minute with 5 burst
- Gzip compression for text content (1024 min length)
- Static file caching (1 year for images/css/js/fonts)
- WebSocket support for Socket.IO (86400s read timeout)
- Security headers:
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: no-referrer-when-downgrade
- Health check endpoint at `/health`
- SSL/HTTPS configuration template (commented for future use)

**Upstream Configuration**:

```nginx
upstream backend_api {
    least_conn;
    server backend:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream frontend_app {
    least_conn;
    server frontend:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### 2. **PostgreSQL Database** ✅ COMPLETED

**Version**: 15-alpine **Port**: 5432 **Schema**: erp **Features**:

- UUID primary keys with uuid-ossp extension
- Full-text search with pg_trgm extension
- Arabic timezone support (Asia/Riyadh)
- Comprehensive indexing strategy
- Audit logging table
- RBAC tables (users, roles, permissions, role_permissions)
- Session management table

**Database Schema**:

- `erp.users` - User accounts with RBAC roles
- `erp.sessions` - Active user sessions with JWT tokens
- `erp.audit_logs` - Complete audit trail with JSONB details
- `erp.permissions` - System permissions by module
- `erp.roles` - RBAC roles with hierarchical levels
- `erp.role_permissions` - Many-to-many mapping

**Default Data**:

- Admin user: admin@alawael.com (password: Admin@123456)
- Default roles: admin (level 10), hr_manager (level 8), finance (level 8),
  teacher (level 5), driver (level 3)

**Initialization**: [backend/database/init.sql](backend/database/init.sql)

### 3. **Redis Cache** ⏳ CONFIGURED

**Version**: 7-alpine **Port**: 6379 **Features**:

- Session storage (JWT tokens, user sessions)
- Rate limiting counters
- Permission caching
- Query result caching
- Password-protected (configurable in .env)
- AOF persistence enabled

**Use Cases**:

- User session management
- API rate limiting counters
- RBAC permission caching
- Frequently accessed data caching
- Real-time analytics data

### 4. **Docker Compose** ⏳ NEEDS UPDATE

**Location**: [docker-compose.yml](docker-compose.yml) **Services**: 7 total

1. **postgres** - PostgreSQL 15 database
2. **redis** - Redis 7 cache server
3. **backend** - Node.js REST API
4. **frontend** - React SPA application
5. **nginx** - Reverse proxy
6. **pgadmin** - Database management UI
7. **redis-commander** - Redis management UI

**Network**: Custom bridge (172.20.0.0/16) **Volumes**:

- postgres_data (database files)
- redis_data (cache persistence)
- backend_uploads (user uploads)
- pgadmin_data (PgAdmin settings)

**Status**: File exists from previous session, needs update with new
configuration

### 5. **Backend Dockerfile** ⏳ NEEDS UPDATE

**Location**: [backend/Dockerfile](backend/Dockerfile) **Pattern**: Multi-stage
build **Features**:

- Stage 1: Builder with production dependencies
- Stage 2: Runtime with non-root user (nodejs:1001)
- Health check: `curl -f http://localhost:3001/api/health`
- Directories: uploads, logs with proper permissions
- Port: 3001

**Status**: File exists, needs verification and update

### 6. **Frontend Dockerfile** ⏳ NEEDS UPDATE

**Location**: [frontend/Dockerfile](frontend/Dockerfile) **Pattern**:
Multi-stage build **Features**:

- Stage 1: Builder with npm ci and npm run build
- Stage 2: Nginx alpine serving static files
- Environment variables: REACT_APP_API_URL, REACT_APP_WS_URL
- Health check on port 3000
- Nginx configuration for React Router

**Status**: File exists, needs verification and update

### 7. **Environment Configuration** ⏳ NEEDS UPDATE

**Location**: [.env.example](.env.example) **Categories**:

- Application settings (NODE_ENV, ports)
- Database configuration (PostgreSQL connection)
- Redis configuration with password
- JWT secrets (access + refresh tokens)
- CORS origins
- Rate limiting settings
- File upload configuration
- SMTP email settings
- Feature flags

**Status**: File exists, needs verification and update

### 8. **Deployment Scripts** ✅ PARTIALLY COMPLETED

**Linux/Mac**: [deploy.sh](deploy.sh) - ⏳ Needs update **Windows**:
[deploy.ps1](deploy.ps1) - ⏳ Needs update

**Features**:

- Docker and Docker Compose version checks
- Environment file validation
- Container management (stop, pull, build, start)
- Health check monitoring
- Service status display
- Access information output

**Status**: Files exist, need update for new architecture

## 🚀 Deployment Process

### Prerequisites

1. Docker 20.10+ installed
2. Docker Compose 1.29+ installed
3. 4GB RAM minimum
4. 10GB disk space

### Quick Start

**Windows**:

```powershell
# 1. Copy environment file
Copy-Item .env.example .env

# 2. Edit .env with your configuration
notepad .env

# 3. Run deployment script
.\deploy.ps1
```

**Linux/Mac**:

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your configuration
nano .env

# 3. Make script executable and run
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment

```bash
# 1. Build images
docker-compose build --no-cache

# 2. Start services
docker-compose up -d

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f
```

## 🔍 Service Access

| Service         | URL                     | Purpose                 |
| --------------- | ----------------------- | ----------------------- |
| Frontend        | http://localhost        | Main application UI     |
| Backend API     | http://localhost/api    | REST API endpoints      |
| Direct Backend  | http://localhost:3001   | Bypass proxy (dev only) |
| Direct Frontend | http://localhost:3002   | Bypass proxy (dev only) |
| PgAdmin         | http://localhost:5050   | Database management     |
| Redis Commander | http://localhost:8081   | Redis management        |
| Health Check    | http://localhost/health | Load balancer check     |

### Default Credentials

**Application**:

- Email: admin@alawael.com
- Password: Admin@123456

**PgAdmin** (from .env):

- Email: admin@alawael.com
- Password: (set in .env)

**PostgreSQL** (from .env):

- Host: postgres (or localhost:5432)
- Database: erp_db
- User: erp_admin
- Password: (set in .env)

**Redis** (from .env):

- Host: redis (or localhost:6379)
- Password: (set in .env)

## 📊 Monitoring & Health Checks

### Health Check Endpoints

**Backend**: `http://localhost:3001/api/health`

```json
{
  "status": "healthy",
  "timestamp": "2026-01-20T10:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

**Frontend**: `http://localhost:3000/health`

```json
{
  "status": "healthy"
}
```

**Nginx**: `http://localhost/health`

```text
OK
```

### Docker Health Checks

```bash
# Check all services health
docker-compose ps

# Check specific service
docker inspect --format='{{.State.Health.Status}}' <container_name>

# View health check logs
docker inspect --format='{{json .State.Health}}' <container_name>
```

### Service Dependencies

```
postgres (database)
  ↓
backend (API) → redis (cache)
  ↓
frontend (UI)
  ↓
nginx (proxy) ← Users
```

**Startup Order**:

1. PostgreSQL and Redis start first
2. Backend waits for database and Redis to be healthy
3. Frontend builds and serves
4. Nginx starts after frontend is ready

## 🔐 Security Features

### Network Isolation

- Custom bridge network (172.20.0.0/16)
- Services communicate via internal network
- Only Nginx exposed to host

### Rate Limiting

- API endpoints: 10 requests/second per IP
- Login endpoint: 5 requests/minute per IP
- Configurable burst limits

### Security Headers

```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer-when-downgrade
```

### Non-Root Containers

- Backend runs as nodejs user (UID 1001)
- Frontend uses nginx with limited permissions
- Database uses postgres user

### Password Protection

- PostgreSQL password-protected
- Redis password-protected
- PgAdmin password-protected
- JWT secrets for authentication

## 📈 Performance Optimizations

### Caching Strategy

1. **Nginx**:
   - Static files cached for 1 year
   - Gzip compression for text content
   - Upstream keepalive connections (32)

2. **Redis**:
   - Permission caching
   - Session storage
   - Rate limiting counters
   - Query result caching

3. **PostgreSQL**:
   - Comprehensive indexing
   - Full-text search optimization
   - Connection pooling
   - Query optimization

### Load Balancing

- Least connections algorithm
- Automatic failover (3 max_fails, 30s timeout)
- Keepalive connections to backends

## 🔧 Maintenance & Operations

### Backup Strategy

**PostgreSQL Backup**:

```bash
# Create backup
docker-compose exec postgres pg_dump -U erp_admin erp_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U erp_admin erp_db < backup.sql
```

**Redis Backup**:

```bash
# Create snapshot
docker-compose exec redis redis-cli BGSAVE

# Copy RDB file
docker cp <redis_container>:/data/dump.rdb ./redis_backup.rdb
```

### Log Management

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100 backend

# Export logs
docker-compose logs > system_logs.txt
```

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Scale service (if supported)
docker-compose up -d --scale backend=3
```

### Database Migrations

```bash
# Run migrations
docker-compose exec backend npm run migrate

# Rollback migrations
docker-compose exec backend npm run migrate:rollback

# View migration status
docker-compose exec backend npm run migrate:status
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: Services not starting

```bash
# Check logs
docker-compose logs

# Check service status
docker-compose ps

# Rebuild images
docker-compose build --no-cache
docker-compose up -d
```

**Issue**: Database connection refused

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection string in .env
cat .env | grep DATABASE_URL
```

**Issue**: Redis connection timeout

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Verify Redis password
docker-compose exec redis redis-cli -a <password> ping
```

**Issue**: Nginx 502 Bad Gateway

```bash
# Check backend is healthy
curl http://localhost:3001/api/health

# Check nginx logs
docker-compose logs nginx

# Verify upstream configuration
docker-compose exec nginx nginx -t
```

### Performance Issues

**High CPU usage**:

```bash
# Check container stats
docker stats

# Identify problematic container
docker top <container_name>

# Review logs for errors
docker-compose logs --tail=1000 <service>
```

**High memory usage**:

```bash
# Check memory limits
docker-compose config

# Monitor memory usage
docker stats --no-stream

# Adjust memory limits in docker-compose.yml
```

**Slow queries**:

```bash
# Enable PostgreSQL query logging
docker-compose exec postgres psql -U erp_admin -d erp_db \
  -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# View slow queries
docker-compose logs postgres | grep "duration:"
```

## 📝 Next Steps

### Phase 1: Complete Infrastructure ⏳

1. ✅ Create Nginx configuration
2. ✅ Create database initialization script
3. ⏳ Update docker-compose.yml
4. ⏳ Update backend Dockerfile
5. ⏳ Update frontend Dockerfile
6. ⏳ Update environment configuration
7. ⏳ Update deployment scripts

### Phase 2: Application Migration

1. Update backend database connection (In-Memory → PostgreSQL)
2. Configure Redis session storage
3. Update CORS settings for Nginx proxy
4. Configure WebSocket connections through proxy
5. Test all API endpoints through Nginx
6. Verify RBAC system with PostgreSQL
7. Test file uploads with volume persistence

### Phase 3: Testing & Validation

1. Load testing with multiple users
2. Security testing (rate limiting, XSS, CSRF)
3. Performance testing (query optimization)
4. Failover testing (container restart)
5. Backup and restore testing
6. Health check validation
7. Monitoring setup

### Phase 4: Production Readiness

1. SSL/HTTPS configuration
2. Domain name setup
3. Secrets management (Docker secrets/Vault)
4. Automated backups (cron jobs)
5. Monitoring and alerting (Prometheus/Grafana)
6. Log aggregation (ELK stack)
7. CI/CD pipeline setup
8. Documentation completion

## 🎯 Success Criteria

- [x] Nginx reverse proxy configured
- [x] PostgreSQL database schema created
- [ ] All 7 services running and healthy
- [ ] Application accessible through Nginx
- [ ] RBAC system working with PostgreSQL
- [ ] Redis caching operational
- [ ] Rate limiting enforced
- [ ] Health checks passing
- [ ] Logs accessible and monitored
- [ ] Backup strategy implemented

## 📚 References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Production Deployment](https://create-react-app.dev/docs/deployment/)

---

**Document Version**: 1.0 **Last Updated**: 2026-01-20 **Maintainer**: ERP
Development Team
