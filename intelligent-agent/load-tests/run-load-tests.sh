#!/bin/bash

# Load Testing Suite for Intelligent Agent
# Requires: k6 (https://k6.io)
# Usage: ./run-load-tests.sh [api|frontend|all] [--base-url URL]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TEST_TYPE=${1:-all}
BASE_URL=${BASE_URL:-http://localhost:5000}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
RESULTS_DIR="load-test-results"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Intelligent Agent - Load Testing Suite${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo -e "${YELLOW}⚠️  k6 not found. Installing...${NC}"
  echo "Visit https://k6.io/docs/getting-started/installation/ for installation instructions"
  exit 1
fi

echo -e "${GREEN}✓ k6 found${NC}\n"

# Function to run test
run_test() {
  local test_name=$1
  local test_file=$2
  local base_url=$3
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local result_file="$RESULTS_DIR/${test_name}_${timestamp}.json"

  echo -e "${YELLOW}Running: ${test_name}${NC}"
  echo -e "${YELLOW}Test File: ${test_file}${NC}"
  echo -e "${YELLOW}Base URL: ${base_url}${NC}"
  echo -e "${YELLOW}Results: ${result_file}${NC}"
  echo ""

  # Run k6 test
  k6 run \
    --vus 10 \
    --duration 30s \
    --out json="$result_file" \
    -e BASE_URL="$base_url" \
    "$test_file" || {
      echo -e "${RED}✗ Test failed${NC}"
      return 1
    }

  echo -e "${GREEN}✓ Test completed${NC}"
  echo -e "${GREEN}  Results saved: ${result_file}${NC}\n"

  return 0
}

# Function to run stress test
run_stress_test() {
  local test_name=$1
  local test_file=$2
  local base_url=$3
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local result_file="$RESULTS_DIR/${test_name}_stress_${timestamp}.json"

  echo -e "${YELLOW}Running Stress Test: ${test_name}${NC}"
  echo -e "${YELLOW}Ramping to 1000 virtual users...${NC}"
  echo ""

  k6 run \
    --vus 100 \
    --duration 5m \
    --out json="$result_file" \
    -e BASE_URL="$base_url" \
    "$test_file" || {
      echo -e "${RED}✗ Stress test failed${NC}"
      return 1
    }

  echo -e "${GREEN}✓ Stress test completed${NC}"
  echo -e "${GREEN}  Results saved: ${result_file}${NC}\n"
}

# Run selected tests
case $TEST_TYPE in
  api)
    echo -e "${BLUE}Testing API Endpoints${NC}\n"
    run_test "API-Load-Test" "api-load-test.js" "$BASE_URL"
    ;;
  frontend)
    echo -e "${BLUE}Testing Frontend${NC}\n"
    run_test "Frontend-Load-Test" "frontend-load-test.js" "$FRONTEND_URL"
    ;;
  all)
    echo -e "${BLUE}Running Complete Load Test Suite${NC}\n"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}1. API Load Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    run_test "API-Load-Test" "api-load-test.js" "$BASE_URL"

    sleep 5

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}2. Frontend Load Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    run_test "Frontend-Load-Test" "frontend-load-test.js" "$FRONTEND_URL"

    sleep 5

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}3. Stress Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    read -p "Run stress test? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      run_stress_test "API-Stress-Test" "api-load-test.js" "$BASE_URL"
    fi
    ;;
  *)
    echo -e "${YELLOW}Unknown test type: $TEST_TYPE${NC}"
    echo "Usage: ./run-load-tests.sh [api|frontend|all]"
    exit 1
    ;;
esac

# Summary
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Load Testing Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "\nTest Results Location: ${RESULTS_DIR}/"
echo -e "\nTo analyze results:"
echo -e "  k6 stats ${RESULTS_DIR}/*.json"
echo -e "\nTo compare results:"
echo -e "  k6 stats --format=json ${RESULTS_DIR}/*.json | jq"
