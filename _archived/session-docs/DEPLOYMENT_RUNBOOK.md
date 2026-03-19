# Deployment Runbook

## Emergency Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd project-root

# Setup environment
cp .env.example .env
# Edit .env with production values

# Deploy with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Verify deployment
docker-compose logs -f backend
```

## Pre-Deployment Checks

- [ ] All tests passing (npm test)
- [ ] Environment variables configured
- [ ] Database connectivity verified
- [ ] SSL certificates in place
- [ ] Backups scheduled
- [ ] Monitoring configured

## Post-Deployment Verification

- [ ] Services running: `docker ps`
- [ ] No errors in logs: `docker logs backend`
- [ ] API responding: `curl http://localhost:3000/health`
- [ ] Database accessible
- [ ] All endpoints tested

## Rollback Procedure

```bash
# Stop services
docker-compose down

# Restore previous version
git checkout <previous-tag>
docker build -t erp-backend .
docker-compose up -d
```

## Monitoring

- Docker: `docker stats`
- Logs: `docker logs -f service-name`
- Performance: Monitor response times in logs

---

**Last Updated:** $(date)
