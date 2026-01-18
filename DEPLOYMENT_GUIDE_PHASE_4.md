# Phase 4 - Deployment Documentation

## Overview

This document provides comprehensive deployment instructions for the Therapy Management System using Docker and Docker Compose.

## Architecture

```
┌─────────────────────────────────────────┐
│         Nginx Reverse Proxy              │
│      (Port 80/443)                      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│   Flask API  │  │   Redis      │
│  (Port 5000) │  │ (Port 6379)  │
└──────────────┘  └──────────────┘
```

## Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- 2GB RAM minimum
- 1GB disk space

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Build and Start Services

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Verify Services

```bash
# Check API health
curl http://localhost:5000/health

# Check logs
docker-compose logs -f api

# Access API
curl http://localhost/api/auth/register
```

## Detailed Setup

### Development Environment

```bash
# 1. Install dependencies
docker-compose build

# 2. Start with debug logging
docker-compose up -d
DEBUG=True docker-compose up

# 3. Run tests in container
docker-compose exec api pytest tests/ -v

# 4. View live logs
docker-compose logs -f api redis nginx
```

### Production Environment

```bash
# 1. Create .env.production
cp .env.example .env.production
# Edit with production values

# 2. Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# 3. Enable SSL
# Copy SSL certificates to ./ssl/
# nginx.conf is already configured for HTTPS

# 4. Monitor services
docker-compose logs --tail=100 -f
```

## Configuration

### Environment Variables

| Variable         | Default              | Description         |
| ---------------- | -------------------- | ------------------- |
| `FLASK_ENV`      | production           | Flask environment   |
| `DATABASE_URL`   | sqlite:///therapy.db | Database connection |
| `REDIS_URL`      | redis://redis:6379/0 | Redis connection    |
| `JWT_SECRET_KEY` | (required)           | JWT signing key     |
| `DEBUG`          | False                | Debug mode          |

### Database

**SQLite (Development)**

- File: `./data/therapy.db`
- Persisted via volume mount
- No setup required

**PostgreSQL (Production)**

```bash
# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@db:5432/therapy_db
```

### Redis Configuration

```bash
# Cache settings
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=your-secure-password
```

## Service Management

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f redis
docker-compose logs -f nginx
```

### Restart Service

```bash
docker-compose restart api
```

### Execute Commands

```bash
# Run shell in API container
docker-compose exec api bash

# Run Python command
docker-compose exec api python script.py

# Run tests
docker-compose exec api pytest tests/ -v
```

## Health Checks

### API Health

```bash
curl http://localhost:5000/health
```

### Redis Connection

```bash
docker-compose exec redis redis-cli ping
```

### Database Status

```bash
docker-compose exec api python -c "from app import db; print(db.engine.execute('SELECT 1'))"
```

## Monitoring & Logs

### View Container Metrics

```bash
docker stats
```

### Export Logs

```bash
docker-compose logs api > api.log
docker-compose logs > all.log
```

### Monitor in Real-time

```bash
watch -n 1 'docker-compose ps'
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Rebuild image
docker-compose build --no-cache api

# Start with verbose output
docker-compose up api (no -d flag)
```

### Connection Issues

```bash
# Test Redis connection
docker-compose exec api python -c "import redis; r=redis.from_url('redis://redis:6379'); print(r.ping())"

# Test database
docker-compose exec api python -c "from app import db; db.create_all(); print('DB OK')"

# Check network
docker network inspect $(docker-compose ps -q | head -1 | xargs docker inspect -f '{{.HostConfig.NetworkMode}}')"
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Increase container limits (update docker-compose.yml):
# resources:
#   limits:
#     memory: 512M
#     cpus: '0.5'

# Restart services
docker-compose restart
```

## Deployment Workflows

### Rolling Updates

```bash
# 1. Build new image
docker-compose build api

# 2. Stop current container
docker-compose stop api

# 3. Start new container
docker-compose up -d api

# 4. Verify
curl http://localhost:5000/health
```

### Zero-Downtime Deployment

```bash
# Scale to 2 instances
docker-compose up -d --scale api=2

# Update one instance
docker-compose up -d --build api --no-deps

# Stop old instance
docker-compose stop api_1

# Scale back to 1
docker-compose down
docker-compose up -d
```

## Production Checklist

- [ ] Database backups configured
- [ ] Redis persistence enabled
- [ ] SSL certificates installed
- [ ] Environment variables secured
- [ ] Health checks passing
- [ ] Logs monitored
- [ ] Resource limits set
- [ ] Network security configured
- [ ] Tests passing in container
- [ ] Monitoring tools configured

## Security Best Practices

1. **Secrets Management**
   - Never commit `.env` to version control
   - Use secrets management tools (AWS Secrets Manager, Vault)
   - Rotate keys regularly

2. **Network Security**
   - Use internal docker network for service-to-service communication
   - Expose only nginx to public internet
   - Enable firewall rules

3. **Container Security**
   - Run containers as non-root user
   - Use read-only filesystems where possible
   - Keep images updated

4. **Data Security**
   - Enable database encryption
   - Use HTTPS everywhere
   - Secure backup procedures

## Backup & Recovery

### Backup Database

```bash
docker-compose exec api python -c "
import shutil
shutil.copy('data/therapy.db', 'backups/therapy_$(date +%Y%m%d_%H%M%S).db')
"
```

### Restore Database

```bash
cp backups/therapy_YYYYMMDD_HHMMSS.db data/therapy.db
docker-compose restart api
```

### Backup Redis

```bash
docker-compose exec redis redis-cli --rdb /data/dump.rdb
```

## Performance Tuning

### API Optimization

```bash
# Increase worker count (update app.py)
gunicorn --workers 4 --worker-class sync app:app

# Enable caching headers
# Already configured in nginx.conf
```

### Database Optimization

```bash
# Index frequently queried fields
# Run in API container:
docker-compose exec api python
# from models import User; User.__table__.create(db.engine)
```

## Scaling

### Horizontal Scaling (Multiple API Instances)

```bash
docker-compose up -d --scale api=3
```

### Load Balancing

```bash
# nginx.conf is already configured for this
# upstream backend with multiple servers
```

## Monitoring Integration

### Prometheus

```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - '9090:9090'
```

### ELK Stack

```yaml
# Similar configuration for Elasticsearch, Logstash, Kibana
```

## Support & Documentation

- API Documentation: http://localhost/api/docs
- Health Status: http://localhost:5000/health
- Nginx Status: http://localhost:8080/status
- Error Logs: `docker-compose logs api`

## Conclusion

The system is now ready for production deployment. Ensure all security measures are in place and backups are configured before going live.
