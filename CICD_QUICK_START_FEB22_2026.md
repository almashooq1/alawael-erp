# ⚡ CI/CD QUICK START GUIDE
## AlAwael ERP - GitHub Actions Cheat Sheet

---

## 📋 WORKFLOW REFERENCE

### test.yml - Automated Testing
**When**: Every PR and push to main/master  
**Duration**: 5-10 min  
**What it does**: Runs 928 tests

```yaml
Test Backend:       Jest (395 tests) ✅
Test Frontend:      Vitest (354 tests) ✅
Test ERP:           Jest (179 tests) ✅
Coverage Report:    Uploaded to Codecov
PR Comment:         Test summary posted
```

### code-quality.yml - Code Quality
**When**: Every PR and push  
**Duration**: 3-5 min  
**What it does**: Code style, formatting, documentation

```yaml
ESLint:             Code style checking
Prettier:           Code formatting
Complexity:         McCabe complexity < 10
JSDoc:              Documentation coverage
```

### security-scan.yml - Security Scanning
**When**: Daily at 2 AM UTC, manual trigger  
**Duration**: 5-10 min  
**What it does**: Vulnerability scanning

```yaml
npm audit:          Dependency vulnerabilities
CodeQL:             Code security analysis
TruffleHog:         Secret detection
Trivy:              Container scanning
Snyk:               Advanced vulnerability scan
```

### performance.yml - Performance Testing
**When**: Daily at 3 AM UTC, manual trigger  
**Duration**: 8-12 min  
**What it does**: Baseline + load testing

```yaml
Baseline:           Compares to 5ms baseline
Load Test:          Artillery with 20 req/sec peak
Canary:             Extended health checks
Report:             Metrics saved
```

### build.yml - Docker Build
**When**: Push to main/master  
**Duration**: 3-5 min  
**What it does**: Builds Docker image

```yaml
Build Image:        From Dockerfile
Push Registry:      ghcr.io/almashooq1/...
Tags:               Latest, version, commit SHA
Cache:              Layer caching enabled
```

### deploy-staging.yml - Staging Deploy
**When**: After successful build  
**Duration**: 5-10 min  
**What it does**: Deploys to staging, runs tests

```yaml
SSH Deploy:         Connects via SSH key
Pull Image:         Downloads new Docker image
Containers:         Restarts with docker-compose
Health Check:       Waits for /health endpoint
Smoke Tests:        Basic endpoint testing
Slack Alert:        Notifies #deployments
```

### deploy-production.yml - Production Deploy
**When**: On GitHub Release (manual)  
**Duration**: 10-15 min  
**What it does**: Blue/green deployment to production

```yaml
Blue/Green:         Zero-downtime deployment
Health Check:       60+ attempts
Canary Tests:       Sustained load testing
Smoke Tests:        Full endpoint testing
Rollback Plan:      Auto-generated instructions
Slack Alert:        Notifies team
```

---

## 🚀 HOW TO USE

### Create a Pull Request (Auto Triggers CI/CD)
```bash
git checkout -b feature/my-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature

# Go to GitHub → Create Pull Request
# Workflows automatically run
```

**What happens**:
1. ✅ test.yml runs → 928 tests
2. ✅ code-quality.yml runs → Code checks
3. ✅ security-scan.yml runs → Vulnerability scan
4. ✅ Results posted to PR as comments
5. 📋 PR blocked if any checks fail
6. 👀 Code review & approval required
7. ✅ Merge to main after approval

### Deploy to Staging (Auto on Merge)
```bash
# After PR approved and merged to main
# deploy-staging.yml triggers automatically

# Watch deployment
# Go to GitHub → Actions → deploy-staging workflow
# Wait 5-10 minutes for completion
```

**What happens**:
1. 🐳 build.yml creates Docker image
2. 📤 Pushes to GitHub Container Registry
3. 🚀 deploy-staging.yml triggers
4. 🔗 SSH connects to staging server
5. 📥 Pulls new Docker image
6. ♻️ Restarts containers
7. ✅ Health checks verify deployment
8. 🔄 Smoke tests verify functionality
9. 💬 Slack notification sent

### Deploy to Production (Manual Release)
```bash
# Method 1: GitHub UI
# Go to Releases → Create new release
# Tag: v1.2.3
# Title: Version 1.2.3
# Description: Release notes
# Click "Publish release"

# Method 2: Command line
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
```

**What happens**:
1. 📦 GitHub Release created
2. 🚀 deploy-production.yml triggers
3. 🔵🟢 Blue/Green deployment starts
4. 🆕 New environment spins up (green)
5. ✅ Health checks on new environment
6. 🧪 Canary tests run
7. 🔄 Traffic switches to new environment (green)
8. 🗑️ Old environment (blue) cleaned up
9. 💬 Slack notification with success
10. 📋 Rollback instructions available

### Manual Workflow Trigger
```bash
# Go to GitHub → Actions
# Select workflow (e.g., performance.yml)
# Click "Run workflow"
# Select branch (main)
# Click "Run workflow"

# Wait for completion and check logs
```

---

## 🔑 IMPORTANT SECRETS

**Must be configured in GitHub Secrets**:
```
PRODUCTION_SSH_KEY        ← SSH private key
STAGING_SSH_KEY          ← SSH private key
PRODUCTION_HOST          ← Server IP/domain
STAGING_HOST             ← Server IP/domain
PRODUCTION_MONGODB_URI   ← Database connection
STAGING_MONGODB_URI      ← Database connection
JWT_SECRET               ← Auth token key
ENCRYPTION_KEY           ← Data encryption
SLACK_WEBHOOK_URL        ← Slack notifications
```

