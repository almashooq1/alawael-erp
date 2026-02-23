#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - REPOSITORY SETUP & INTEGRATION
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Configure and integrate actual GitHub repositories
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
GITHUB_OWNER="almashooq1"
BACKEND_REPO="alawael-backend"
ERP_REPO="alawael-erp"
CONFIG_DIR=".alawael-repo-config"

################################################################################
# HELPER FUNCTIONS
################################################################################

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

create_config_dir() {
    if [ ! -d "$CONFIG_DIR" ]; then
        mkdir -p "$CONFIG_DIR"
        log_success "Created config directory: $CONFIG_DIR"
    fi
}

################################################################################
# REPOSITORY SETUP
################################################################################

setup_backend_repo() {
    log_info "Setting up backend repository..."
    
    if [ ! -d "alawael-backend" ]; then
        log_warning "Backend repository not found. Cloning..."
        git clone "https://github.com/${GITHUB_OWNER}/${BACKEND_REPO}.git"
    else
        log_info "Backend repository found. Updating..."
        cd alawael-backend
        git fetch origin
        git pull origin main
        cd ..
    fi
    
    log_success "Backend repository ready"
}

setup_erp_repo() {
    log_info "Setting up ERP repository..."
    
    if [ ! -d "alawael-erp" ]; then
        log_warning "ERP repository not found. Cloning..."
        git clone "https://github.com/${GITHUB_OWNER}/${ERP_REPO}.git"
    else
        log_info "ERP repository found. Updating..."
        cd alawael-erp
        git fetch origin
        
        # Check current branch
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        log_info "Current branch: $CURRENT_BRANCH"
        
        # Sync with main if on master
        if [ "$CURRENT_BRANCH" = "master" ]; then
            log_warning "Repository is on 'master' branch but default is 'main'"
            log_info "Checking if we should switch to 'main'..."
            
            if git show-ref --verify --quiet refs/remotes/origin/main; then
                log_info "Switching to 'main' branch..."
                git checkout main
                log_success "Switched to main branch"
            fi
        fi
        
        git pull origin main
        cd ..
    fi
    
    log_success "ERP repository ready"
}

################################################################################
# GITHUB CONFIGURATION
################################################################################

save_github_config() {
    log_info "Saving GitHub configuration..."
    
    cat > "$CONFIG_DIR/github-config.json" << 'EOF'
{
  "owner": "almashooq1",
  "repositories": {
    "backend": {
      "name": "alawael-backend",
      "branch": "main",
      "url": "https://github.com/almashooq1/alawael-backend.git",
      "description": "ALAWAEL Backend - Node.js/Express API",
      "topics": ["alawael", "backend", "nodejs", "express", "erp"]
    },
    "erp": {
      "name": "alawael-erp",
      "branch": "main",
      "url": "https://github.com/almashooq1/alawael-erp.git",
      "description": "ALAWAEL ERP System - Main Integration",
      "topics": ["alawael", "erp", "integration"]
    }
  },
  "deployment": {
    "environments": {
      "development": {
        "name": "Development",
        "branch": "develop",
        "url": "https://dev.alawael.local"
      },
      "staging": {
        "name": "Staging",
        "branch": "staging",
        "url": "https://staging.alawael.local"
      },
      "production": {
        "name": "Production",
        "branch": "main",
        "url": "https://alawael.local"
      }
    }
  }
}
EOF
    
    log_success "GitHub configuration saved to $CONFIG_DIR/github-config.json"
}

################################################################################
# ENVIRONMENT SETUP
################################################################################

create_env_files() {
    log_info "Creating environment configuration files..."
    
    # Backend .env template
    cat > "$CONFIG_DIR/.env.backend.template" << 'EOF'
# ALAWAEL Backend Environment Configuration
# Copy to backend/.env and customize

NODE_ENV=development
PORT=3000
DEBUG=alawael:*

# Database
MONGODB_URI=mongodb://localhost:27017/alawael
MONGODB_USER=alawael_user
MONGODB_PASSWORD=your_secure_password
DATABASE_NAME=alawael

# Redis (Cache/Queue)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@alawael.local

# Sentry Error Tracking
SENTRY_DSN=https://your_sentry_key@sentry.io/your_project_id
SENTRY_ENVIRONMENT=development

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=alawael-production
AWS_REGION=us-east-1

# GitHub (Integration)
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=almashooq1

# Monitoring
UPTIME_ROBOT_API_KEY=your_uptime_robot_key
DATADOG_API_KEY=your_datadog_key

# API Keys
STRIPE_SECRET_KEY=your_stripe_secret
PAYPAL_CLIENT_ID=your_paypal_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# Features
ENABLE_MONITORING=true
ENABLE_BACKUP=true
ENABLE_SCALING=true
ENABLE_SECURITY_HEADERS=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF
    
    # ERP .env template
    cat > "$CONFIG_DIR/.env.erp.template" << 'EOF'
# ALAWAEL ERP System Environment Configuration
# Copy to erp_new_system/.env and customize

NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/alawael-erp
DATABASE_NAME=alawael-erp

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENVIRONMENT=development

# Security
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
SECURE_COOKIES=false

# Features
FEATURES_ADVANCED_ANALYTICS=true
FEATURES_CIVIL_DEFENSE=false
FEATURES_SMS_NOTIFICATIONS=true
FEATURES_BACKUP_MANAGEMENT=true
EOF
    
    log_success "Environment template files created"
}

