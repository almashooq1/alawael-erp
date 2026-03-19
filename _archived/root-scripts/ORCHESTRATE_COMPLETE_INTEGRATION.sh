#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - COMPLETE REPOSITORY & DEPLOYMENT ORCHESTRATOR
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: One-command setup for complete GitHub integration + deployment
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Execution modes
FULL_MODE=false
EXPRESS_MODE=false
DEPLOY_ONLY=false

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
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_info() {
    echo -e "${CYAN}[i]${NC} $1"
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

progress_bar() {
    local current=$1
    local total=$2
    local width=40
    local filled=$(( current * width / total ))
    
    printf "\r  Progress: ["
    printf "%${filled}s" | tr ' ' '='
    printf "%$((width - filled))s" | tr ' ' '-'
    printf "] %d%%" $((current * 100 / total))
}

wait_for_input() {
    echo ""
    read -p "Press Enter to continue..."
}

################################################################################
# EXECUTION MODES
################################################################################

show_mode_selection() {
    log_header "ALAWAEL v1.0.0 - REPOSITORY & DEPLOYMENT INTEGRATION"
    
    echo "Select execution mode:"
    echo ""
    echo -e "${GREEN}1. FULL MODE${NC} (Complete setup + deployment + monitoring)"
    echo "   Duration: 2-3 hours"
    echo "   Includes: All steps below"
    echo ""
    echo -e "${YELLOW}2. EXPRESS MODE${NC} (Quick setup + staging deployment)"
    echo "   Duration: 45 minutes - 1 hour"
    echo "   Skips: Full monitoring setup, production deployment"
    echo ""
    echo -e "${BLUE}3. CONFIGURATION ONLY${NC} (Setup + config, no deployment)"
    echo "   Duration: 30 minutes"
    echo "   Includes: Repos, configs, workflows"
    echo "   Skips: Any deployments"
    echo ""
    echo -e "${PURPLE}4. DEPLOYMENT ONLY${NC} (Deploy pre-configured system)"
    echo "   Duration: 30-60 minutes"
    echo "   Assumes: Already configured via one of above"
    echo ""
    
    read -p "Select mode (1-4): " mode_choice
    
    case $mode_choice in
        1)
            FULL_MODE=true
            log_success "Full mode selected"
            ;;
        2)
            EXPRESS_MODE=true
            log_success "Express mode selected"
            ;;
        3)
            FULL_MODE=false
            EXPRESS_MODE=false
            DEPLOY_ONLY=false
            log_success "Configuration only mode selected"
            ;;
        4)
            DEPLOY_ONLY=true
            log_success "Deployment only mode selected"
            ;;
        *)
            log_error "Invalid selection"
            exit 1
            ;;
    esac
}

################################################################################
# EXECUTION STEPS
################################################################################

step_repository_setup() {
    log_section "STEP 1: Repository Setup & Sync"
    
    if [ ! -f "setup-repository-integration.sh" ]; then
        log_error "setup-repository-integration.sh not found!"
        return 1
    fi
    
    chmod +x setup-repository-integration.sh
    
    log_info "Setting up repositories..."
    log_info "- Cloning/updating alawael-backend"
    log_info "- Cloning/updating alawael-erp"
    log_info "- Detecting branch states"
    log_info "- Creating configuration templates"
    
    ./setup-repository-integration.sh
    
    log_success "Repository setup complete"
}

step_deployment_configs() {
    log_section "STEP 2: Generate Deployment Configurations"
    
    if [ ! -f "setup-deployment-configurations.sh" ]; then
        log_error "setup-deployment-configurations.sh not found!"
        return 1
    fi
    
    chmod +x setup-deployment-configurations.sh
    
    log_info "Generating deployment configurations for:"
    log_info "  • Heroku"
    log_info "  • AWS Elastic Beanstalk"
    log_info "  • Azure App Service"
    log_info "  • GCP Cloud Run + Kubernetes"
    log_info "  • Docker + Docker Compose"
    
    ./setup-deployment-configurations.sh
    
    log_success "Deployment configurations generated"
}

step_github_workflows() {
    log_section "STEP 3: Generate GitHub Actions Workflows"
    
    if [ ! -f "generate-github-actions.sh" ]; then
        log_error "generate-github-actions.sh not found!"
        return 1
    fi
    
    chmod +x generate-github-actions.sh
    
    log_info "Creating GitHub Actions workflows for:"
    log_info "  • Test suite (Jest + Snyk + coverage)"
    log_info "  • Build pipeline"
    log_info "  • Docker image building & scanning"
    log_info "  • Deployment (staging + production)"
    log_info "  • Scheduled maintenance"
    log_info "  • Pull request validation"
    
    ./generate-github-actions.sh
    
    log_success "GitHub Actions workflows generated"
}

