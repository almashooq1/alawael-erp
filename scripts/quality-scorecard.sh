#!/bin/bash

# ALAWAEL Live Performance Scorecard
# Real-time monitoring and tracking of system health

set -e

# Configuration
METRICS_DIR="${PWD}/.quality-metrics"
SCOREBOARD_FILE="${METRICS_DIR}/scoreboard.json"
HISTORY_DIR="${METRICS_DIR}/history"
TIMESTAMP=$(date +%s)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Initialize directories
mkdir -p "${METRICS_DIR}" "${HISTORY_DIR}"

# Initialize scoreboard if not exists
init_scoreboard() {
    if [ ! -f "$SCOREBOARD_FILE" ]; then
        cat > "$SCOREBOARD_FILE" << 'EOF'
{
  "system": {
    "name": "ALAWAEL Quality System",
    "version": "2.0.0",
    "status": "initialized",
    "lastUpdate": 0,
    "score": 0
  },
  "services": {
    "backend": {
      "name": "Backend API",
      "status": "unknown",
      "tests": 0,
      "coverage": 0,
      "duration": 0,
      "score": 0,
      "timestamp": 0
    },
    "graphql": {
      "name": "GraphQL Service",
      "status": "unknown",
      "tests": 0,
      "coverage": 0,
      "duration": 0,
      "score": 0,
      "timestamp": 0
    },
    "finance": {
      "name": "Finance Module",
      "status": "unknown",
      "tests": 0,
      "coverage": 0,
      "duration": 0,
      "score": 0,
      "timestamp": 0
    },
    "supply_chain": {
      "name": "Supply Chain",
      "status": "unknown",
      "tests": 0,
      "coverage": 0,
      "duration": 0,
      "score": 0,
      "timestamp": 0
    }
  },
  "metrics": {
    "totalTests": 0,
    "passedTests": 0,
    "failedTests": 0,
    "averageCoverage": 0,
    "averageDuration": 0,
    "systemScore": 0,
    "lastUpdate": "$(date -Iseconds)"
  }
}
EOF
    fi
}

# Update service metrics
update_service() {
    local service=$1
    local status=$2
    local tests=$3
    local coverage=$4
    local duration=$5

    # Calculate score (0-100)
    local score=$(( (tests > 0 ? 50 : 0) + (coverage / 2) ))
    [ "$status" = "pass" ] && score=$(( score + 10 )) || score=$(( score - 20 ))
    [ $score -lt 0 ] && score=0
    [ $score -gt 100 ] && score=100

    # Update JSON (using temporary file for reliability)
    local temp_file="${METRICS_DIR}/.tmp.json"

    jq --arg service "$service" \
       --arg status "$status" \
       --arg tests "$tests" \
       --arg coverage "$coverage" \
       --arg duration "$duration" \
       --arg score "$score" \
       --arg timestamp "$TIMESTAMP" \
       '.services[$service].status = $status |
        .services[$service].tests = ($tests | tonumber) |
        .services[$service].coverage = ($coverage | tonumber) |
        .services[$service].duration = ($duration | tonumber) |
        .services[$service].score = ($score | tonumber) |
        .services[$service].timestamp = ($timestamp | tonumber) |
        .system.lastUpdate = ($timestamp | tonumber)' \
       "$SCOREBOARD_FILE" > "$temp_file"

    mv "$temp_file" "$SCOREBOARD_FILE"
}

