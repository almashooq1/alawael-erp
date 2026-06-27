#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Database Backup Script
# Usage: ./scripts/backup.sh [type] [destination]
#   type: full | incremental | mongo-only | redis-only (default: full)
#   destination: local | s3 | minio (default: local)
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_TYPE="${1:-full}"
DESTINATION="${2:-local}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATE=$(date -u +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Al-Awael ERP — Backup"
echo "  Type: $BACKUP_TYPE | Destination: $DESTINATION"
echo "  Date: $DATE"
echo "═══════════════════════════════════════════════════════════════════════"

mkdir -p "$BACKUP_PATH"

# ─── MongoDB Backup ───────────────────────────────────────────────────────
if [ "$BACKUP_TYPE" = "full" ] || [ "$BACKUP_TYPE" = "mongo-only" ]; then
  echo ""
  echo "💾 Backing up MongoDB..."
  
  MONGO_URI="${MONGODB_URI:-mongodb://admin:admin123@localhost:27017/alawael_erp?authSource=admin}"
  
  mongodump --uri="$MONGO_URI" --out="$BACKUP_PATH/mongo" --gzip
  
  echo "✅ MongoDB backup: $BACKUP_PATH/mongo"
fi

# ─── Redis Backup ─────────────────────────────────────────────────────────
if [ "$BACKUP_TYPE" = "full" ] || [ "$BACKUP_TYPE" = "redis-only" ]; then
  echo ""
  echo "💾 Backing up Redis..."
  
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  REDIS_PASSWORD="${REDIS_PASSWORD:-}"
  
  if [ -n "$REDIS_PASSWORD" ]; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$BACKUP_PATH/redis.rdb"
  else
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_PATH/redis.rdb"
  fi
  
  echo "✅ Redis backup: $BACKUP_PATH/redis.rdb"
fi

# ─── Application Data ─────────────────────────────────────────────────────
if [ "$BACKUP_TYPE" = "full" ]; then
  echo ""
  echo "💾 Backing up application data..."
  
  # Uploads
  if [ -d "/app/uploads" ]; then
    tar czf "$BACKUP_PATH/uploads.tar.gz" -C /app uploads
    echo "✅ Uploads backup: $BACKUP_PATH/uploads.tar.gz"
  fi
  
  # Logs (last 7 days)
  find /app/logs -name "*.log" -mtime -7 -exec tar czf "$BACKUP_PATH/logs.tar.gz" {} + 2>/dev/null || true
  echo "✅ Logs backup: $BACKUP_PATH/logs.tar.gz"
fi

# ─── Upload to destination ──────────────────────────────────────────────
if [ "$DESTINATION" = "s3" ]; then
  echo ""
  echo "☁️ Uploading to S3..."
  aws s3 sync "$BACKUP_PATH" "s3://${S3_BUCKET}/backups/$DATE/" --delete
  echo "✅ S3 upload complete"
elif [ "$DESTINATION" = "minio" ]; then
  echo ""
  echo "☁️ Uploading to MinIO..."
  mc cp --recursive "$BACKUP_PATH" "minio/${MINIO_BUCKET}/backups/$DATE/"
  echo "✅ MinIO upload complete"
fi

# ─── Retention cleanup ──────────────────────────────────────────────────
echo ""
echo "🧹 Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ Backup Complete: $BACKUP_PATH"
echo "═══════════════════════════════════════════════════════════════════════"
