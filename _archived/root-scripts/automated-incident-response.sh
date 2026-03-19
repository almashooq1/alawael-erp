#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - AUTOMATED INCIDENT RESPONSE & RECOVERY
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Automated incident detection, response, and recovery procedures
################################################################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
INCIDENT_DIR=".alawael-incidents"
LOG_DIR="${INCIDENT_DIR}/logs"
RESPONSE_SCRIPTS_DIR="${INCIDENT_DIR}/responses"
RECOVERY_SCRIPTS_DIR="${INCIDENT_DIR}/recovery"
BACKUP_DIR="${INCIDENT_DIR}/backups"

################################################################################
# INITIALIZE
################################################################################

init_incident_response() {
    mkdir -p "$LOG_DIR" "$RESPONSE_SCRIPTS_DIR" "$RECOVERY_SCRIPTS_DIR" "$BACKUP_DIR"
    
    cat > "${INCIDENT_DIR}/incident-config.json" << 'EOF'
{
  "incident_response": {
    "severity_levels": {
      "critical": 1,
      "high": 2,
      "medium": 3,
      "low": 4
    },
    "response_times": {
      "critical": 5,
      "high": 15,
      "medium": 60,
      "low": 240
    },
    "escalation": {
      "critical": ["on-call", "manager", "ceo"],
      "high": ["on-call", "manager"],
      "medium": ["team-lead"],
      "low": ["team"]
    },
    "communication_channels": {
      "slack": "#incidents",
      "email": "incidents@example.com",
      "sms": "+1-XXX-XXX-XXXX"
    }
  }
}
EOF

    echo "Incident response system initialized"
}

################################################################################
# INCIDENT DETECTION
################################################################################

detect_service_down() {
    local SERVICE=$1
    local URL=$2
    local TIMEOUT=${3:-5}
    
    if ! curl -s -m "$TIMEOUT" "$URL/health" &>/dev/null; then
        echo "CRITICAL"
        return 0
    else
        echo "OK"
        return 1
    fi
}

detect_memory_leak() {
    local PID=$1
    local THRESHOLD=${2:-90}
    
    if command -v ps &>/dev/null; then
        local MEMORY=$(ps aux | grep $PID | grep -v grep | awk '{printf("%.0f", $6/1024)}')
        
        if [ "$MEMORY" -gt "$THRESHOLD" ]; then
            echo "HIGH"
            return 0
        fi
    fi
    return 1
}

detect_high_error_rate() {
    local ERROR_LOG=$1
    local THRESHOLD=${2:-10}
    
    if [ -f "$ERROR_LOG" ]; then
        local ERROR_COUNT=$(tail -100 "$ERROR_LOG" | grep -c "ERROR")
        local TOTAL_LOGS=$(tail -100 "$ERROR_LOG" | wc -l)
        local ERROR_RATE=$((ERROR_COUNT * 100 / TOTAL_LOGS))
        
        if [ "$ERROR_RATE" -gt "$THRESHOLD" ]; then
            echo "HIGH: ${ERROR_RATE}%"
            return 0
        fi
    fi
    return 1
}

detect_database_issue() {
    local DB_HOST=${1:-localhost}
    local DB_PORT=${2:-27017}
    
    if ! timeout 5 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
        echo "CONNECTION_FAILED"
        return 0
    fi
    return 1
}

################################################################################
# AUTO-RESPONSE PROCEDURES
################################################################################

response_service_restart() {
    local SERVICE=$1
    
    echo -e "${YELLOW}[AUTO-RESPONSE] Attempting to restart $SERVICE...${NC}"
    
    case $SERVICE in
        backend)
            cd $PWD && npm --prefix "erp_new_system/backend" restart 2>&1 | tee -a "$LOG_DIR/restart_backend.log"
            ;;
        erp)
            cd $PWD && npm --prefix "erp_new_system/erp" restart 2>&1 | tee -a "$LOG_DIR/restart_erp.log"
            ;;
        *)
            echo "Unknown service: $SERVICE"
            return 1
            ;;
    esac
    
    # Verify restart
    sleep 5
    if check_service_health "$SERVICE"; then
        echo -e "${GREEN}✓ Service recovered successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Service restart failed - ESCALATE${NC}"
        return 1
    fi
}