**To add secrets**:
1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret

---

## ✅ CHECKLIST BEFORE MERGE

Before merging a PR:
- [ ] All tests passing (928+ tests)
- [ ] Code quality A+
- [ ] No security vulnerabilities (Critical/High)
- [ ] Performance metrics acceptable
- [ ] Code review approved
- [ ] PR linked to issue
- [ ] Commit messages clear
- [ ] Tests added for changes

---

## 🚨 DEBUGGING FAILED WORKFLOWS

### Test Failure
```bash
# 1. Go to Actions → Failed workflow
# 2. Click the job
# 3. Scroll to failed test
# 4. Read error message
# 5. Run locally: npm test
# 6. Fix and push again
```

### Build Failure
```bash
# 1. Check Dockerfile
# 2. Check dependencies in package.json
# 3. View Docker build logs
# 4. Run build locally: docker build -f Dockerfile . 
# 5. Fix and push again
```

### Deployment Failure
```bash
# 1. Go to Actions → Failed workflow
# 2. Check SSH connection
# 3. Verify secrets are correct
# 4. SSH to server manually and check
# 5. View server logs: docker logs container_name
# 6. Fix issues and retry deployment
```

### Rollback Production
```bash
# If production deploy fails
# Manual rollback available

ssh deploy@production
cd /app/66666

# Switch back to previous environment
echo blue > .current-env  # or echo green > .current-env

# Restart containers
export COMPOSE_PROJECT_NAME=blue
docker-compose -f docker-compose.unified.yml up -d

# Verify
curl https://api.alawael.com/api/v1/health
```

---

## 📊 MONITORING

### Workflow Dashboard
- Go to **Actions** tab
- See all workflow runs
- Click workflow for details
- Check duration, status, logs

### Test Coverage
- Push to: **Codecov.io**
- View at: **codecov.io/gh/almashooq1/alawael-erp**
- Monitor coverage trends

### Performance Metrics
- Saved in: **Artifacts**
- Download: performance-test-*.json
- Compare: Baseline vs current
- Expected: 5ms avg, 100% success

### Security Alerts
- GitHub's Security tab
- Dependabot alerts
- CodeQL findings
- Secret scanning

### Slack Notifications
- #deployments channel
- Real-time updates
- Success/failure notifications
- Deployment summary

---

## ⏱️ TYPICAL TIMELINE

### For a Feature Change

```
5:00 PM  Push to branch
         └─ Create PR

5:05 PM  test.yml starts
         ├─ Backend tests (2 min)
         ├─ Frontend tests (2 min)
         └─ Coverage upload (1 min)

5:10 PM  code-quality.yml starts
         ├─ Linting (2 min)
         ├─ Formatting (1 min)
         └─ Complexity (1 min)

5:15 PM  security-scan.yml starts
         ├─ npm audit (2 min)
         ├─ CodeQL (3 min)
         └─ Secret scan (2 min)

5:25 PM  All checks pass ✅
         └─ Awaiting code review

6:00 PM  Approved & merged
         └─ build.yml starts

6:05 PM  Docker image built ✅
         └─ deploy-staging.yml starts

6:10 PM  Connected to staging
         ├─ Pull image (1 min)
         ├─ Restart containers (1 min)
         ├─ Health checks (2 min)
         ├─ Smoke tests (2 min)
         └─ Slack notification mailed ✅

6:20 PM  Complete! 🎉
         └─ Ready for production release
```

---

## 🎯 PERFORMANCE OPTIMIZATION

### Faster CI/CD

1. **Reduce test time**
   - Run tests in parallel (already enabled)
   - Skip slow tests in CI with `@skip` tags
   - Cache dependencies

2. **Faster builds**
   - Docker layer caching enabled
   - Multi-stage Dockerfile
   - Skip unnecessary copies

3. **Reduce deployments**
   - Auto-deploy only on release
   - Manual approval for production
   - No auto-deploy to production

### Cost Management

```
GitHub Actions Included:
✅ 2,000 minutes/month free
✅ 500 MB storage free
✅ Private repositories

Typical Usage:
- 5 min per test run × 10 runs/day = 50 min
- 4 min per security scan × 2/day = 8 min
- 3 min per deploy × 2/day = 6 min
─────────────────────────────
Total: ~64 min/day = 1,920 min/month
✅ Well within free tier!
```

---

## 📚 DOCUMENTATION LINKS

- **GitHub Actions**: https://docs.github.com/en/actions
- **Secrets**: https://docs.github.com/en/actions/security-guides
- **Docker**: https://docs.docker.com
- **Artillery**: https://artillery.io/docs
- **CodeQL**: https://codeql.github.com

---

## 🆘 QUICK SUPPORT

**Question**: How do I trigger a workflow manually?
**Answer**: Actions tab → Select workflow → Run workflow button

**Question**: How do I see test results?
**Answer**: Actions → Click workflow run → View job logs

**Question**: How do I rollback a deployment?
**Answer**: Manual SSH to server, switch environment (blue/green)

**Question**: Why is a workflow failing?
**Answer**: Click workflow → Click job → Scroll to error

**Question**: How often do security scans run?
**Answer**: Daily at 2 AM UTC, but can trigger manually

**Question**: Can I skip a workflow?
**Answer**: Add `[skip ci]` to commit message (not recommended)

---

## 🎉 SUCCESS!

Once all workflows are running:
- ✅ Every commit automatically tested
- ✅ Code quality enforced
- ✅ Security vulnerabilities detected
- ✅ Performance tracked
- ✅ Deployments automated
- ✅ Team notified instantly
- ✅ Rollback ready if needed

**Result**: Professional CI/CD pipeline! 🚀

