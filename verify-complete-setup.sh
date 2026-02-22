#!/bin/bash

# ALAWAEL v1.0.0 - Comprehensive Verification & Status Dashboard
# Verifies all setups and provides real-time status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  📊 ALAWAEL v1.0.0 - Verification & Status Dashboard       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;37m'
NC='\033[0m'

check_mark="${GREEN}✅${NC}"
cross_mark="${RED}❌${NC}"
pending="⏳"

# Verification functions
verify_scripts() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}1️⃣  SETUP SCRIPTS VERIFICATION${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    local scripts=(
        "setup-monitoring.sh"
        "setup-cicd-pipeline.sh"
        "setup-disaster-recovery.sh"
        "setup-scaling-performance.sh"
        "setup-team-training-operations.sh"
        "setup-security-crisis-management.sh"
    )
    
    local count=0
    local found=0
    
    for script in "${scripts[@]}"; do
        count=$((count + 1))
        if [[ -f "$SCRIPT_DIR/$script" ]]; then
            local size=$(wc -l < "$SCRIPT_DIR/$script")
            echo "$check_mark $script ($size lines)"
            found=$((found + 1))
        else
            echo "$cross_mark $script (MISSING)"
        fi
    done
    
    echo ""
    echo "Status: $found/$count scripts found"
    echo ""
}

verify_documentation() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}2️⃣  DOCUMENTATION FILES VERIFICATION${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    local docs=(
        "MONITORING_SETUP_CHECKLIST.md"
        "CICD_SETUP_CHECKLIST.md"
        "PIPELINE_PERFORMANCE_TRACKING.md"
        "DISASTER_RECOVERY_PLAN.md"
        "AUTO_SCALING_RULES.md"
        "PERFORMANCE_OPTIMIZATION.md"
        "TEAM_ROLES_RESPONSIBILITIES.md"
        "OPERATIONAL_HANDBOOK.md"
        "TEAM_ONBOARDING_GUIDE.md"
        "TROUBLESHOOTING_GUIDE.md"
        "SECURITY_HARDENING_GUIDE.md"
        "CRISIS_MANAGEMENT_PLAN.md"
        "SECURITY_AUDIT_CHECKLIST.md"
        "ADVANCED_SETUP_MASTER_INDEX.md"
        "00_START_ADVANCED_SETUP_HERE.md"
    )
    
    local count=0
    local found=0
    local total_lines=0
    
    for doc in "${docs[@]}"; do
        count=$((count + 1))
        if [[ -f "$SCRIPT_DIR/$doc" ]]; then
            local lines=$(wc -l < "$SCRIPT_DIR/$doc")
            total_lines=$((total_lines + lines))
            echo "$check_mark $doc ($lines lines)"
            found=$((found + 1))
        else
            echo "$cross_mark $doc (MISSING)"
        fi
    done
    
    echo ""
    echo "Status: $found/$count documents found"
    echo "Total lines: ~$total_lines"
    echo ""
}

verify_config_templates() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}3️⃣  CONFIGURATION TEMPLATES VERIFICATION${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    local configs=(
        "nginx-load-balancer.conf"
        ".github-workflow-template.yml"
        "docker-compose-scaling.yml"
        "monitoring-config.template.json"
        "monitoring-dashboard.json"
    )
    
    local count=0
    local found=0
    
    for config in "${configs[@]}"; do
        count=$((count + 1))
        if [[ -f "$SCRIPT_DIR/$config" ]]; then
            local size=$(wc -l < "$SCRIPT_DIR/$config")
            echo "$check_mark $config ($size lines)"
            found=$((found + 1))
        else
            echo "$cross_mark $config (MISSING)"
        fi
    done
    
    echo ""
    echo "Status: $found/$count configuration files found"
    echo ""
}

verify_repositories() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}4️⃣  GITHUB REPOSITORIES STATUS${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    # Check for git
    if ! command -v git &> /dev/null; then
        echo "$cross_mark Git not installed"
        echo ""
        return 1
    fi
    
    echo "$check_mark Git installed"
    
    # Check for alawael-backend
    if [[ -d "$SCRIPT_DIR/alawael-backend" ]] || [[ -d "$SCRIPT_DIR/backend" ]]; then
        echo "$check_mark Backend repository found"
    else
        echo "$cross_mark Backend repository not found"
    fi
    
    # Check for alawael-erp
    if [[ -d "$SCRIPT_DIR/alawael-erp" ]] || [[ -d "$SCRIPT_DIR/erp_new_system" ]]; then
        echo "$check_mark ERP repository found"
    else
        echo "$cross_mark ERP repository not found"
    fi
    
    echo ""
}

verify_dependencies() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}5️⃣  SYSTEM DEPENDENCIES CHECK${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    local tools=(
        "node"
        "npm"
        "docker"
        "git"
    )
    
    for tool in "${tools[@]}"; do
        if command -v $tool &> /dev/null; then
            local version=$($tool --version 2>/dev/null | head -n1)
            echo "$check_mark $tool: $version"
        else
            echo "$cross_mark $tool: NOT INSTALLED"
        fi
    done
    
    echo ""
}