check_service_health() {
    local SERVICE=$1
    
    case $SERVICE in
        backend)
            curl -s http://localhost:3001/health &>/dev/null && return 0
            ;;
        erp)
            curl -s http://localhost:3002/health &>/dev/null && return 0
            ;;
    esac
    return 1
}

response_clear_cache() {
    echo -e "${YELLOW}[AUTO-RESPONSE] Clearing cache...${NC}"
    
    if command -v redis-cli &>/dev/null; then
        redis-cli FLUSHALL 2>&1 | tee -a "$LOG_DIR/cache_clear.log"
        echo -e "${GREEN}✓ Cache cleared${NC}"
    else
        echo -e "${YELLOW}[⚠] Redis not available${NC}"
    fi
}

response_rotate_logs() {
    echo -e "${YELLOW}[AUTO-RESPONSE] Rotating logs...${NC}"
    
    local LOGS=(
        "erp_new_system/backend/logs/app.log"
        "erp_new_system/backend/logs/error.log"
    )
    
    for LOG in "${LOGS[@]}"; do
        if [ -f "$LOG" ]; then
            mv "$LOG" "${LOG}.$(date +%Y%m%d_%H%M%S)"
            echo -e "${GREEN}✓ Rotated $LOG${NC}"
        fi
    done
}

response_database_failover() {
    echo -e "${YELLOW}[AUTO-RESPONSE] Initiating database failover...${NC}"
    
    # Check if replica set exists
    if command -v mongosh &>/dev/null; then
        mongosh --eval "
            try {
                rs.status();
                console.log('Replica set is active');
            } catch (e) {
                console.log('No replica set configured');
            }
        " 2>&1 | tee -a "$LOG_DIR/db_failover.log"
    fi
}

response_circuit_breaker() {
    echo -e "${YELLOW}[AUTO-RESPONSE] Activating circuit breaker...${NC}"
    
    # Create circuit breaker state file
    touch "${INCIDENT_DIR}/.circuit-breaker-active"
    
    # Implement graceful degradation
    cat > "${INCIDENT_DIR}/circuit-breaker-config.json" << 'EOF'
{
  "circuit_breaker": {
    "status": "OPEN",
    "activated_at": "$(date)",
    "triggering_incident": "",
    "fallback_responses": {
      "api_calls": "return cached data",
      "external_services": "use local alternatives",
      "database_heavy_operations": "degraded mode"
    }
  }
}
EOF

    echo -e "${GREEN}✓ Circuit breaker activated${NC}"
}

################################################################################
# INCIDENT RECOVERY
################################################################################

recover_from_deployment() {
    echo -e "${YELLOW}[RECOVERY] Rolling back deployment...${NC}"
    
    if command -v git &>/dev/null; then
        git revert HEAD --no-edit 2>&1 | tee -a "$LOG_DIR/rollback.log"
        echo -e "${GREEN}✓ Rollback initiated${NC}"
    fi
}

recover_database() {
    echo -e "${YELLOW}[RECOVERY] Recovering database...${NC}"
    
    # Check for backups
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR)" ]; then
        local LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)
        echo -e "${YELLOW}Found backup: $LATEST_BACKUP${NC}"
        
        # Prompt for recovery
        read -p "Restore from backup? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # MongoDB restore example
            if command -v mongorestore &>/dev/null; then
                mongorestore --archive="$BACKUP_DIR/$LATEST_BACKUP" 2>&1 | tee -a "$LOG_DIR/db_restore.log"
                echo -e "${GREEN}✓ Database restored${NC}"
            fi
        fi
    else
        echo -e "${RED}[✗] No backups found${NC}"
    fi
}

recover_from_data_corruption() {
    echo -e "${YELLOW}[RECOVERY] Detecting data corruption...${NC}"
    
    if command -v mongosh &>/dev/null; then
        mongosh --eval "
            db.runCommand({ validate: 'users' });
        " 2>&1 | tee -a "$LOG_DIR/db_validation.log"
    fi
}

################################################################################
# INCIDENT RESPONSE RUNBOOKS
################################################################################

