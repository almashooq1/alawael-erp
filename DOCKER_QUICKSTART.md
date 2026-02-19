# 🐳 ERP System - Docker Deployment

Quick setup guide for running the ERP system with Docker.

## Quick Start (5 minutes)

### 1. Clone and Setup
```bash
cd /path/to/erp-system
cp .env.docker.example .env.docker
```

### 2. Start Services
```bash
# Development with hot reload
docker-compose up --build

# Or in background
docker-compose up -d --build
```

### 3. Access Services
```
Frontend:     http://localhost:3000
API:          http://localhost:3001/api
SSO:          http://localhost:3002
Mongo Admin:  mongodb://admin:secure_password@localhost:27017
```

## File Structure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base production configuration |
| `docker-compose.override.yml` | Development overrides (hot reload, debugging) |
| `docker-compose.production.yml` | Production overrides |
| `.env.docker` | Environment variables |
| `.dockerignore` | Files excluded from Docker build |
| `DOCKER_SETUP_GUIDE.md` | Comprehensive documentation |

## Common Commands

```bash
# View logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend npm test

# Access MongoDB
docker-compose exec mongodb mongosh

# Rebuild images
docker-compose up --build --no-deps backend

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

## Production Deployment

```bash
# Edit environment variables for production
nano .env.docker

# Deploy with production settings
docker-compose -f docker-compose.yml \
               -f docker-compose.production.yml \
               up -d

# Verify
docker-compose ps
docker-compose logs backend
```

## Architecture

```
┌─────────────────┐
│   Frontend      │ (React)
│  Port 3000      │
└────────┬────────┘
         │
     [Nginx:80]
         │
    ┌────┴────┐
    │          │
┌───▼───┐  ┌──▼──┐
│Backend│  │ SSO │
│ 3001  │  │3002 │
└───┬───┘  └──┬──┘
    │         │
    └────┬────┘
         │
    [MongoDB:27017]
         │
      Database
```

## Troubleshooting

### Port already in use
```bash
# Change port in .env.docker
PORT=3001  # Change to different port

# Or kill process occupying port
lsof -i :3001 | awk 'NR!=1 {print $2}' | xargs kill -9
```

### MongoDB connection failed
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Wait a bit longer for MongoDB to start
docker-compose restart backend
```

### Frontend can't connect to API
```bash
# Verify backend is healthy
docker-compose ps

# Check API endpoint
curl http://localhost:3001/health

# View backend logs
docker-compose logs backend
```

## Security Considerations

- ✅ **Change default passwords** in `.env.docker`
- ✅ **Set strong JWT_SECRET** for production
- ✅ **Enable SSL/TLS** via Nginx for production
- ✅ **Don't commit .env files** to version control
- ✅ **Use environment-specific .env files**

## Next Steps

1. Read [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md) for detailed instructions
2. Configure environment variables in `.env.docker`
3. Start developing: `docker-compose up --build`
4. Check health: `docker-compose ps`
5. View logs: `docker-compose logs -f`

## Documentation

- **Setup Guide:** [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md)
- **API Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Database Guide:** [DATABASE_MIGRATION_SETUP_GUIDE.md](DATABASE_MIGRATION_SETUP_GUIDE.md)

---

**Version:** 1.0.0 | **Last Updated:** 2025-02-23
