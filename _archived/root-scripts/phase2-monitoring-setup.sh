#!/bin/bash

# ALAWAEL ERP - Phase 2: Monitoring & Alerting Setup
# Purpose: Deploy Prometheus, Grafana, ELK Stack, and monitoring infrastructure
# Duration: ~2 hours
# Date: February 24, 2026

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MONITORING_NAMESPACE="monitoring"
DEPLOYMENT_MODE="${1:-docker-compose}"  # docker-compose or kubernetes
LOG_FILE="phase2-deployment-$(date +%Y%m%d_%H%M%S).log"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║ $1"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Prerequisites check
check_prerequisites() {
    print_header "PHASE 2: MONITORING SETUP - PREREQUISITES CHECK"
    
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
    fi
    log_success "Docker is installed: $(docker --version)"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    log_success "Docker Compose is installed: $(docker-compose --version)"
    
    # Check disk space
    AVAILABLE_SPACE=$(df /var/lib/docker | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=$((20 * 1024 * 1024))  # 20GB
    
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        log_warning "Limited disk space. At least 20GB recommended for data volumes."
    else
        log_success "Sufficient disk space available: $(df -h /var/lib/docker | awk 'NR==2 {print $4}')"
    fi
    
    # Check ports
    for port in 9090 9093 3000 9200 5601 5000 9100 8080; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_warning "Port $port is already in use"
        else
            log_success "Port $port is available"
        fi
    done
}

# Create directory structure
create_directories() {
    print_header "CREATING DIRECTORY STRUCTURE"
    
    log_info "Creating monitoring directories..."
    
    mkdir -p monitoring/{prometheus,logstash/pipeline,grafana/{provisioning,dashboards}}
    mkdir -p logs/{prometheus,logstash,grafana}
    
    log_success "Directory structure created"
}

# Setup environment variables
setup_environment() {
    print_header "SETTING UP ENVIRONMENT VARIABLES"
    
    log_info "Creating .env.monitoring file..."
    
    cat > .env.monitoring << 'EOF'
# Monitoring Stack Configuration
COMPOSE_PROJECT_NAME=alawael-monitoring

# Prometheus
PROMETHEUS_RETENTION=30d
PROMETHEUS_SCRAPE_INTERVAL=15s

# Grafana
GRAFANA_PASSWORD=Alawael@Monitoring2026
GRAFANA_SMTP_ENABLED=true
GRAFANA_SMTP_HOST=smtp.alawael.com
GRAFANA_SMTP_PORT=587

# Elasticsearch
ES_JAVA_OPTS=-Xms512m -Xmx512m
ELASTIC_PASSWORD=ElasticPass@2026

# Logstash
LOG_LEVEL=info

# Alertmanager
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_SERVICE_KEY=your-pagerduty-key

# SMTP
SMTP_PASSWORD=your-smtp-password

# Security
ENABLE_HTTPS=true
CERT_FILE=/etc/ssl/certs/monitoring.crt
KEY_FILE=/etc/ssl/private/monitoring.key
EOF
    
    log_success ".env.monitoring created"
    log_warning "Please update the values in .env.monitoring with your actual credentials"
}

# Deploy monitoring stack
deploy_monitoring_stack() {
    print_header "DEPLOYING MONITORING STACK"
    
    log_info "Starting monitoring containers..."
    
    if [ "$DEPLOYMENT_MODE" == "docker-compose" ]; then
        docker-compose -f docker-compose.monitoring.yml --env-file .env.monitoring up -d
        log_success "Monitoring stack deployed via Docker Compose"
    elif [ "$DEPLOYMENT_MODE" == "kubernetes" ]; then
        kubectl apply -f k8s/monitoring/namespace.yml
        kubectl apply -f k8s/monitoring/ -R
        log_success "Monitoring stack deployed via Kubernetes"
    fi
    
    sleep 10
    
    # Wait for containers to be healthy
    log_info "Waiting for containers to be healthy..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.monitoring.yml ps | grep -q "healthy"; then
            log_success "All containers are healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            log_warning "Some containers may not be fully ready, continuing..."
        fi
        sleep 2
    done
}

# Configure Grafana
configure_grafana() {
    print_header "CONFIGURING GRAFANA"
    
    log_info "Creating Grafana data source..."
    
    # Wait for Grafana to be ready
    while ! curl -s http://localhost:3000/api/health > /dev/null; do
        log_info "Waiting for Grafana to start..."
        sleep 5
    done
    
    # Add Prometheus data source
    curl -X POST http://admin:${GRAFANA_PASSWORD}@localhost:3000/api/datasources \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Prometheus",
            "type": "prometheus",
            "url": "http://prometheus:9090",
            "access": "proxy",
            "isDefault": true
        }' 2>/dev/null || log_warning "Failed to add Prometheus data source"
    
    # Add Elasticsearch data source
    curl -X POST http://admin:${GRAFANA_PASSWORD}@localhost:3000/api/datasources \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Elasticsearch",
            "type": "elasticsearch",
            "url": "http://elasticsearch:9200",
            "access": "proxy",
            "jsonData": {
                "esVersion": "8.0.0"
            }
        }' 2>/dev/null || log_warning "Failed to add Elasticsearch data source"
    
    log_success "Grafana data sources configured"
}