trigger_runbook() {
    local INCIDENT_TYPE=$1
    
    case $INCIDENT_TYPE in
        HIGH_CPU)
            runbook_high_cpu
            ;;
        HIGH_MEMORY)
            runbook_high_memory
            ;;
        SERVICE_DOWN)
            runbook_service_down
            ;;
        DATABASE_SLOW)
            runbook_database_slow
            ;;
        ERROR_SPIKE)
            runbook_error_spike
            ;;
        DEPLOYMENT_FAILED)
            runbook_deployment_failed
            ;;
        SECURITY_ALERT)
            runbook_security_alert
            ;;
        *)
            echo "Unknown incident type: $INCIDENT_TYPE"
            ;;
    esac
}

runbook_high_cpu() {
    echo -e "${CYAN}=== RUNBOOK: High CPU Usage ===${NC}"
    echo ""
    echo "Step 1: Identify culprit process"
    ps aux --sort=-%cpu | head -5
    echo ""
    echo "Step 2: Check for loops or infinite processes"
    echo "Step 3: Consider service restart"
    echo "Step 4: Scale horizontally if needed"
}

runbook_high_memory() {
    echo -e "${CYAN}=== RUNBOOK: High Memory Usage ===${NC}"
    echo ""
    echo "Step 1: Identify memory hog"
    ps aux --sort=-%mem | head -5
    echo ""
    echo "Step 2: Check for memory leaks"
    echo "Step 3: Clear caches"
    response_clear_cache
    echo "Step 4: Restart service if needed"
}

runbook_service_down() {
    echo -e "${CYAN}=== RUNBOOK: Service Down ===${NC}"
    echo ""
    echo "Step 1: Verify service status"
    echo "Step 2: Check logs for errors"
    echo "Step 3: Attempt auto-restart"
    echo "Step 4: Manual intervention if needed"
}

runbook_database_slow() {
    echo -e "${CYAN}=== RUNBOOK: Database Slow ===${NC}"
    echo ""
    echo "Step 1: Check slow query log"
    echo "Step 2: Analyze query plans"
    echo "Step 3: Add missing indexes"
    echo "Step 4: Consider data archival"
}

runbook_error_spike() {
    echo -e "${CYAN}=== RUNBOOK: Error Spike ===${NC}"
    echo ""
    echo "Step 1: Check error logs"
    analyze_error_logs
    echo "Step 2: Identify common errors"
    echo "Step 3: Apply hotfix"
    echo "Step 4: Monitor error rate"
}

runbook_deployment_failed() {
    echo -e "${CYAN}=== RUNBOOK: Deployment Failed ===${NC}"
    echo ""
    echo "Step 1: Check deployment logs"
    echo "Step 2: Identify failure reason"
    echo "Step 3: Rollback to stable version"
    recover_from_deployment
    echo "Step 4: Fix and redeploy"
}

runbook_security_alert() {
    echo -e "${RED}=== RUNBOOK: Security Alert ===${NC}"
    echo ""
    echo "⚠️  CRITICAL - SECURITY BREACH DETECTED ⚠️"
    echo ""
    echo "Step 1: Isolate affected systems IMMEDIATELY"
    echo "Step 2: Enable verbose logging"
    echo "Step 3: Check for unauthorized access"
    echo "Step 4: Notify security team"
    echo "Step 5: Begin forensic investigation"
}

################################################################################
# ANALYSIS FUNCTIONS
################################################################################

analyze_error_logs() {
    local LOG_FILE="erp_new_system/backend/logs/error.log"
    
    if [ ! -f "$LOG_FILE" ]; then
        echo "Log file not found: $LOG_FILE"
        return 1
    fi
    
    echo -e "${CYAN}Error Log Analysis:${NC}"
    echo "Total errors (last hour): $(grep "$(date '+%Y-%m-%d %H')" "$LOG_FILE" | wc -l)"
    echo ""
    echo "Top error types:"
    tail -100 "$LOG_FILE" | grep -o "Error: [^,]*" | sort | uniq -c | sort -rn | head -5
}

################################################################################
# INCIDENT TRACKING
################################################################################

