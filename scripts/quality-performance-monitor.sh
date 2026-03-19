#!/bin/bash

# ALAWAEL Quality Performance Monitor
# Tracks and analyzes quality check execution times and trends

set -e

METRICS_DIR="${PWD}/.quality-metrics"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
METRICS_FILE="${METRICS_DIR}/metrics_${TIMESTAMP}.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

print_header() {
    echo -e "${BLUE}════════════════════════════════════════${RESET}"
    echo -e "${BLUE}$1${RESET}"
    echo -e "${BLUE}════════════════════════════════════════${RESET}"
}

print_metric() {
    echo -e "${CYAN}$1:${RESET} $2"
}

# Initialize metrics directory
mkdir -p "${METRICS_DIR}"

# Function to run and measure a quality check
measure_quality_check() {
    local service=$1
    local script=$2
    local description=$3
    local cwd=$4

    echo -e "${YELLOW}⏱️  Measuring $description...${RESET}"

    local start=$(date +%s.%N)

    if (cd "$cwd" && $script > /dev/null 2>&1); then
        local end=$(date +%s.%N)
        local duration=$(echo "$end - $start" | bc)
        echo -e "${GREEN}✅ ${description}: ${duration}s${RESET}"
        echo "$duration"
    else
        echo -e "${RED}❌ ${description} failed${RESET}"
        echo "-1"
    fi
}

# Main monitoring function
main() {
    print_header "ALAWAEL Quality Performance Analysis"

    local backend_ci_time=$(measure_quality_check "backend" "npm run quality:ci" "Backend CI (strict)" "backend")
    local backend_push_time=$(measure_quality_check "backend" "npm run quality:push" "Backend Push (fast)" "backend")
    local graphql_time=$(measure_quality_check "graphql" "npm run quality" "GraphQL Quality" "graphql")
    local finance_time=$(measure_quality_check "finance" "npm run quality" "Finance Quality" "finance-module/backend")
    local supply_chain_time=$(measure_quality_check "supply-chain" "npm run quality" "Supply Chain Quality" "supply-chain-management/backend")

    echo ""
    print_header "Performance Summary"

    # Calculate total
    local total_time=0
    if [ "$backend_ci_time" != "-1" ]; then
        total_time=$(echo "$total_time + $backend_ci_time" | bc)
    fi
    if [ "$graphql_time" != "-1" ]; then
        total_time=$(echo "$total_time + $graphql_time" | bc)
    fi
    if [ "$finance_time" != "-1" ]; then
        total_time=$(echo "$total_time + $finance_time" | bc)
    fi
    if [ "$supply_chain_time" != "-1" ]; then
        total_time=$(echo "$total_time + $supply_chain_time" | bc)
    fi

    echo ""
    print_metric "Backend CI" "${backend_ci_time}s"
    print_metric "Backend Push" "${backend_push_time}s"
    print_metric "GraphQL" "${graphql_time}s"
    print_metric "Finance" "${finance_time}s"
    print_metric "Supply Chain" "${supply_chain_time}s"
    print_metric "Total Sequential" "${total_time}s"

    # Save metrics
    cat > "$METRICS_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "metrics": {
    "backend_ci_seconds": $backend_ci_time,
    "backend_push_seconds": $backend_push_time,
    "graphql_seconds": $graphql_time,
    "finance_seconds": $finance_time,
    "supply_chain_seconds": $supply_chain_time,
    "total_sequential_seconds": $total_time,
    "estimated_parallel_seconds": $(echo "scale=2; (($backend_ci_time > $graphql_time ? $backend_ci_time : $graphql_time) > $finance_time ? ($backend_ci_time > $graphql_time ? $backend_ci_time : $graphql_time) : $finance_time) > $supply_chain_time ? (($backend_ci_time > $graphql_time ? $backend_ci_time : $graphql_time) > $finance_time ? ($backend_ci_time > $graphql_time ? $backend_ci_time : $graphql_time) : $finance_time) : $supply_chain_time" | bc)
  }
}
EOF

    echo ""
    print_header "Metrics Saved"
    echo -e "${GREEN}Metrics file: ${CYAN}${METRICS_FILE}${RESET}"

    echo ""
    echo -e "${YELLOW}📊 Recent Performance Trend:${RESET}"
    ls -lt "${METRICS_DIR}"/metrics_*.json 2>/dev/null | head -5 | awk '{print $9}' | while read file; do
        [ -f "$file" ] && echo "  - $(basename $file)"
    done
}

# Run analysis
main "$@"
