#!/bin/bash
# Rollback Execution Script - نص تنفيذ التراجع
# الاستخدام: ./execute-rollback.sh [partial|full] "reason" "approved_by"

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/alawael"
BACKUP_DIR="/backups/pre-migration"

# ألوان للإخراج
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# === إعداد السجلات ===
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/rollback-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
  echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
  echo -e "${BLUE}[ℹ]${NC} $1" | tee -a "$LOG_FILE"
}

# === التحقق من المعاملات ===
if [ $# -lt 3 ]; then
  echo "استخدام: $0 [partial|full] 'reason' 'approved_by'"
  echo "مثال: $0 full 'Data corruption detected' 'Ahmed Manager'"
  exit 1
fi

ROLLBACK_TYPE=$1
REASON=$2
APPROVED_BY=$3
MIGRATION_ID=$(date +%Y%m%d-%H%M%S)

# === طباعة المعلومات ===
clear
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                  ROLLBACK EXECUTION STARTED               ║
╚═══════════════════════════════════════════════════════════╝
EOF

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Rollback Type: $ROLLBACK_TYPE"
echo "Reason: $REASON"
echo "Approved By: $APPROVED_BY"
echo "Timestamp: $(date +'%Y-%m-%d %H:%M:%S')"
echo "Log File: $LOG_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# === حفظ تفاصيل القرار ===
cat > "$LOG_DIR/rollback-decision-$MIGRATION_ID.json" << EOF
{
  "migrationId": "$MIGRATION_ID",
  "type": "$ROLLBACK_TYPE",
  "reason": "$REASON",
  "approvedBy": "$APPROVED_BY",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "INITIATED"
}
EOF

success "Decision recorded in rollback-decision-$MIGRATION_ID.json"

# === البحث عن أحدث نسخة احتياطية ===
log "Searching for backup..."

if [ ! -d "$BACKUP_DIR" ]; then
  error "Backup directory not found: $BACKUP_DIR"
  exit 1
fi

LATEST_BACKUP=$(ls -td "$BACKUP_DIR"/*/ 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  error "No backups found in $BACKUP_DIR"
  exit 1
fi

info "Found backup: $LATEST_BACKUP"

# === دالة التراجع الجزئي ===
partial_rollback() {
  local collection=$1
  log "Starting partial rollback for: $collection"
  
  # حذف البيانات القديمة
  info "Dropping collection: $collection"
  mongosh "$MONGO_NEW_URI" --eval "db.${collection}.drop()" 2>&1 | tee -a "$LOG_FILE"
  
  # استعادة من النسخة
  info "Restoring from backup..."
  mongorestore --uri="$MONGO_NEW_URI" \
    --nsInclude="alawael.${collection}" \
    "$LATEST_BACKUP" 2>&1 | tee -a "$LOG_FILE"
  
  success "Collection $collection restored"
}

# === دالة التراجع الكامل ===
full_rollback() {
  log "=== STARTING FULL ROLLBACK ==="
  
  # المرحلة 1: إيقاف التطبيق
  info "Phase 1/5: Stopping application (timeout: 30s)"
  if systemctl is-active --quiet alawael; then
    systemctl stop alawael
    sleep 5
    success "Application stopped"
  else
    warning "Application not running"
  fi
  
  # المرحلة 2: حذف قاعدة البيانات
  info "Phase 2/5: Dropping new database"
  mongosh "$MONGO_NEW_URI" --eval "db.dropDatabase()" 2>&1 | tee -a "$LOG_FILE"
  success "Database dropped"
  
  # المرحلة 3: استعادة النسخة الاحتياطية
  info "Phase 3/5: Restoring backup (this may take several minutes)"
  RESTORE_START=$(date +%s)
  
  mongorestore --uri="$MONGO_NEW_URI" \
    --nsInclude="alawael.*" \
    "$LATEST_BACKUP" \
    2>&1 | tee -a "$LOG_FILE"
  
  RESTORE_END=$(date +%s)
  RESTORE_TIME=$((RESTORE_END - RESTORE_START))
  
  info "Restore completed in ${RESTORE_TIME}s"
  
  # المرحلة 4: إعادة بناء الفهارس
  info "Phase 4/5: Rebuilding indexes"
  npm --prefix /app/backend run db:rebuild-indexes 2>&1 | tee -a "$LOG_FILE"
  success "Indexes rebuilt"
  
  # المرحلة 5: التحقق والتشغيل
  info "Phase 5/5: Verifying and starting application"
  
  # التحقق من قاعدة البيانات
  PING=$(mongosh "$MONGO_NEW_URI" --eval "db.adminCommand('ping')" 2>&1)
  
  if echo "$PING" | grep -q '"ok" : 1'; then
    success "Database connection verified"
    
    # تشغيل التطبيق
    systemctl start alawael
    sleep 5
    
    # التحقق من تشغيل التطبيق
    if systemctl is-active --quiet alawael; then
      success "Application started successfully"
      success "ROLLBACK COMPLETED SUCCESSFULLY"
    else
      error "Application failed to start"
      exit 1
    fi
  else
    error "Database verification failed"
    exit 1
  fi
}

# === تنفيذ التراجع ===
case "$ROLLBACK_TYPE" in
  "partial")
    log "Executing PARTIAL rollback"
    # التراجع عن أقسام محددة
    partial_rollback "users"
    partial_rollback "employees"
    success "Partial rollback completed"
    ;;
  
  "full")
    log "Executing FULL rollback"
    full_rollback
    ;;
  
  *)
    error "Invalid rollback type: $ROLLBACK_TYPE"
    echo "Valid types: partial, full"
    exit 1
    ;;
esac

# === التحقق النهائي ===
log "Running final verification..."

# التحقق من الاتصال
HEALTH=$(curl -s http://localhost:3000/health || echo "down")

if echo "$HEALTH" | grep -q "ok"; then
  success "Application health check: OK"
else
  warning "Application may not be fully ready"
fi

# عرض النتائج
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ROLLBACK COMPLETED SUCCESSFULLY                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Summary:"
echo "  - Type: $ROLLBACK_TYPE"
echo "  - Duration: $(($SECONDS / 60)) minutes $(($SECONDS % 60)) seconds"
echo "  - Log: $LOG_FILE"
echo ""

# إرسال إشعارات
if command -v notify-send &> /dev/null; then
  notify-send "Rollback Complete" "Database rollback completed for: $REASON"
fi

log "=== ROLLBACK SESSION COMPLETE ==="