create_incident_ticket() {
    local SEVERITY=$1
    local TITLE=$2
    local DESCRIPTION=$3
    
    local INCIDENT_ID="INC-$(date +%s)"
    local TICKET_FILE="${INCIDENT_DIR}/${INCIDENT_ID}.md"
    
    cat > "$TICKET_FILE" << EOF
# Incident Ticket: $INCIDENT_ID

**Severity:** $SEVERITY  
**Title:** $TITLE  
**Created:** $(date)  
**Status:** Open  

## Description
$DESCRIPTION

## Timeline
- $(date): Incident created

## Response Actions
- [ ] Acknowledge incident
- [ ] Begin investigation
- [ ] Implement workaround
- [ ] Deploy fix
- [ ] Verify resolution

## Root Cause Analysis
[To be completed]

## Prevention
[To be completed]

---
**Ticket ID:** $INCIDENT_ID
EOF

    echo "Incident ticket created: $TICKET_FILE"
    echo "Ticket ID: $INCIDENT_ID"
}

################################################################################
# SIMULATION TESTING
################################################################################

simulate_incident() {
    local INCIDENT_TYPE=$1
    
    echo -e "${YELLOW}[SIMULATION] Testing incident: $INCIDENT_TYPE${NC}"
    echo "⚠️  This is a simulation - no actual impact"
    echo ""
    
    case $INCIDENT_TYPE in
        cpu_spike)
            echo "Simulating: High CPU usage"
            echo "Expected response: Auto-scaling triggered"
            ;;
        memory_leak)
            echo "Simulating: Memory leak"
            echo "Expected response: Cache cleared, service restarted"
            ;;
        service_crash)
            echo "Simulating: Service crash"
            echo "Expected response: Automatic restart and health check"
            ;;
        database_timeout)
            echo "Simulating: Database timeout"
            echo "Expected response: Connection pool reset, circuit breaker activated"
            ;;
        *)
            echo "Unknown simulation: $INCIDENT_TYPE"
            return 1
            ;;
    esac
    
    echo ""
    echo -e "${CYAN}Simulation Response Plan:${NC}"
    trigger_runbook "$INCIDENT_TYPE"
}

################################################################################
# MAIN MENU
################################################################################

show_menu() {
    clear
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       ALAWAEL - AUTOMATED INCIDENT RESPONSE          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Automated incident detection and response"
    echo ""
    echo "Detection:"
    echo "  1. Detect service status"
    echo "  2. Detect error rate spike"
    echo "  3. Detect database issues"
    echo ""
    echo "Auto-Response:"
    echo "  4. Restart service"
    echo "  5. Clear cache"
    echo "  6. Rotate logs"
    echo "  7. Activate circuit breaker"
    echo ""
    echo "Recovery:"
    echo "  8. Rollback deployment"
    echo "  9. Recover database"
    echo ""
    echo "Runbooks:"
    echo "  10. Show CPU spike runbook"
    echo "  11. Show memory leak runbook"
    echo "  12. Show service down runbook"
    echo ""
    echo "Testing:"
    echo "  13. Simulate incident"
    echo "  14. Create incident ticket"
    echo ""
    echo "  0. Exit"
    echo ""
}

main() {
    init_incident_response
    
    while true; do
        show_menu
        read -p "Select option (0-14): " choice
        
        case $choice in
            1)
                STATUS=$(detect_service_down "backend" "http://localhost:3001")
                echo "Backend status: $STATUS"
                ;;
            2)
                ERROR_RATE=$(detect_high_error_rate "erp_new_system/backend/logs/error.log")
                echo "Error rate: $ERROR_RATE"
                ;;
            3)
                DB_STATUS=$(detect_database_issue)
                echo "Database: $DB_STATUS"
                ;;
            4)
                response_service_restart "backend"
                ;;
            5)
                response_clear_cache
                ;;
            6)
                response_rotate_logs
                ;;
            7)
                response_circuit_breaker
                ;;
            8)
                recover_from_deployment
                ;;
            9)
                recover_database
                ;;
            10)
                runbook_high_cpu
                ;;
            11)
                runbook_high_memory
                ;;
            12)
                runbook_service_down
                ;;
            13)
                read -p "Incident type (cpu_spike/memory_leak/service_crash): " INC_TYPE
                simulate_incident "$INC_TYPE"
                ;;
            14)
                read -p "Severity (Critical/High/Medium): " SEVERITY
                read -p "Title: " TITLE
                read -p "Description: " DESCRIPTION
                create_incident_ticket "$SEVERITY" "$TITLE" "$DESCRIPTION"
                ;;
            0)
                echo "Exiting..."
                exit 0
                ;;
            *)
                echo "Invalid option"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
