# Phase 3.4: Staging & Production Deployment

**Planned Start:** January 18, 2026 (after Phase 3.3)  
**Estimated Duration:** 1–2 days  
**Status:** 🔵 PENDING

---

## Overview

Establish production-ready infrastructure, execute staged deployments, and validate system performance and stability before full production release.

---

## Pre-Deployment Checklist

### Code Quality & Testing

- [ ] All unit tests passing (target: 95%+)
  - Current: 579/654 (88.5%) — Fix remaining 75 failures
- [ ] Integration tests passing (32 tests)
- [ ] Security tests passing (35 tests)
- [ ] ESLint/code quality checks passing
- [ ] No hardcoded credentials or secrets
- [ ] No console.log() or debug code in production

### Security Audit

- [ ] Dependency vulnerabilities scanned (npm audit, Snyk)
- [ ] CORS configuration reviewed and restricted
- [ ] Authentication/authorization tested
- [ ] SQL injection protection verified
- [ ] XSS protection in place (sanitization)
- [ ] CSRF tokens implemented
- [ ] Rate limiting configured
- [ ] API endpoint authorization verified
- [ ] Sensitive data encryption (passwords, tokens)
- [ ] HTTPS/TLS enforced

### Performance & Load Testing

- [ ] Response times < 500ms for 95th percentile
- [ ] Database queries optimized (indexes in place)
- [ ] Memory usage stable under load
- [ ] CPU usage < 80% under normal load
- [ ] API can handle 100+ concurrent users
- [ ] Document upload/download speed acceptable
- [ ] Pagination/bulk ops don't time out

### Accessibility & Localization

- [ ] WCAG 2.1 AA compliance verified
- [ ] Arabic RTL layout tested on all pages
- [ ] Keyboard navigation working
- [ ] Screen reader compatibility tested
- [ ] All text properly translated to Arabic
- [ ] Date/time formatting localized

### Documentation & Support

- [ ] User guide completed and published
- [ ] Admin guide completed
- [ ] API documentation complete
- [ ] Runbooks prepared
- [ ] Support contact info and escalation paths defined
- [ ] Monitoring dashboards configured
- [ ] Alert templates prepared

---

## Deployment Infrastructure Setup

### 1. **Environment Configuration**

#### Development Environment (Already Ready)

```
.env.development:
- DATABASE_URL=mongodb://localhost:27017/rehab-dev
- NODE_ENV=development
- JWT_SECRET=dev-secret
- API_PORT=3001
- REACT_APP_API_URL=http://localhost:3001
```

#### Staging Environment (To Be Created)

```
.env.staging:
- DATABASE_URL=mongodb://<staging-db>:27017/rehab-staging
- NODE_ENV=staging
- JWT_SECRET=<secure-random-32-chars>
- API_PORT=3001
- REACT_APP_API_URL=https://staging-api.rehab-system.sa
- LOG_LEVEL=info
- DB_BACKUP_ENABLED=true
- MONITORING_ENABLED=true
```

#### Production Environment (To Be Created)

```
.env.production:
- DATABASE_URL=mongodb://<prod-db-cluster>:27017/rehab-prod
- NODE_ENV=production
- JWT_SECRET=<secure-random-32-chars>
- API_PORT=3001
- REACT_APP_API_URL=https://api.rehab-system.sa
- LOG_LEVEL=warn
- DB_BACKUP_ENABLED=true
- MONITORING_ENABLED=true
- SENTRY_DSN=<error-tracking>
- DATADOG_ENABLED=true
- CERTIFICATE_PATH=/etc/ssl/certs/rehab-system.sa.crt
```

### 2. **Server & Infrastructure**

#### Option A: Docker Containerization (Recommended)

```dockerfile
# Dockerfile (Backend)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]

# Dockerfile (Frontend)
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports:
      - '27017:27017'
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  backend:
    build: ./backend
    ports:
      - '3001:3001'
    environment:
      DATABASE_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/rehab
      NODE_ENV: ${NODE_ENV}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - '80:80'
    depends_on:
      - backend
```

#### Option B: Cloud Deployment (Azure/AWS)

- **Azure App Service** for backend (Node.js)
- **Azure Static Web Apps** for frontend (React)
- **Azure Cosmos DB** for MongoDB compatibility
- **Azure Key Vault** for secrets management
- **Azure Application Insights** for monitoring

