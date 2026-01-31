#!/bin/bash

# Intelligent Agent - Rollback Script
# Usage: ./rollback.sh [environment] [revision]
# Example: ./rollback.sh production 2

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT=${1:-production}
REVISION=${2}
NAMESPACE="${ENVIRONMENT}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Intelligent Agent Rollback${NC}"
echo -e "${YELLOW}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}========================================${NC}"

# Function to show deployment history
show_history() {
    echo -e "\n${YELLOW}Deployment History - Frontend:${NC}"
    kubectl rollout history deployment/intelligent-agent-frontend -n $NAMESPACE
    
    echo -e "\n${YELLOW}Deployment History - Backend:${NC}"
    kubectl rollout history deployment/intelligent-agent-backend -n $NAMESPACE
}

# Function to perform rollback
perform_rollback() {
    echo -e "\n${RED}WARNING: This will rollback the deployment!${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Rollback cancelled${NC}"
        exit 0
    fi
    
    echo -e "\n${YELLOW}Rolling back deployments...${NC}"
    
    if [ -z "$REVISION" ]; then
        # Rollback to previous version
        kubectl rollout undo deployment/intelligent-agent-frontend -n $NAMESPACE
        kubectl rollout undo deployment/intelligent-agent-backend -n $NAMESPACE
    else
        # Rollback to specific revision
        kubectl rollout undo deployment/intelligent-agent-frontend -n $NAMESPACE --to-revision=$REVISION
        kubectl rollout undo deployment/intelligent-agent-backend -n $NAMESPACE --to-revision=$REVISION
    fi
    
    echo -e "${GREEN}✓ Rollback initiated${NC}"
}

# Function to wait for rollback completion
wait_for_rollback() {
    echo -e "\n${YELLOW}Waiting for rollback to complete...${NC}"
    
    kubectl rollout status deployment/intelligent-agent-frontend -n $NAMESPACE --timeout=5m
    kubectl rollout status deployment/intelligent-agent-backend -n $NAMESPACE --timeout=5m
    
    echo -e "${GREEN}✓ Rollback completed${NC}"
}

# Function to verify rollback
verify_rollback() {
    echo -e "\n${YELLOW}Verifying rollback...${NC}"
    
    sleep 20
    
    # Check frontend health
    FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l component=frontend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n $NAMESPACE $FRONTEND_POD -- curl -f http://localhost/health || {
        echo -e "${RED}ERROR: Frontend health check failed after rollback${NC}"
        exit 1
    }
    
    # Check backend health
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l component=backend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:5000/api/health || {
        echo -e "${RED}ERROR: Backend health check failed after rollback${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Verification passed${NC}"
}

# Main function
main() {
    show_history
    perform_rollback
    wait_for_rollback
    verify_rollback
    
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  Rollback Completed Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    echo -e "\n${YELLOW}Current Pod Status:${NC}"
    kubectl get pods -n $NAMESPACE
}

main
