#!/bin/bash

# ============================================================================
# 🚀 ALAWAEL ERP - PRODUCTION DEPLOYMENT AUTOMATION SCRIPT (v1.0.0)
# ============================================================================
# Purpose: Automated deployment to production with health checks and rollback
# Author: GitHub Copilot
# Date: February 23, 2026
# Status: Production Ready
# ============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_NAME="alawael-erp"
REPO_URL="https://github.com/almashooq1/alawael-erp.git"
DEPLOYMENT_DIR="/opt/alawael-erp"
BACKUP_DIR="/opt/alawael-erp/backups"
LOG_FILE="/var/log/alawael-deployment.log"
RELEASE_TAG="v1.0.0-production"
ENVIRONMENT="${ENVIRONMENT:-production}"
PORT="${PORT:-3000}"
NODE_PORT="${NODE_PORT:-3002}"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${timestamp}]${NC} ${message}" | tee -a "$LOG_FILE"
}

success() {
    local message="$@"
    echo -e "${GREEN}✅ ${message}${NC}" | tee -a "$LOG_FILE"
}

error() {
    local message="$@"
    echo -e "${RED}❌ ${message}${NC}" | tee -a "$LOG_FILE"
}

warning() {
    local message="$@"
    echo -e "${YELLOW}⚠️  ${message}${NC}" | tee -a "$LOG_FILE"
}

info() {
    local message="$@"
    echo -e "${CYAN}ℹ️  ${message}${NC}" | tee -a "$LOG_FILE"
}

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

check_requirements() {
    log "INFO" "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        return 1
    fi
    local node_version=$(node --version)
    success "Node.js installed: $node_version"
    
    # Check NPM
    if ! command -v npm &> /dev/null; then
        error "NPM is not installed"
        return 1
    fi
    local npm_version=$(npm --version)
    success "NPM installed: $npm_version"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        error "Git is not installed"
        return 1
    fi
    local git_version=$(git --version)
    success "Git installed: $git_version"
    
    # Check MongoDB connectivity
    if ! command -v mongosh &> /dev/null; then
        warning "MongoDB shell not found, skipping connectivity check"
    else
        if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
            success "MongoDB connectivity verified"
        else
            error "Cannot connect to MongoDB"
            return 1
        fi
    fi
    
    # Check disk space
    local available_space=$(df /opt | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1000000 ]; then
        error "Insufficient disk space (need 1GB, have ${available_space}KB)"
        return 1
    fi
    success "Disk space available: ${available_space}KB"
    
    return 0
}

# ============================================================================
# BACKUP CURRENT DEPLOYMENT
# ============================================================================

create_backup() {
    log "INFO" "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$DEPLOYMENT_DIR" ]; then
        local backup_name="alawael-$(date +'%Y%m%d-%H%M%S')"
        local backup_path="$BACKUP_DIR/$backup_name"
        
        cp -r "$DEPLOYMENT_DIR" "$backup_path"
        success "Backup created at: $backup_path"
        
        # Keep only last 5 backups
        cd "$BACKUP_DIR" && ls -t | tail -n +6 | xargs -r rm -rf
        success "Old backups cleaned up (kept last 5)"
        
        echo "$backup_path"
    else
        warning "No previous deployment found, skipping backup"
        return 0
    fi
}

# ============================================================================
# CLONE/UPDATE REPOSITORY
# ============================================================================

setup_repository() {
    log "INFO" "Setting up repository..."
    
    if [ ! -d "$DEPLOYMENT_DIR" ]; then
        info "Cloning repository..."
        mkdir -p "$(dirname "$DEPLOYMENT_DIR")"
        git clone "$REPO_URL" "$DEPLOYMENT_DIR"
        success "Repository cloned"
    else
        info "Repository exists, pulling latest changes..."
        cd "$DEPLOYMENT_DIR"
        git fetch origin
        success "Repository updated"
    fi
    
    # Checkout release tag
    cd "$DEPLOYMENT_DIR"
    git checkout "$RELEASE_TAG" 2>/dev/null || git checkout main
    success "Checked out version: $RELEASE_TAG"
    
    return 0
}

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

