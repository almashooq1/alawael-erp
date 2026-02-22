#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - PRODUCTION READINESS VERIFICATION
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Comprehensive pre-deployment verification checklist
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Tracking
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
CRITICAL_ISSUES=0

################################################################################
# UTILITY FUNCTIONS
################################################################################

log_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_pass() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++))
    ((CHECKS_TOTAL++))
}

check_fail() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++))
    ((CHECKS_TOTAL++))
}

check_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((CHECKS_TOTAL++))
}

check_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
    ((CRITICAL_ISSUES++))
    ((CHECKS_FAILED++))
    ((CHECKS_TOTAL++))
}

################################################################################
# ENVIRONMENT CHECKS
################################################################################

check_environment() {
    log_section "ENVIRONMENT CHECKS"
    
    # Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -ge 18 ]; then
            check_pass "Node.js $NODE_VERSION (required: 18+)"
        else
            check_fail "Node.js $NODE_VERSION (required: 18+)"
        fi
    else
        check_critical "Node.js not installed"
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        check_pass "npm $NPM_VERSION installed"
    else
        check_critical "npm not installed"
    fi
    
    # Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | awk '{print $3}')
        check_pass "Git $GIT_VERSION installed"
    else
        check_critical "Git not installed"
    fi
    
    # Docker (optional)
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
        check_pass "Docker $DOCKER_VERSION installed"
    else
        check_warning "Docker not installed (optional for local deployment)"
    fi
    
    # Disk space
    DISK_FREE=$(df . | tail -1 | awk '{print $4}')
    DISK_FREE_GB=$((DISK_FREE / 1024 / 1024))
    if [ "$DISK_FREE_GB" -gt 30 ]; then
        check_pass "Disk space: ${DISK_FREE_GB}GB available (required: 30GB)"
    else
        check_fail "Disk space: Only ${DISK_FREE_GB}GB available (required: 30GB)"
    fi
}

################################################################################
# REPOSITORY CHECKS
################################################################################

check_repositories() {
    log_section "REPOSITORY CHECKS"
    
    # Backend repo
    if [ -d "alawael-backend" ]; then
        cd alawael-backend
        BACKEND_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        BACKEND_COMMITS=$(git rev-list --count HEAD)
        check_pass "Backend repo found (branch: $BACKEND_BRANCH, commits: $BACKEND_COMMITS)"
        
        # Check for uncommitted changes
        if [ -z "$(git status --porcelain)" ]; then
            check_pass "Backend: Clean working directory"
        else
            check_warning "Backend: Has uncommitted changes"
        fi
        
        # Check package.json
        if [ -f "package.json" ]; then
            check_pass "Backend: package.json found"
        else
            check_fail "Backend: package.json missing"
        fi
        
        cd ..
    else
        check_fail "Backend repository not found"
    fi
    
    # ERP repo
    if [ -d "alawael-erp" ]; then
        cd alawael-erp
        ERP_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        ERP_COMMITS=$(git rev-list --count HEAD)
        check_pass "ERP repo found (branch: $ERP_BRANCH, commits: $ERP_COMMITS)"
        
        # Check for uncommitted changes
        if [ -z "$(git status --porcelain)" ]; then
            check_pass "ERP: Clean working directory"
        else
            check_warning "ERP: Has uncommitted changes"
        fi
        
        # Check branch state
        if [ "$ERP_BRANCH" = "master" ]; then
            check_warning "ERP: On 'master' branch, default is 'main' (recommend sync)"
        else
            check_pass "ERP: On correct branch"
        fi
        
        # Check package.json
        if [ -f "package.json" ]; then
            check_pass "ERP: package.json found"
        else
            check_fail "ERP: package.json missing"
        fi
        
        cd ..
    else
        check_fail "ERP repository not found"
    fi
}

################################################################################
# DEPENDENCY CHECKS
################################################################################

