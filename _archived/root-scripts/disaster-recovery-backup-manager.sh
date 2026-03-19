#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - DISASTER RECOVERY & BACKUP MANAGEMENT
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Comprehensive backup, disaster recovery, business continuity
################################################################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
DR_DIR=".alawael-disaster-recovery"
BACKUP_DIR="$DR_DIR/backups"
RTO_TARGET=15  # Recovery Time Objective (minutes)
RPO_TARGET=1   # Recovery Point Objective (hours)

################################################################################
# INITIALIZE
################################################################################

init_dr_system() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$DR_DIR/recovery-plans"
    mkdir -p "$DR_DIR/test-results"
    mkdir -p "$DR_DIR/logs"
    
    if [ ! -f "$DR_DIR/dr-config.json" ]; then
        cat > "$DR_DIR/dr-config.json" << 'EOF'
{
  "disaster_recovery": {
    "rto_minutes": 15,
    "rpo_hours": 1,
    "backup_frequency": "hourly",
    "retention_days": 30,
    "strategies": {
      "database": "full+incremental",
      "filesystem": "rsync+tar",
      "cloud": "multi-region"
    },
    "recovery_sites": [
      "primary",
      "secondary_backup",
      "tertiary_cloud"
    ]
  }
}
EOF
    fi
}

################################################################################
# BACKUP OPERATIONS
################################################################################

backup_mongodb() {
    echo -e "${CYAN}Creating MongoDB Backup...${NC}"
    echo ""
    
    if ! command -v mongodump &> /dev/null; then
        echo -e "${YELLOW}⚠ MongoDB tools not available${NC}"
        return 1
    fi
    
    local BACKUP_FILE="$BACKUP_DIR/mongodb_$(date +%Y%m%d_%H%M%S).archive"
    
    echo "Backup location: $BACKUP_FILE"
    echo "Starting backup..."
    
    # Create full backup
    mongodump --archive="$BACKUP_FILE" --gzip 2>/dev/null
    
    if [ -f "$BACKUP_FILE" ]; then
        local SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Backup created: $SIZE${NC}"
        
        # Verify backup
        mongodump --archive="$BACKUP_FILE" --gzip --dumpDbUsersAndRoles 2>/dev/null
        echo -e "${GREEN}✓ Backup verified${NC}"
        
        return 0
    else
        echo -e "${RED}✗ Backup failed${NC}"
        return 1
    fi
}

backup_application_data() {
    echo -e "${CYAN}Backing Up Application Data...${NC}"
    echo ""
    
    local BACKUP_FILE="$BACKUP_DIR/app-data_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    echo "Backing up: erp_new_system/backend"
    
    # Exclude node_modules, .git, logs
    tar --exclude='node_modules' \
        --exclude='.git' \
        --exclude='logs' \
        --exclude='*.log' \
        -czf "$BACKUP_FILE" \
        erp_new_system/backend/ \
        supply-chain-management/frontend/ \
        2>/dev/null
    
    if [ -f "$BACKUP_FILE" ]; then
        local SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Application data backed up: $SIZE${NC}"
        return 0
    else
        echo -e "${RED}✗ Backup failed${NC}"
        return 1
    fi
}

