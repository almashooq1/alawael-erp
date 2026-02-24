# 🚀 Production Deployment Runbook

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** Production Ready  
**Last Updated:** February 24, 2026  

---

## 📋 Quick Links

- **Duration:** 30-45 minutes
- **Rollback Time:** 10 minutes  
- **Downtime:** ~2 minutes (with load balancer)
- **Risk Level:** Low

---

## ⏱️ Pre-Deployment (Day Before)

### Communication
- [ ] Notify team members: "Deployment scheduled for [DATE] at [TIME]"
- [ ] Check if any team members need to block time
- [ ] Verify stakeholders aware of potential 2-min downtime window

### Verification
- [ ] Run test suite: `npm test`
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Check Git status: `git status` (should be clean)
- [ ] Verify main branch: `git branch` (should be on main)
- [ ] Review recent commits: `git log --oneline -5`

### Database
- [ ] Create backup: `mongodump --uri="mongodb://..." --out=backup/`
- [ ] Test backup restoration locally
- [ ] Document any schema changes in CHANGELOG
- [ ] Prepare migration scripts if needed

### Monitoring
- [ ] Set up alerts for critical endpoints
- [ ] Prepare monitoring dashboard
- [ ] Clear old logs to free space: `docker exec mongo mongo --eval "db.logs.deleteMany({createdAt: {\$lt: new Date(Date.now() - 30*24*60*60*1000)}})"`
- [ ] Verify uptime monitoring active

---

## 🔄 Deployment Steps (Day Of)

### Phase 1: Pre-Deployment Checks (5 min)

```bash
# 1. Verify current state
cd /path/to/alawael-erp
git status
git log --oneline -1

# 2. Check running services
docker-compose ps
docker ps | grep alawael

# 3. Backup current state
docker-compose exec mongo mongodump --out=/data/backup-$(date +%s)

# 4. Note current version
echo "Current version before deployment:" > deployment.log
git describe --tags >> deployment.log
date >> deployment.log
```

### Phase 2: Code Deployment (5 min)

```bash
# 1. Pull latest code
git fetch origin
git pull origin main

# 2. Verify code integrity
git log --oneline -5
git show --stat HEAD

# 3. Check for migrations needed
ls -la backend/migrations/pending/

# 4. Build new images (async in another terminal if needed)
docker-compose build
```

### Phase 3: Database Preparation (3 min)

```bash
# 1. Run migrations (if any)
docker-compose exec backend npm run migrate:up

# 2. Seed new data if needed
docker-compose exec backend npm run seed:production

# 3. Verify database consistency
docker-compose exec mongo mongosh << EOF
use alawael
db.collection.countDocuments()
db.users.findOne()
EOF
```

### Phase 4: Service Update (3 min)

```bash
# 1. Stop services gracefully
docker-compose down --grace-time 30

# 2. Wait for graceful shutdown
sleep 5

# 3. Start new containers
docker-compose up -d

# 4. Wait for services to be ready
sleep 10

# 5. Check container status
docker-compose ps
```

### Phase 5: Health Checks (5 min)

```bash
# 1. Check service logs for errors
docker-compose logs backend | grep -i "error\|fatal" || echo "✅ No errors"

# 2. Verify API is responding
for i in {1..10}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
  if [ $status -eq 200 ]; then
    echo "✅ API health check passed"
    break
  else
    echo "⏳ Waiting for API... ($i/10)"
    sleep 2
  fi
done

# 3. Check MongoDB
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')" && echo "✅ MongoDB OK"

# 4. Check Redis
docker-compose exec redis redis-cli ping && echo "✅ Redis OK"

# 5. Test critical endpoints
curl -s http://localhost:3000/api/system/health | jq .
curl -s http://localhost:3000/api/system/metrics | jq '.cpu,.memory' | head -20
```

### Phase 6: Frontend Deployment (3 min)

```bash
# 1. Rebuild frontend
docker-compose exec frontend npm run build

# 2. Verify build
ls -lah frontend/dist/

# 3. Check for build errors
docker-compose logs frontend | grep -i "error" || echo "✅ Build successful"

# 4. Restart nginx
docker-compose restart nginx
```

### Phase 7: Smoke Testing (10 min)

```bash
# Run quick integration tests
docker-compose exec backend npm run test:smoke

# Check critical workflows
curl -X POST http://localhost:3000/api/health \
  -H "Content-Type: application/json" \
  -d '{"check": "system"}' | jq

# Verify database access
curl -s http://localhost:3000/api/system/stats | jq '.database'

# Check file uploads
curl -X POST http://localhost:3000/api/files/healthcheck \
  -F "file=@test.txt" || echo "Endpoint may not exist, continue"
```

---

## 📊 Monitoring Post-Deployment

### First 5 Minutes

```bash
# Watch logs in real-time
docker-compose logs -f backend

# Monitor errors
docker-compose logs backend | grep -i "error" | tail -20

# Check CPU/Memory
watch -n 1 'docker stats --no-stream | grep alawael'
```

