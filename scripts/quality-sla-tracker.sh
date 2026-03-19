#!/bin/bash

# ALAWAEL SLA Tracker and Performance Dashboard
# Monitor service level agreements and performance trends

set -e

# Configuration
SLA_DIR="${PWD}/.quality-sla"
TODAY=$(date +%Y-%m-%d)
SLA_FILE="${SLA_DIR}/sla_${TODAY}.json"
HISTORY_DIR="${SLA_DIR}/history"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RESET='\033[0m'

# Create directories
mkdir -p "${SLA_DIR}" "${HISTORY_DIR}"

# Initialize SLA template
init_sla() {
    if [ ! -f "$SLA_FILE" ]; then
        cat > "$SLA_FILE" << 'EOF'
{
  "date": "$(date -Iseconds)",
  "slas": {
    "backend": {
      "name": "Backend API",
      "target_uptime": 99.9,
      "target_response_time": 200,
      "target_coverage": 80,
      "target_test_pass": 99.5,
      "actual_uptime": 100,
      "actual_response_time": 0,
      "actual_coverage": 0,
      "actual_test_pass": 0,
      "status": "pending"
    },
    "graphql": {
      "name": "GraphQL Service",
      "target_uptime": 99.5,
      "target_response_time": 150,
      "target_coverage": 75,
      "target_test_pass": 99.0,
      "actual_uptime": 100,
      "actual_response_time": 0,
      "actual_coverage": 0,
      "actual_test_pass": 0,
      "status": "pending"
    },
    "finance": {
      "name": "Finance Module",
      "target_uptime": 99.95,
      "target_response_time": 300,
      "target_coverage": 85,
      "target_test_pass": 99.8,
      "actual_uptime": 100,
      "actual_response_time": 0,
      "actual_coverage": 0,
      "actual_test_pass": 0,
      "status": "pending"
    },
    "supply_chain": {
      "name": "Supply Chain",
      "target_uptime": 99.0,
      "target_response_time": 250,
      "target_coverage": 70,
      "target_test_pass": 98.5,
      "actual_uptime": 100,
      "actual_response_time": 0,
      "actual_coverage": 0,
      "actual_test_pass": 0,
      "status": "pending"
    }
  },
  "breaches": [],
  "summary": {
    "total_services": 4,
    "compliant": 0,
    "non_compliant": 0,
    "at_risk": 0,
    "compliance_rate": 0
  }
}
EOF
    fi
}

# Update SLA metrics
update_sla_metrics() {
    local service=$1
    local uptime=$2
    local response=$3
    local coverage=$4
    local tests=$5

    local temp_file="${SLA_DIR}/.tmp.json"

    jq --arg service "$service" \
       --arg uptime "$uptime" \
       --arg response "$response" \
       --arg coverage "$coverage" \
       --arg tests "$tests" \
       '.slas[$service].actual_uptime = ($uptime | tonumber) |
        .slas[$service].actual_response_time = ($response | tonumber) |
        .slas[$service].actual_coverage = ($coverage | tonumber) |
        .slas[$service].actual_test_pass = ($tests | tonumber)' \
       "$SLA_FILE" > "$temp_file"

    mv "$temp_file" "$SLA_FILE"

    # Verify compliance
    verify_compliance "$service"
}

# Verify SLA compliance
verify_compliance() {
    local service=$1
    local temp_file="${SLA_DIR}/.tmp.json"

    # Get targets and actuals
    local target_uptime=$(jq ".slas[$service].target_uptime" "$SLA_FILE")
    local actual_uptime=$(jq ".slas[$service].actual_uptime" "$SLA_FILE")

    local target_response=$(jq ".slas[$service].target_response_time" "$SLA_FILE")
    local actual_response=$(jq ".slas[$service].actual_response_time" "$SLA_FILE")

    local target_coverage=$(jq ".slas[$service].target_coverage" "$SLA_FILE")
    local actual_coverage=$(jq ".slas[$service].actual_coverage" "$SLA_FILE")

    # Determine status
    local status="compliant"
    local breaches=()

    if (( $(echo "$actual_uptime < $target_uptime" | bc -l) )); then
        status="non_compliant"
        breaches+=("Uptime: $actual_uptime% vs target $target_uptime%")
    fi

    if (( $(echo "$actual_coverage < $target_coverage" | bc -l) )); then
        status="at_risk"
        [ "$status" = "non_compliant" ] || breaches+=("Coverage: $actual_coverage% vs target $target_coverage%")
    fi

    jq --arg service "$service" \
       --arg status "$status" \
       '.slas[$service].status = $status' \
       "$SLA_FILE" > "$temp_file"

    mv "$temp_file" "$SLA_FILE"
}

