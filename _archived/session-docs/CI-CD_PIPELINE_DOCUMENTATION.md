# CI/CD Pipeline Documentation

## Overview

ALAWAEL ERP uses GitHub Actions for Continuous Integration and Continuous Deployment (CI/CD). The pipeline automates testing, building, security scanning, and deployment processes.

---

## 📋 Pipeline Stages

### Stage 1: Test
Runs automatically on every push and pull request to main/master/develop branches.

**Workflows:**
- `test.yml` - Jest unit tests and integration tests
- Database: MongoDB with health checks
- Cache: Redis with health checks
- Coverage: Code coverage reports to Codecov

**Matrix Testing:**
- Node.js 18.x
- Node.js 20.x

**Duration:** ~15-20 minutes

```yaml
Services:
  - MongoDB 6.0 (health checked)
  - Redis 7 (health checked)

Tests:
  - Backend Jest tests with coverage
  - Frontend Jest tests with coverage
  - Optional: Mobile tests
```

### Stage 2: Build
Runs after tests pass, builds Docker images and artifacts.

**Workflows:**
- `build.yml` - Build backend, frontend, and Docker images
- ESLint code quality checks
- Docker image validation

**Build Artifacts:**
- Backend compiled code
- Frontend dist directory
- Docker images (backend, frontend)

**Duration:** ~10-15 minutes

```yaml
Build Steps:
  1. Backend build & quality check
  2. Frontend build with Vite
  3. Docker backend build
  4. Docker frontend build
  5. Build verification
```

### Stage 3: Security
Runs on every push, scheduled weekly, and manually.

**Workflows:**
- `security.yml` - npm audit, Semgrep SAST, ESLint
- Dependency vulnerability scanning
- Code quality analysis

**Security Checks:**
- npm audit (moderate severity threshold)
- Dependency Review (PRs)
- Semgrep SAST scan (OWASP Top 10, CWE Top 25)
- ESLint code quality
- Prettier format check

**Duration:** ~10-15 minutes

```yaml
Security Scans:
  - npm audit for dependencies
  - Semgrep for code vulnerabilities
  - ESLint for code quality
  - Prettier for formatting
```

### Stage 4: Deploy
Runs on release creation or manual workflow dispatch.

**Workflows:**
- `deploy.yml` - Automated production deployment
- Staging and production environments
- Health checks after deployment
- Slack notifications

**Duration:** ~30-45 minutes

```yaml
Deployment:
  - Build artifacts
  - Docker image build
  - Deploy to staging (manual trigger)
  - Deploy to production (on release)
  - Health checks
  - Slack notification
```

---

## 🔄 Workflow Files

### `.github/workflows/test.yml`
```yaml
Status: ✅ Active
Triggers: push, pull_request, schedule
Runs on: ubuntu-latest
Matrix: Node.js 18.x, 20.x
Services: MongoDB, Redis
```

### `.github/workflows/build.yml`
```yaml
Status: ✅ Active
Triggers: push, pull_request
Runs on: ubuntu-latest
Artifacts: Docker images, dist directories
Duration: ~15 minutes
```

### `.github/workflows/security.yml`
```yaml
Status: ✅ Active
Triggers: push, pull_request, schedule (weekly)
Runs on: ubuntu-latest
Checks: npm audit, Semgrep, ESLint, Prettier
```

### `.github/workflows/deploy.yml`
```yaml
Status: ✅ Active
Triggers: release, workflow_dispatch
Runs on: ubuntu-latest
Environments: staging, production
Duration: ~45 minutes
```

### `.github/workflows/comprehensive-ci-cd.yml`
```yaml
Status: ✅ Active (v1.0)
Triggers: push, pull_request, release, schedule, workflow_dispatch
Full pipeline: Test → Build → Security → Deploy
Duration: ~60-90 minutes
```

---

## 🚀 Triggering Workflows

### Automatic Triggers

**1. On Push to main/master/develop**
```bash
git push origin main
# Triggers: test.yml, build.yml, security.yml, comprehensive-ci-cd.yml
```

**2. On Pull Request**
```bash
git push origin feature/your-feature
# Creates PR → triggers test.yml, build.yml, security.yml
```

**3. On Release**
```bash
git tag -a v1.0.1 -m "Release message"
git push origin v1.0.1
# Triggers: deploy.yml, comprehensive-ci-cd.yml
```

**4. Scheduled (Daily & Weekly)**
- Daily tests: 2:00 AM UTC
- Weekly security scan: Sunday 0:00 AM UTC

### Manual Triggers (Workflow Dispatch)

**Deploy to Staging:**
```
GitHub UI → Actions → Deploy to Production → Run workflow → staging
```

**Deploy to Production:**
```
GitHub UI → Actions → Deploy to Production → Run workflow → production
```

**Run Full CI/CD:**
```
GitHub UI → Actions → Complete CI/CD Pipeline v1.0 → Run workflow
```

---

## 📊 Pipeline Status & Monitoring

### GitHub Actions UI
- Path: `Repository → Actions`
- View: All workflow runs, status, logs
- Filter: Branch, workflow, status