---

## CI/CD Pipeline Setup

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Staging/Production

on:
  push:
    branches:
      - staging
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install backend deps
        run: cd backend && npm ci
      - name: Run backend tests
        run: cd backend && npm test
      - name: Install frontend deps
        run: cd frontend && npm ci
      - name: Run frontend tests
        run: cd frontend && npm test
      - name: Run linter
        run: cd backend && npm run lint && cd ../frontend && npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: |
          docker build -t rehab-backend:latest ./backend
          docker build -t rehab-frontend:latest ./frontend
      - name: Push to registry
        run: |
          docker push rehab-backend:latest
          docker push rehab-frontend:latest

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    steps:
      - name: Deploy to staging
        run: |
          # Deploy to staging environment
          # Run smoke tests

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Manual approval required
        run: echo "Waiting for approval..."
      - name: Deploy to production
        run: |
          # Blue-green deployment
          # Health checks
          # Rollback capability
```

---

## Staging Environment Validation

### 1. **Health Checks**

```javascript
// GET /health
{
  status: "ok",
  timestamp: "2026-01-18T10:30:00Z",
  database: "connected",
  uptime: 3600,
  version: "1.0.0"
}
```

### 2. **Smoke Tests**

- [ ] Login/logout works
- [ ] Create vehicle succeeds
- [ ] Register patient succeeds
- [ ] Schedule session succeeds
- [ ] Upload document succeeds
- [ ] Filter documents works
- [ ] Export CSV works
- [ ] Bulk operations work
- [ ] Generate report works
- [ ] Send notification works

### 3. **Performance Tests**

- [ ] Document list loads in < 2 seconds (1000 docs)
- [ ] Filter application completes in < 500ms
- [ ] Export completes in < 5 seconds
- [ ] API responds within SLA (95th %ile < 500ms)

### 4. **Security Validation**

- [ ] All endpoints require authentication
- [ ] CORS headers correct
- [ ] No sensitive data in logs
- [ ] Rate limiting active
- [ ] SQL injection tests pass
- [ ] XSS tests pass

---

## Production Deployment Strategy

### Blue-Green Deployment (Recommended)

```
Current (Blue)           New (Green)
[Production Running]  →  [Staging Deploy]
                       ↓
                    [Run Tests]
                       ↓
                    [If OK: Switch]
                       ↓
Blue ← Standby        Green → Active
```

### Rollback Procedure

```bash
# If issues detected in production
git revert <commit>
docker build -t rehab-backend:rollback ./backend
# Re-deploy to production
```

---

## Monitoring & Alerting Setup

### 1. **Key Metrics to Monitor**

- [ ] API response times (p50, p95, p99)
- [ ] Error rate (4xx, 5xx per minute)
- [ ] Database query performance
- [ ] Server CPU/memory usage
- [ ] Network bandwidth usage
- [ ] Concurrent active users
- [ ] Database size
- [ ] Backup job status
- [ ] Authentication success/failure rate
- [ ] File upload/download success rate

### 2. **Alerting Thresholds**

- [ ] API response time > 1000ms (warning), > 2000ms (critical)
- [ ] Error rate > 5% (warning), > 10% (critical)
- [ ] CPU usage > 80% (warning), > 95% (critical)
- [ ] Memory usage > 85% (warning), > 95% (critical)
- [ ] Database replication lag > 10s (critical)
- [ ] Backup job failed (critical)

### 3. **Monitoring Tools**

- **Application Insights** (Azure) or **DataDog** for APM
- **Prometheus + Grafana** for metrics visualization
- **ELK Stack** or **Splunk** for log aggregation
- **Sentry** for error tracking
- **UptimeRobot** for uptime monitoring

---

## Database Backup & Disaster Recovery

### Backup Strategy

```
Daily Backups:
- 0:00 UTC: Full backup (retained 30 days)
- 6:00 UTC: Incremental backup (retained 7 days)
- 12:00 UTC: Incremental backup (retained 7 days)
- 18:00 UTC: Incremental backup (retained 7 days)

Recovery Time Objectives (RTO):
- RTO: < 1 hour
- RPO: < 15 minutes
```

### Restore Procedure

```bash
# List available backups
mongodump --archive=rehab-2026-01-18.archive

