#!/usr/bin/env bash
#
# W1437 Post-Deploy Monitor for Docker
#
# Watches a backend container's logs for 30 minutes and reports occurrences
# of the production DB timeout / LLM anomaly save failure signatures.
#
# Usage:
#   ./scripts/monitor-w1437-docker.sh [CONTAINER_NAME]
#
# Default CONTAINER_NAME: alawael-backend-1
#

set -uo pipefail

CONTAINER_NAME="${1:-alawael-backend-1}"
DURATION_MINUTES=30
CHECK_INTERVAL_SECONDS=10
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_MINUTES * 60))
LAST_REPORT_TIME=$START_TIME

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
error() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR:${NC} $*"; }
info()  { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] STAT:${NC} $*"; }

PATTERNS=(
  "Operation advancedtickets.find() buffering timed out after 10000ms"
  "Operation nphiesclaims.find() buffering timed out after 10000ms"
  "[llm-anomaly-history] save failed:"
)

declare -A COUNTS
for p in "${PATTERNS[@]}"; do
  COUNTS["$p"]=0
done

log "Starting W1437 Docker post-deploy monitor"
log "Container: $CONTAINER_NAME"
log "Duration: $DURATION_MINUTES minutes"

if ! docker inspect "$CONTAINER_NAME" &>/dev/null; then
  warn "Container $CONTAINER_NAME not found. Will retry every ${CHECK_INTERVAL_SECONDS}s."
fi

LAST_LOGS=""

while [[ $(date +%s) -lt $END_TIME ]]; do
  NOW=$(date +%s)
  REMAINING=$((END_TIME - NOW))
  MINUTES=$((REMAINING / 60))
  SECONDS=$((REMAINING % 60))

  if docker inspect "$CONTAINER_NAME" &>/dev/null; then
    CURRENT_LOGS=$(docker logs "$CONTAINER_NAME" --since "$((CHECK_INTERVAL_SECONDS + 2))s" 2>&1 || true)

    if [[ -n "$CURRENT_LOGS" ]]; then
      while IFS= read -r line || [[ -n "$line" ]]; do
        for p in "${PATTERNS[@]}"; do
          if [[ "$line" == *"$p"* ]]; then
            COUNTS["$p"]=$((COUNTS["$p"] + 1))
            echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] MATCH: $p"
            echo "  LINE: ${line:0:200}"
          fi
        done
      done <<< "$CURRENT_LOGS"
    fi
  fi

  # Progress report every 60 seconds
  if [[ $(( NOW - LAST_REPORT_TIME )) -ge 60 ]]; then
    LAST_REPORT_TIME=$NOW
    info "Time remaining: ${MINUTES}m ${SECONDS}s"
    for p in "${PATTERNS[@]}"; do
      count=${COUNTS[$p]:-0}
      if [[ $count -gt 0 ]]; then
        error "  '$p' => $count occurrence(s)"
      else
        log "  '$p' => 0 occurrences ✓"
      fi
    done
  fi

  sleep "$CHECK_INTERVAL_SECONDS"
done

# --- Final report ------------------------------------------------------------
echo ""
log "================================================================"
log "W1437 Docker post-deploy monitoring COMPLETE ($DURATION_MINUTES minutes)"
log "================================================================"

ANY_ERROR=0
for p in "${PATTERNS[@]}"; do
  count=${COUNTS[$p]:-0}
  if [[ $count -gt 0 ]]; then
    error "'$p' => $count total occurrence(s)"
    ANY_ERROR=1
  else
    log "'$p' => 0 occurrences ✓"
  fi
done

echo ""
if [[ $ANY_ERROR -eq 0 ]]; then
  log "✅ All monitored signatures are clean. Release looks healthy."
  exit 0
else
  error "❌ One or more signatures were detected. Investigate immediately."
  error "   See docs/DEPLOYMENT_NOTES_W1437.md for troubleshooting steps."
  exit 1
fi