step_monitoring_setup() {
    log_section "STEP 4: Setup Monitoring (Full Mode Only)"
    
    if [ "$FULL_MODE" = false ] && [ "$EXPRESS_MODE" = true ]; then
        log_warning "Skipped in Express mode (can run later)"
        return 0
    fi
    
    if [ ! -f "setup-monitoring.sh" ]; then
        log_warning "setup-monitoring.sh not found, skipping"
        return 0
    fi
    
    chmod +x setup-monitoring.sh
    
    log_info "Configuring monitoring:"
    log_info "  • Sentry error tracking"
    log_info "  • Health check endpoints"
    log_info "  • Monitoring dashboards"
    log_info "  • Alert configuration"
    
    ./setup-monitoring.sh
    
    log_success "Monitoring setup complete"
}

step_security_setup() {
    log_section "STEP 5: Setup Security Framework"
    
    if [ ! -f "setup-security-crisis-management.sh" ]; then
        log_warning "setup-security-crisis-management.sh not found, skipping"
        return 0
    fi
    
    chmod +x setup-security-crisis-management.sh
    
    log_info "Configuring security:"
    log_info "  • OWASP Top 10 hardening"
    log_info "  • Encryption configuration"
    log_info "  • Audit logging"
    log_info "  • Crisis management procedures"
    
    ./setup-security-crisis-management.sh
    
    log_success "Security setup complete"
}

step_staging_deployment() {
    log_section "STEP 6: Deploy to Staging"
    
    if [ ! -f "advanced-deploy.sh" ]; then
        log_error "advanced-deploy.sh not found!"
        return 1
    fi
    
    if [ "$EXPRESS_MODE" = true ] || [ "$FULL_MODE" = true ]; then
        log_info "Preparing staging deployment..."
        
        # This would typically run advanced-deploy.sh with staging option
        log_info "Note: Run './advanced-deploy.sh' and select Heroku Staging"
        log_info "Alternative: Deploy via Docker locally first"
        
        read -p "Deploy to staging now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            chmod +x advanced-deploy.sh
            ./advanced-deploy.sh
        else
            log_warning "Skipped staging deployment"
        fi
    fi
}

step_production_deployment() {
    log_section "STEP 7: Deploy to Production (Full Mode Only)"
    
    if [ "$FULL_MODE" = false ]; then
        log_warning "Production deployment skipped (not in Full mode)"
        return 0
    fi
    
    log_warning "⚠ PRODUCTION DEPLOYMENT ⚠"
    echo ""
    echo "Before proceeding with production:"
    echo "  ✓ Staging deployment tested and verified"
    echo "  ✓ All monitoring configured and active"
    echo "  ✓ Security audit completed (130+ points)"
    echo "  ✓ Backup and recovery tested"
    echo "  ✓ Rollback procedure verified"
    echo "  ✓ Team trained and ready"
    echo ""
    
    read -p "Proceed with production deployment? (yes/no) " -r confirm
    if [ "$confirm" != "yes" ]; then
        log_warning "Production deployment cancelled"
        return 0
    fi
    
    log_info "Deploying to production..."
    
    # Production deployment would typically involve:
    # 1. Creating a release tag
    # 2. Running GitHub Actions deployment workflow
    # 3. Health checks
    # 4. Smoke tests
    
    log_warning "To complete production deployment:"
    echo "  1. Create version tag:"
    echo "     git tag v1.0.0"
    echo "     git push origin v1.0.0"
    echo ""
    echo "  2. GitHub Actions will automatically:"
    echo "     - Run full test suite"
    echo "     - Build Docker images"
    echo "     - Deploy to production"
    echo "     - Run smoke tests"
    echo "     - Send notifications"
}

step_configuration_guide() {
    log_section "STEP 8: Manual Configuration Required"
    
    echo -e "${YELLOW}⚠ IMPORTANT - Next Actions Required:${NC}"
    echo ""
    echo "1. ${CYAN}Configure Environment Variables${NC}"
    echo "   Location: .alawael-repo-config/"
    echo "   Files: .env.backend.template, .env.erp.template"
    echo "   Action: Copy and customize for your environment"
    echo ""
    
    echo "2. ${CYAN}Add GitHub Secrets${NC}"
    echo "   Location: Each repository's Settings → Secrets"
    echo "   Guide: cat .alawael-repo-config/GITHUB_SECRETS_SETUP.md"
    echo "   Secrets: MONGODB_URI, JWT_SECRET, AWS keys, etc."
    echo ""
    
    echo "3. ${CYAN}Review Deployment Configs${NC}"
    echo "   Location: deployment-configs/"
    echo "   Customize: URLs, instance types, scaling rules"
    echo ""
    
    echo "4. ${CYAN}Commit GitHub Actions Workflows${NC}"
    echo "   Action: Push .github/workflows/ to repositories"
    echo "   Command:"
    echo "     git add .github/"
    echo "     git commit -m 'Add GitHub Actions workflows'"
    echo "     git push origin main"
    echo ""
    
    echo "5. ${CYAN}Sync Branches (if needed)${NC}"
    echo "   Command: ./repository-management.sh"
    echo "   Option: 1 (Sync master → main)"
    echo ""
    
    wait_for_input
}