# Restore from backup
mongorestore --archive=rehab-2026-01-18.archive --nsInclude='*'
```

---

## Post-Deployment Validation

### Day 1: Immediate Validation

- [ ] All services responding correctly
- [ ] Users can login and access features
- [ ] DocumentList features working (filters, exports, bulk ops)
- [ ] Reports generating correctly
- [ ] No error spikes in monitoring
- [ ] Performance metrics within SLA
- [ ] Backup jobs completing successfully

### Week 1: Initial Monitoring

- [ ] Error rates stable and low
- [ ] Performance consistent
- [ ] Users reporting no major issues
- [ ] No security incidents
- [ ] Backup restoration tested successfully

### Week 2+: Optimization

- [ ] Database query optimization based on slow logs
- [ ] Cache warming strategies if needed
- [ ] User feedback incorporated
- [ ] Performance tuning based on real-world usage

---

## Rollback Decision Tree

```
System Behavior OK?
├─ YES → Continue monitoring (Success ✅)
└─ NO
    ├─ Error rate > 10%?
    │  └─ YES → Rollback immediately
    ├─ API response > 2000ms?
    │  └─ YES → Investigate; rollback if no quick fix
    ├─ Database corruption detected?
    │  └─ YES → Rollback + restore from backup
    └─ Security incident?
       └─ YES → Rollback + security investigation
```

---

## Support & Escalation

### Level 1: Monitoring Alerts

- [ ] Automated alerts to operations team
- [ ] Slack/email notifications
- [ ] Dashboard view of system health

### Level 2: On-Call Support

- [ ] On-call engineer follows runbook
- [ ] Escalate to Level 3 if unresolved in 15 min

### Level 3: Engineering Team

- [ ] Senior engineer investigates
- [ ] Code changes/patches as needed
- [ ] Post-mortem if production issue

---

## Success Criteria

✅ All health checks pass  
✅ Smoke tests 100% passing  
✅ Performance metrics within SLA  
✅ Security audit passed  
✅ Zero P1 errors in first 24 hours  
✅ User acceptance testing (UAT) approved  
✅ Backup/restore tested successfully  
✅ Monitoring/alerting configured and validated

---

## Estimated Timeline

| Task                       | Time            | Owner   |
| -------------------------- | --------------- | ------- |
| Pre-deployment checks      | 2–4 hours       | QA Team |
| Staging setup              | 4–6 hours       | DevOps  |
| CI/CD pipeline             | 4–6 hours       | DevOps  |
| Smoke tests                | 2–3 hours       | QA Team |
| Production deployment      | 1–2 hours       | DevOps  |
| Post-deployment validation | 2–4 hours       | QA Team |
| **TOTAL**                  | **15–25 hours** | —       |

**Realistic Timeline:** 1–2 full working days

---

## Post-Deployment Support

### Go-Live Support (First 48 hours)

- [ ] 24/7 on-call engineer
- [ ] Slack channel for real-time updates
- [ ] Daily health briefings
- [ ] Incident response team on standby

### Ongoing Operations (Week 1+)

- [ ] Daily performance reports
- [ ] Weekly optimization meetings
- [ ] User feedback collection
- [ ] Issue tracking and prioritization

---

## Deliverables

1. ✅ Staging environment fully operational
2. ✅ Production environment configured
3. ✅ CI/CD pipeline automated
4. ✅ Monitoring & alerting active
5. ✅ Backup & DR procedures tested
6. ✅ All tests passing in staging
7. ✅ Performance validated
8. ✅ Security audit completed
9. ✅ Runbooks prepared
10. ✅ Support team trained

---

## Notes & Recommendations

- **Gradual Rollout:** Consider 10% → 25% → 50% → 100% user rollout
- **Feature Flags:** Use feature toggles to control new features in production
- **Database Replication:** Set up read replicas for scaling
- **CDN:** Use CloudFlare or Azure CDN for static assets
- **Load Testing:** Run JMeter or Artillery with 500+ concurrent users
- **Chaos Engineering:** Test failure scenarios (db down, api down, etc.)

---

## Sign-Off Checklist

- [ ] Project Lead: All deliverables complete and tested
- [ ] QA Lead: All tests passing, security audit done
- [ ] DevOps Lead: Infrastructure ready, CI/CD functional
- [ ] Security Lead: No vulnerabilities or compliance issues
- [ ] Business Lead: UAT approved, ready for production

**Status:** Ready to proceed upon Phase 3.3 completion
