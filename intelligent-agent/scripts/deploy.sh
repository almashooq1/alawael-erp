#!/bin/bash

# Intelligent Agent - Production Deployment Script
# Usage: ./deploy.sh [environment] [version]
# Example: ./deploy.sh production v1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
NAMESPACE="${ENVIRONMENT}"
KUBECTL="kubectl"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Intelligent Agent Deployment${NC}"
echo -e "${GREEN}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}  Version: ${VERSION}${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}Checking prerequisites...${NC}"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}ERROR: kubectl is not installed${NC}"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}ERROR: Docker is not installed${NC}"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}ERROR: Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Function to create namespace
create_namespace() {
    echo -e "\n${YELLOW}Creating namespace...${NC}"
    kubectl apply -f k8s/namespace.yaml
    echo -e "${GREEN}✓ Namespace created${NC}"
}

# Function to apply secrets
apply_secrets() {
    echo -e "\n${YELLOW}Applying secrets...${NC}"
    
    # Check if secrets file exists
    if [ ! -f "k8s/secrets.yaml" ]; then
        echo -e "${RED}ERROR: secrets.yaml not found${NC}"
        exit 1
    fi
    
    # Warning about secrets
    echo -e "${YELLOW}WARNING: Make sure you've updated all CHANGE_ME values in secrets.yaml${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
    
    kubectl apply -f k8s/secrets.yaml -n $NAMESPACE
    echo -e "${GREEN}✓ Secrets applied${NC}"
}

# Function to apply configmaps
apply_configmaps() {
    echo -e "\n${YELLOW}Applying configmaps...${NC}"
    kubectl apply -f k8s/configmap.yaml -n $NAMESPACE
    echo -e "${GREEN}✓ ConfigMaps applied${NC}"
}

# Function to build and push images
build_and_push() {
    echo -e "\n${YELLOW}Building and pushing Docker images...${NC}"
    
    # Build frontend
    echo -e "${YELLOW}Building frontend image...${NC}"
    docker build -t ghcr.io/intelligent-agent/frontend:$VERSION ./frontend
    docker push ghcr.io/intelligent-agent/frontend:$VERSION
    
    # Build backend
    echo -e "${YELLOW}Building backend image...${NC}"
    docker build -t ghcr.io/intelligent-agent/backend:$VERSION ./backend
    docker push ghcr.io/intelligent-agent/backend:$VERSION
    
    echo -e "${GREEN}✓ Images built and pushed${NC}"
}

# Function to deploy application
deploy_application() {
    echo -e "\n${YELLOW}Deploying application...${NC}"
    
    # Update image tags in deployment
    sed -i "s/:latest/:$VERSION/g" k8s/deployment.yaml
    
    # Apply deployments
    kubectl apply -f k8s/deployment.yaml -n $NAMESPACE
    
    # Apply services
    kubectl apply -f k8s/service.yaml -n $NAMESPACE
    
    # Apply ingress
    kubectl apply -f k8s/ingress.yaml -n $NAMESPACE
    
    # Apply HPA
    kubectl apply -f k8s/hpa.yaml -n $NAMESPACE
    
    echo -e "${GREEN}✓ Application deployed${NC}"
}

# Function to wait for rollout
wait_for_rollout() {
    echo -e "\n${YELLOW}Waiting for deployment rollout...${NC}"
    
    kubectl rollout status deployment/intelligent-agent-frontend -n $NAMESPACE --timeout=10m
    kubectl rollout status deployment/intelligent-agent-backend -n $NAMESPACE --timeout=10m
    
    echo -e "${GREEN}✓ Rollout completed${NC}"
}

# Function to run health checks
run_health_checks() {
    echo -e "\n${YELLOW}Running health checks...${NC}"
    
    # Wait for pods to be ready
    sleep 30
    
    # Check frontend health
    FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l component=frontend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n $NAMESPACE $FRONTEND_POD -- curl -f http://localhost/health || {
        echo -e "${RED}ERROR: Frontend health check failed${NC}"
        exit 1
    }
    
    # Check backend health
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l component=backend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:5000/api/health || {
        echo -e "${RED}ERROR: Backend health check failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Health checks passed${NC}"
}

# Function to display deployment info
display_info() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Completed Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    echo -e "\n${YELLOW}Deployment Information:${NC}"
    echo -e "Environment: ${ENVIRONMENT}"
    echo -e "Version: ${VERSION}"
    echo -e "Namespace: ${NAMESPACE}"
    
    echo -e "\n${YELLOW}Pod Status:${NC}"
    kubectl get pods -n $NAMESPACE
    
    echo -e "\n${YELLOW}Service Status:${NC}"
    kubectl get services -n $NAMESPACE
    
    echo -e "\n${YELLOW}Ingress Status:${NC}"
    kubectl get ingress -n $NAMESPACE
    
    echo -e "\n${YELLOW}Access URLs:${NC}"
    echo -e "Frontend: https://intelligent-agent.com"
    echo -e "Backend API: https://api.intelligent-agent.com"
    
    echo -e "\n${GREEN}========================================${NC}"
}

# Main deployment flow
main() {
    check_prerequisites
    create_namespace
    apply_secrets
    apply_configmaps
    
    # Ask if images should be built
    read -p "Build and push new images? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_and_push
    fi
    
    deploy_application
    wait_for_rollout
    run_health_checks
    display_info
}

# Run main function
main