check_dependencies() {
    log_section "DEPENDENCY CHECKS"
    
    echo "Backend dependencies:"
    if [ -d "alawael-backend" ]; then
        cd alawael-backend
        
        if [ -d "node_modules" ]; then
            INSTALLED_COUNT=$(ls -1 node_modules | wc -l)
            check_pass "Backend: $INSTALLED_COUNT packages installed"
        else
            check_warning "Backend: node_modules not found (run 'npm install')"
        fi
        
        # Check package-lock.json
        if [ -f "package-lock.json" ]; then
            check_pass "Backend: package-lock.json exists"
        else
            check_warning "Backend: package-lock.json missing"
        fi
        
        cd ..
    fi
    
    echo ""
    echo "ERP dependencies:"
    if [ -d "alawael-erp" ]; then
        cd alawael-erp
        
        if [ -d "node_modules" ]; then
            INSTALLED_COUNT=$(ls -1 node_modules | wc -l)
            check_pass "ERP: $INSTALLED_COUNT packages installed"
        else
            check_warning "ERP: node_modules not found (run 'npm install')"
        fi
        
        # Check package-lock.json
        if [ -f "package-lock.json" ]; then
            check_pass "ERP: package-lock.json exists"
        else
            check_warning "ERP: package-lock.json missing"
        fi
        
        cd ..
    fi
}

################################################################################
# CONFIGURATION CHECKS
################################################################################

check_configuration() {
    log_section "CONFIGURATION CHECKS"
    
    echo "Environment configurations:"
    
    if [ -f ".alawael-repo-config/github-config.json" ]; then
        check_pass "GitHub config exists"
    else
        check_warning "GitHub config template exists"
    fi
    
    if [ -d "deployment-configs" ]; then
        check_pass "Deployment configs directory exists"
        
        COUNT=$(find deployment-configs -type f | wc -l)
        check_pass "Deployment configs: $COUNT files"
    else
        check_warning "Deployment configs directory not found"
    fi
    
    if [ -d ".github/workflows" ]; then
        WORKFLOW_COUNT=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)
        check_pass "GitHub Actions workflows: $WORKFLOW_COUNT files"
    else
        check_warning "GitHub Actions workflows not found"
    fi
    
    echo ""
    echo "Backend configuration:"
    if [ -f "alawael-backend/.env" ]; then
        check_pass "Backend .env file exists"
        
        # Check for required variables
        if grep -q "MONGODB_URI" alawael-backend/.env; then
            check_pass "  - MONGODB_URI configured"
        else
            check_fail "  - MONGODB_URI missing"
        fi
        
        if grep -q "JWT_SECRET" alawael-backend/.env; then
            check_pass "  - JWT_SECRET configured"
        else
            check_fail "  - JWT_SECRET missing"
        fi
    else
        check_warning "Backend .env not found (template: .env.backend.template)"
    fi
    
    echo ""
    echo "ERP configuration:"
    if [ -f "alawael-erp/.env" ]; then
        check_pass "ERP .env file exists"
        
        if grep -q "REACT_APP_API_URL" alawael-erp/.env; then
            check_pass "  - REACT_APP_API_URL configured"
        else
            check_fail "  - REACT_APP_API_URL missing"
        fi
    else
        check_warning "ERP .env not found (template: .env.erp.template)"
    fi
}

################################################################################
# AUTOMATION CHECKS
################################################################################

check_automation() {
    log_section "AUTOMATION & SCRIPTS CHECKS"
    
    SCRIPTS=(
        "master-setup.sh"
        "first-run-wizard.sh"
        "setup-monitoring.sh"
        "setup-cicd-pipeline.sh"
        "setup-disaster-recovery.sh"
        "setup-scaling-performance.sh"
        "setup-team-training-operations.sh"
        "setup-security-crisis-management.sh"
        "verify-complete-setup.sh"
        "github-integration.sh"
        "advanced-deploy.sh"
        "setup-repository-integration.sh"
        "setup-deployment-configurations.sh"
        "generate-github-actions.sh"
        "repository-management.sh"
        "ORCHESTRATE_COMPLETE_INTEGRATION.sh"
    )
    
    echo "Core automation scripts:"
    for script in "${SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                check_pass "$script (executable)"
            else
                check_warning "$script (not executable, run: chmod +x $script)"
            fi
        else
            check_fail "$script (missing)"
        fi
    done
}