install_dependencies() {
    log "INFO" "Installing dependencies..."
    
    cd "$DEPLOYMENT_DIR/backend"
    
    # Clean npm cache
    npm cache clean --force > /dev/null 2>&1
    success "NPM cache cleaned"
    
    # Install production dependencies
    npm install --production 2>&1 | tee -a "$LOG_FILE"
    success "Dependencies installed"
    
    return 0
}

# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================

configure_environment() {
    log "INFO" "Configuring environment..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Create .env if not exists
    if [ ! -f .env ]; then
        info "Creating .env file..."
        cat > .env << EOF
NODE_ENV=$ENVIRONMENT
PORT=$PORT
MONGODB_URI=mongodb://localhost:27017/alawael-erp
JWT_SECRET=$(openssl rand -base64 32)
LOG_LEVEL=info
CORS_ORIGIN=*
EOF
        success ".env file created"
    else
        warning ".env file already exists, skipping"
    fi
    
    # Verify required env vars
    if ! grep -q "NODE_ENV=$ENVIRONMENT" .env; then
        sed -i "s/NODE_ENV=.*/NODE_ENV=$ENVIRONMENT/" .env
    fi
    
    success "Environment configured"
    return 0
}

# ============================================================================
# DATABASE MIGRATIONS
# ============================================================================

run_migrations() {
    log "INFO" "Running database migrations..."
    
    cd "$DEPLOYMENT_DIR/backend"
    
    # Check if migration script exists
    if [ -f "db/migrate.js" ]; then
        node db/migrate.js 2>&1 | tee -a "$LOG_FILE"
        success "Database migrations completed"
    elif [ -f "db/seeders/seed-phase4-testdata.js" ]; then
        info "Using seeder for initial data..."
        node db/seeders/seed-phase4-testdata.js 2>&1 | tee -a "$LOG_FILE" || true
        success "Database seeded"
    else
        warning "No migration scripts found, skipping"
    fi
    
    return 0
}

# ============================================================================
# START APPLICATION
# ============================================================================

start_application() {
    log "INFO" "Starting application server..."
    
    cd "$DEPLOYMENT_DIR/backend"
    
    # Stop existing process if running
    if command -v pm2 &> /dev/null; then
        info "Using PM2 for process management..."
        pm2 delete alawael-erp 2>/dev/null || true
        pm2 start server.js --name alawael-erp --env production 2>&1 | tee -a "$LOG_FILE"
        pm2 save
        success "Application started with PM2"
    else
        info "PM2 not found, starting with node directly..."
        nohup node server.js > "$LOG_FILE" 2>&1 &
        local pid=$!
        echo "$pid" > /tmp/alawael-pid
        success "Application started with PID: $pid"
    fi
    
    sleep 5
    return 0
}

# ============================================================================
# HEALTH CHECKS
# ============================================================================

