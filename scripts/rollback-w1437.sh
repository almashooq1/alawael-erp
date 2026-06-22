#!/usr/bin/env bash
#
# W1437 Rollback Script
#
# Reverts the application code deployed for W1437. Note: the migration itself
# is NOT rolled back because it is safe to leave nphies.submission.updatedAt
# populated; old code will simply ignore the field.
#
# Usage:
#   export DEPLOY_ROOT=/opt/alawael-erp
#   ./scripts/rollback-w1437.sh [COMMIT_OR_TAG]
#
# If COMMIT_OR_TAG is omitted, the script rolls back to the commit immediately
# before the W1437 merge (one before 009c676bd on main). Specify a commit or
# tag explicitly for a different target.
#

set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/alawael-erp}"
W1437_MERGE_COMMIT="009c676bd"
TARGET="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
fail() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAIL:${NC} $*"; exit 1; }

log "Starting W1437 rollback"

if [[ ! -d "$DEPLOY_ROOT" ]]; then
  fail "Deployment root does not exist: $DEPLOY_ROOT"
fi

cd "$DEPLOY_ROOT" || fail "Could not cd to $DEPLOY_ROOT"

if [[ ! -d ".git" ]]; then
  fail "No .git directory found in $DEPLOY_ROOT"
fi

# Determine rollback target
if [[ -z "$TARGET" ]]; then
  log "No explicit target provided; rolling back to commit before W1437 merge ($W1437_MERGE_COMMIT)"
  if ! git rev-parse --verify "$W1437_MERGE_COMMIT^1" &>/dev/null; then
    fail "Could not resolve $W1437_MERGE_COMMIT^1. Specify an explicit commit or tag."
  fi
  TARGET=$(git rev-parse "$W1437_MERGE_COMMIT^1")
fi

if ! git rev-parse --verify "$TARGET" &>/dev/null; then
  fail "Invalid rollback target: $TARGET"
fi

TARGET_SHORT=$(git rev-parse --short "$TARGET")
CURRENT_COMMIT=$(git rev-parse --short HEAD)

log "Current commit: $CURRENT_COMMIT"
log "Rollback target: $TARGET_SHORT"

warn "This will revert application code to $TARGET_SHORT."
warn "The W1437 migration data will NOT be removed (it is safe to leave)."
read -rp "Continue? [y/N] " ans
if [[ "$ans" != "y" && "$ans" != "Y" ]]; then
  fail "Rollback cancelled by user"
fi

# Create a backup stamp
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$DEPLOY_ROOT/rollback-backup-$STAMP"
mkdir -p "$BACKUP_DIR"
echo "$CURRENT_COMMIT" > "$BACKUP_DIR/before-rollback-commit.txt"
cp -a backend "$BACKUP_DIR/backend" 2>/dev/null || warn "Could not backup backend directory"
cp -a frontend "$BACKUP_DIR/frontend" 2>/dev/null || warn "Could not backup frontend directory"
log "Backup saved to $BACKUP_DIR"

# Roll back code
git fetch origin main
git checkout main
git reset --hard "$TARGET"
log "Rolled back to $TARGET_SHORT"

# Restart services if possible
if command -v pm2 &>/dev/null && [[ -f "ecosystem.config.js" ]]; then
  log "Restarting backend via pm2..."
  pm2 reload ecosystem.config.js || pm2 restart all
elif command -v systemctl &>/dev/null; then
  log "Restarting backend via systemctl..."
  sudo systemctl restart alawael-api 2>/dev/null || warn "systemctl service name may differ; restart manually"
else
  warn "No recognized restart mechanism found. Please restart services manually."
fi

log "================================================================"
log "W1437 rollback COMPLETE"
log "Rolled back from $CURRENT_COMMIT to $TARGET_SHORT"
log "Backup: $BACKUP_DIR"
log "================================================================"