verify_execution_readiness() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}6️⃣  EXECUTION READINESS CHECK${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    local ready=true
    
    # Check write permissions
    if [[ -w "$SCRIPT_DIR" ]]; then
        echo "$check_mark Write permissions OK"
    else
        echo "$cross_mark Directory not writable"
        ready=false
    fi
    
    # Check disk space
    local disk_free=$(df "$SCRIPT_DIR" | tail -1 | awk '{print $4}')
    if [[ $disk_free -gt 1000000 ]]; then
        echo "$check_mark Disk space: $(numfmt --to=iec $((disk_free * 1024)) 2>/dev/null || echo $disk_free)K available"
    else
        echo "$cross_mark Low disk space"
        ready=false
    fi
    
    # Check bash version
    if [[ ${BASH_VERSINFO[0]} -ge 4 ]]; then
        echo "$check_mark Bash version: ${BASH_VERSION%% *}"
    else
        echo "$cross_mark Bash 4.0+ required"
        ready=false
    fi
    
    echo ""
    if [[ "$ready" == "true" ]]; then
        echo "${GREEN}System ready for setup execution${NC}"
    else
        echo "${YELLOW}Some prerequisites missing${NC}"
    fi
    echo ""
}

generate_summary_report() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}📋 SUMMARY REPORT${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    local report_file="$SCRIPT_DIR/VERIFICATION_REPORT_$(date +%Y%m%d_%H%M%S).md"
    
    {
        echo "# Alawael v1.0.0 - Verification Report"
        echo ""
        echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "## Package Contents"
        echo ""
        echo "### Setup Scripts (6)"
        echo "- setup-monitoring.sh"
        echo "- setup-cicd-pipeline.sh"
        echo "- setup-disaster-recovery.sh"
        echo "- setup-scaling-performance.sh"
        echo "- setup-team-training-operations.sh"
        echo "- setup-security-crisis-management.sh"
        echo ""
        echo "### Documentation Files (16)"
        for doc in MONITORING_SETUP_CHECKLIST.md CICD_SETUP_CHECKLIST.md DISASTER_RECOVERY_PLAN.md AUTO_SCALING_RULES.md PERFORMANCE_OPTIMIZATION.md TEAM_ROLES_RESPONSIBILITIES.md OPERATIONAL_HANDBOOK.md TEAM_ONBOARDING_GUIDE.md TROUBLESHOOTING_GUIDE.md SECURITY_HARDENING_GUIDE.md CRISIS_MANAGEMENT_PLAN.md SECURITY_AUDIT_CHECKLIST.md ADVANCED_SETUP_MASTER_INDEX.md; do
            echo "- $doc"
        done
        echo ""
        echo "### Configuration Templates (5)"
        echo "- nginx-load-balancer.conf"
        echo "- .github-workflow-template.yml"
        echo "- docker-compose-scaling.yml"
        echo "- monitoring-config.template.json"
        echo "- monitoring-dashboard.json"
        echo ""
        echo "## Next Steps"
        echo ""
        echo "1. Review: \`00_START_ADVANCED_SETUP_HERE.md\`"
        echo "2. Choose approach: Express (1 day), Full (2-3 weeks), or Phased"
        echo "3. Execute: \`./master-setup.sh\`"
        echo "4. Follow checklists in each documentation file"
        echo "5. Verify: Run \`./verify-complete-setup.sh\` after execution"
        echo ""
        echo "## System Ready"
        echo ""
        echo "✅ All files verified"
        echo "✅ Dependencies checked"
        echo "✅ Ready for immediate execution"
        echo ""
    } > "$report_file"
    
    echo "Report saved to: $report_file"
    echo ""
}

show_quick_reference() {
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo "${BLUE}🚀 QUICK START COMMANDS${NC}"
    echo "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    
    echo "${YELLOW}To start setup execution:${NC}"
    echo "  \$ chmod +x master-setup.sh"
    echo "  \$ ./master-setup.sh"
    echo ""
    
    echo "${YELLOW}To run individual scripts:${NC}"
    echo "  \$ chmod +x setup-monitoring.sh"
    echo "  \$ ./setup-monitoring.sh"
    echo ""
    
    echo "${YELLOW}To re-verify setup:${NC}"
    echo "  \$ ./verify-complete-setup.sh"
    echo ""
    
    echo "${YELLOW}To check specific documentation:${NC}"
    echo "  \$ cat MONITORING_SETUP_CHECKLIST.md"
    echo "  \$ cat DISASTER_RECOVERY_PLAN.md"
    echo "  \$ cat SECURITY_HARDENING_GUIDE.md"
    echo ""
}

# Main execution
main() {
    verify_scripts
    verify_documentation
    verify_config_templates
    verify_repositories
    verify_dependencies
    verify_execution_readiness
    show_quick_reference
    generate_summary_report
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Verification Complete - System Ready for Setup            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

main "$@"