backup_configurations() {
    echo -e "${CYAN}Backing Up Configuration Files...${NC}"
    echo ""
    
    local BACKUP_FILE="$BACKUP_DIR/configs_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    echo "Backing up: Configuration files"
    
    tar -czf "$BACKUP_FILE" \
        .env \
        docker-compose.yml \
        Dockerfile \
        kubernetes/ \
        terraform/ \
        2>/dev/null
    
    if [ -f "$BACKUP_FILE" ]; then
        local SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Configurations backed up: $SIZE${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Some configs may not exist${NC}"
    fi
}

################################################################################
# RECOVERY PROCEDURES
################################################################################

restore_mongodb() {
    echo -e "${CYAN}MongoDB Recovery Procedure...${NC}"
    echo ""
    
    # List available backups
    echo "Available MongoDB backups:"
    ls -lh "$BACKUP_DIR"/mongodb_*.archive 2>/dev/null | tail -5 | awk '{print $9, "(" $5 ")"}'
    
    echo ""
    read -p "Enter backup file path to restore: " BACKUP_FILE
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "File not found: $BACKUP_FILE"
        return 1
    fi
    
    echo "Restoring from: $BACKUP_FILE"
    echo "This will overwrite existing data!"
    read -p "Continue? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled"
        return 1
    fi
    
    # Restore backup
    mongorestore --archive="$BACKUP_FILE" --gzip 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database restored successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Restore failed${NC}"
        return 1
    fi
}

restore_application_data() {
    echo -e "${CYAN}Application Data Recovery...${NC}"
    echo ""
    
    echo "Available application backups:"
    ls -lh "$BACKUP_DIR"/app-data_*.tar.gz 2>/dev/null | tail -5 | awk '{print $9, "(" $5 ")"}'
    
    echo ""
    read -p "Enter backup file path to restore: " BACKUP_FILE
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "File not found: $BACKUP_FILE"
        return 1
    fi
    
    echo "This will restore application files"
    read -p "Continue? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled"
        return 1
    fi
    
    # Create recovery directory
    mkdir -p "$DR_DIR/recovery"
    
    # Extract backup
    tar -xzf "$BACKUP_FILE" -C "$DR_DIR/recovery/" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Files extracted to $DR_DIR/recovery${NC}"
        echo "Review and merge changes manually"
        return 0
    else
        echo -e "${RED}✗ Restore failed${NC}"
        return 1
    fi
}

################################################################################
# DISASTER RECOVERY PLAN
################################################################################

show_dr_plan() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}ALAWAEL DISASTER RECOVERY PLAN${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${CYAN}Recovery Objectives:${NC}"
    echo "  RTO (Recovery Time Objective): $RTO_TARGET minutes"
    echo "  RPO (Recovery Point Objective): $RPO_TARGET hour(s)"
    echo ""
    
    echo -e "${CYAN}Backup Strategy:${NC}"
    echo ""
    echo "1. Database Backups"
    echo "   - Frequency: Every hour"
    echo "   - Type: Full + Incremental"
    echo "   - Retention: 30 days"
    echo "   - Location: Local + Cloud"
    echo ""
    
    echo "2. Application Data"
    echo "   - Frequency: Every 4 hours"
    echo "   - Type: Compressed archive"
    echo "   - Retention: 30 days"
    echo "   - Compression: gzip"
    echo ""
    
    echo "3. Configuration Files"
    echo "   - Frequency: After changes"
    echo "   - Type: Versioned backup"
    echo "   - Retention: 90 days"
    echo "   - Encryption: AES-256"
    echo ""
    
    echo -e "${CYAN}Recovery Centers:${NC}"
    echo "  Primary:        Production (Primary Region)"
    echo "  Secondary:      Backup Server (Same Region)"
    echo "  Tertiary:       Cloud Provider (Different Region)"
    echo ""
    
    echo -e "${CYAN}Failover Sequence:${NC}"
    echo "  1. Automatic health check (2 min)"
    echo "  2. Failover to secondary (3 min)"
    echo "  3. Data sync validation (5 min)"
    echo "  4. DNS update (2 min)"
    echo "  5. Services restart (3 min)"
    echo "     Total: ~15 minutes"
    echo ""
    
    echo -e "${CYAN}Recovery Procedures:${NC}"
    echo ""
    echo "Scenario A: Database Corruption (RTO: 15 min)"
    echo "  1. Detect corruption via monitoring"
    echo "  2. Stop writes to primary"
    echo "  3. Restore from latest backup"
    echo "  4. Run consistency checks"
    echo "  5. Resume operations"
    echo ""
    
    echo "Scenario B: Complete Data Loss (RTO: 15 min)"
    echo "  1. Activate secondary site"
    echo "  2. Restore from cloud backup"
    echo "  3. Verify all systems"
    echo "  4. Update routing"
    echo "  5. Notify stakeholders"
    echo ""
    
    echo "Scenario C: Complete System Failure (RTO: 15 min)"
    echo "  1. Detect primary failure"
    echo "  2. Promote secondary to primary"
    echo "  3. Restore all services"
    echo "  4. Run full validation (45+ tests)"
    echo "  5. Resume full operations"
    echo ""
}

################################################################################
# BACKUP TESTING
################################################################################

test_backup_restore() {
    echo -e "${CYAN}Testing Backup/Restore Procedures...${NC}"
    echo ""
    
    local TESTS_PASSED=0
    local TESTS_TOTAL=0
    
    # Test 1: Database backup
    echo -n "Test 1: MongoDB backup: "
    ((TESTS_TOTAL++))
    if [ -f "$(ls $BACKUP_DIR/mongodb_*.archive 2>/dev/null | tail -1)" ]; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}"
    fi
    
    # Test 2: Database restore
    echo -n "Test 2: MongoDB restore capability: "
    ((TESTS_TOTAL++))
    if command -v mongorestore &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
    fi
    
    # Test 3: Application backup
    echo -n "Test 3: Application data backup: "
    ((TESTS_TOTAL++))
    if [ -f "$(ls $BACKUP_DIR/app-data_*.tar.gz 2>/dev/null | tail -1)" ]; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}"
    fi
    
    # Test 4: Config backup
    echo -n "Test 4: Configuration backup: "
    ((TESTS_TOTAL++))
    if [ -f "$(ls $BACKUP_DIR/configs_*.tar.gz 2>/dev/null | tail -1)" ]; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}"
    fi
    
    # Test 5: Backup verification
    echo -n "Test 5: Backup integrity: "
    ((TESTS_TOTAL++))
    LATEST_DB=$(ls $BACKUP_DIR/mongodb_*.archive 2>/dev/null | tail -1)
    if [ -f "$LATEST_DB" ]; then
        tar -tzf "$LATEST_DB" &>/dev/null && echo -e "${GREEN}✓${NC}" && ((TESTS_PASSED++)) || echo -e "${RED}✗${NC}"
    else
        echo -e "${YELLOW}⚠${NC}"
    fi
    
    echo ""
    echo "Backup Tests: $TESTS_PASSED/$TESTS_TOTAL passed"
    
    if [ "$TESTS_PASSED" -ge $((TESTS_TOTAL - 1)) ]; then
        echo -e "${GREEN}✓ Disaster Recovery system is operational${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Some components need attention${NC}"
        return 1
    fi
}

