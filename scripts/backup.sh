#!/bin/bash
# Database Backup Automation Script
# سكريبت أتمتة النسخ الاحتياطية لقاعدة البيانات

set -e

# ================== Configuration ==================

# Database Settings
DB_USER="${MONGODB_USER:-admin}"
DB_PASSWORD="${MONGODB_PASSWORD:-admin}"
DB_HOST="${MONGODB_HOST:-localhost}"
DB_PORT="${MONGODB_PORT:-27017}"
DB_NAME="${MONGODB_DBNAME:-alawael}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
ARCHIVE_DIR="${ARCHIVE_DIR:-./backups/archive}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ================== Functions ==================

log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Create backup directories
create_backup_dirs() {
  mkdir -p "$BACKUP_DIR"
  mkdir -p "$ARCHIVE_DIR"
  success "Backup directories created"
}

# Full Database Backup
backup_full() {
  log "Starting Full Database Backup..."

  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_name="full_backup_${timestamp}"
  local backup_path="$BACKUP_DIR/${backup_name}"

  # Create backup directory
  mkdir -p "$backup_path"

  # Dump database
  mongodump \
    --uri="mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    --out="$backup_path" \
    --verbose

  if [ $? -eq 0 ]; then
    success "Full backup completed: $backup_name"

    # Create archive
    tar -czf "${ARCHIVE_DIR}/${backup_name}.tar.gz" -C "$BACKUP_DIR" "$backup_name"
    rm -rf "$backup_path"
    success "Backup archived: ${backup_name}.tar.gz"
  else
    error "Full backup failed"
    return 1
  fi
}

# Incremental Backup (Collection-specific)
backup_incremental() {
  log "Starting Incremental Backup..."

  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_name="incremental_backup_${timestamp}"
  local backup_path="$BACKUP_DIR/${backup_name}"

  mkdir -p "$backup_path"

  # Collections to backup
  collections=("users" "modules" "reports" "attendance" "payments" "documents")

  for collection in "${collections[@]}"; do
    log "Backing up collection: $collection"

    mongoexport \
      --uri="mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
      --collection="$collection" \
      --out="${backup_path}/${collection}.json" \
      --jsonArray

    if [ $? -ne 0 ]; then
      warning "Failed to backup collection: $collection"
    fi
  done

  # Create archive
  tar -czf "${ARCHIVE_DIR}/${backup_name}.tar.gz" -C "$BACKUP_DIR" "$backup_name"
  rm -rf "$backup_path"
  success "Incremental backup completed"
}

# Backup specific collection
backup_collection() {
  local collection="$1"

  if [ -z "$collection" ]; then
    error "Collection name required"
    return 1
  fi

  log "Backing up collection: $collection"

  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${ARCHIVE_DIR}/${collection}_${timestamp}.json"

  mongoexport \
    --uri="mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    --collection="$collection" \
    --out="$backup_file" \
    --jsonArray

  if [ $? -eq 0 ]; then
    gzip "$backup_file"
    success "Collection backup completed: ${collection}_${timestamp}.json.gz"
  else
    error "Collection backup failed"
    return 1
  fi
}

# Restore from backup
restore_backup() {
  local backup_file="$1"

  if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
    error "Backup file not found: $backup_file"
    return 1
  fi

  log "Restoring from backup: $backup_file"

  # Check if file is compressed
  if [[ "$backup_file" == *.gz ]]; then
    tar -xzf "$backup_file" -C "$BACKUP_DIR"
    backup_dir=$(basename "$backup_file" .tar.gz)
  else
    backup_dir=$(basename "$backup_file")
  fi

  mongorestore \
    --uri="mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    "$BACKUP_DIR/$backup_dir" \
    --verbose

  if [ $? -eq 0 ]; then
    success "Restore completed successfully"
    rm -rf "$BACKUP_DIR/$backup_dir"
  else
    error "Restore failed"
    return 1
  fi
}

# List all backups
list_backups() {
  log "Available Backups:"
  echo ""
  ls -lhS "$ARCHIVE_DIR" | tail -n +2 | awk '{printf "  %-50s %10s %s\n", $9, $5, $6" "$7" "$8}'
  echo ""
}

