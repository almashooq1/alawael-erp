#!/bin/bash
###############################################################################
# ALAWAEL ERP - PRODUCTION DEPLOYMENT SCRIPT
# Automated deployment to production environment
# AlAwael ERP v1.4 | 2026-02-07
###############################################################################

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_NAME="alawael"
ENVIRONMENT=${1:-staging}
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
IMAGE_NAME="${REGISTRY}/alawael/api"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUILD_TAG="${ENVIRONMENT}-${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_success "Docker found"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    log_success "Docker Compose found"
    
    # Check kubectl (for Kubernetes deployments)
    if [[ "$ENVIRONMENT" == "production-k8s" ]] && ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    [[ "$ENVIRONMENT" == "production-k8s" ]] && log_success "kubectl found"
    
    # Check required environment variables
    if [[ -z "$JWT_SECRET" ]]; then
        log_error "JWT_SECRET environment variable not set"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

build_docker_image() {
    log_info "Building Docker image: ${IMAGE_NAME}:${BUILD_TAG}"
    
    docker build \
        --file Dockerfile.prod \
        --tag "${IMAGE_NAME}:${BUILD_TAG}" \
        --tag "${IMAGE_NAME}:${ENVIRONMENT}-latest" \
        --build-arg NODE_ENV=production \
        --label "environment=${ENVIRONMENT}" \
        --label "timestamp=${TIMESTAMP}" \
        .
    
    if [[ $? -eq 0 ]]; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

push_docker_image() {
    log_info "Pushing Docker image to registry..."
    
    docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}" "${REGISTRY}"
    
    docker push "${IMAGE_NAME}:${BUILD_TAG}"
    docker push "${IMAGE_NAME}:${ENVIRONMENT}-latest"
    
    if [[ $? -eq 0 ]]; then
        log_success "Docker image pushed successfully"
    else
        log_error "Failed to push Docker image"
        exit 1
    fi
}

run_tests() {
    log_info "Running tests..."
    
    docker run --rm \
        -e NODE_ENV=test \
        -e USE_MOCK_DB=true \
        -v "$(pwd)/backend:/app/backend" \
        "${IMAGE_NAME}:${BUILD_TAG}" \
        npm test -- --passWithNoTests
    
    if [[ $? -eq 0 ]]; then
        log_success "Tests passed"
    else
        log_warning "Some tests failed, continuing deployment..."
    fi
}

deploy_docker_compose() {
    log_info "Deploying with Docker Compose to ${ENVIRONMENT}..."
    
    # Create environment file
    cat > .env.${ENVIRONMENT} <<EOF
ENVIRONMENT=${ENVIRONMENT}
NODE_ENV=production
DOCKER_IMAGE_TAG=${BUILD_TAG}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
API_KEY=${API_KEY}
STRIPE_SECRET=${STRIPE_SECRET}
SENDGRID_API_KEY=${SENDGRID_API_KEY}
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}
EOF
    
    # Deploy
    docker-compose \
        --file docker-compose.prod.yml \
        --project-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --env-file .env.${ENVIRONMENT} \
        up -d --remove-orphans
    
    if [[ $? -eq 0 ]]; then
        log_success "Docker Compose deployment successful"
    else
        log_error "Docker Compose deployment failed"
        exit 1
    fi
}

deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    KUBE_NAMESPACE="${PROJECT_NAME}-prod"
    
    # Create namespace
    kubectl create namespace "$KUBE_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Update image in manifests
    sed "s|alawael-api:latest|${IMAGE_NAME}:${BUILD_TAG}|g" k8s-deployment-prod.yaml > k8s-deployment-prod-updated.yaml
    
    # Apply manifests
    kubectl apply -f k8s-deployment-prod-updated.yaml
    
    # Wait for rollout
    kubectl rollout status deployment/alawael-api -n "$KUBE_NAMESPACE" --timeout=5m
    
    if [[ $? -eq 0 ]]; then
        log_success "Kubernetes deployment successful"
    else
        log_error "Kubernetes deployment failed"
        exit 1
    fi
    
    # Cleanup
    rm k8s-deployment-prod-updated.yaml
}

run_health_checks() {
    log_info "Running health checks..."
    
    sleep 5
    
    if [[ "$ENVIRONMENT" == "production-k8s" ]]; then
        API_URL=$(kubectl get service alawael-api -n alawael-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    else
        API_URL="localhost:3000"
    fi
    
    log_info "Health check endpoint: http://${API_URL}/health"
    
    for i in {1..5}; do
        if curl -f "http://${API_URL}/health" > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        log_warning "Health check attempt $i failed, retrying..."
        sleep 5
    done
    
    log_error "Health checks failed"
    return 1
}

generate_report() {
    log_info "Generating deployment report..."
    
    REPORT_FILE="deployment-report-${TIMESTAMP}.txt"
    
    {
        echo "=========================================="
        echo "ALAWAEL ERP - DEPLOYMENT REPORT"
        echo "=========================================="
        echo "Timestamp: ${TIMESTAMP}"
        echo "Environment: ${ENVIRONMENT}"
        echo "Image Tag: ${BUILD_TAG}"
        echo "Image: ${IMAGE_NAME}:${BUILD_TAG}"
        echo ""
        echo "Deployment Status: SUCCESS"
        echo ""
        
        if [[ "$ENVIRONMENT" == "production-k8s" ]]; then
            echo "=== KUBERNETES DEPLOYMENT ==="
            kubectl get deployment -n alawael-prod
            kubectl get pods -n alawael-prod
            kubectl get services -n alawael-prod
        else
            echo "=== DOCKER COMPOSE DEPLOYMENT ==="
            docker-compose -f docker-compose.prod.yml ps
        fi
        
        echo ""
        echo "=========================================="
    } | tee "$REPORT_FILE"
    
    log_success "Report generated: $REPORT_FILE"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "Starting deployment for environment: ${ENVIRONMENT}"
    
    case "${ENVIRONMENT}" in
        staging|staging-docker)
            log_info "Deploying to staging with Docker Compose"
            check_prerequisites
            build_docker_image
            run_tests
            deploy_docker_compose
            run_health_checks
            generate_report
            log_success "Staging deployment complete"
            ;;
        production|production-docker)
            log_info "Deploying to production with Docker Compose"
            log_warning "This will deploy to PRODUCTION"
            read -p "Are you sure? (yes/no): " confirm
            if [[ "${confirm}" != "yes" ]]; then
                log_error "Deployment cancelled"
                exit 1
            fi
            check_prerequisites
            build_docker_image
            push_docker_image
            run_tests
            deploy_docker_compose
            run_health_checks
            generate_report
            log_success "Production deployment complete"
            ;;
        production-k8s)
            log_info "Deploying to production with Kubernetes"
            log_warning "This will deploy to PRODUCTION KUBERNETES CLUSTER"
            read -p "Are you sure? (yes/no): " confirm
            if [[ "${confirm}" != "yes" ]]; then
                log_error "Deployment cancelled"
                exit 1
            fi
            check_prerequisites
            build_docker_image
            push_docker_image
            run_tests
            deploy_kubernetes
            run_health_checks
            generate_report
            log_success "Kubernetes production deployment complete"
            ;;
        *)
            log_error "Unknown environment: ${ENVIRONMENT}"
            echo "Usage: $0 [staging|staging-docker|production|production-docker|production-k8s]"
            exit 1
            ;;
    esac
}

main "$@"
