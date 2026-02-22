#!/bin/bash

################################################################################
# ALAWAEL GitHub Configuration Script
# Purpose: Configure GitHub repositories for ALAWAEL deployment
# Status: Ready for execution
# Date: February 22, 2026
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_OWNER="${1:-almashooq1}"
BACKEND_REPO="${2:-alawael-backend}"
ERP_OWNER="${3:-almashooq1}"
ERP_REPO="${4:-alawael-erp}"

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  INFO${NC}: $1"; }
log_success() { echo -e "${GREEN}✅ SUCCESS${NC}: $1"; }
log_warning() { echo -e "${YELLOW}⚠️  WARNING${NC}: $1"; }
log_error() { echo -e "${RED}❌ ERROR${NC}: $1"; }

################################################################################
# PHASE 1: VALIDATE GitHub CLI
################################################################################

validate_github_cli() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 1: VALIDATING GitHub CLI${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI not found. Install with: brew install gh"
        return 1
    fi
    log_success "GitHub CLI found"
    
    if ! gh auth status &> /dev/null; then
        log_error "Not authenticated with GitHub. Run: gh auth login"
        return 1
    fi
    log_success "GitHub authentication verified"
}

################################################################################
# PHASE 2: CREATE GitHub SECRETS
################################################################################

create_github_secrets() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 2: CREATING GITHUB SECRETS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    log_warning "GitHub secrets must be created manually or with proper values"
    
    echo -e "\n${YELLOW}Required Secrets (create in GitHub):${NC}"
    echo -e "  1. GITHUB_TOKEN"
    echo -e "     - Personal access token with repo, workflow scopes"
    echo -e "     - Create: https://github.com/settings/tokens"
    
    echo -e "\n  2. SONAR_TOKEN"
    echo -e "     - SonarCloud token for code quality"
    echo -e "     - Create: https://sonarcloud.io/account/security"
    
    echo -e "\n  3. SNYK_TOKEN"
    echo -e "     - Snyk token for dependency scanning"
    echo -e "     - Create: https://app.snyk.io/account/settings"
    
    echo -e "\n  4. DEPLOY_TOKEN"
    echo -e "     - Deploy PAT with write:packages scope"
    echo -e "     - Create: https://github.com/settings/tokens"
    
    echo -e "\n  5. SLACK_WEBHOOK"
    echo -e "     - Slack webhook for notifications"
    echo -e "     - Create: https://api.slack.com/messaging/webhooks"
    
    echo -e "\n  6. DATABASE_PASSWORD"
    echo -e "     - Database password for deployments"
    echo -e "\n"
    
    log_info "To create secrets via GitHub CLI, run:"
    echo -e "  ${BLUE}gh secret set -R <OWNER>/<REPO> SECRET_NAME --body 'value'${NC}"
    
    log_warning "Example: gh secret set -R $BACKEND_OWNER/$BACKEND_REPO GITHUB_TOKEN --body 'ghp_...'"
}

################################################################################
# PHASE 3: CREATE Teams
################################################################################

create_github_teams() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 3: CREATING GITHUB TEAMS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    log_warning "GitHub teams must be created via GitHub web interface (API limited)"
    
    echo -e "\n${YELLOW}Required Teams:${NC}"
    echo -e "  1. alawael-admins"
    echo -e "     - Full repository access"
    echo -e "     - Can approve deployments"
    echo -e "     - Can manage secrets"
    
    echo -e "\n  2. alawael-developers"
    echo -e "     - Code push access"
    echo -e "     - Can create PRs"
    echo -e "     - Can not approve deployments"
    
    echo -e "\n  3. alawael-ops"
    echo -e "     - Deployment permissions"
    echo -e "     - Monitoring access"
    echo -e "     - Incident response"
    
    echo -e "\n  4. alawael-security"
    echo -e "     - Security review access"
    echo -e "     - Audit trail access"
    echo -e "     - Can not modify code\n"
    
    log_info "Create teams at: https://github.com/orgs/YOUR_ORG/teams"
}

################################################################################
# PHASE 4: CONFIGURE Branch Protection
################################################################################

configure_branch_protection() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 4: CONFIGURING BRANCH PROTECTION${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "\n${YELLOW}Recommended Branch Protection Rules:${NC}"
    
    echo -e "\n${BLUE}For 'main' branch:${NC}"
    echo -e "  ✓ Require pull request reviews (at least 2)"
    echo -e "  ✓ Require status checks to pass"
    echo -e "  ✓ Require branches to be up to date"
    echo -e "  ✓ Require code owners review"
    echo -e "  ✓ Restrict who can push to matching branches"
    
    echo -e "\n${BLUE}For 'develop' branch:${NC}"
    echo -e "  ✓ Require pull request reviews (at least 1)"
    echo -e "  ✓ Require status checks to pass"
    echo -e "  ✓ Allow specified roles to bypass rules"
    
    log_info "Configure at: https://github.com/OWNER/REPO/settings/branches"
}

################################################################################
# PHASE 5: SETUP Code Owners
################################################################################

setup_code_owners() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 5: SETTING UP CODE OWNERS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    log_info "Creating CODEOWNERS file..."
    
    cat > /tmp/CODEOWNERS << 'EOF'
# ALAWAEL Code Owners

# Global
* @almashooq1

# ALAWAEL Tools
.alawael/ @almashooq1

# GitHub workflows
.github/workflows/ @almashooq1

# Documentation
*.md @almashooq1