# Delete old backups
cleanup_old_backups() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."

  find "$ARCHIVE_DIR" -type f -mtime "+$RETENTION_DAYS" -name "*.tar.gz" | while read file; do
    log "Deleting: $(basename "$file")"
    rm -f "$file"
  done

  success "Cleanup completed"
}

# Get backup statistics
show_stats() {
  log "Backup Statistics:"
  echo ""

  local total_size=$(du -sh "$BACKUP_DIR" "$ARCHIVE_DIR" 2>/dev/null | tail -1 | awk '{print $1}')
  local backup_count=$(find "$ARCHIVE_DIR" -type f -name "*.tar.gz" | wc -l)
  local latest_backup=$(ls -t "$ARCHIVE_DIR"/*.tar.gz 2>/dev/null | head -1)
  local oldest_backup=$(ls -t "$ARCHIVE_DIR"/*.tar.gz 2>/dev/null | tail -1)

  echo "  Total Backups: $backup_count"
  echo "  Total Size: $total_size"

  if [ ! -z "$latest_backup" ]; then
    echo "  Latest: $(basename "$latest_backup") - $(stat -f %Sm -t %Y-%m-%d %H:%M:%S "$latest_backup" 2>/dev/null || stat --format=%y "$latest_backup" | cut -d' ' -f1-2)"
  fi

  if [ ! -z "$oldest_backup" ]; then
    echo "  Oldest: $(basename "$oldest_backup")"
  fi

  echo ""
}

# Setup cron job
setup_cron() {
  log "Setting up backup cron job..."

  local cron_cmd="0 2 * * * cd /path/to/project && bash scripts/backup.sh backup-full"

  echo ""
  echo "Add this line to your crontab (crontab -e):"
  echo "$cron_cmd"
  echo ""
  echo "This will run daily backups at 2:00 AM"
  echo ""
}

# ================== Main ==================

main() {
  local command="${1:-help}"

  case "$command" in
    init)
      log "Initializing backup system..."
      create_backup_dirs
      success "Backup system initialized"
      ;;

    full)
      create_backup_dirs
      backup_full
      ;;

    incremental)
      create_backup_dirs
      backup_incremental
      ;;

    collection)
      create_backup_dirs
      backup_collection "$2"
      ;;

    restore)
      restore_backup "$2"
      ;;

    list)
      list_backups
      ;;

    cleanup)
      cleanup_old_backups
      ;;

    stats)
      show_stats
      ;;

    cron)
      setup_cron
      ;;

    all)
      log "Running complete backup routine..."
      create_backup_dirs
      backup_full
      cleanup_old_backups
      show_stats
      success "Backup routine completed"
      ;;

    *)
      echo ""
      echo "╔════════════════════════════════════════════════════════════════╗"
      echo "║          📦 Database Backup Management Script 📦               ║"
      echo "╚════════════════════════════════════════════════════════════════╝"
      echo ""
      echo "Usage: $0 <command> [options]"
      echo ""
      echo "Commands:"
      echo "  init              Initialize backup system"
      echo "  full              Perform full database backup"
      echo "  incremental       Perform incremental backup"
      echo "  collection <name> Backup specific collection"
      echo "  restore <file>    Restore from backup file"
      echo "  list              List all available backups"
      echo "  cleanup           Remove old backups"
      echo "  stats             Show backup statistics"
      echo "  cron              Setup automated backups"
      echo "  all               Run complete backup routine"
      echo ""
      echo "Examples:"
      echo "  $0 full                    # Full database backup"
      echo "  $0 collection users        # Backup users collection"
      echo "  $0 restore backups/full_backup_20250104_120000.tar.gz"
      echo "  $0 cleanup                 # Remove backups older than 30 days"
      echo ""
      echo "Configuration:"
      echo "  DB_USER: $DB_USER"
      echo "  DB_HOST: $DB_HOST:$DB_PORT"
      echo "  DB_NAME: $DB_NAME"
      echo "  BACKUP_DIR: $BACKUP_DIR"
      echo "  RETENTION: $RETENTION_DAYS days"
      echo ""
      ;;
  esac
}

main "$@"