################################################################################
# DEPENDENCY SETUP
################################################################################

install_dependencies() {
    log_info "Installing dependencies..."
    
    # Backend dependencies
    if [ -d "alawael-backend" ]; then
        log_info "Installing backend dependencies..."
        cd alawael-backend
        npm install 2>/dev/null || log_warning "Some backend dependencies failed"
        cd ..
        log_success "Backend dependencies installed"
    fi
    
    # ERP dependencies
    if [ -d "alawael-erp" ]; then
        log_info "Installing ERP dependencies..."
        cd alawael-erp
        npm install 2>/dev/null || log_warning "Some ERP dependencies failed"
        cd ..
        log_success "ERP dependencies installed"
    fi
}

################################################################################
# GITHUB SECRETS & VARIABLES
################################################################################

save_github_secrets_guide() {
    log_info "Creating GitHub secrets configuration guide..."
    
    cat > "$CONFIG_DIR/GITHUB_SECRETS_SETUP.md" << 'EOF'
# GitHub Secrets & Variables Setup

## Required Secrets for Actions

Add these secrets to each repository (Settings → Secrets):

### Backend Repository (alawael-backend)

```
MONGODB_URI          = mongodb+srv://user:password@cluster.mongodb.net/DB
MONGODB_PASSWORD     = your_secure_password
JWT_SECRET          = your_jwt_secret_key_here
SENTRY_DSN          = https://key@sentry.io/project_id
AWS_ACCESS_KEY_ID   = your_aws_key
AWS_SECRET_ACCESS_KEY = your_aws_secret
DOCKER_USERNAME     = your_docker_hub_username
DOCKER_PASSWORD     = your_docker_hub_token
HEROKU_API_KEY      = your_heroku_api_key (optional)
SLACK_WEBHOOK       = your_slack_webhook_url
EMAIL_PASSWORD      = your_email_app_password
```

### ERP Repository (alawael-erp)

```
MONGODB_URI         = mongodb+srv://user:password@cluster.mongodb.net/DB
REACT_APP_API_URL   = https://api.alawael.local
SENTRY_DSN          = https://key@sentry.io/project_id
AWS_ACCESS_KEY_ID   = your_aws_key
AWS_SECRET_ACCESS_KEY = your_aws_secret
DOCKER_USERNAME     = your_docker_hub_username
DOCKER_PASSWORD     = your_docker_hub_token
```

## Required Variables (Settings → Variables)

These can be public:

```
NODE_ENV            = production
DEBUG               = alawael:*
LOG_LEVEL           = info
GITHUB_OWNER        = almashooq1
```

## Setup Steps

1. Go to Repository Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each secret name and value
5. Click "Add secret"

## Verification

After adding secrets:
```bash
git push origin main
# GitHub Actions should now access secrets automatically
```

## Security Best Practices

- ✅ Use unique, strong passwords for each environment
- ✅ Rotate secrets every 90 days
- ✅ Never commit actual secrets to any branch
- ✅ Use separate secrets for dev/staging/prod
- ✅ Audit secret access in Actions logs
- ✅ Use GitHub's secret scanning
- ✅ Consider using GitHub's environment secrets

EOF
    
    log_success "GitHub secrets guide created"
}

################################################################################
# BRANCH MANAGEMENT
################################################################################

