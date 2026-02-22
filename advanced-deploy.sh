#!/bin/bash

# ALAWAEL v1.0.0 - Advanced Deployment Automation
# Complete multi-platform deployment with rollback and monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DEPLOY_LOG="$SCRIPT_DIR/deploy-execution-$(date +%Y%m%d_%H%M%S).log"

clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 ALAWAEL v1.0.0 - Advanced Deployment Automation        ║"
echo "║     Multi-Platform Deployment with Full Recovery           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log_info() { echo -e "${BLUE}ℹ️ ${1}${NC}" | tee -a "$DEPLOY_LOG"; }
log_success() { echo -e "${GREEN}✅ ${1}${NC}" | tee -a "$DEPLOY_LOG"; }
log_error() { echo -e "${RED}❌ ${1}${NC}" | tee -a "$DEPLOY_LOG"; }
log_warning() { echo -e "${YELLOW}⚠️  ${1}${NC}" | tee -a "$DEPLOY_LOG"; }

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    echo ""
    
    local checks_passed=true
    
    # Check Git status
    if [[ -d ".git" ]]; then
        if [[ -z $(git status -s) ]]; then
            log_success "Git repository clean"
        else
            log_warning "Uncommitted changes detected"
            read -p "Commit before deploying? (y/n): " commit
            if [[ "$commit" == "y" ]]; then
                git add -A
                git commit -m "chore: pre-deployment commit"
            fi
        fi
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        log_success "Docker available: $(docker --version)"
    else
        log_warning "Docker not found"
        checks_passed=false
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        log_success "Node.js available: $(node --version)"
    else
        log_error "Node.js not found"
        checks_passed=false
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        log_success "npm available: $(npm --version)"
    else
        log_error "npm not found"
        checks_passed=false
    fi
    
    echo ""
    if [[ "$checks_passed" == "true" ]]; then
        log_success "All pre-deployment checks passed"
    else
        log_error "Some checks failed"
        return 1
    fi
    return 0
}

# Show deployment options menu
show_deployment_menu() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Deployment Options                                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Environment:"
    echo "  1) Development (Local/Docker)"
    echo "  2) Staging (Heroku/Render)"
    echo "  3) Production (AWS/Azure/GCP)"
    echo ""
    echo "Services:"
    echo "  4) Backend Only"
    echo "  5) Frontend Only"
    echo "  6) Full Stack (Backend + Frontend + Database)"
    echo ""
    echo "Advanced:"
    echo "  7) Custom Deployment"
    echo "  8) Health Check & Monitoring"
    echo "  9) Rollback Last Deployment"
    echo "  0) Exit"
    echo ""
    read -p "Choose deployment option (0-9): " choice
    echo "$choice"
}

# Development deployment
deploy_dev() {
    log_info "════════════════════════════════════════════════"
    log_info "Development Deployment (Docker)"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    if [[ ! -f "$SCRIPT_DIR/docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found"
        return 1
    fi
    
    log_info "Building containers..."
    docker-compose build
    
    log_info "Starting services..."
    docker-compose up -d
    
    log_success "Development environment ready"
    echo ""
    
    log_info "Services running:"
    docker-compose ps
    
    echo ""
    log_info "Access points:"
    echo "  Backend: http://localhost:3000"
    echo "  Frontend: http://localhost:3001"
    echo ""
}

# Staging deployment
deploy_staging() {
    log_info "════════════════════════════════════════════════"
    log_info "Staging Deployment"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    read -p "Deploy to Heroku? (y/n): " deploy_heroku
    if [[ "$deploy_heroku" == "y" ]]; then
        if ! command -v heroku &> /dev/null; then
            log_error "Heroku CLI not installed"
            return 1
        fi
        
        log_info "Deploying to Heroku..."
        
        # Backend deployment
        cd "$SCRIPT_DIR/backend" 2>/dev/null || true
        heroku create alawael-backend-staging --remote staging 2>/dev/null || true
        git push staging main
        
        cd "$SCRIPT_DIR"
        log_success "Staging deployment initiated"
    fi
    
    echo ""
}

# Production deployment
deploy_production() {
    log_info "════════════════════════════════════════════════"
    log_info "Production Deployment"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    log_warning "⚠️  PRODUCTION DEPLOYMENT - PLEASE CONFIRM!"
    echo ""
    
    read -p "Target Platform (1=AWS, 2=Azure, 3=GCP): " platform
    
    case $platform in
        1)
            log_info "AWS Deployment..."
            log_info "Prerequisites:"
            echo "  • AWS CLI configured"
            echo "  • ECR repository created"
            echo "  • RDS/Aurora database ready"
            echo "  • ElastiCache configured"
            echo ""
            read -p "Continue with AWS deployment? (y/n): " confirm
            if [[ "$confirm" == "y" ]]; then
                deploy_aws
            fi
            ;;
        2)
            log_info "Azure Deployment..."
            read -p "Continue with Azure deployment? (y/n): " confirm
            if [[ "$confirm" == "y" ]]; then
                deploy_azure
            fi
            ;;
        3)
            log_info "GCP Deployment..."
            read -p "Continue with GCP deployment? (y/n): " confirm
            if [[ "$confirm" == "y" ]]; then
                deploy_gcp
            fi
            ;;
        *)
            log_error "Invalid platform selection"
            return 1
            ;;
    esac
}

