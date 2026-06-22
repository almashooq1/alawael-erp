#!/usr/bin/env bash
#
# W1437 Docker Production Deployment
#
# Use this when the production stack is managed with docker compose.
# It runs the migration in a one-off backend container, then restarts
# the affected services.
#
# Usage:
#   export MONGODB_URI="mongodb+srv://..."
#   export COMPOSE_FILE="docker-compose.professional.yml:docker-compose.production.yml"
#   export COMPOSE_PROJECT_NAME=alawael
#   ./scripts/deploy-w1437-docker.sh [up|migrate-only]
#
# Modes:
#   up            (default) run migration then docker compose up -d
#   migrate-only  run migration only, do not restart services
#

set -euo pipefail

# --- Configuration -----------------------------------------------------------
MONGODB_URI="${MONGODB_URI:-${MONGO_URI:-}}"
NODE_ENV="${NODE_ENV:-production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.professional.yml:docker-compose.production.yml}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-alawael}"
BACKEND_SERVICE="${BACKEND_SERVICE:-backend}"
MIGRATION_TIMEOUT="${MIGRATION_TIMEOUT:-600}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
fail() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAIL:${NC} $*"; exit 1; }

MODE="${1:-up}"
case "$MODE" in
  up|migrate-only) ;;
  -h|--help)
    sed -n '2,22p' "$0"
    exit 0
    ;;
  *) fail "Unknown mode: $MODE. Use 'up' or 'migrate-only'." ;;
esac

# --- Pre-flight checks -------------------------------------------------------
log "Starting W1437 Docker production deployment (mode: $MODE)"

if [[ -z "$MONGODB_URI" ]]; then
  fail "MONGODB_URI (or MONGO_URI) is not set. Export it before running this script."
fi

if ! command -v docker &>/dev/null; then
  fail "docker is not installed or not in PATH"
fi

if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
  fail "docker compose plugin (or docker-compose) is not available"
fi

# Prefer the modern plugin
if docker compose version &>/dev/null; then
  COMPOSE_CMD=(docker compose)
else
  COMPOSE_CMD=(docker-compose)
fi

log "Using compose command: ${COMPOSE_CMD[*]}"
log "Compose files: $COMPOSE_FILE"
log "Project name: $COMPOSE_PROJECT_NAME"

# --- Pull latest images (if prebuilt) ----------------------------------------
log "Pulling latest images..."
COMPOSE_FILE="$COMPOSE_FILE" COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" "${COMPOSE_CMD[@]}" pull "$BACKEND_SERVICE" || warn "Could not pull images; will use existing/build locally."

# --- Run migration in one-off container --------------------------------------
log "Running NphiesClaim updatedAt backfill migration in one-off container..."
log "(URI host: $(echo "$MONGODB_URI" | sed -E 's#^mongodb(\+srv)?://([^/]+)/.*#\2#'))"

MIGRATION_CONTAINER="alawael-w1437-migration-$(date +%s)"

# Remove any previous migration container with the same name pattern
docker rm -f "$MIGRATION_CONTAINER" &>/dev/null || true

docker run --rm \
  --name "$MIGRATION_CONTAINER" \
  -e NODE_ENV="$NODE_ENV" \
  -e MONGODB_URI="$MONGODB_URI" \
  --network "${COMPOSE_PROJECT_NAME}_default" \
  -v "${COMPOSE_PROJECT_NAME}_uploads_data:/app/uploads" \
  "${COMPOSE_PROJECT_NAME}/${BACKEND_SERVICE}:latest" \
  node backend/scripts/migrate-nphies-claim-updatedAt.js

MIGRATION_EXIT=$?
if [[ $MIGRATION_EXIT -ne 0 ]]; then
  fail "Migration failed with exit code $MIGRATION_EXIT. STOP. Do not deploy application code."
fi

log "Migration completed successfully"

# --- Verify indexes ----------------------------------------------------------
log "Verifying required compound indexes..."

VERIFY_CONTAINER="alawael-w1437-verify-$(date +%s)"
docker rm -f "$VERIFY_CONTAINER" &>/dev/null || true

VERIFY_EXIT=0
docker run --rm \
  --name "$VERIFY_CONTAINER" \
  -e NODE_ENV="$NODE_ENV" \
  -e MONGODB_URI="$MONGODB_URI" \
  --network "${COMPOSE_PROJECT_NAME}_default" \
  "${COMPOSE_PROJECT_NAME}/${BACKEND_SERVICE}:latest" \
  node - <<'NODE_SCRIPT' || VERIFY_EXIT=$?
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
      keys: { status: 1, 'sla.firstResponseAt': 1, 'sla.isBreached': 1, createdAt: -1 },
    },
    {
      collection: 'nphiesclaims',
      keys: { 'nphies.submission.status': 1, 'nphies.submission.updatedAt': 1, 'nphies.submission.submittedAt': 1 },
    },
  ];

  let missing = 0;
  for (const spec of requiredIndexes) {
    const indexes = await db.collection(spec.collection).indexes();
    const found = indexes.some((idx) => JSON.stringify(idx.key) === JSON.stringify(spec.keys));
    if (found) {
      console.log(`[OK] Index found on ${spec.collection}`);
    } else {
      console.warn(`[MISSING] Index not found on ${spec.collection}`);
      missing += 1;
    }
  }

  await mongoose.disconnect();
  process.exit(missing > 0 ? 2 : 0);
})();
NODE_SCRIPT

if [[ $VERIFY_EXIT -eq 2 ]]; then
  warn "One or more indexes are missing. Mongoose autoIndex will build them on app startup if enabled."
elif [[ $VERIFY_EXIT -ne 0 ]]; then
  fail "Index verification failed with exit code $VERIFY_EXIT"
else
  log "All required indexes verified"
fi

# --- Deploy services ---------------------------------------------------------
if [[ "$MODE" == "migrate-only" ]]; then
  log "migrate-only mode: skipping service restart."
  log "Run the following to start/restart services when ready:"
  log "  COMPOSE_FILE=$COMPOSE_FILE COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME ${COMPOSE_CMD[*]} up -d"
  exit 0
fi

log "Restarting services..."
COMPOSE_FILE="$COMPOSE_FILE" COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" "${COMPOSE_CMD[@]}" up -d

log "Waiting for backend healthcheck..."
sleep 10

if docker inspect --format='{{.State.Health.Status}}' "${COMPOSE_PROJECT_NAME}-${BACKEND_SERVICE}-1" 2>/dev/null | grep -q "healthy"; then
  log "Backend healthcheck: healthy"
else
  warn "Backend healthcheck not healthy yet (or container name differs). Check with: ${COMPOSE_CMD[*]} ps"
fi

log "================================================================"
log "W1437 Docker deploy COMPLETE"
log "================================================================"
log "Next step: run monitoring with:"
log "  ./scripts/monitor-w1437-docker.sh ${COMPOSE_PROJECT_NAME}-${BACKEND_SERVICE}-1"
