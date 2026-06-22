#!/usr/bin/env bash
#
# W1437 Final Pre-Deploy Review
#
# Runs all local checks and reports readiness status before production deploy.
# Does NOT access production — safe to run on any developer machine.
#
# Usage:
#   ./scripts/final-review-w1437.sh
#

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

log()   { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
error() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAIL:${NC} $*"; }
info()  { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] CHECK:${NC} $*"; }

check() {
  local name="$1"
  shift
  echo -n "▶ $name ... "
  if "$@" &>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    FAIL=$((FAIL + 1))
    return 1
  fi
}

log "Starting W1437 final pre-deploy review"

# --- Git checks --------------------------------------------------------------
check "On main branch" bash -c "git rev-parse --abbrev-ref HEAD | grep -qx main"
check "Working tree clean" git diff --quiet
check "Main up to date with origin" bash -c "git fetch origin main && git merge-base --is-ancestor origin/main HEAD"
CURRENT_COMMIT=$(git rev-parse --short HEAD)
info "Current commit: $CURRENT_COMMIT"

# --- File existence checks ---------------------------------------------------
check "Migration script exists" test -f backend/scripts/migrate-nphies-claim-updatedAt.js
check "Deploy script exists" test -f scripts/deploy-w1437.sh
check "Monitor script exists" test -f scripts/monitor-w1437.sh
check "Rollback script exists" test -f scripts/rollback-w1437.sh
check "Smoke test script exists" test -f scripts/smoke-test-w1437.sh
check "Runbook PDF exists" test -f docs/RUNBOOK_W1437.pdf
check "Cheat sheet exists" test -f docs/W1437_DEPLOY_CHEAT_SHEET.md

# --- Syntax checks -----------------------------------------------------------
check "Migration script syntax" node -c backend/scripts/migrate-nphies-claim-updatedAt.js
check "Local migration test syntax" node -c backend/scripts/test-migration-local.js
check "Deploy script syntax" bash -n scripts/deploy-w1437.sh
check "Monitor script syntax" bash -n scripts/monitor-w1437.sh
check "Rollback script syntax" bash -n scripts/rollback-w1437.sh
check "Smoke test syntax" bash -n scripts/smoke-test-w1437.sh
check "VPS deploy syntax" bash -n scripts/deploy-vps.sh

# --- Backend pre-push gates --------------------------------------------------
check "sprint-paths sync" bash -c "cd backend && npm run check:sprint-paths"
check "gitignored-sources baseline" bash -c "cd backend && npm run check:gitignored-sources"
check "hook-style" bash -c "cd backend && npm run check:hook-style"
check "phantom-writes" bash -c "cd backend && npm run check:phantom-writes"
check "route-shadowing" bash -c "cd backend && npm run check:route-shadowing"

# --- Migration local test ----------------------------------------------------
info "Running local migration test (may take 1-2 minutes)..."
if bash -c "cd backend && node scripts/test-migration-local.js" &>/tmp/w1437-migration-test.log; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
else
  echo -e "${RED}FAIL${NC}"
  error "See /tmp/w1437-migration-test.log"
  FAIL=$((FAIL + 1))
fi

# --- Summary -----------------------------------------------------------------
echo ""
log "================================================================"
log "Final review summary: $PASS passed, $FAIL failed"
log "================================================================"

if [[ $FAIL -eq 0 ]]; then
  log "✅ Repository is ready for W1437 production deployment"
  log "Next: execute one of the deployment methods in docs/W1437_DEPLOY_CHEAT_SHEET.md"
  exit 0
else
  error "❌ $FAIL check(s) failed. Fix before deploying."
  exit 1
fi
