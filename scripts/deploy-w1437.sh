#!/usr/bin/env bash
#
# W1437 Production Deployment Executor
#
# Run this script ON THE PRODUCTION HOST as the deployment user.
# It performs the mandatory pre-deploy migration and index verification.
#
# Usage:
#   export MONGODB_URI="mongodb://..."
#   export NODE_ENV=production
#   export DEPLOY_ROOT=/opt/alawael-erp
#   ./scripts/deploy-w1437.sh [--force]
#
# Use --force to discard any local uncommitted changes in DEPLOY_ROOT.
# Without --force the script aborts if the working tree is dirty.
#

set -euo pipefail

# --- Configuration -----------------------------------------------------------
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/alawael-erp}"
MONGODB_URI="${MONGODB_URI:-${MONGO_URI:-}}"
NODE_ENV="${NODE_ENV:-production}"
REQUIRED_NODE_VERSION="22"
FORCE_RESET=false
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-24}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
TEAMS_WEBHOOK="${TEAMS_WEBHOOK:-}"
PAGERDUTY_INTEGRATION_KEY="${PAGERDUTY_INTEGRATION_KEY:-}"
SENTRY_DSN="${SENTRY_DSN:-}"

# Parse optional args
for arg in "$@"; do
  case "$arg" in
    --force) FORCE_RESET=true ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# --- Colors ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
fail() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAIL:${NC} $*"; exit 1; }

# --- Pre-flight checks -------------------------------------------------------
log "Starting W1437 production deployment executor"

if [[ -z "$MONGODB_URI" ]]; then
  fail "MONGODB_URI (or MONGO_URI) is not set. Export it before running this script."
fi

if [[ "$NODE_ENV" != "production" ]]; then
  warn "NODE_ENV is not set to 'production' (current: $NODE_ENV). Continuing anyway."
fi

if [[ ! -d "$DEPLOY_ROOT" ]]; then
  fail "Deployment root does not exist: $DEPLOY_ROOT"
fi

cd "$DEPLOY_ROOT" || fail "Could not cd to $DEPLOY_ROOT"

if [[ ! -d ".git" ]]; then
  fail "No .git directory found in $DEPLOY_ROOT"
fi

if ! command -v node &>/dev/null; then
  fail "node is not installed or not in PATH"
fi

NODE_MAJOR=$(node -v | sed -E 's/v([0-9]+).*/\1/')
if [[ "$NODE_MAJOR" -lt "$REQUIRED_NODE_VERSION" ]]; then
  fail "Node.js version $NODE_MAJOR is too old. Required: >= $REQUIRED_NODE_VERSION"
fi

log "Environment OK: node $(node -v), DEPLOY_ROOT=$DEPLOY_ROOT, NODE_ENV=$NODE_ENV"

# --- Notify start ------------------------------------------------------------
notify() {
  local status="$1"
  local message="$2"
  local severity="$3"
  severity="${severity:-info}"

  if [[ -n "$SLACK_WEBHOOK" || -n "$TEAMS_WEBHOOK" || -n "$PAGERDUTY_INTEGRATION_KEY" || -n "$SENTRY_DSN" ]]; then
    "${DEPLOY_ROOT}/scripts/alert-dispatch.sh" "$severity" "$status" "$message" || warn "Alert dispatch failed"
  fi
}

notify "STARTED" "Deployment pre-flight on $(hostname)" "info"

# --- Backup verification -----------------------------------------------------
log "Verifying production MongoDB backup..."

# Try common backup locations
BACKUP_DIR=""
for candidate in "$DEPLOY_ROOT/backups/mongodb" "/var/backups/mongodb" "/opt/backups/mongodb" "/backup/mongodb"; do
  if [[ -d "$candidate" ]]; then
    BACKUP_DIR="$candidate"
    break
  fi
done

if [[ -z "$BACKUP_DIR" ]]; then
  warn "Could not find a MongoDB backup directory. Skipping backup age check."
  warn "Expected one of: $DEPLOY_ROOT/backups/mongodb, /var/backups/mongodb, /opt/backups/mongodb, /backup/mongodb"
else
  LATEST_BACKUP=$(find "$BACKUP_DIR" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
  if [[ -z "$LATEST_BACKUP" ]]; then
    warn "No backup files found in $BACKUP_DIR"
  else
    BACKUP_AGE_HOURS=$(( ( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || stat -f %m "$LATEST_BACKUP" 2>/dev/null || echo 0) ) / 3600 ))
    log "Latest backup: $LATEST_BACKUP (age: ${BACKUP_AGE_HOURS}h)"
    if [[ $BACKUP_AGE_HOURS -gt $BACKUP_MAX_AGE_HOURS ]]; then
      fail "Backup is older than ${BACKUP_MAX_AGE_HOURS}h. Create a fresh backup before proceeding."
    fi
  fi
fi

# --- Pre-flight DB connectivity ----------------------------------------------
log "Testing MongoDB connectivity..."
node - <<'NODE_SCRIPT'
const mongoose = require('mongoose');
(async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(mongoUri, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  const admin = mongoose.connection.db.admin();
  const info = await admin.serverInfo();
  console.log(`[DB] Connected: MongoDB ${info.version}`);
  await mongoose.disconnect();
})();
NODE_SCRIPT