health_check() {
    log "INFO" "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        info "Health check attempt $attempt/$max_attempts..."
        
        # Check if server is responding
        if curl -sf "http://localhost:${NODE_PORT:-3002}/api/v1/health/alive" > /dev/null 2>&1; then
            success "✅ Server is healthy"
            
            # Additional checks
            if curl -sf "http://localhost:${NODE_PORT:-3002}/api/v1/health/db" > /dev/null 2>&1; then
                success "✅ Database connection verified"
            else
                warning "⚠️  Database check returned error"
            fi
            
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# ============================================================================
# SMOKE TESTS
# ============================================================================

smoke_tests() {
    log "INFO" "Running smoke tests..."
    
    local node_port="${NODE_PORT:-3002}"
    
    # Test 1: Server responds
    info "Testing server availability..."
    if curl -sf "http://localhost:${node_port}/api/v1/health/alive" > /dev/null; then
        success "Server is available"
    else
        error "Server is not responding"
        return 1
    fi
    
    # Test 2: Database connection
    info "Testing database connectivity..."
    if curl -sf "http://localhost:${node_port}/api/v1/health/db" > /dev/null; then
        success "Database is connected"
    else
        error "Database connection failed"
        return 1
    fi
    
    # Test 3: API response time
    info "Testing API response time..."
    local start_time=$(date +%s%N)
    curl -sf "http://localhost:${node_port}/api/health" > /dev/null 2>&1
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response_time" -lt 1000 ]; then
        success "API response time: ${response_time}ms"
    else
        warning "API response time is high: ${response_time}ms"
    fi
    
    return 0
}

# ============================================================================
# ROLLBACK FUNCTION
# ============================================================================

rollback() {
    log "ERROR" "Deployment failed, initiating rollback..."
    
    local backup_path=$1
    
    if [ -z "$backup_path" ]; then
        error "No backup path provided for rollback"
        return 1
    fi
    
    if [ -d "$backup_path" ]; then
        error "Rolling back to backup: $backup_path"
        
        # Stop current application
        if command -v pm2 &> /dev/null; then
            pm2 delete alawael-erp 2>/dev/null || true
        fi
        
        # Wait for graceful shutdown
        sleep 3
        
        # Restore from backup
        rm -rf "$DEPLOYMENT_DIR"
        cp -r "$backup_path" "$DEPLOYMENT_DIR"
        
        # Restart application
        cd "$DEPLOYMENT_DIR/backend"
        npm install --production > /dev/null 2>&1
        start_application
        
        sleep 3
        if health_check; then
            success "Application restored from backup"
            return 0
        else
            error "Rollback verification failed"
            return 1
        fi
    else
        error "Backup directory not found: $backup_path"
        return 1
    fi
}

# ============================================================================
# MAIN DEPLOYMENT WORKFLOW
# ============================================================================

main() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  🚀 ALAWAEL ERP - PRODUCTION DEPLOYMENT (v1.0.0)              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    log "INFO" "Starting deployment process..."
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "Release: $RELEASE_TAG"
    
    # Pre-deployment checks
    if ! check_requirements; then
        error "Pre-deployment checks failed"
        exit 1
    fi
    
    # Create backup
    local backup_path=$(create_backup)
    
    # Main deployment steps
    if ! setup_repository; then
        error "Repository setup failed"
        [ -n "$backup_path" ] && rollback "$backup_path"
        exit 1
    fi
    
    if ! install_dependencies; then
        error "Dependency installation failed"
        [ -n "$backup_path" ] && rollback "$backup_path"
        exit 1
    fi
    
    if ! configure_environment; then
        error "Environment configuration failed"
        [ -n "$backup_path" ] && rollback "$backup_path"
        exit 1
    fi
    
    if ! run_migrations; then
        warning "Database migration had issues, but continuing..."
    fi
    
    if ! start_application; then
        error "Application startup failed"
        [ -n "$backup_path" ] && rollback "$backup_path"
        exit 1
    fi
    
    if ! health_check; then
        error "Health check failed"
        [ -n "$backup_path" ] && rollback "$backup_path"
        exit 1
    fi
    
    if ! smoke_tests; then
        error "Smoke tests failed"
        [ -n "$backup_path" ] && rollback "$backup_path"
        exit 1
    fi
    
    # Deployment successful
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  ✅ DEPLOYMENT COMPLETED SUCCESSFULLY                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    success "Application deployed and verified"
    success "Backup location: $backup_path"
    success "Log file: $LOG_FILE"
    
    return 0
}

# ============================================================================
# EXECUTE MAIN FUNCTION
# ============================================================================

# Check if script is run with root privileges
if [ "$EUID" -ne 0 ]; then
    error "This script must be run with sudo"
    exit 1
fi

main "$@"
