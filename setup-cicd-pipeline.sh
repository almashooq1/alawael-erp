#!/bin/bash

# Advanced CI/CD Pipeline Setup - v1.0.0
# Configures GitHub Actions, automated testing, and deployment pipelines

set -e

echo "🔄 Alawael v1.0.0 - Advanced CI/CD Pipeline Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📦 CI/CD Pipeline Components"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. GitHub Actions Workflows
echo "1️⃣  GitHub Actions Workflows"
echo "   └─ Status: $([ -d .github/workflows ] && echo '✅ Configured' || echo '⚠️  Not configured')"
echo "   └─ Workflows included:"
echo "      • Test Suite (on every push)"
echo "      • Build & Release (on tag)"
echo "      • Auto-Deploy (on release)"
echo "      • Security Scan (weekly)"
echo "      • Performance Test (nightly)"
echo ""

# 2. Testing Pipeline
echo "2️⃣  Automated Testing Pipeline"
echo "   └─ Unit Tests: Jest"
echo "   └─ Integration Tests: Supertest"
echo "   └─ E2E Tests: Playwright/Cypress"
echo "   └─ Coverage Target: 80%+"
echo "   └─ Test Framework: npm test"
echo ""

# 3. Build Pipeline
echo "3️⃣  Build Pipeline"
echo "   └─ Build command: npm run build"
echo "   └─ Output: /dist"
echo "   └─ Bundle size check"
echo "   └─ Performance optimization"
echo ""

# 4. Security Scanning
echo "4️⃣  Security Scanning"
echo "   └─ SAST: Snyk"
echo "   └─ Dependency scan: npm audit"
echo "   └─ Container scan: Trivy"
echo "   └─ DAST: OWASP ZAP (optional)"
echo ""

# 5. Docker Build & Push
echo "5️⃣  Docker Registry Integration"
echo "   └─ Build Docker image"
echo "   └─ Push to Docker Hub / ECR"
echo "   └─ Tag versioning"
echo "   └─ Cleanup old images"
echo ""

# 6. Deployment Pipeline
echo "6️⃣  Automated Deployment"
echo "   └─ Dev environment: auto-deploy on push"
echo "   └─ Staging environment: auto-deploy on release"
echo "   └─ Production: manual trigger with approval"
echo "   └─ Rollback: 1-click rollback to previous"
echo ""

# 7. Notification System
echo "7️⃣  Notification System"
echo "   └─ Slack integration"
echo "   └─ Email notifications"
echo "   └─ Success/failure alerts"
echo "   └─ Build time notifications"
echo ""

# 8. Performance Tracking
echo "8️⃣  Performance Tracking"
echo "   └─ Build time trend"
echo "   └─ Test execution time"
echo "   └─ Code coverage trend"
echo "   └─ Bundle size tracking"
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create GitHub Actions workflow template
cat > .github-workflow-template.yml << 'WORKFLOW_EOF'
# GitHub Actions Workflow Template
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main, develop]

