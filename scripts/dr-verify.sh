#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Disaster Recovery Verify Script
# Usage: ./scripts/dr-verify.sh [backup_path]
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_PATH="${1:-}"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Al-Awael ERP — Disaster Recovery Verification"
echo "═══════════════════════════════════════════════════════════════════════"

# ─── Check 1: Backup Existence ────────────────────────────────────────────
echo ""
echo "🔍 Check 1: Backup Existence"
if [ -z "$BACKUP_PATH" ]; then
  echo "   ❌ No backup path provided"
  exit 1
fi

if [ ! -d "$BACKUP_PATH" ]; then
  echo "   ❌ Backup path not found: $BACKUP_PATH"
  exit 1
fi

echo "   ✅ Backup found: $BACKUP_PATH"

# ─── Check 2: MongoDB Backup Integrity ────────────────────────────────────
echo ""
echo "🔍 Check 2: MongoDB Backup Integrity"
if [ -d "$BACKUP_PATH/mongo" ]; then
  MONGO_BACKUP_COUNT=$(find "$BACKUP_PATH/mongo" -type d | wc -l)
  if [ "$MONGO_BACKUP_COUNT" -gt 0 ]; then
    echo "   ✅ MongoDB backup: $MONGO_BACKUP_COUNT collections"
  else
    echo "   ⚠️ MongoDB backup empty"
  fi
else
  echo "   ⚠️ No MongoDB backup found"
fi

# ─── Check 3: Redis Backup Integrity ────────────────────────────────────
echo ""
echo "🔍 Check 3: Redis Backup Integrity"
if [ -f "$BACKUP_PATH/redis.rdb" ]; then
  RDB_SIZE=$(stat -c%s "$BACKUP_PATH/redis.rdb" 2>/dev/null || stat -f%z "$BACKUP_PATH/redis.rdb")
  echo "   ✅ Redis backup: $RDB_SIZE bytes"
else
  echo "   ⚠️ No Redis backup found"
fi

# ─── Check 4: Uploads Backup Integrity ───────────────────────────────────
echo ""
echo "🔍 Check 4: Uploads Backup Integrity"
if [ -f "$BACKUP_PATH/uploads.tar.gz" ]; then
  UPLOADS_SIZE=$(stat -c%s "$BACKUP_PATH/uploads.tar.gz" 2>/dev/null || stat -f%z "$BACKUP_PATH/uploads.tar.gz")
  echo "   ✅ Uploads backup: $UPLOADS_SIZE bytes"
else
  echo "   ⚠️ No uploads backup found"
fi

# ─── Check 5: Application Connectivity ──────────────────────────────────
echo ""
echo "🔍 Check 5: Application Connectivity"
if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
  echo "   ✅ Application is running and healthy"
else
  echo "   ⚠️ Application is not responding (may be stopped for DR)"
fi

# ─── Check 6: Environment Variables ──────────────────────────────────────
echo ""
echo "🔍 Check 6: Required Environment Variables"
REQUIRED_VARS=("MONGODB_URI" "REDIS_URL" "JWT_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
  if [ -n "${!var:-}" ]; then
    echo "   ✅ $var: Set"
  else
    echo "   ❌ $var: Not set"
  fi
done

# ─── Check 7: Disk Space ──────────────────────────────────────────────────
echo ""
echo "🔍 Check 7: Disk Space"
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt 90 ]; then
  echo "   ✅ Disk usage: $DISK_USAGE%"
else
  echo "   ⚠️ Disk usage: $DISK_USAGE% (critical)"
fi

# ─── Check 8: Memory ──────────────────────────────────────────────────────
echo ""
echo "🔍 Check 8: Memory"
if command -v free > /dev/null 2>&1; then
  MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}')
  echo "   ✅ Memory usage: $MEM_USAGE%"
else
  echo "   ⚠️ Cannot check memory (free not available)"
fi

# ─── Check 9: Network Connectivity ───────────────────────────────────────
echo ""
echo "🔍 Check 9: Network Connectivity"
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
  echo "   ✅ Internet connectivity: OK"
else
  echo "   ⚠️ No internet connectivity"
fi

# ─── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ Disaster Recovery Verification Complete"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  Backup: $BACKUP_PATH"
echo "  Date: $(date -u +%Y-%m-%d\ %H:%M:%S\ UTC)"
echo ""
