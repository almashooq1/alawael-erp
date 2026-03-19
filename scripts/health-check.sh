#!/bin/bash

###############################################################################
# Health Check Script for Alawael System
# Checks API endpoints and services health
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="/api/health"
TIMEOUT=10
MAX_RETRIES=5
RETRY_DELAY=3

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🏥 Health Check - Alawael System${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local service_name=$2
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        echo -e "${YELLOW}[$(($retry_count + 1))/$MAX_RETRIES]${NC} Checking $service_name..."
        
        if curl -f -s -m $TIMEOUT "$API_URL$endpoint" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}⏳ Retrying in ${RETRY_DELAY}s...${NC}"
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    echo -e "${RED}❌ $service_name health check failed${NC}"
    return 1
}

# Function to check database
check_database() {
    echo ""
    echo -e "${YELLOW}🗄️  Database Check:${NC}"
    
    if [ ! -z "$DATABASE_URL" ]; then
        echo -e "${GREEN}✓ DATABASE_URL configured: $DATABASE_URL${NC}"
    else
        echo -e "${YELLOW}⚠️  DATABASE_URL not configured${NC}"
    fi
    
    if [ ! -z "$MONGODB_URI" ]; then
        echo -e "${GREEN}✓ MongoDB is configured${NC}"
    fi
}

# Function to check redis
check_redis() {
    echo ""
    echo -e "${YELLOW}📫 Redis Check:${NC}"
    
    if [ ! -z "$REDIS_URL" ]; then
        echo -e "${GREEN}✓ REDIS_URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  REDIS_URL not configured${NC}"
    fi
}

# Main health checks
main() {
    echo -e "${YELLOW}🔍 Checking API Endpoints:${NC}"
    echo ""
    
    # Check main health endpoint
    if check_endpoint "$HEALTH_ENDPOINT" "API Health"; then
        health_status="✅ HEALTHY"
    else
        health_status="❌ UNHEALTHY"
    fi
    
    # Check database
    check_database
    
    # Check redis
    check_redis
    
    # Summary
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}📊 Health Check Summary:${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "API Status: $health_status"
    echo -e "API URL: ${BLUE}$API_URL${NC}"
    echo -e "Timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    if [ "$health_status" = "✅ HEALTHY" ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main
