#!/usr/bin/env bash
#
# W1437 Canary Deployment
#
# Deploys to a canary host first, runs smoke tests, then — if approved —
# deploys to the production fleet.
#
# Usage:
#   export MONGODB_URI="mongodb+srv://..."
#   export CANARY_HOST="canary.alaweal.org"
#   export PROD_HOST="alaweal.org"
#   ./scripts/deploy-canary-w1437.sh
#
# Required env:
#   MONGODB_URI, CANARY_HOST, PROD_HOST
#   VPS_USER, VPS_SSH_KEY (same as deploy-vps.sh)
#

set -euo pipefail

MONGODB_URI="${MONGODB_URI:-${MONGO_URI:-}}"
CANARY_HOST="${CANARY_HOST:-}"
PROD_HOST="${PROD_HOST:-}"
VPS_USER="${VPS_USER:-}"
VPS_SSH_KEY="${VPS_SSH_KEY:-${SSH_KEY:-}}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
fail() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAIL:${NC} $*"; exit 1; }

# --- Pre-flight --------------------------------------------------------------
[[ -n "$MONGODB_URI" ]] || fail "MONGODB_URI is required"
[[ -n "$CANARY_HOST" ]] || fail "CANARY_HOST is required"
[[ -n "$PROD_HOST" ]] || fail "PROD_HOST is required"
[[ -n "$VPS_USER" ]] || fail "VPS_USER is required"
[[ -f "$VPS_SSH_KEY" ]] || fail "VPS_SSH_KEY not found: $VPS_SSH_KEY"

log "Starting W1437 canary deployment"
log "Canary: $CANARY_HOST"
log "Production: $PROD_HOST"

# --- Canary phase ------------------------------------------------------------
log "=== CANARY DEPLOY ==="
VPS_HOST="$CANARY_HOST" MONGODB_URI="$MONGODB_URI" ./scripts/deploy-vps.sh --with-w1437-migration

log "Running smoke tests against canary..."
CANARY_URL="https://$CANARY_HOST"
if ./scripts/smoke-test-w1437.sh "$CANARY_URL"; then
  log "✅ Canary smoke tests passed"
else
  fail "❌ Canary smoke tests failed. Aborting production deploy."
fi

warn "Canary is live on $CANARY_URL"
read -rp "Promote to production ($PROD_HOST)? [y/N] " ans
[[ "$ans" == "y" || "$ans" == "Y" ]] || fail "Production deploy cancelled by user"

# --- Production phase --------------------------------------------------------
log "=== PRODUCTION DEPLOY ==="
VPS_HOST="$PROD_HOST" MONGODB_URI="$MONGODB_URI" ./scripts/deploy-vps.sh --with-w1437-migration

log "Running smoke tests against production..."
PROD_URL="https://$PROD_HOST"
if ./scripts/smoke-test-w1437.sh "$PROD_URL"; then
  log "✅ Production smoke tests passed"
else
  fail "❌ Production smoke tests failed. Consider rollback: ./scripts/rollback-w1437.sh"
fi

log "================================================================"
log "W1437 canary deployment COMPLETE"
log "Canary: $CANARY_URL"
log "Production: $PROD_URL"
log "================================================================"