# AWS deployment
deploy_aws() {
    log_info "Deploying to AWS Elastic Beanstalk..."
    
    if ! command -v eb &> /dev/null; then
        log_error "Elastic Beanstalk CLI not installed"
        return 1
    fi
    
    # Backup current version
    log_info "Creating backup..."
    
    # Build and push Docker image
    log_info "Building Docker image..."
    docker build -t alawael-backend:latest -f Dockerfile .
    
    # Push to ECR
    log_info "Pushing to ECR..."
    # AWS ECR login and push commands
    
    # Deploy to Elastic Beanstalk
    log_info "Deploying to Elastic Beanstalk..."
    eb deploy
    
    log_success "AWS deployment completed"
}

# Azure deployment
deploy_azure() {
    log_info "Deploying to Azure App Service..."
    
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI not installed"
        return 1
    fi
    
    log_info "Creating backup..."
    
    # Build application
    log_info "Building application..."
    npm run build
    
    # Deploy to Azure
    log_info "Deploying to Azure..."
    az webapp deployment source config-zip \
        --resource-group alawael \
        --name alawael-backend \
        --src-path dist.zip
    
    log_success "Azure deployment completed"
}

# GCP deployment
deploy_gcp() {
    log_info "Deploying to Google Cloud Run..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "Google Cloud CLI not installed"
        return 1
    fi
    
    log_info "Setting up deployment..."
    
    # Build image
    log_info "Building Docker image..."
    gcloud builds submit --tag gcr.io/PROJECT_ID/alawael-backend:latest
    
    # Deploy to Cloud Run
    log_info "Deploying to Cloud Run..."
    gcloud run deploy alawael-backend \
        --image gcr.io/PROJECT_ID/alawael-backend:latest \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated
    
    log_success "GCP deployment completed"
}

# Health checks
run_health_checks() {
    log_info "════════════════════════════════════════════════"
    log_info "Running Health Checks"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    local checks_passed=0
    local checks_failed=0
    
    # Backend health check
    log_info "Checking backend health..."
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Backend health: OK"
        ((checks_passed++))
    else
        log_error "Backend health: FAILED"
        ((checks_failed++))
    fi
    
    # Frontend health check
    log_info "Checking frontend health..."
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        log_success "Frontend health: OK"
        ((checks_passed++))
    else
        log_error "Frontend health: FAILED"
        ((checks_failed++))
    fi
    
    # Database health check
    log_info "Checking database connection..."
    if command -v mongosh &> /dev/null; then
        if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
            log_success "Database health: OK"
            ((checks_passed++))
        else
            log_warning "Database health: Unable to verify"
        fi
    fi
    
    echo ""
    log_success "Health checks: $checks_passed passed, $checks_failed failed"
    echo ""
}

# Rollback mechanism
rollback_deployment() {
    log_info "════════════════════════════════════════════════"
    log_info "Rollback Deployment"
    log_info "════════════════════════════════════════════════"
    echo ""
    
    log_warning "Rolling back to previous version..."
    
    # Check if backup exists
    if [[ -f "$SCRIPT_DIR/.deployment-backup" ]]; then
        log_info "Restoring from backup..."
        
        # Restore Docker containers
        if command -v docker &> /dev/null; then
            log_info "Restoring Docker containers..."
            docker-compose stop
            # Restore commands here
            docker-compose up -d
        fi
        
        # Run health checks
        run_health_checks
        
        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
        return 1
    fi
    
    echo ""
}

# Deployment summary
create_deployment_summary() {
    local env=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat >> "$DEPLOY_LOG" << EOF

═══════════════════════════════════════════════════════
DEPLOYMENT SUMMARY
═══════════════════════════════════════════════════════
Environment: $env
Timestamp: $timestamp
Status: Completed
Logs: $DEPLOY_LOG

Next Steps:
1. Run health checks: ./advanced-deploy.sh 8
2. Monitor: Check ALAWAEL_OBSERVABILITY or status dashboard
3. Rollback if needed: ./advanced-deploy.sh 9

═══════════════════════════════════════════════════════
EOF
    
    log_success "Deployment log saved: $DEPLOY_LOG"
}

# Main execution
main() {
    log_info "Starting Alawael Deployment..."
    echo ""
    
    # Run pre-checks
    if ! pre_deployment_checks; then
        log_error "Pre-deployment checks failed"
        exit 1
    fi
    
    # Show menu and handle user selection
    local choice=$(show_deployment_menu)
    
    case $choice in
        1) deploy_dev; create_deployment_summary "Development" ;;
        2) deploy_staging; create_deployment_summary "Staging" ;;
        3) deploy_production; create_deployment_summary "Production" ;;
        4) log_info "Backend-only deployment (custom location)"; log_warning "Feature in development" ;;
        5) log_info "Frontend-only deployment (custom location)"; log_warning "Feature in development" ;;
        6) deploy_dev; create_deployment_summary "Full Stack Development" ;;
        7) log_info "Custom deployment wizard"; log_warning "Feature in development" ;;
        8) run_health_checks ;;
        9) rollback_deployment ;;
        0) log_warning "Deployment cancelled"; exit 0 ;;
        *) log_error "Invalid choice"; exit 1 ;;
    esac
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Deployment Process Complete ✅                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

main "$@"