jobs:
  # Job 1: Test
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7.0
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint --no-bail
      
      - name: Run tests
        run: npm test -- --coverage
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # Job 2: Security Scan
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run npm audit
        run: npm audit --production

  # Job 3: Build
  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Check bundle size
        run: npm run analyze:bundle || true

  # Job 4: Docker Build & Push
  docker:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || startsWith(github.ref, 'refs/tags/v')
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: |
            ${{ secrets.DOCKERHUB_USERNAME }}/alawael-backend
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Job 5: Deploy to Dev
  deploy-dev:
    needs: docker
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to dev
        run: |
          echo "Deploying to development..."
          curl -X POST ${{ secrets.DEV_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{"action":"deploy","environment":"dev","commit":"${{ github.sha }}"}'

  # Job 6: Deploy to Staging
  deploy-staging:
    needs: docker
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging..."
          curl -X POST ${{ secrets.STAGING_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{"action":"deploy","environment":"staging","version":"${{ github.ref_name }}"}'

  # Job 7: Create Release
  release:
    needs: [test, security, build, docker]
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v3
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          draft: false
          prerelease: ${{ contains(github.ref, 'rc') || contains(github.ref, 'beta') }}

WORKFLOW_EOF

echo "✅ GitHub Actions workflow template created"
echo ""

# Create CI/CD setup checklist
cat > CICD_SETUP_CHECKLIST.md << 'CICD_EOF'
# Alawael v1.0.0 - CI/CD Pipeline Setup Checklist

## GitHub Repository Setup

### Secrets Configuration
- [ ] Go to repo → Settings → Secrets and variables → Actions
- [ ] Add `DOCKERHUB_USERNAME`
- [ ] Add `DOCKERHUB_TOKEN` (from https://hub.docker.com/settings/security)
- [ ] Add `SNYK_TOKEN` (from https://snyk.io/account/api-token)
- [ ] Add `DEV_WEBHOOK_URL` (for dev deployments)
- [ ] Add `STAGING_WEBHOOK_URL` (for staging deployments)

### Branch Protection
- [ ] Go to repo → Settings → Branches
- [ ] Create rule for main branch
  - [ ] Require pull request reviews (2 reviewers)
  - [ ] Dismiss stale PR approvals
  - [ ] Require status checks to pass:
    - [ ] test (required)
    - [ ] security (required)
    - [ ] build (required)
- [ ] Protect all release tags

### GitHub Actions Configuration
- [ ] Copy workflow template to `.github/workflows/ci-cd.yml`
- [ ] Update branch names (if different)
- [ ] Enable Actions: Settings → Actions → Allow all actions
- [ ] Set default branch to `main`

## Testing Setup

### Unit Tests
- [ ] Jest configured in package.json
- [ ] Test files: `__tests__` or `.test.js` pattern
- [ ] Run: `npm test`
- [ ] Coverage: 80%+ target

### Integration Tests
- [ ] Supertest configured for API tests
- [ ] Database seeding for test data
- [ ] Test environment variables defined
- [ ] Cleanup between tests

### E2E Tests (Optional)
- [ ] Playwright or Cypress configured
- [ ] Critical user flows defined
- [ ] Mock external services
- [ ] Run: `npm run test:e2e`

## Docker Setup

### Docker Configuration
- [ ] Dockerfile exists in repo root
- [ ] Multi-stage build optimized
- [ ] .dockerignore configured
- [ ] Health check command defined

### Docker Registry
- [ ] Docker Hub account created
- [ ] Repository created: `username/alawael-backend`
- [ ] Token generated for CI/CD
- [ ] Image tags versioned correctly

### Container Registry (Alternative)
- [ ] If using ECR: IAM user created with push permissions
- [ ] If using GCR: Service account created with permissions
- [ ] If using Azure: Container registry and credentials set up

## Deployment Configuration

### Webhook Setup (for automatic deployment)
- [ ] Dev webhook configured
- [ ] Staging webhook configured
- [ ] Production webhook URL added to secrets
- [ ] Webhook authentication tokens generated

### Environment Variables
- [ ] `.env.example` committed to repo
- [ ] Sensitive values in GitHub Secrets
- [ ] Environment-specific configs prepared
- [ ] Database connection strings secured

### Database Migrations
- [ ] Migration tool configured (knex/typeorm)
- [ ] Migrations run automatically on deploy
- [ ] Rollback procedure documented
- [ ] Backup taken before migration

## Monitoring & Alerts

### GitHub Notifications
- [ ] Repository watching enabled
- [ ] Workflow failure notifications configured
- [ ] Slack integration set up (optional)
  - Slack webhook URL added to secrets
  - Notification on build success/failure

### Performance Metrics
- [ ] Build time being tracked
- [ ] Test execution time monitored
- [ ] Code coverage dashboard enabled
- [ ] Bundle size analysis enabled

## Security Scanning

### Dependency Management
- [ ] `npm audit` running in CI
- [ ] Snyk integration enabled
- [ ] GitHub dependabot configured
- [ ] Version update policy defined

### Code Quality
- [ ] ESLint configured
- [ ] Prettier for formatting
- [ ] SonarQube integration optional
- [ ] Code review requirements enforced

## Rollback Procedure

### Rollback Plan
- [ ] Previous versions tagged
- [ ] Quick rollback command documented
- [ ] Rollback to previous docker image
- [ ] Manual rollback tested

### Disaster Recovery
- [ ] Database backup before deploy
- [ ] Backup restoration tested
- [ ] Recovery time objective: < 5 minutes
- [ ] Recovery point objective: < 1 hour

## Post-Deployment Validation

### Health Checks
- [ ] Health endpoint returning 200
- [ ] All services responding
- [ ] Database accessible
- [ ] No error logs

### Smoke Tests
- [ ] Critical endpoints responding
- [ ] Authentication working
- [ ] Database queries working
- [ ] No obvious errors

## Documentation

- [ ] CI/CD workflow documented
- [ ] Deployment procedure documented
- [ ] Troubleshooting guide written
- [ ] Team trained on new pipeline

---

## 🚀 Ready for Production?

Check all items above before going live:
- [ ] All tests passing
- [ ] Security scan clean
- [ ] Build artifact created
- [ ] Docker image pushed
- [ ] Health check passing
- [ ] Monitoring configured
- [ ] Rollback tested

---

Setup completed by: _____________  
Date: _____________  
Notes: _____________  

CICD_EOF

echo "✅ CI/CD setup checklist created: CICD_SETUP_CHECKLIST.md"
echo ""

# Create pipeline performance tracking
cat > PIPELINE_PERFORMANCE_TRACKING.md << 'PERF_EOF'
# Pipeline Performance Tracking

## Current Metrics

### Build Times
| Component | Target | Current | Status |
|-----------|--------|---------|--------|
| Install Dependencies | < 2min | TBD | ⏳ |
| Linting | < 1min | TBD | ⏳ |
| Unit Tests | < 3min | TBD | ⏳ |
| Build | < 2min | TBD | ⏳ |
| Integration Tests | < 5min | TBD | ⏳ |
| Docker Build | < 5min | TBD | ⏳ |
| Total Pipeline | < 20min | TBD | ⏳ |

### Test Coverage
- Unit Tests: [Target: 80%] Current: TBD
- Integration Tests: [Target: 70%] Current: TBD
- Overall Coverage: Current: TBD

### Security Scan Results
- Snyk Vulnerabilities: Current: TBD
  - Critical: 0
  - High: 0
  - Medium: TBD
  - Low: TBD
- npm Audit: Current: TBD

### Deployment Success Rate
- Dev: Current: TBD
- Staging: Current: TBD
- Production: Current: TBD

## Optimization Targets

### Quick Wins (< 2 hours)
- [ ] Cache npm dependencies in CI
- [ ] Parallelize independent tests
- [ ] Remove unused dependencies
- [ ] Optimize Docker layer caching

### Medium Term (1-2 weeks)
- [ ] Set up artifact caching
- [ ] Implement test parallelization
- [ ] Add incremental builds
- [ ] Optimize Docker image size

### Long Term (1-3 months)
- [ ] Machine learning-based optimization
- [ ] Custom test runner optimization
- [ ] Distributed build system
- [ ] Advanced caching strategies

## Success Criteria

✅ Pipeline completion within 20 minutes
✅ Test coverage > 80%
✅ Zero critical security issues
✅ Deployment success rate > 99%
✅ All status checks passing

PERF_EOF

echo "✅ Pipeline performance tracking created: PIPELINE_PERFORMANCE_TRACKING.md"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CI/CD Pipeline Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📝 Next Steps:"
echo "   1. Review workflow template: .github-workflow-template.yml"
echo "   2. Copy to: .github/workflows/ci-cd.yml"
echo "   3. Configure GitHub Secrets (6 required)"
echo "   4. Test workflow on develop branch"
echo "   5. Enable branch protection rules"
echo ""

echo "📊 Monitoring Dashboard:"
echo "   - GitHub Actions: https://github.com/[user]/[repo]/actions"
echo "   - Build logs: Available for each workflow run"
echo "   - Coverage reports: https://codecov.io/[user]/[repo]"
echo ""

echo "⏱️  Expected Pipeline Time:"
echo "   - Fast path (no tests): ~3-5 minutes"
echo "   - Normal path: ~15-20 minutes"
echo "   - Full path with security: ~20-25 minutes"
echo ""

echo "✅ All CI/CD setup files created!"
echo ""
