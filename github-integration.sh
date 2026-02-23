#!/bin/bash

# ALAWAEL v1.0.0 - Complete GitHub Integration & Automation
# Integrates alawael-backend and alawael-erp with full CI/CD

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🐙 ALAWAEL v1.0.0 - GitHub Integration & Automation       ║"
echo "║     Complete Repository Setup & CI/CD Configuration        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log_info() { echo -e "${BLUE}ℹ️ ${1}${NC}"; }
log_success() { echo -e "${GREEN}✅ ${1}${NC}"; }
log_error() { echo -e "${RED}❌ ${1}${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  ${1}${NC}"; }

# Check for git
if ! command -v git &> /dev/null; then
    log_error "Git is not installed"
    exit 1
fi

log_success "Git found: $(git --version)"
echo ""

# GitHub Integration for Backend
integrate_backend_repo() {
    log_info "════════════════════════════════════════════════"
    log_info "Integrating alawael-backend repository"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    local backend_path="$SCRIPT_DIR/backend"
    
    if [[ ! -d "$backend_path" ]]; then
        log_error "Backend directory not found at $backend_path"
        
        read -p "Enter backend repository path (or press Enter to skip): " custom_path
        if [[ -z "$custom_path" ]]; then
            log_warning "Backend integration skipped"
            return 1
        fi
        backend_path="$custom_path"
    fi
    
    if [[ ! -d "$backend_path/.git" ]]; then
        log_warning "Backend not yet a git repository"
        read -p "Initialize Repository? (y/n): " init
        if [[ "$init" == "y" ]]; then
            cd "$backend_path"
            git init
            git remote add origin https://github.com/almashooq1/alawael-backend.git
            log_success "Repository initialized"
            cd "$SCRIPT_DIR"
        fi
    fi
    
    # Add GitHub Actions workflow
    local workflow_dir="$backend_path/.github/workflows"
    mkdir -p "$workflow_dir"
    
    cat > "$workflow_dir/ci-cd.yml" << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  release:
    types: [ published ]

jobs:
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
        image: redis:7
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
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run linter
      run: npm run lint --if-present
    
    - name: Run tests
      run: npm test
      env:
        MONGODB_URI: mongodb://localhost:27017/test
        REDIS_URL: redis://localhost:6379
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      if: always()

  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      continue-on-error: true
    
    - name: npm audit
      run: npm audit --audit-level=moderate
      continue-on-error: true

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install
    
    - name: Build application
      run: npm run build --if-present
    
    - name: Analyze bundle
      run: npm run analyze --if-present
      continue-on-error: true
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-output
        path: dist/
      if: always()

  docker:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Build Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: false
        tags: alawael-backend:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy-dev:
    needs: docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to development
      run: |
        echo "Deploying to development environment..."
        # Add deployment commands here

  deploy-staging:
    needs: docker
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment..."
        # Add deployment commands here

  release:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')
    
    permissions:
      contents: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Create GitHub Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        body: |
          ### Changes in this Release
          - See commit history for details
          - Automated release created by CI/CD pipeline
        draft: false
        prerelease: false
EOF
    
    log_success "GitHub Actions workflow created"
    
    # Add status badges
    if [[ ! -f "$backend_path/README.md" ]]; then
        cat > "$backend_path/README.md" << 'EOF'
# Alawael Backend v1.0.0

![CI/CD Pipeline](https://github.com/almashooq1/alawael-backend/actions/workflows/ci-cd.yml/badge.svg)
[![codecov](https://codecov.io/gh/almashooq1/alawael-backend/branch/main/graph/badge.svg)](https://codecov.io/gh/almashooq1/alawael-backend)

Production-ready backend system with comprehensive CI/CD, monitoring, disaster recovery, and security.

## Quick Start

```bash
npm install
npm start
```

## Documentation

- [Setup Guide](docs/SETUP.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOY.md)
EOF
    fi
    
    log_success "Backend repository configured"
    echo ""
}

# GitHub Integration for ERP
integrate_erp_repo() {
    log_info "════════════════════════════════════════════════"
    log_info "Integrating alawael-erp repository"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    local erp_path="$SCRIPT_DIR/erp_new_system"
    
    if [[ ! -d "$erp_path" ]]; then
        log_error "ERP directory not found at $erp_path"
        
        read -p "Enter ERP repository path (or press Enter to skip): " custom_path
        if [[ -z "$custom_path" ]]; then
            log_warning "ERP integration skipped"
            return 1
        fi
        erp_path="$custom_path"
    fi
    
    if [[ ! -d "$erp_path/.git" ]]; then
        log_warning "ERP not yet a git repository"
        read -p "Initialize Repository? (y/n): " init
        if [[ "$init" == "y" ]]; then
            cd "$erp_path"
            git init
            git remote add origin https://github.com/almashooq1/alawael-erp.git
            log_success "ERP repository initialized"
            cd "$SCRIPT_DIR"
        fi
    fi
    
    # Add GitHub Actions workflow
    local workflow_dir="$erp_path/.github/workflows"
    mkdir -p "$workflow_dir"
    
    cat > "$workflow_dir/ci-cd.yml" << 'EOF'
name: ERP CI/CD Pipeline

on:
  push:
    branches: [ master, develop ]
  pull_request:
    branches: [ master, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install frontend dependencies
      run: cd frontend && npm install
    
    - name: Install backend dependencies
      run: cd backend && npm install
    
    - name: Test frontend
      run: cd frontend && npm test -- --passWithNoTests
    
    - name: Test backend
      run: cd backend && npm test

  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Snyk scan
      uses: snyk/actions/docker@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      continue-on-error: true

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Build frontend
      run: cd frontend && npm run build
    
    - name: Build backend
      run: cd backend && npm run build --if-present
EOF
    
    log_success "GitHub Actions workflow created"
    log_success "ERP repository configured"
    echo ""
}

# Create deployment instructions
create_deployment_guide() {
    log_info "═════════════════════════════════════════════════"
    log_info "Creating GitHub Integration Guide"
    log_info "═════════════════════════════════════════════════"
    echo ""
    
    local guide_file="$SCRIPT_DIR/GITHUB_INTEGRATION_GUIDE.md"
    
    cat > "$guide_file" << 'EOF'
# GitHub Integration & Deployment Guide

## Prerequisites

1. GitHub account with access to:
   - almashooq1/alawael-backend
   - almashooq1/alawael-erp

2. Local setup complete with:
   - Node.js 18+
   - Git configured with correct credentials
   - SSH keys configured (optional but recommended)

## Integration Steps

### 1. Clone Repositories

```bash
# Clone backend
git clone https://github.com/almashooq1/alawael-backend.git
cd alawael-backend

# Clone ERP
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp
```

### 2. Configure Git

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set upstream to track main/master
git remote set-url origin https://github.com/almashooq1/alawael-backend.git
```

### 3. Set Up GitHub Secrets (for CI/CD)

In GitHub repository settings, add these secrets:

- `SNYK_TOKEN` - Snyk security scanning token
- `CODECOV_TOKEN` - Code coverage token
- `DOCKER_USERNAME` - Docker Hub username (if using Docker Hub)
- `DOCKER_PASSWORD` - Docker Hub password

### 4. Configure Branch Protection Rules

In Repository Settings → Branches:

**Main/Master Branch:**
- ✅ Require pull request reviews (2 reviews)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date

**Status Checks Required:**
- test
- security
- build

### 5. Enable GitHub Actions

- Repository Settings → Actions → Allow all actions

### 6. Create Deployment Branches

```bash
# Development branch
git checkout -b develop
git push origin develop

# Set default branch to main/master
# In GitHub: Settings → Default branch → select main/master
```

## CI/CD Workflow

### Branching Strategy (Git Flow)

```
main/master (production)
    ↑
    |-- release/* (RC versions)
    |       ↓
develop (staging)
    ↑
    |-- feature/* (feature branches)
    |-- bugfix/*
    |-- hotfix/*
```

### Commit Messages

Follow conventional commits format:

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add/update tests
chore: Maintenance tasks
ci: CI/CD changes
```

Example:
```
feat(auth): Add JWT token refresh endpoint
```

### Pull Request Process

1. Create feature branch from develop:
   ```bash
   git checkout -b feature/my-feature develop
   ```

2. Make changes and commit:
   ```bash
   git commit -m "feat: Description of feature"
   ```

3. Push to GitHub:
   ```bash
   git push origin feature/my-feature
   ```

4. Create Pull Request:
   - Base: develop
   - Compare: feature/my-feature
   - Add description and link issues

5. CI checks run automatically:
   - Tests must pass
   - Security scan must pass
   - Code review approved

6. Merge to develop

### Release Process

1. Create release branch from develop:
   ```bash
   git checkout -b release/v1.1.0 develop
   ```

2. Update version in package.json:
   ```json
   {
     "version": "1.1.0"
   }
   ```

3. Create Pull Request:
   - Base: main/master
   - Compare: release/v1.1.0

4. Merge and create GitHub Release:
   - Tag: v1.1.0
   - Release notes with changelog

5. Back-merge to develop:
   ```bash
   git checkout develop
   git merge release/v1.1.0
   git push origin develop
   ```

### Hotfix Process (for production bugs)

1. Create hotfix branch from main:
   ```bash
   git checkout -b hotfix/v1.0.1 main
   ```

2. Fix the issue

3. Merge to main and develop:
   ```bash
   git checkout main
   git merge hotfix/v1.0.1
   
   git checkout develop
   git merge hotfix/v1.0.1
   ```

## Monitoring CI/CD

### GitHub Actions Dashboard

1. Go to: Repository → Actions
2. View latest workflow runs
3. Click on failed jobs to see logs

### Status Checks

- ✅ All checks must pass before merging
- View check results in Pull Request

### Security Scanning

- Snyk results available in:
  - Pull Request checks
  - Code tab (security)
  - GitHub Security Alert tab

### Code Coverage

- Codecov badge in README
- Coverage report in Pull Request

## Troubleshooting

### Failed Tests

```bash
# Run tests locally before pushing
npm test

# View GitHub Actions logs for details
```

### Failed Security Scan

1. Review Snyk report in GitHub
2. Fix vulnerabilities locally
3. Push fix to trigger re-scan

### Merge Conflicts

```bash
# Update feature branch with develop
git checkout feature/my-feature
git fetch origin
git rebase origin/develop

# Resolve conflicts
# Force push (only on feature branches)
git push origin feature/my-feature -f
```

## Best Practices

1. **Keep branches up to date:** Rebase on develop regularly
2. **Small PRs:** Easier to review and test
3. **Meaningful commits:** Follow conventional commits
4. **Local testing:** Run tests before pushing
5. **Descriptive messages:** Clear PR descriptions
6. **Code review:** Always get approval from team leads
7. **Monitor CI:** Check GitHub Actions for issues

## Next Steps

1. Integrate with project management (GitHub Projects)
2. Set up automated deployment (GitHub Actions → AWS/Azure/GCP)
3. Configure branch auto-deployment
4. Set up monitoring and alerts
5. Create team-specific workflows

EOF
    
    log_success "Guide created: GITHUB_INTEGRATION_GUIDE.md"
    echo ""
}

# Create GitHub Actions status checker
create_status_dashboard() {
    log_info "════════════════════════════════════════════════"
    log_info "Creating GitHub Status Monitoring Script"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    local status_script="$SCRIPT_DIR/check-github-status.sh"
    
    cat > "$status_script" << 'EOF'
#!/bin/bash

# GitHub Repository Status Checker
# Shows real-time status of GitHub Actions and PR checks

if ! command -v curl &> /dev/null; then
    echo "curl not found"
    exit 1
fi

OWNER="almashooq1"
BACKEND_REPO="alawael-backend"
ERP_REPO="alawael-erp"

echo "═══════════════════════════════════════════════════"
echo "🐙 GitHub Repository Status"
echo "═══════════════════════════════════════════════════"
echo ""

# Function to check workflow status
check_workflow_status() {
    local repo=$1
    local owner=$2
    
    echo "Repository: $owner/$repo"
    
    # Get latest workflow runs
    local response=$(curl -s "https://api.github.com/repos/$owner/$repo/actions/runs?per_page=5")
    
    echo "$response" | grep -o '"name":"[^"]*"' | head -5
    echo ""
}

echo "Checking Backend Repository..."
check_workflow_status "$BACKEND_REPO" "$OWNER"

echo "Checking ERP Repository..."
check_workflow_status "$ERP_REPO" "$OWNER"

echo "For detailed status, visit:"
echo "  Backend: https://github.com/$OWNER/$BACKEND_REPO/actions"
echo "  ERP: https://github.com/$OWNER/$ERP_REPO/actions"
EOF
    
    chmod +x "$status_script"
    log_success "Status script created: check-github-status.sh"
    echo ""
}

# Create .gitignore files
create_gitignore() {
    log_info "════════════════════════════════════════════════"
    log_info "Creating .gitignore Files"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    # Backend .gitignore
    cat > "$SCRIPT_DIR/.gitignore" << 'EOF'
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
.DS_Store?

# Testing
coverage/
.nyc_output/

# Temp files
*.tmp
temp/

# Docker
docker-compose.override.yml
EOF
    
    log_success ".gitignore created"
    echo ""
}

# Main installation
main() {
    echo ""
    log_info "Starting GitHub Integration Setup..."
    echo ""
    
    integrate_backend_repo
    integrate_erp_repo
    create_deployment_guide
    create_status_dashboard
    create_gitignore
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  GitHub Integration Complete! ✅                           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    log_success "Integration Summary:"
    echo "  ✅ GitHub Actions workflows configured"
    echo "  ✅ CI/CD pipelines created"
    echo "  ✅ Deployment guides created"
    echo "  ✅ Status monitoring script ready"
    echo ""
    
    log_info "Next Steps:"
    echo "  1. Push changes to GitHub:"
    echo "     \$ git add -A"
    echo "     \$ git commit -m 'ci: add github actions ci/cd'"
    echo "     \$ git push origin main"
    echo ""
    echo "  2. Configure branch protection rules in GitHub"
    echo "  3. Add secrets in GitHub Settings"
    echo "  4. View pipelines at:"
    echo "     - https://github.com/almashooq1/alawael-backend/actions"
    echo "     - https://github.com/almashooq1/alawael-erp/actions"
    echo ""
}

main "$@"