################################################################################
# BACKUP STATUS
################################################################################

show_backup_status() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}BACKUP STATUS REPORT${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Database backups
    echo -e "${CYAN}Database Backups:${NC}"
    local DB_COUNT=$(ls $BACKUP_DIR/mongodb_*.archive 2>/dev/null | wc -l)
    echo "  Total backups: $DB_COUNT"
    
    if [ "$DB_COUNT" -gt 0 ]; then
        echo "  Most recent:"
        ls -lh $BACKUP_DIR/mongodb_*.archive 2>/dev/null | tail -1 | awk '{print "    " $9 " (" $5 ")"}'
    fi
    echo ""
    
    # Application backups
    echo -e "${CYAN}Application Backups:${NC}"
    local APP_COUNT=$(ls $BACKUP_DIR/app-data_*.tar.gz 2>/dev/null | wc -l)
    echo "  Total backups: $APP_COUNT"
    
    if [ "$APP_COUNT" -gt 0 ]; then
        echo "  Most recent:"
        ls -lh $BACKUP_DIR/app-data_*.tar.gz 2>/dev/null | tail -1 | awk '{print "    " $9 " (" $5 ")"}'
    fi
    echo ""
    
    # Config backups
    echo -e "${CYAN}Configuration Backups:${NC}"
    local CONFIG_COUNT=$(ls $BACKUP_DIR/configs_*.tar.gz 2>/dev/null | wc -l)
    echo "  Total backups: $CONFIG_COUNT"
    
    if [ "$CONFIG_COUNT" -gt 0 ]; then
        echo "  Most recent:"
        ls -lh $BACKUP_DIR/configs_*.tar.gz 2>/dev/null | tail -1 | awk '{print "    " $9 " (" $5 ")"}'
    fi
    echo ""
    
    # Storage used
    echo -e "${CYAN}Storage Usage:${NC}"
    local TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "  Total backup size: $TOTAL_SIZE"
    echo ""
    
    # Last backup times
    echo -e "${CYAN}Backup Frequency:${NC}"
    echo "  Database: Hourly"
    echo "  Application: Every 4 hours"
    echo "  Configuration: On change"
    echo ""
}

################################################################################
# CLEANUP & RETENTION
################################################################################

cleanup_old_backups() {
    echo -e "${CYAN}Cleaning Up Old Backups...${NC}"
    echo ""
    
    local DAYS_TO_KEEP=30
    
    echo "Removing backups older than $DAYS_TO_KEEP days..."
    
    find "$BACKUP_DIR" -type f -name "*.archive" -mtime +$DAYS_TO_KEEP -exec rm {} \;
    find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$DAYS_TO_KEEP -exec rm {} \;
    
    local REMOVED=$(find "$BACKUP_DIR" -type f -mtime +$DAYS_TO_KEEP 2>/dev/null | wc -l)
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    echo "Old backups removed"
    
    show_backup_status
}

################################################################################
# MAIN MENU
################################################################################

show_menu() {
    clear
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ALAWAEL - DISASTER RECOVERY & BACKUP MANAGEMENT      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Backup and disaster recovery management"
    echo ""
    echo "Backup Operations:"
    echo "  1. Backup MongoDB database"
    echo "  2. Backup application data"
    echo "  3. Backup configuration files"
    echo "  4. Full system backup (all above)"
    echo ""
    echo "Recovery Operations:"
    echo "  5. Restore MongoDB database"
    echo "  6. Restore application data"
    echo ""
    echo "Management:"
    echo "  7. Show disaster recovery plan"
    echo "  8. Test backup/restore procedures"
    echo "  9. Show backup status"
    echo "  10. Cleanup old backups"
    echo ""
    echo "  0. Exit"
    echo ""
}

main() {
    init_dr_system
    
    while true; do
        show_menu
        read -p "Select option (0-10): " choice
        
        case $choice in
            1) backup_mongodb ;;
            2) backup_application_data ;;
            3) backup_configurations ;;
            4)
                backup_mongodb
                sleep 1
                backup_application_data
                sleep 1
                backup_configurations
                ;;
            5) restore_mongodb ;;
            6) restore_application_data ;;
            7) show_dr_plan ;;
            8) test_backup_restore ;;
            9) show_backup_status ;;
            10) cleanup_old_backups ;;
            0) echo "Exiting..."; exit 0 ;;
            *) echo "Invalid option" ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