# Display SLA Dashboard
display_sla_dashboard() {
    clear

    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${BLUE}║      ALAWAEL Quality System - SLA Compliance Dashboard         ║${RESET}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${RESET}"
    echo ""

    # Calculate overall compliance
    local total=$(jq '.slas | length' "$SLA_FILE")
    local compliant=$(jq '[.slas[] | select(.status=="compliant")] | length' "$SLA_FILE")
    local at_risk=$(jq '[.slas[] | select(.status=="at_risk")] | length' "$SLA_FILE")
    local non_compliant=$(jq '[.slas[] | select(.status=="non_compliant")] | length' "$SLA_FILE")
    local compliance_rate=$((compliant * 100 / total))

    # Overall status color
    local overall_color=$GREEN
    [ $compliance_rate -lt 75 ] && overall_color=$RED
    [ $compliance_rate -lt 90 ] && overall_color=$YELLOW

    echo -e "${CYAN}OVERALL COMPLIANCE${RESET}"
    echo -e "${overall_color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "  Compliance Rate: ${overall_color}${compliance_rate}%${RESET} (${compliant}/${total} services)"
    echo -e "  Status: " $([ $compliance_rate -ge 90 ] && echo -e "${GREEN}✅ COMPLIANT${RESET}" || echo -e "${RED}⚠️  AT RISK${RESET}")
    echo ""

    # Service-by-Service Report
    echo -e "${CYAN}SERVICE SLA STATUS${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

    jq -r '.slas | to_entries[] |
        "\(.value.name) | Status: \(.value.status) | Uptime: \(.value.actual_uptime)% | Coverage: \(.value.actual_coverage)%"' \
        "$SLA_FILE" | while read line; do
        if [[ "$line" =~ "compliant" ]]; then
            echo -e "  ${GREEN}✅${RESET} $(echo $line | cut -d'|' -f1)"
        elif [[ "$line" =~ "at_risk" ]]; then
            echo -e "  ${YELLOW}⚠️ ${RESET} $(echo $line | cut -d'|' -f1)"
        else
            echo -e "  ${RED}❌${RESET} $(echo $line | cut -d'|' -f1)"
        fi
    done

    echo ""
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${RESET}"

    # Detailed Metrics
    echo -e "${CYAN}DETAILED METRICS (Backend Example)${RESET}"

    local backend_uptime=$(jq '.slas.backend.actual_uptime' "$SLA_FILE")
    local backend_response=$(jq '.slas.backend.actual_response_time' "$SLA_FILE")
    local backend_coverage=$(jq '.slas.backend.actual_coverage' "$SLA_FILE")
    local backend_tests=$(jq '.slas.backend.actual_test_pass' "$SLA_FILE")

    echo "  Uptime:            $backend_uptime% (Target: 99.9%)"
    echo "  Response Time:     ${backend_response}ms (Target: 200ms)"
    echo "  Code Coverage:     $backend_coverage% (Target: 80%)"
    echo "  Test Pass Rate:    $backend_tests% (Target: 99.5%)"

    echo ""
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}"
}

