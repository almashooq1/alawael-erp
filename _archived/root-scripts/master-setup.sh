#!/bin/bash

# ALAWAEL v1.0.0 - Master Automation & Execution Script
# Runs all setup scripts automatically with intelligence

set -e

clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 ALAWAEL v1.0.0 - COMPREHENSIVE SETUP AUTOMATION        ║"
echo "║     Master Execution Script - Run Everything               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/setup-execution.log"
ERROR_LOG="$SCRIPT_DIR/setup-errors.log"
PROGRESS_FILE="$SCRIPT_DIR/.setup-progress"

# Initialize logging
> "$LOG_FILE"
> "$ERROR_LOG"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️ ${1}${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ ${1}${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ ${1}${NC}" | tee -a "$ERROR_LOG"
}

progress_update() {
    echo "$1" >> "$PROGRESS_FILE"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=0
    
    # Check bash version
    if [[ ${BASH_VERSINFO[0]} -lt 4 ]]; then
        log_error "Bash 4.0+ required (you have ${BASH_VERSION})"
        missing=$((missing + 1))
    fi
    
    # Check if scripts exist
    local scripts=(
        "setup-monitoring.sh"
        "setup-cicd-pipeline.sh"
        "setup-disaster-recovery.sh"
        "setup-scaling-performance.sh"
        "setup-team-training-operations.sh"
        "setup-security-crisis-management.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ ! -f "$SCRIPT_DIR/$script" ]]; then
            log_error "Missing: $script"
            missing=$((missing + 1))
        fi
    done
    
    if [[ $missing -gt 0 ]]; then
        log_error "Prerequisites check failed ($missing issues)"
        return 1
    fi
    
    log_success "All prerequisites met"
    return 0
}

# Execute setup scripts with error handling
execute_setup_script() {
    local script=$1
    local description=$2
    local estimated_time=$3
    
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Executing: $description"
    log_info "Script: $script"
    log_info "Estimated time: $estimated_time"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    progress_update "START: $description - $(date '+%Y-%m-%d %H:%M:%S')"
    
    if bash "$SCRIPT_DIR/$script"; then
        log_success "$description completed successfully"
        progress_update "COMPLETE: $description - $(date '+%Y-%m-%d %H:%M:%S')"
        return 0
    else
        log_error "$description failed (see $ERROR_LOG)"
        progress_update "ERROR: $description - $(date '+%Y-%m-%d %H:%M:%S')"
        return 1
    fi
}

# Show menu for user to select which scripts to run
show_setup_menu() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Setup Options                                             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "1) 🚀 Full Setup (All 6 scripts) - 12-18 hours"
    echo "2) ⚡ Express Setup (3 essential) - 6-8 hours"
    echo "3) 🎯 Monitoring + Recovery (2) - 3-5 hours"
    echo "4) 🔧 Manual Selection"
    echo "5) 📊 Show Progress Only"
    echo "6) ❌ Exit"
    echo ""
    read -p "Choose option (1-6): " choice
    echo "$choice"
}

# Full setup execution
run_full_setup() {
    log_info "Starting FULL SETUP (all 6 scripts)"
    log_info "Total estimated time: 12-18 hours"
    echo ""
    
    local failed=0
    
    # 1. Monitoring
    if ! execute_setup_script "setup-monitoring.sh" \
        "🔍 Monitoring & Observability Setup" "1-2 hours"; then
        failed=$((failed + 1))
    fi
    
    # 2. CI/CD Pipeline
    if ! execute_setup_script "setup-cicd-pipeline.sh" \
        "🔄 CI/CD Pipeline Setup" "2-3 hours"; then
        failed=$((failed + 1))
    fi
    
    # 3. Disaster Recovery
    if ! execute_setup_script "setup-disaster-recovery.sh" \
        "🔐 Disaster Recovery & Backup Setup" "2-3 hours"; then
        failed=$((failed + 1))
    fi
    
    # 4. Scaling & Performance
    if ! execute_setup_script "setup-scaling-performance.sh" \
        "⚡ Scaling & Performance Optimization" "2-3 hours"; then
        failed=$((failed + 1))
    fi
    
    # 5. Team & Operations
    if ! execute_setup_script "setup-team-training-operations.sh" \
        "👥 Team Training & Operations Setup" "3-4 hours"; then
        failed=$((failed + 1))
    fi
    
    # 6. Security & Crisis
    if ! execute_setup_script "setup-security-crisis-management.sh" \
        "🛡️  Security & Crisis Management Setup" "2-3 hours"; then
        failed=$((failed + 1))
    fi
    
    echo ""
    if [[ $failed -eq 0 ]]; then
        log_success "🎉 ALL SETUPS COMPLETED SUCCESSFULLY!"
        return 0
    else
        log_warning "$failed setup(s) encountered issues"
        return 1
    fi
}

# Express setup (3 essentials)
run_express_setup() {
    log_info "Starting EXPRESS SETUP (3 essentials)"
    log_info "Total estimated time: 6-8 hours"
    echo ""
    
    local failed=0
    
    # 1. Monitoring
    if ! execute_setup_script "setup-monitoring.sh" \
        "🔍 Monitoring & Observability" "1-2 hours"; then
        failed=$((failed + 1))
    fi
    
    # 2. Disaster Recovery
    if ! execute_setup_script "setup-disaster-recovery.sh" \
        "🔐 Disaster Recovery & Backup" "2-3 hours"; then
        failed=$((failed + 1))
    fi
    
    # 3. CI/CD Pipeline
    if ! execute_setup_script "setup-cicd-pipeline.sh" \
        "🔄 CI/CD Pipeline" "2-3 hours"; then
        failed=$((failed + 1))
    fi
    
    echo ""
    if [[ $failed -eq 0 ]]; then
        log_success "✅ EXPRESS SETUP COMPLETED!"
        echo ""
        log_warning "Remaining setups to complete:"
        echo "  • ./master-setup.sh 4 (for manual selection)"
        return 0
    else
        log_warning "$failed script(s) had issues"
        return 1
    fi
}

# Monitoring + Recovery only
run_minimal_setup() {
    log_info "Starting MINIMAL SETUP (Monitoring + Recovery)"
    log_info "Total estimated time: 3-5 hours"
    echo ""
    
    local failed=0
    
    # 1. Monitoring
    if ! execute_setup_script "setup-monitoring.sh" \
        "🔍 Monitoring & Observability" "1-2 hours"; then
        failed=$((failed + 1))
    fi
    
    # 2. Disaster Recovery
    if ! execute_setup_script "setup-disaster-recovery.sh" \
        "🔐 Disaster Recovery & Backup" "2-3 hours"; then
        failed=$((failed + 1))
    fi
    
    echo ""
    if [[ $failed -eq 0 ]]; then
        log_success "✅ MINIMAL SETUP COMPLETED!"
        return 0
    else
        log_warning "$failed script(s) had issues"
        return 1
    fi
}

# Manual selection
run_manual_selection() {
    log_info "Manual Setup Selection"
    echo ""
    echo "Available setup scripts:"
    echo "1) setup-monitoring.sh (1-2 hours)"
    echo "2) setup-cicd-pipeline.sh (2-3 hours)"
    echo "3) setup-disaster-recovery.sh (2-3 hours)"
    echo "4) setup-scaling-performance.sh (2-3 hours)"
    echo "5) setup-team-training-operations.sh (3-4 hours)"
    echo "6) setup-security-crisis-management.sh (2-3 hours)"
    echo "0) Run all selected"
    echo ""
    
    local selections=()
    local continue=1
    
    while [[ $continue -eq 1 ]]; do
        read -p "Select script number (or 0 to start): " num
        
        if [[ $num -eq 0 ]]; then
            continue=0
        elif [[ $num -ge 1 && $num -le 6 ]]; then
            selections+=($num)
            log_success "Selected script $num"
        else
            log_error "Invalid selection"
        fi
    done
    
    # Execute selected
    if [[ ${#selections[@]} -eq 0 ]]; then
        log_warning "No scripts selected"
        return 1
    fi
    
    local failed=0
    for sel in "${selections[@]}"; do
        case $sel in
            1) execute_setup_script "setup-monitoring.sh" "Monitoring" "1-2h" || ((failed++)) ;;
            2) execute_setup_script "setup-cicd-pipeline.sh" "CI/CD" "2-3h" || ((failed++)) ;;
            3) execute_setup_script "setup-disaster-recovery.sh" "Disaster Recovery" "2-3h" || ((failed++)) ;;
            4) execute_setup_script "setup-scaling-performance.sh" "Scaling" "2-3h" || ((failed++)) ;;
            5) execute_setup_script "setup-team-training-operations.sh" "Team" "3-4h" || ((failed++)) ;;
            6) execute_setup_script "setup-security-crisis-management.sh" "Security" "2-3h" || ((failed++)) ;;
        esac
    done
    
    return $([[ $failed -eq 0 ]] && echo 0 || echo 1)
}