# Display ASCII scorecard
display_scorecard() {
    local backend_score=$(jq '.services.backend.score' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)
    local graphql_score=$(jq '.services.graphql.score' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)
    local finance_score=$(jq '.services.finance.score' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)
    local supply_score=$(jq '.services.supply_chain.score' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)

    local system_score=$(( (backend_score + graphql_score + finance_score + supply_score) / 4 ))

    local backend_status=$(jq -r '.services.backend.status' "$SCOREBOARD_FILE" 2>/dev/null || echo "unknown")
    local graphql_status=$(jq -r '.services.graphql.status' "$SCOREBOARD_FILE" 2>/dev/null || echo "unknown")
    local finance_status=$(jq -r '.services.finance.status' "$SCOREBOARD_FILE" 2>/dev/null || echo "unknown")
    local supply_status=$(jq -r '.services.supply_chain.status' "$SCOREBOARD_FILE" 2>/dev/null || echo "unknown")

    # Color based on score
    local system_color=$RED
    if [ "$system_score" -ge 80 ]; then system_color=$GREEN; fi
    if [ "$system_score" -ge 60 ] && [ "$system_score" -lt 80 ]; then system_color=$YELLOW; fi

    clear

    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${BLUE}║           ALAWAEL Quality System - Live Scorecard              ║${RESET}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${RESET}"
    echo ""

    # System Overview
    echo -e "${CYAN}SYSTEM HEALTH SCORE${RESET}"
    echo -e "${system_color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "  Overall Score: ${system_color}${system_score}/100${RESET}"
    echo ""

    # Service Scores
    echo -e "${CYAN}SERVICE SCORES${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

    # Backend
    local backend_color=$RED
    [ "$backend_score" -ge 80 ] && backend_color=$GREEN
    [ "$backend_score" -ge 60 ] && [ "$backend_score" -lt 80 ] && backend_color=$YELLOW
    echo -e "  Backend              [${backend_color}${backend_score}/100${RESET}] ${backend_status^^}"

    # GraphQL
    local graphql_color=$RED
    [ "$graphql_score" -ge 80 ] && graphql_color=$GREEN
    [ "$graphql_score" -ge 60 ] && [ "$graphql_score" -lt 80 ] && graphql_color=$YELLOW
    echo -e "  GraphQL              [${graphql_color}${graphql_score}/100${RESET}] ${graphql_status^^}"

    # Finance
    local finance_color=$RED
    [ "$finance_score" -ge 80 ] && finance_color=$GREEN
    [ "$finance_score" -ge 60 ] && [ "$finance_score" -lt 80 ] && finance_color=$YELLOW
    echo -e "  Finance Module       [${finance_color}${finance_score}/100${RESET}] ${finance_status^^}"

    # Supply Chain
    local supply_color=$RED
    [ "$supply_score" -ge 80 ] && supply_color=$GREEN
    [ "$supply_score" -ge 60 ] && [ "$supply_score" -lt 80 ] && supply_color=$YELLOW
    echo -e "  Supply Chain         [${supply_color}${supply_score}/100${RESET}] ${supply_status^^}"

    echo ""
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${RESET}"

    # Stats
    echo -e "${CYAN}SYSTEM METRICS${RESET}"
    local total_tests=$(jq '.metrics.totalTests' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)
    local passed_tests=$(jq '.metrics.passedTests' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)
    local avg_coverage=$(jq '.metrics.averageCoverage' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)
    local last_update=$(jq -r '.metrics.lastUpdate' "$SCOREBOARD_FILE" 2>/dev/null || echo "Never")

    echo "  Total Tests:         $total_tests"
    echo "  Passed Tests:        $passed_tests"
    echo "  Average Coverage:    ${avg_coverage}%"
    echo "  Last Update:         $last_update"

    echo ""
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}"
}

# Show trend analysis
show_trends() {
    echo ""
    echo -e "${CYAN}TREND ANALYSIS (Last 10 Updates)${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

    # Get last 10 history files
    ls -t "${HISTORY_DIR}"/scoreboard_*.json 2>/dev/null | head -10 | while read file; do
        local timestamp=$(jq -r '.system.lastUpdate' "$file" 2>/dev/null)
        local score=$(jq '.metrics.systemScore' "$file" 2>/dev/null || echo 0)
        local date=$(date -d @"$timestamp" +"%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "Unknown")
        printf "  %s  │  Score: %3d/100\n" "$date" "$score"
    done

    echo ""
}

# Health recommendations
show_recommendations() {
    echo ""
    echo -e "${CYAN}SYSTEM RECOMMENDATIONS${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

    local backend_status=$(jq -r '.services.backend.status' "$SCOREBOARD_FILE" 2>/dev/null || echo "unknown")
    local system_score=$(jq '.metrics.systemScore' "$SCOREBOARD_FILE" 2>/dev/null || echo 0)

    if [ "$backend_status" != "pass" ]; then
        echo "  ⚠️  Backend quality checks failing - Review backend tests"
    fi

    if [ "$system_score" -lt 60 ]; then
        echo "  ⚠️  System score below 60 - Critical attention needed"
    fi

    if [ "$system_score" -gt 80 ]; then
        echo "  ✅ System in good health - Continue monitoring"
    fi

    echo ""
}

# Save snapshot to history
save_snapshot() {
    cp "$SCOREBOARD_FILE" "${HISTORY_DIR}/scoreboard_${TIMESTAMP}.json"
}

# Initialize and display
init_scoreboard
display_scorecard
show_trends
show_recommendations
save_snapshot

# Watch mode (optional)
if [ "$1" = "--watch" ]; then
    echo ""
    echo -e "${YELLOW}Live monitoring enabled (updates every 5 seconds)${RESET}"
    echo -e "${YELLOW}Press Ctrl+C to exit${RESET}"
    while true; do
        sleep 5
        display_scorecard
    done
fi