################################################################################
# SECURITY CHECKS
################################################################################

check_security() {
    log_section "SECURITY CHECKS"
    
    echo "Credentials & Secrets:"
    
    # Check for hardcoded secrets
    DANGEROUS_PATTERNS=("password=" "secret=" "token=" "api_key=" "AWS_SECRET")
    FOUND_SECRETS=0
    
    for pattern in "${DANGEROUS_PATTERNS[@]}"; do
        if grep -r "$pattern" alawael-backend/ alawael-erp/ 2>/dev/null | grep -v node_modules | grep -v ".git" > /dev/null; then
            check_warning "Potential hardcoded secret found: $pattern"
            ((FOUND_SECRETS++))
        fi
    done
    
    if [ $FOUND_SECRETS -eq 0 ]; then
        check_pass "No obvious hardcoded secrets found"
    fi
    
    # Check .gitignore
    echo ""
    echo "Version control security:"
    
    if [ -f ".gitignore" ]; then
        if grep -q ".env" .gitignore; then
            check_pass ".env files in .gitignore"
        else
            check_fail ".env files NOT in .gitignore (CRITICAL!)"
        fi
        
        if grep -q "node_modules" .gitignore; then
            check_pass "node_modules in .gitignore"
        else
            check_warning "node_modules NOT in .gitignore"
        fi
    else
        check_warning ".gitignore not found"
    fi
    
    # Check for .env in repos (should NOT be there)
    echo ""
    echo "Repository contents:"
    
    if [ -f "alawael-backend/.env.production" ]; then
        check_fail "Production .env should NOT be committed to git"
    else
        check_pass "No production .env file in repository"
    fi
}

################################################################################
# BUILD & TEST CHECKS
################################################################################

check_build() {
    log_section "BUILD & TEST CAPABILITY CHECKS"
    
    echo "Backend build:"
    if [ -d "alawael-backend" ]; then
        cd alawael-backend
        
        if [ -f "package.json" ]; then
            # Check if build script exists
            if grep -q '"build"' package.json; then
                check_pass "Build script defined"
            else
                check_warning "Build script not defined"
            fi
            
            # Check if test script exists
            if grep -q '"test"' package.json; then
                check_pass "Test script defined"
            else
                check_warning "Test script not defined"
            fi
            
            # Check if start script exists
            if grep -q '"start"' package.json; then
                check_pass "Start script defined"
            else
                check_fail "Start script not defined"
            fi
        fi
        
        cd ..
    fi
    
    echo ""
    echo "ERP build:"
    if [ -d "alawael-erp" ]; then
        cd alawael-erp
        
        if [ -f "package.json" ]; then
            # Check if build script exists
            if grep -q '"build"' package.json; then
                check_pass "Build script defined"
            else
                check_warning "Build script not defined"
            fi
        fi
        
        cd ..
    fi
}

################################################################################
# DEPLOYMENT CHECKS
################################################################################

check_deployment() {
    log_section "DEPLOYMENT READINESS CHECKS"
    
    echo "Docker readiness:"
    if [ -f "alawael-backend/Dockerfile" ]; then
        check_pass "Backend Dockerfile exists"
    else
        check_warning "Backend Dockerfile not found"
    fi
    
    if [ -f "alawael-erp/Dockerfile" ]; then
        check_pass "ERP Dockerfile exists"
    else
        check_warning "ERP Dockerfile not found"
    fi
    
    echo ""
    echo "Health check endpoints:"
    if grep -r "/health" alawael-backend/src 2>/dev/null | grep -v node_modules > /dev/null; then
        check_pass "Backend has /health endpoint"
    else
        check_warning "Backend /health endpoint not found"
    fi
    
    echo ""
    echo "Deployment configuration:"
    
    if [ -f "deployment-configs/heroku/Procfile" ]; then
        check_pass "Heroku Procfile ready"
    else
        check_warning "Heroku Procfile not found"
    fi
    
    if [ -f "deployment-configs/docker/docker-compose.prod.yml" ]; then
        check_pass "Docker Compose production config ready"
    else
        check_warning "Docker Compose config not found"
    fi
}