# Generate SLA Report
generate_sla_report() {
    echo ""
    echo -e "${CYAN}Generating Weekly SLA Report...${RESET}"

    local report_file="${HISTORY_DIR}/sla_report_$(date +%Y-W%V).txt"

    {
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║              ALAWAEL SLA Compliance Report - Week $(date +%V)              ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Generated: $(date -Iseconds)"
        echo "Reporting Period: $(date -d '1 week ago' +%Y-%m-%d) to $(date +%Y-%m-%d)"
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
        echo "SERVICES COMPLIANCE SUMMARY"
        echo "═══════════════════════════════════════════════════════════════"

        jq -r '.slas[] |
            "\(.name)\n  Uptime: \(.actual_uptime)% (Target: \(.target_uptime)%)\n  Coverage: \(.actual_coverage)% (Target: \(.target_coverage)%)\n  Status: \(.status)\n"' \
            "$SLA_FILE"

        echo "═══════════════════════════════════════════════════════════════"
        echo "COMPLIANCE METRICS"
        echo "═══════════════════════════════════════════════════════════════"
        echo "Overall Compliance Rate: $(jq '[.slas[] | select(.status=="compliant")] | length' "$SLA_FILE")/$(jq '.slas | length' "$SLA_FILE") services"
        echo ""
        echo "Breakdown:"
        echo "  ✅ Compliant:     $(jq '[.slas[] | select(.status=="compliant")] | length' "$SLA_FILE")"
        echo "  ⚠️  At Risk:      $(jq '[.slas[] | select(.status=="at_risk")] | length' "$SLA_FILE")"
        echo "  ❌ Non-Compliant: $(jq '[.slas[] | select(.status=="non_compliant")] | length' "$SLA_FILE")"

    } | tee "$report_file"

    echo ""
    echo -e "${GREEN}✅ Report saved to: $report_file${RESET}"
}

# Display trend chart
show_trends() {
    echo ""
    echo -e "${CYAN}COMPLIANCE TRENDS (Last 7 Days)${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

    ls -t "${HISTORY_DIR}"/sla_*.json 2>/dev/null | head -7 | sort | while read file; do
        local date=$(basename "$file" | sed 's/sla_//;s/.json//')
        local compliance=$(jq '[.slas[] | select(.status=="compliant")] | length' "$file" 2>/dev/null)
        local total=$(jq '.slas | length' "$file" 2>/dev/null)
        local rate=$((compliance * 100 / total))

        # Draw bar chart
        local bar=""
        for ((i = 0; i < rate / 5; i++)); do bar="${bar}█"; done

        printf "  %s │ %3d%% │ %s\n" "$date" "$rate" "$bar"
    done

    echo ""
}

# Recommendations
show_recommendations() {
    echo -e "${CYAN}RECOMMENDATIONS${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

    local non_compliant=$(jq '[.slas[] | select(.status=="non_compliant")] | length' "$SLA_FILE")
    local at_risk=$(jq '[.slas[] | select(.status=="at_risk")] | length' "$SLA_FILE")

    if [ "$non_compliant" -gt 0 ]; then
        echo -e "${RED}❌ CRITICAL: $non_compliant service(s) not meeting SLA${RESET}"
        jq -r '.slas[] | select(.status=="non_compliant") |
            "\(.name): Coverage at \(.actual_coverage)% (need \(.target_coverage)%)"' \
            "$SLA_FILE" | while read line; do
            echo "    • $line"
        done
    fi

    if [ "$at_risk" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  WARNING: $at_risk service(s) approaching SLA breach${RESET}"
        jq -r '.slas[] | select(.status=="at_risk") |
            "\(.name): Coverage at \(.actual_coverage)% (need \(.target_coverage)%)"' \
            "$SLA_FILE" | while read line; do
            echo "    • $line"
        done
    fi

    echo ""
    echo "Action Items:"
    echo "  1. Review failing test suites"
    echo "  2. Increase test coverage targets"
    echo "  3. Optimize CI/CD pipeline performance"
    echo "  4. Schedule optimization sprint"
    echo ""
}

# Main
main() {
    init_sla

    case "${1:-dashboard}" in
        dashboard)
            display_sla_dashboard
            show_trends
            show_recommendations
            ;;

        update)
            local service=$2
            local uptime=$3
            local response=$4
            local coverage=$5
            local tests=$6

            if [ -z "$service" ] || [ -z "$uptime" ]; then
                echo "Usage: $0 update <service> <uptime> <response> <coverage> <tests>"
                exit 1
            fi

            update_sla_metrics "$service" "$uptime" "$response" "$coverage" "$tests"
            echo -e "${GREEN}✅ SLA metrics updated for $service${RESET}"
            display_sla_dashboard
            ;;

        report)
            generate_sla_report
            ;;

        *)
            echo "Usage: $0 {dashboard|update|report}"
            exit 1
            ;;
    esac
}

main "$@"