step_verification() {
    log_section "STEP 9: Verification & Health Check"
    
    if [ ! -f "verify-complete-setup.sh" ]; then
        log_warning "verify-complete-setup.sh not found"
        return 1
    fi
    
    chmod +x verify-complete-setup.sh
    
    log_info "Running comprehensive verification..."
    
    ./verify-complete-setup.sh
    
    log_success "Verification complete"
}

step_summary() {
    log_section "Setup Complete - Summary"
    
    echo -e "${GREEN}✓ Successfully completed integration setup!${NC}"
    echo ""
    
    echo "What was configured:"
    echo "  ✓ GitHub repositories cloned and synced"
    echo "  ✓ Environment templates generated"
    echo "  ✓ Deployment configurations created (all platforms)"
    echo "  ✓ GitHub Actions workflows generated"
    if [ "$FULL_MODE" = true ]; then
        echo "  ✓ Monitoring configured"
        echo "  ✓ Security hardening applied"
    fi
    echo ""
    
    echo "What you still need to do:"
    echo "  1. Configure environment variables (.env files)"
    echo "  2. Add GitHub secrets"
    echo "  3. Customize deployment configurations"
    echo "  4. Commit and push workflows to GitHub"
    echo "  5. Test in staging before production"
    echo ""
    
    echo "Useful commands:"
    echo "  Review configs:   ls -R deployment-configs/"
    echo "  Manage repos:     ./repository-management.sh"
    echo "  Deploy:           ./advanced-deploy.sh"
    echo "  Show status:      ./SYSTEM_STATUS.sh"
    echo ""
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    # Parse command line arguments
    if [ "$1" = "--full" ]; then
        FULL_MODE=true
    elif [ "$1" = "--express" ]; then
        EXPRESS_MODE=true
    elif [ "$1" = "--deploy" ]; then
        DEPLOY_ONLY=true
    fi
    
    # Show mode selection if not specified
    if [ "$FULL_MODE" = false ] && [ "$EXPRESS_MODE" = false ] && [ "$DEPLOY_ONLY" = false ]; then
        show_mode_selection
    fi
    
    # Determine which steps to run
    if [ "$DEPLOY_ONLY" = true ]; then
        log_header "ALAWAEL v1.0.0 - DEPLOYMENT ONLY MODE"
    elif [ "$EXPRESS_MODE" = true ]; then
        log_header "ALAWAEL v1.0.0 - EXPRESS INTEGRATION (45 MINUTES)"
    elif [ "$FULL_MODE" = true ]; then
        log_header "ALAWAEL v1.0.0 - FULL INTEGRATION (2-3 HOURS)"
    else
        log_header "ALAWAEL v1.0.0 - CONFIGURATION ONLY (30 MINUTES)"
    fi
    
    # Start timestamp
    START_TIME=$(date +%s)
    
    # Execute steps based on mode
    if [ "$DEPLOY_ONLY" = false ]; then
        step_repository_setup
        step_deployment_configs
        step_github_workflows
        
        if [ "$FULL_MODE" = true ]; then
            step_monitoring_setup
            step_security_setup
        fi
        
        step_staging_deployment
        
        if [ "$FULL_MODE" = true ]; then
            step_production_deployment
        fi
        
        step_configuration_guide
        step_verification
    else
        # Deploy only mode - check for existing configs
        if [ ! -d "deployment-configs" ]; then
            log_error "deployment-configs directory not found!"
            log_error "Run full or express mode first to generate configurations"
            exit 1
        fi
        
        log_info "Using existing deployment configurations..."
        step_staging_deployment
    fi
    
    # Final summary
    step_summary
    
    # Duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ ORCHESTRATION COMPLETE${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo "Duration: ${MINUTES} minutes"
    echo ""
    echo "Next step: Configure .env files and add GitHub secrets"
    echo ""
}

# Execute main function
main "$@"