################################################################################
# SUMMARY & REPORT
################################################################################

print_summary() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    VERIFICATION SUMMARY                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    PASS_PERCENTAGE=$((CHECKS_PASSED * 100 / CHECKS_TOTAL))
    
    echo "Results:"
    echo "  Total Checks: $CHECKS_TOTAL"
    echo -e "  ${GREEN}Passed: $CHECKS_PASSED${NC}"
    echo -e "  ${RED}Failed: $CHECKS_FAILED${NC}"
    echo "  Pass Rate: $PASS_PERCENTAGE%"
    echo ""
    
    if [ $CRITICAL_ISSUES -gt 0 ]; then
        echo -e "${RED}⚠ CRITICAL ISSUES: $CRITICAL_ISSUES${NC}"
        echo "  You CANNOT deploy to production with critical issues!"
        echo ""
    fi
    
    # Recommendation
    if [ $CRITICAL_ISSUES -eq 0 ] && [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ ALL CHECKS PASSED - READY FOR PRODUCTION${NC}"
        return 0
    elif [ $CRITICAL_ISSUES -eq 0 ] && [ $PASS_PERCENTAGE -ge 90 ]; then
        echo -e "${YELLOW}⚠ READY FOR STAGING (Minor issues to resolve)${NC}"
        return 1
    else
        echo -e "${RED}✗ NOT READY (Fix critical issues first)${NC}"
        return 2
    fi
}

generate_report() {
    REPORT_FILE="production-readiness-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "ALAWAEL v1.0.0 - PRODUCTION READINESS VERIFICATION REPORT"
        echo "Generated: $(date)"
        echo ""
        echo "==================================================================="
        echo "SUMMARY"
        echo "==================================================================="
        echo "Total Checks: $CHECKS_TOTAL"
        echo "Passed: $CHECKS_PASSED"
        echo "Failed: $CHECKS_FAILED"
        echo "Critical Issues: $CRITICAL_ISSUES"
        echo "Pass Rate: $((CHECKS_PASSED * 100 / CHECKS_TOTAL))%"
        echo ""
        echo "Status:"
        if [ $CRITICAL_ISSUES -eq 0 ] && [ $CHECKS_FAILED -eq 0 ]; then
            echo "✓ PRODUCTION READY"
        elif [ $CRITICAL_ISSUES -eq 0 ] && [ $CHECKS_PASSED -ge $((CHECKS_TOTAL * 9 / 10)) ]; then
            echo "⚠ STAGING READY (Minor issues)"
        else
            echo "✗ NOT READY (Critical issues found)"
        fi
    } > "$REPORT_FILE"
    
    echo ""
    log_section "Report Generated"
    echo "Saved to: $REPORT_FILE"
}

################################################################################
# MAIN
################################################################################

main() {
    log_header "ALAWAEL v1.0.0 - PRODUCTION READINESS VERIFICATION"
    
    check_environment
    check_repositories
    check_dependencies
    check_configuration
    check_automation
    check_security
    check_build
    check_deployment
    
    print_summary
    FINAL_STATUS=$?
    
    generate_report
    
    echo ""
    echo "Next steps:"
    if [ $CRITICAL_ISSUES -gt 0 ]; then
        echo "  1. Fix all critical issues listed above"
        echo "  2. Re-run this verification"
        echo "  3. Do NOT proceed with deployment"
    elif [ $CHECKS_FAILED -gt 0 ]; then
        echo "  1. Fix remaining issues"
        echo "  2. Test in staging environment"
        echo "  3. Deploy to production"
    else
        echo "  1. Run final smoke tests"
        echo "  2. Notify team for production deployment"
        echo "  3. Deploy with confidence!"
    fi
    
    echo ""
    
    exit $FINAL_STATUS
}

main "$@"