setup_branch_protection() {
    log_info "Creating branch protection configuration..."
    
    cat > "$CONFIG_DIR/branch-protection-rules.json" << 'EOF'
{
  "rules": [
    {
      "branch": "main",
      "protection": {
        "required_status_checks": {
          "strict": true,
          "contexts": ["Test Suite", "Security Scan", "Build", "Docker Build"]
        },
        "required_pull_request_reviews": {
          "dismiss_stale_reviews": true,
          "require_code_owner_reviews": true,
          "required_approving_review_count": 2
        },
        "dismiss_stale_pull_request_approvals": true,
        "require_status_checks_to_pass_before_merging": true,
        "require_branches_to_be_up_to_date_before_merging": true,
        "require_conversation_resolution_before_merging": true,
        "require_signed_commits": false,
        "block_creations": false,
        "block_deletions": false,
        "allow_force_pushes": false,
        "allow_deletions": false
      }
    },
    {
      "branch": "develop",
      "protection": {
        "required_status_checks": {
          "strict": true,
          "contexts": ["Test Suite", "Build"]
        },
        "required_pull_request_reviews": {
          "dismiss_stale_reviews": true,
          "required_approving_review_count": 1
        }
      }
    }
  ]
}
EOF
    
    log_success "Branch protection rules configured"
}

################################################################################
# REPOSITORY HEALTH CHECK
################################################################################

check_repository_health() {
    log_info "Checking repository health..."
    
    echo ""
    echo -e "${BLUE}=== REPOSITORY STATUS ===${NC}"
    echo ""
    
    # Backend status
    if [ -d "alawael-backend" ]; then
        echo -e "${CYAN}Backend Repository:${NC}"
        cd alawael-backend
        BACKEND_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        BACKEND_COMMITS=$(git rev-list --count HEAD)
        BACKEND_FILES=$(find . -type f -name "*.js" -o -name "*.json" | wc -l)
        echo "  ├─ Current Branch: $BACKEND_BRANCH"
        echo "  ├─ Total Commits: $BACKEND_COMMITS"
        echo "  ├─ Code Files: $BACKEND_FILES"
        
        if [ -f "package.json" ]; then
            echo "  ├─ package.json: ✓"
            NPM_PACKAGES=$(grep -c '"dependencies"' package.json || echo "0")
            echo "  └─ Dependencies: $(jq '.dependencies | length' package.json) packages"
        fi
        cd ..
        echo ""
    fi
    
    # ERP status
    if [ -d "alawael-erp" ]; then
        echo -e "${CYAN}ERP Repository:${NC}"
        cd alawael-erp
        ERP_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        ERP_COMMITS=$(git rev-list --count HEAD)
        ERP_FILES=$(find . -type f -name "*.js" -o -name "*.jsx" -o -name "*.json" | wc -l)
        echo "  ├─ Current Branch: $ERP_BRANCH"
        echo "  ├─ Total Commits: $ERP_COMMITS"
        echo "  ├─ Code Files: $ERP_FILES"
        
        if [ -f "package.json" ]; then
            echo "  ├─ package.json: ✓"
            echo "  └─ Dependencies: $(jq '.dependencies | length' package.json) packages"
        fi
        cd ..
        echo ""
    fi
    
    echo -e "${GREEN}Repository health check complete${NC}"
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ALAWAEL v1.0.0 - REPOSITORY SETUP & INTEGRATION          ║${NC}"
    echo -e "${BLUE}║   Configuration for GitHub Repositories                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Create config directory
    create_config_dir
    echo ""
    
    # Setup repositories
    log_info "Initializing repositories..."
    setup_backend_repo
    echo ""
    setup_erp_repo
    echo ""
    
    # Save configurations
    save_github_config
    create_env_files
    save_github_secrets_guide
    setup_branch_protection
    echo ""
    
    # Install dependencies
    log_warning "NOTE: Dependency installation is optional"
    read -p "Install dependencies now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_dependencies
        echo ""
    fi
    
    # Check health
    check_repository_health
    
    # Summary
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ REPOSITORY SETUP COMPLETE${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Next Steps:"
    echo "  1. Review configuration: cat $CONFIG_DIR/github-config.json"
    echo "  2. Setup GitHub secrets: cat $CONFIG_DIR/GITHUB_SECRETS_SETUP.md"
    echo "  3. Add environment files:"
    echo "     └─ cp $CONFIG_DIR/.env.backend.template alawael-backend/.env"
    echo "     └─ cp $CONFIG_DIR/.env.erp.template alawael-erp/.env"
    echo "  4. Update .env files with your credentials"
    echo "  5. Run: ./github-integration.sh (to setup Actions)"
    echo ""
    echo "Configuration saved to: $CONFIG_DIR/"
    echo ""
}

# Run main function
main "$@"
