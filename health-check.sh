#!/bin/bash

# Health Check & Verification Script for v1.0.0
# Complete post-deployment verification

set -e

echo "🏥 Alawael v1.0.0 Health Check & Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
API_URL=${1:-"http://localhost:3000"}
CRITICAL_CHECKS=0
WARNING_CHECKS=0
PASSED_CHECKS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking: $API_URL"
echo ""

# Function to print results
check_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=$3
    
    echo -n "  ✓ $name..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")
    
    if [ "$response" == "$expected_status" ]; then
        echo -e " ${GREEN}PASS${NC} (HTTP $response)"
        ((PASSED_CHECKS++))
    else
        echo -e " ${RED}FAIL${NC} (HTTP $response, expected $expected_status)"
        ((CRITICAL_CHECKS++))
    fi
}

check_response_time() {
    local name=$1
    local endpoint=$2
    local max_time=$3
    
    echo -n "  ⏱️  $name..."
    
    local time_ms=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL$endpoint" | awk '{print int($1 * 1000)}')
    
    if [ "$time_ms" -lt "$max_time" ]; then
        echo -e " ${GREEN}PASS${NC} (${time_ms}ms)"
        ((PASSED_CHECKS++))
    else
        echo -e " ${YELLOW}SLOW${NC} (${time_ms}ms, target < ${max_time}ms)"
        ((WARNING_CHECKS++))
    fi
}

check_json_field() {
    local name=$1
    local endpoint=$2
    local field=$3
    
    echo -n "  📋 $name..."
    
    local response=$(curl -s "$API_URL$endpoint")
    
    if echo "$response" | jq -e "$field" > /dev/null 2>&1; then
        echo -e " ${GREEN}PASS${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e " ${RED}FAIL${NC}"
        ((CRITICAL_CHECKS++))
    fi
}

# ====== Connectivity Tests ======
echo "📡 Connectivity Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
check_endpoint "Health Check" "/api/health" "200"
check_endpoint "API Status" "/api/stats" "200"
echo ""

# ====== Response Time Tests ======
echo "⚡ Response Time Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
check_response_time "Health Check Response" "/api/health" "500"
check_response_time "Stats Response" "/api/stats" "1000"
echo ""

# ====== API Functionality Tests ======
echo "✨ API Functionality Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_endpoint "Authentication Available" "/api/auth/login" "200"
check_endpoint "Products Endpoint" "/api/products" "200"
check_endpoint "Users Endpoint" "/api/users" "200"
check_endpoint "Orders Endpoint" "/api/orders" "200"
check_endpoint "ML Predictions" "/api/ml/demand-forecast" "200"
check_endpoint "Analytics" "/api/analytics" "200"
echo ""

# ====== Response Structure Tests ======
echo "🔍 Response Structure Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_json_field "Health status field" "/api/health" ".status"
check_json_field "API version field" "/api/stats" ".version"
check_json_field "Database status" "/api/stats" ".database"
echo ""

# ====== Database Tests ======
echo "🗄️  Database Tests"
echo "━━━━━━━━━━━━━━━━"
check_json_field "Database connected" "/api/stats" '.database == "connected"'
check_json_field "Database response time" "/api/stats" ".dbResponseTime"
echo ""

# ====== Authentication Tests ======
echo "🔐 Authentication Tests"
echo "━━━━━━━━━━━━━━━━━━━━━"
echo -n "  🔑 Authentication endpoint available..."
local auth_response=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -o /dev/null -w "%{http_code}")

if [ "$auth_response" == "200" ] || [ "$auth_response" == "400" ] || [ "$auth_response" == "401" ]; then
    echo -e " ${GREEN}PASS${NC}"
    ((PASSED_CHECKS++))
else
    echo -e " ${RED}FAIL${NC}"
    ((CRITICAL_CHECKS++))
fi
echo ""

# ====== Summary ======
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ✅ Passed:    ${GREEN}$PASSED_CHECKS${NC}"
echo -e "  ⚠️  Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
echo -e "  ❌ Critical:  ${RED}$CRITICAL_CHECKS${NC}"
echo ""

TOTAL=$((PASSED_CHECKS + WARNING_CHECKS + CRITICAL_CHECKS))
SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL))

echo "🎯 Success Rate: $SUCCESS_RATE%"
echo ""

if [ $CRITICAL_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment Verification PASSED${NC}"
    echo "System is ready for production use"
    exit 0
else
    echo -e "${RED}❌ Deployment Verification FAILED${NC}"
    echo "Please check the errors above"
    exit 1
fi