### First 1 Hour

- [ ] Monitor error rate (should be < 0.1%)
- [ ] Check average response time (should be < 500ms)
- [ ] Verify database performance
- [ ] Check Redis cache hit rate
- [ ] Monitor disk space usage
- [ ] Review access logs for anomalies

### Continuous

- [ ] Monitor key metrics in dashboard
- [ ] Check Sentry for errors
- [ ] Monitor Datadog for anomalies
- [ ] Review CloudWatch logs
- [ ] Check alert status

---

## ✅ Post-Deployment Validation

### Endpoint Verification

```bash
#!/bin/bash
endpoints=(
  "/health"
  "/api/health"
  "/api/system/health"
  "/api/system/metrics"
  "/api/system/stats"
  "/api/system/routes"
  "/api/cache-stats"
)

echo "🧪 Testing $(echo ${#endpoints[@]}) endpoints..."
failed=0

for endpoint in "${endpoints[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$endpoint)
  if [ "$response" -eq 200 ] || [ "$response" -eq 201 ]; then
    echo "✅ $endpoint ($response)"
  else
    echo "❌ $endpoint ($response)"
    ((failed++))
  fi
done

if [ $failed -eq 0 ]; then
  echo "✅ All endpoints responding correctly"
else
  echo "❌ $failed endpoints failed"
fi
```

### Feature Verification

```bash
# Check feature flags
curl -s http://localhost:3000/api/system/features | jq .

# Verify key features
# Telemedicine
curl -s http://localhost:3000/api/telemedicine/health | jq .

# Supply Chain
curl -s http://localhost:3000/api/supply-chain/health | jq .

# Analytics
curl -s http://localhost:3000/api/analytics/health | jq .
```

### Database Verification

```bash
# Check MongoDB
docker-compose exec mongo mongosh << EOF
use alawael
db.stats()
db.users.count()
db.products.count()
EOF

# Check data integrity
curl -s http://localhost:3000/api/system/integrity-check | jq
```

---

## 🆘 Rollback Procedure

**If critical issues detected:**

```bash
# 1. Identify previous working version
git log --oneline | head -5

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Restore from backup
docker-compose down
mongorestore --uri="mongodb://..." < backup/

# 4. Rebuild and restart
docker-compose up --build -d

# 5. Verify rollback
docker-compose logs backend | grep "started"
curl http://localhost:3000/api/health
```

**Estimated Rollback Time:** 10-15 minutes

---

## 📝 Deployment Log Template

```
═══════════════════════════════════════════════════════════
  DEPLOYMENT LOG - ALAWAEL ERP v1.0.0
═══════════════════════════════════════════════════════════

Date: [DATE]
Time: [START TIME] - [END TIME]
Duration: [MINUTES]
Status: [✅ SUCCESS / ⚠️ WITH WARNINGS / ❌ FAILED]

Pre-Deployment
──────────────
[✓] Git status clean
[✓] Tests passing
[✓] Database backup created
[✓] Monitoring configured

Deployment
──────────
[✓] Code pulled
[✓] Database migrated
[✓] Services restarted
[✓] Health checks passed

Post-Deployment
───────────────
[✓] All endpoints responding
[✓] No errors in logs
[✓] Performance metrics normal
[✓] Monitoring active

Issues Encountered: NONE
Rollback Required: NO

Deployed By: [PERSON NAME]
Approved By: [PERSON NAME]

Notes:
- Deployment completed successfully
- All systems operational
- No issues detected

═══════════════════════════════════════════════════════════
```

---

## 🔍 Common Issues & Solutions

### Issue: Services won't start

```bash
# Check logs
docker-compose logs

# Fix: Clear old containers
docker-compose rm -f
docker system prune

# Restart
docker-compose up -d
```

### Issue: Database connection error

```bash
# Check MongoDB
docker-compose logs mongo

# Fix: Restore backup
mongorestore --uri="mongodb://..." < backup/

# Verify connection
docker-compose exec backend npm run test:db-connection
```

### Issue: High memory usage

```bash
# Check container memory
docker stats

# Fix: Restart services
docker-compose restart backend

# Monitor memory
docker-compose exec backend npm run memory:optimize
```

### Issue: Frontend not loading

```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild
docker-compose exec frontend npm run build

# Clear cache
docker-compose exec frontend rm -rf .next dist

# Restart
docker-compose restart frontend
```

---

## 📞 Escalation Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| DevOps Lead | [Name] | [Phone] | [Email] |
| Database Admin | [Name] | [Phone] | [Email] |
| Backend Lead | [Name] | [Phone] | [Email] |
| Frontend Lead | [Name] | [Phone] | [Email] |

---

## 📚 Additional Resources

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Comprehensive deployment guide
- [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) - Env variables reference
- [docs/MONITORING.md](docs/MONITORING.md) - Monitoring guide
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [README.md](README.md) - Main documentation

---

**Remember:** Safety over speed. When in doubt, consult the team or rollback!

