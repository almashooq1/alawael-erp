#!/usr/bin/env bash
#
# W1437 Post-Deploy Smoke Tests
#
# Lightweight health and functional checks to run immediately after deploying
# W1437. Fails fast if the release is unhealthy.
#
# Usage:
#   ./scripts/smoke-test-w1437.sh [BASE_URL]
#
# Default BASE_URL: https://alaweal.org
#

set -uo pipefail

BASE_URL="${1:-https://alaweal.org}"
HEALTH_URL="${BASE_URL}/health"
BUILD_INFO_URL="${BASE_URL}/api/v1/build-info"
API_URL="${BASE_URL}/api/v1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

log()  { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
fail() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAIL:${NC} $*"; }

check() {
  local name="$1"
  local cmd="$2"
  local expect="$3"

  echo -n "▶ $name ... "
  result=$(eval "$cmd" 2>&1 || true)

  if [[ "$result" == *"$expect"* ]]; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}"
    fail "  Expected: $expect"
    fail "  Got: ${result:0:200}"
    FAIL=$((FAIL + 1))
  fi
}

log "W1437 smoke tests against $BASE_URL"

# --- Basic health -----------------------------------------------------------
check "Health endpoint returns 200" \
  "curl -sf -o /dev/null -w '%{http_code}' '$HEALTH_URL'" \
  "200"

# --- Build info -------------------------------------------------------------
check "Build info contains commit" \
  "curl -sf '$BUILD_INFO_URL'" \
  "commit"

# --- API availability (public/unauthenticated endpoints) --------------------
# These endpoints should exist and return JSON even if they require auth.
# We only verify they do not return 5xx or timeout.

test_api() {
  local endpoint="$1"
  local name="$2"
  local status

  status=$(curl -sf -o /dev/null -w "%{http_code}" -m 15 "$API_URL$endpoint" || echo "ERR")
  echo -n "▶ $name ($API_URL$endpoint) ... "

  if [[ "$status" == "200" || "$status" == "401" || "$status" == "403" || "$status" == "404" ]]; then
    echo -e "${GREEN}PASS${NC} (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC} (HTTP $status)"
    FAIL=$((FAIL + 1))
  fi
}

# Adjust these endpoints to match your actual public/health endpoints
test_api "/tickets/sla-stats" "SLA stats endpoint reachable"
test_api "/nphies/reconciliation/status" "NPHIES reconciliation endpoint reachable"

# --- DNS / TLS sanity -------------------------------------------------------
check "TLS certificate valid" \
  "echo | openssl s_client -connect $(echo "$BASE_URL" | sed -E 's#https?://##'):443 -servername $(echo "$BASE_URL" | sed -E 's#https?://##') 2>/dev/null | openssl x509 -noout -subject" \
  "subject="

# --- Summary ----------------------------------------------------------------
echo ""
log "================================================================"
log "Smoke test summary: $PASS passed, $FAIL failed"
log "================================================================"

if [[ $FAIL -eq 0 ]]; then
  log "✅ All smoke tests passed"
  exit 0
else
  fail "❌ $FAIL smoke test(s) failed. Investigate before declaring the release healthy."
  exit 1
fi
