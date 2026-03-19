#!/bin/bash

# ALAWAEL Coverage Analysis Tool
# Aggregates and analyzes test coverage across all services

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

print_header() {
    echo -e "${BLUE}════════════════════════════════════════════════════${RESET}"
    echo -e "${BLUE}$1${RESET}"
    echo -e "${BLUE}════════════════════════════════════════════════════${RESET}"
}

analyze_coverage() {
    local service=$1
    local coverage_dir=$2

    if [ ! -d "$coverage_dir" ]; then
        echo -e "${YELLOW}⚠️  Coverage directory not found for $service${RESET}"
        return
    fi

    # Extract coverage metrics if coverage/coverage-summary.json exists
    if [ -f "$coverage_dir/coverage-summary.json" ]; then
        local lines=$(jq '.total.lines.pct' "$coverage_dir/coverage-summary.json" 2>/dev/null || echo "N/A")
        local statements=$(jq '.total.statements.pct' "$coverage_dir/coverage-summary.json" 2>/dev/null || echo "N/A")
        local functions=$(jq '.total.functions.pct' "$coverage_dir/coverage-summary.json" 2>/dev/null || echo "N/A")
        local branches=$(jq '.total.branches.pct' "$coverage_dir/coverage-summary.json" 2>/dev/null || echo "N/A")

        echo -e "${CYAN}$service:${RESET}"
        echo "  Lines:       ${lines}%"
        echo "  Statements:  ${statements}%"
        echo "  Functions:   ${functions}%"
        echo "  Branches:    ${branches}%"
    else
        echo -e "${YELLOW}$service: Coverage data not available${RESET}"
    fi
}

main() {
    print_header "Quality System Coverage Analysis"

    echo ""
    echo -e "${CYAN}Analyzing test coverage across all services...${RESET}"
    echo ""

    # Backend coverage
    analyze_coverage "Backend" "backend/coverage"

    echo ""

    # GraphQL coverage
    analyze_coverage "GraphQL" "graphql/coverage"

    echo ""

    # Finance coverage
    analyze_coverage "Finance" "finance-module/backend/coverage"

    echo ""

    # Supply Chain coverage
    analyze_coverage "Supply Chain" "supply-chain-management/backend/coverage"
    echo ""
    analyze_coverage "Supply Chain Frontend" "supply-chain-management/frontend/coverage"

    echo ""
    print_header "Analysis Complete"

    echo ""
    echo -e "${GREEN}💡 Tips:${RESET}"
    echo "  • Run 'npm test -- --coverage' in each service to generate reports"
    echo "  • Coverage reports are available in ./coverage/ directories"
    echo "  • Coverage summaries are in ./coverage/coverage-summary.json"
    echo ""
}

main "$@"