# --- Pull latest main --------------------------------------------------------
log "Pulling latest main from origin..."

if [[ -n "$(git status --porcelain)" ]]; then
  warn "Working tree is dirty."
  if [[ "$FORCE_RESET" != "true" ]]; then
    fail "Aborting. Use --force to discard local changes, or commit/stash them first."
  fi
  warn "--force supplied; local changes will be discarded."
fi

git fetch origin main
git checkout main
git reset --hard origin/main || fail "Could not reset to origin/main"

CURRENT_COMMIT=$(git rev-parse --short HEAD)
log "Now on main at commit $CURRENT_COMMIT"

# --- Run migration -----------------------------------------------------------
log "Running NphiesClaim updatedAt backfill migration..."
log "(URI host: $(echo "$MONGODB_URI" | sed -E 's#^mongodb(\+srv)?://([^/]+)/.*#\2#'))"

MIGRATION_OUTPUT=$(MONGODB_URI="$MONGODB_URI" NODE_ENV="$NODE_ENV" node backend/scripts/migrate-nphies-claim-updatedAt.js 2>&1)
MIGRATION_EXIT=$?

# Log output locally
printf '%s\n' "$MIGRATION_OUTPUT"

MIGRATION_MATCHED=$(echo "$MIGRATION_OUTPUT" | grep -oE '"matched":[0-9]+' | cut -d: -f2 || echo "?")
MIGRATION_MODIFIED=$(echo "$MIGRATION_OUTPUT" | grep -oE '"modified":[0-9]+' | cut -d: -f2 || echo "?")

if [[ $MIGRATION_EXIT -ne 0 ]]; then
  notify "MIGRATION_FAILED" "Migration failed with exit code $MIGRATION_EXIT" "critical"
  fail "Migration failed with exit code $MIGRATION_EXIT. STOP. Do not deploy application code."
fi

log "Migration completed successfully (matched: $MIGRATION_MATCHED, modified: $MIGRATION_MODIFIED)"
notify "MIGRATION_OK" "Migration completed on $(hostname): matched=$MIGRATION_MATCHED modified=$MIGRATION_MODIFIED" "info"
notify "MIGRATION_OK" "Migration completed: matched=$MIGRATION_MATCHED modified=$MIGRATION_MODIFIED"

# --- Verify indexes ----------------------------------------------------------
log "Verifying required compound indexes exist..."

node - <<'NODE_SCRIPT'
const mongoose = require('mongoose');

(async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 30000,
    readPreference: 'primary',
  });

  const db = mongoose.connection.db;

  const requiredIndexes = [
    {
      collection: 'advancedtickets',
      name: 'status_1_sla.firstResponseAt_1_sla.isBreached_1_createdAt_-1',
      keys: { status: 1, 'sla.firstResponseAt': 1, 'sla.isBreached': 1, createdAt: -1 },
    },
    {
      collection: 'nphiesclaims',
      name: 'nphies.submission.status_1_nphies.submission.updatedAt_1_nphies.submission.submittedAt_1',
      keys: { 'nphies.submission.status': 1, 'nphies.submission.updatedAt': 1, 'nphies.submission.submittedAt': 1 },
    },
  ];

  let missing = 0;
  for (const spec of requiredIndexes) {
    const indexes = await db.collection(spec.collection).indexes();
    const found = indexes.some((idx) => {
      const keys = JSON.stringify(idx.key);
      const expected = JSON.stringify(spec.keys);
      return keys === expected;
    });

    if (found) {
      console.log(`[OK] Index found on ${spec.collection}: ${spec.name}`);
    } else {
      console.warn(`[MISSING] Index not found on ${spec.collection}: ${spec.name}`);
      console.warn('        Mongoose autoIndex will build it on startup if enabled.');
      missing += 1;
    }
  }

  await mongoose.disconnect();
  process.exit(missing > 0 ? 2 : 0);
})();
NODE_SCRIPT

INDEX_EXIT=$?
if [[ $INDEX_EXIT -eq 2 ]]; then
  warn "One or more indexes are missing. If Mongoose autoIndex is enabled, they will be built on app startup."
  warn "Otherwise, build them manually (see docs/DEPLOYMENT_NOTES_W1437.md)."
elif [[ $INDEX_EXIT -ne 0 ]]; then
  fail "Index verification script failed with exit code $INDEX_EXIT"
else
  log "All required indexes verified"
fi

# --- Summary -----------------------------------------------------------------
log "================================================================"
log "W1437 pre-deploy phase COMPLETE"
log "Commit: $CURRENT_COMMIT"
log "Migration: OK"
log "Indexes: $([[ $INDEX_EXIT -eq 0 ]] && echo OK || echo MISSING — will be built by autoIndex or manually)"
log "================================================================"
log "Next steps:"
log "  1. Deploy backend services from $DEPLOY_ROOT"
log "  2. Deploy frontend build"
log "  3. Deploy mobile build (if applicable)"
log "  4. Run: ./scripts/monitor-w1437.sh"
log "================================================================"

notify "PREDEPLOY_OK" "Pre-deploy phase complete on $(hostname). Commit: $CURRENT_COMMIT" "info"