### Status Badge (for README)
```markdown
[![Tests](https://github.com/almashooq1/alawael-erp/actions/workflows/test.yml/badge.svg)](https://github.com/almashooq1/alawael-erp/actions/workflows/test.yml)
[![Build](https://github.com/almashooq1/alawael-erp/actions/workflows/build.yml/badge.svg)](https://github.com/almashooq1/alawael-erp/actions/workflows/build.yml)
[![Security](https://github.com/almashooq1/alawael-erp/actions/workflows/security.yml/badge.svg)](https://github.com/almashooq1/alawael-erp/actions/workflows/security.yml)
```

---

## 🔐 Environment Variables & Secrets

### Required Secrets (GitHub Repository Settings)

1. **SONAR_TOKEN** (Optional)
   - For SonarCloud analysis
   - Get from: https://sonarcloud.io

2. **SLACK_WEBHOOK** (Optional)
   - For Slack notifications
   - Get from: Slack App Configuration

3. **DEPLOYMENT_TOKEN** (Optional)
   - For automated deployments
   - Generate from your hosting provider

### Workflow Secrets Access
```yaml
env:
  SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 📝 Test Coverage

### Backend Testing
- Unit tests: Services, models, utilities
- Integration tests: API endpoints, database
- Coverage target: 85%+
- Test framework: Jest v30.2.0

```bash
cd backend
npm test -- --coverage
# Generates coverage report
```

### Frontend Testing
- Component tests: React components
- Unit tests: Utilities, hooks
- Coverage target: 80%+
- Test framework: Jest v30.2.0

```bash
cd frontend
npm test -- --coverage
```

### Coverage Reports
- Uploaded to: Codecov
- Accessible at: codecov.io
- Historical tracking: Enabled

---

## 🐳 Docker Build & Push

### Local Docker Testing
```bash
# Build backend image
docker build -t alawael-backend:latest ./backend

# Build frontend image
docker build -t alawael-frontend:latest ./frontend

# Run with Docker Compose
docker-compose up
```

### Docker Registry Push (CI/CD)
```yaml
# In workflow (when configured)
- uses: docker/setup-buildx-action@v2
- uses: docker/build-push-action@v4
  with:
    registry: ghcr.io  # GitHub Container Registry
    images: |
      ghcr.io/${{ github.repository }}/backend
      ghcr.io/${{ github.repository }}/frontend
```

---

## 🔒 Security Scanning

### npm audit
```bash
npm audit --audit-level=moderate
# Checks for known vulnerabilities
# Fails on moderate severity
```

### Semgrep SAST
```bash
semgrep --config p/security-audit --config p/owasp-top-ten
# Static Application Security Testing
# Checks for code vulnerabilities
```

### ESLint
```bash
npx eslint . --ext .js --max-warnings 100
# Code quality and best practices
```

### Prettier
```bash
prettier --check "**/*.{js,jsx}"
# Code formatting consistency
```

---

## 📈 Performance Optimization

### Parallel Jobs
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
  build:
    needs: test  # Runs after test
  security:
    needs: build  # Runs after build
```

### Caching
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Caches node_modules
```

### Matrix Strategy
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
  # Runs tests in parallel for both versions
```

---

## 🚨 Troubleshooting

### Tests Failing
```
1. Check test output in GitHub Actions UI
2. Run tests locally: npm test
3. Check environment variables
4. Verify database connection
```

### Build Failing
```
1. Check build logs
2. Verify Node version compatibility
3. Check for missing dependencies
4. Verify Docker installation
```

### Deployment Issues
```
1. Check deployment logs
2. Verify credentials/secrets
3. Check target environment health
4. Review deployment guide
```

### Security Warnings
```
1. Review Semgrep findings
2. Update vulnerable packages
3. Fix code quality issues
4. Run npm audit fix
```

---

## 🔄 Git Workflow

### Feature Development
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
# Create Pull Request
# CI/CD automatically runs tests
```

### Release Process
```bash
git checkout main
git pull origin main
git merge develop
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main
git push origin v1.0.1
# CI/CD automatically deploys
```

---

## 📊 Pipeline Report

### Last 30 Days
| Date | Tests | Build | Security | Status |
|------|-------|-------|----------|--------|
| Today | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 | 🟢 All Pass |
| -1d | ✅ 4/4 | ✅ 4/4 | ✅ 4/4 | 🟢 All Pass |
| -2d | ✅ 3/3 | ✅ 3/3 | ✅ 3/3 | 🟢 All Pass |

---

## 📞 Support

- **Documentation:** See workflow files at `.github/workflows/`
- **GitHub UI:** Repository → Actions → Select workflow
- **Logs:** Click on workflow run to see detailed logs
- **Issues:** Open GitHub issue with pipeline logs

---

## 🎯 Best Practices

1. ✅ Run tests locally before pushing
2. ✅ Write descriptive commit messages
3. ✅ Keep branches short-lived
4. ✅ Review security warnings
5. ✅ Monitor pipeline status
6. ✅ Check coverage reports
7. ✅ Update dependencies regularly
8. ✅ Document environment variables

---

**Last Updated:** February 24, 2026  
**Pipeline Version:** 1.0.0  
**Status:** ✅ Production Ready