# Show progress
show_progress() {
    log_info "Setup Progress Report"
    echo ""
    
    if [[ -f "$PROGRESS_FILE" ]]; then
        cat "$PROGRESS_FILE"
    else
        log_warning "No progress data yet"
    fi
    
    echo ""
    log_info "Logs:"
    echo "  • Success: $LOG_FILE"
    echo "  • Errors: $ERROR_LOG"
    echo ""
}

# Main execution
main() {
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed - exiting"
        exit 1
    fi
    
    progress_update "═════════════════════════════════════════════"
    progress_update "Master Setup Execution Started - $(date '+%Y-%m-%d %H:%M:%S')"
    progress_update "═════════════════════════════════════════════"
    
    # Show menu
    choice=$(show_setup_menu)
    
    case $choice in
        1)
            run_full_setup
            ;;
        2)
            run_express_setup
            ;;
        3)
            run_minimal_setup
            ;;
        4)
            run_manual_selection
            ;;
        5)
            show_progress
            ;;
        6)
            log_warning "Setup cancelled"
            exit 0
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    # Summary
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Setup Execution Complete                                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Logs available:"
    echo "  • Success log: $LOG_FILE"
    echo "  • Error log: $ERROR_LOG"
    echo "  • Progress: $PROGRESS_FILE"
    echo ""
    
    show_progress
}

# Run main
main "$@"