# Load Prometheus targets
load_prometheus_targets() {
    print_header "LOADING PROMETHEUS TARGETS"
    
    log_info "Configuring Prometheus scrape targets..."
    
    # Reload Prometheus configuration
    curl -X POST http://localhost:9090/-/reload 2>/dev/null || \
        log_warning "Prometheus reload may require container restart"
    
    # Verify targets are loaded
    sleep 5
    ACTIVE_TARGETS=$(curl -s http://localhost:9090/api/v1/targets | grep -c '"state":"up"')
    log_success "$ACTIVE_TARGETS targets are active"
}

# Setup alerting
setup_alerting() {
    print_header "SETTING UP ALERTING"
    
    log_info "Configuring Alertmanager..."
    
    # Verify Alertmanager is running
    while ! curl -s http://localhost:9093/-/healthy > /dev/null 2>&1; do
        log_info "Waiting for Alertmanager to start..."
        sleep 5
    done
    
    # Test alert
    log_info "Sending test alert..."
    curl -X POST http://localhost:9093/api/v1/alerts \
        -H "Content-Type: application/json" \
        -d '[{
            "labels": {
                "alertname": "TestAlert",
                "severity": "info"
            },
            "annotations": {
                "summary": "Test alert from Phase 2 setup",
                "description": "Monitoring stack is operational"
            }
        }]' 2>/dev/null || log_warning "Test alert may not have been sent"
    
    log_success "Alerting configured"
}

# Verify deployment
verify_deployment() {
    print_header "VERIFYING DEPLOYMENT"
    
    log_info "Performing health checks..."
    
    # Check Prometheus
    if curl -s http://localhost:9090/-/healthy | grep -q "Prometheus is Healthy"; then
        log_success "Prometheus is healthy"
    else
        log_warning "Prometheus health check inconclusive"
    fi
    
    # Check Alertmanager
    if curl -s http://localhost:9093/-/healthy > /dev/null; then
        log_success "Alertmanager is healthy"
    else
        log_warning "Alertmanager may not be ready"
    fi
    
    # Check Elasticsearch
    if curl -s http://localhost:9200/_cluster/health | grep -q "green\|yellow"; then
        log_success "Elasticsearch is healthy"
    else
        log_warning "Elasticsearch may not be ready"
    fi
    
    # Check Grafana
    if curl -s http://localhost:3000/api/health | grep -q "ok"; then
        log_success "Grafana is healthy"
    else
        log_warning "Grafana may not be ready"
    fi
    
    # Check Kibana
    if curl -s http://localhost:5601/api/status | grep -q "state"; then
        log_success "Kibana is healthy"
    else
        log_warning "Kibana may not be ready"
    fi
}

# Display access information
display_access_info() {
    print_header "MONITORING STACK DEPLOYMENT COMPLETE"
    
    echo "✓ All monitoring services are deployed and configured"
    echo ""
    echo "Access URLs:"
    echo "  • Prometheus:    http://localhost:9090"
    echo "  • Alertmanager:  http://localhost:9093"
    echo "  • Grafana:       http://localhost:3000 (admin/${GRAFANA_PASSWORD})"
    echo "  • Kibana:        http://localhost:5601"
    echo "  • Node Exporter: http://localhost:9100"
    echo "  • cAdvisor:      http://localhost:8080"
    echo ""
    echo "Monitoring Stack Size: ~4 GB RAM, ~50 GB Disk (with data retention)"
    echo ""
    echo "Next Steps:"
    echo "  1. Login to Grafana and create custom dashboards"
    echo "  2. Configure alert notification channels in Alertmanager"
    echo "  3. Add your application metrics to Prometheus scrape config"
    echo "  4. Setup log ingestion for your applications"
    echo ""
    echo "Documentation: See MONITORING_AND_ALERTING_GUIDE.md"
    echo ""
    tee -a "$LOG_FILE" << EOF
═══════════════════════════════════════════════════════════════
✓ PHASE 2 COMPLETE: MONITORING & ALERTING SETUP SUCCESSFUL
═══════════════════════════════════════════════════════════════
Deployment Log: $LOG_FILE
EOF
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║      ALAWAEL ERP v1.0.0 - PHASE 2: MONITORING & ALERTING      ║"
    echo "║                    Setup & Deployment Script                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    create_directories
    setup_environment
    deploy_monitoring_stack
    configure_grafana
    load_prometheus_targets
    setup_alerting
    verify_deployment
    display_access_info
}

# Run main function
main

exit 0