# Tests
test/ @almashooq1
tests/ @almashooq1
__tests__/ @almashooq1

# Backend API
src/ @almashooq1
routes/ @almashooq1
controllers/ @almashooq1

# Configuration
.env.* @almashooq1
config/ @almashooq1
EOF
    
    log_success "CODEOWNERS template created"
    log_info "Add to repositories: .github/CODEOWNERS"
    log_warning "Update usernames as needed"
}

################################################################################
# PHASE 6: ENVIRONMENT Variables
################################################################################

setup_environments() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 6: SETTING UP GitHub ENVIRONMENTS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "\n${YELLOW}Recommended Environments:${NC}"
    
    echo -e "\n${BLUE}1. Development${NC}"
    echo -e "   - Environment: dev"
    echo -e "   - Protection rules: None"
    echo -e "   - Variables: DEV_API_URL, DEV_DB_URL"
    
    echo -e "\n${BLUE}2. Staging${NC}"
    echo -e "   - Environment: staging"
    echo -e "   - Protection rules: Require reviewers from alawael-ops"
    echo -e "   - Variables: STAGING_API_URL, STAGING_DB_URL"
    
    echo -e "\n${BLUE}3. Production${NC}"
    echo -e "   - Environment: production"
    echo -e "   - Protection rules: Require custom deployment rules"
    echo -e "   - Variables: PROD_API_URL, PROD_DB_URL"
    
    log_info "Configure at: https://github.com/OWNER/REPO/settings/environments"
}

################################################################################
# PHASE 7: ENABLE Features
################################################################################

enable_features() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 7: ENABLING GitHub FEATURES${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "\n${YELLOW}Features to Enable:${NC}"
    echo -e "  ✓ Issues"
    echo -e "  ✓ Discussions"
    echo -e "  ✓ Wiki"
    echo -e "  ✓ GitHub Actions"
    echo -e "  ✓ Dependabot alerts"
    echo -e "  ✓ Security alerts"
    echo -e "  ✓ Branch protection"
    
    log_info "Configure at: https://github.com/OWNER/REPO/settings"
}

################################################################################
# PHASE 8: VERIFICATION
################################################################################

verify_configuration() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 8: VERIFICATION CHECKLIST${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "\n${YELLOW}✓ Pre-Deployment Checklist:${NC}\n"
    echo -e "  [ ] GitHub CLI authenticated"
    echo -e "  [ ] 6 secrets configured"
    echo -e "  [ ] 4 teams created"
    echo -e "  [ ] Branch protection enabled"
    echo -e "  [ ] Code owners configured"
    echo -e "  [ ] GitHub environments created"
    echo -e "  [ ] GitHub Actions enabled"
    echo -e "  [ ] Dependabot enabled"
    echo -e "  [ ] Security alerts enabled"
    
    echo -e "\n${YELLOW}✓ Repository Checklist:${NC}\n"
    echo -e "  [ ] ALAWAEL tools synced"
    echo -e "  [ ] GitHub workflows created"
    echo -e "  [ ] npm scripts added"
    echo -e "  [ ] Documentation present"
    echo -e "  [ ] .gitignore updated"
    echo -e "  [ ] Changes committed"
    echo -e "  [ ] Changes pushed"
    
    echo -e "\n${YELLOW}✓ Team Checklist:${NC}\n"
    echo -e "  [ ] Team briefed on ALAWAEL"
    echo -e "  [ ] Team trained on operations"
    echo -e "  [ ] On-call rotation started"
    echo -e "  [ ] Incident procedures rehearsed"
    echo -e "  [ ] Slack channels configured"
    echo -e "  [ ] Emergency contacts shared"
}

################################################################################
# MAIN
################################################################################

main() {
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ALAWAEL GitHub Configuration Script v1.0.0              ║${NC}"
    echo -e "${GREEN}║  Configuring repositories for ALAWAEL deployment           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    
    validate_github_cli || exit 1
    create_github_secrets
    create_github_teams
    configure_branch_protection
    setup_code_owners
    setup_environments
    enable_features
    verify_configuration
    
    # Summary
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ CONFIGURATION GUIDE COMPLETE                             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}Summary:${NC}"
    echo -e "  Backend: $BACKEND_OWNER/$BACKEND_REPO"
    echo -e "  ERP:     $ERP_OWNER/$ERP_REPO"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo -e "  1. Manual Steps:"
    echo -e "     - Create secrets in GitHub (6 items)"
    echo -e "     - Create teams (4 items)"
    echo -e "     - Configure branch protection"
    echo -e "     - Setup environments (3 items)"
    echo -e "\n  2. Automated:"
    echo -e "     - Run alawael-integration.sh"
    echo -e "     - Run alawael-deployment.sh"
    
    echo -e "\n${BLUE}Configuration Pages:${NC}"
    echo -e "  Secrets:                https://github.com/$BACKEND_OWNER/$BACKEND_REPO/settings/secrets/actions"
    echo -e "  Teams:                  https://github.com/orgs/YOUR_ORG/teams"
    echo -e "  Environments:           https://github.com/$BACKEND_OWNER/$BACKEND_REPO/settings/environments"
    echo -e "  Branch Protection:      https://github.com/$BACKEND_OWNER/$BACKEND_REPO/settings/branches"
    echo -e "  Actions Settings:       https://github.com/$BACKEND_OWNER/$BACKEND_REPO/settings/actions"
    
    echo -e "\n"
}

main "$@"
