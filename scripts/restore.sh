#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Database Restore Script
# Usage: ./scripts/restore.sh <backup_path>
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_PATH="${1:-}"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Al-Awael ERP — Restore"
echo "═══════════════════════════════════════════════════════════════════════"

if [ -z "$BACKUP_PATH" ]; then
  echo "❌ Usage: $0 <backup_path>"
  exit 1
fi

if [ ! -d "$BACKUP_PATH" ]; then
  echo "❌ Backup path not found: $BACKUP_PATH"
  exit 1
fi

# ─── MongoDB Restore ──────────────────────────────────────────────────────
if [ -d "$BACKUP_PATH/mongo" ]; then
  echo ""
  echo "💾 Restoring MongoDB..."
  
  MONGO_URI="${MONGODB_URI:-mongodb://admin:admin123@localhost:27017/alawael_erp?authSource=admin}"
  
  mongorestore --uri="$MONGO_URI" --gzip --drop "$BACKUP_PATH/mongo"
  
  echo "✅ MongoDB restored"
fi

# ─── Redis Restore ────────────────────────────────────────────────────────
if [ -f "$BACKUP_PATH/redis.rdb" ]; then
  echo ""
  echo "💾 Restoring Redis..."
  
  # Stop Redis, copy RDB, start Redis
  docker compose stop redis 2>/dev/null || systemctl stop redis 2>/dev/null || true
  cp "$BACKUP_PATH/redis.rdb" /data/redis/dump.rdb 2>/dev/null || true
  docker compose start redis 2>/dev/null || systemctl start redis 2>/dev/null || true
  
  echo "✅ Redis restored"
fi

# ─── Uploads Restore ───────────────────────────────────────────────────────
if [ -f "$BACKUP_PATH/uploads.tar.gz" ]; then
  echo ""
  echo "💾 Restoring uploads..."
  
  tar xzf "$BACKUP_PATH/uploads.tar.gz" -C /app
  
  echo "✅ Uploads restored"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ Restore Complete"
echo "═══════════════════════════════════════════════════════════════════════"
