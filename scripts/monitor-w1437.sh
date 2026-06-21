#!/usr/bin/env bash
#
# W1437 Post-Deploy Monitor
#
# Watches error1.log for 30 minutes and reports occurrences of the
# production DB timeout / LLM anomaly save failure signatures.
#
# Usage:
#   ./scripts/monitor-w1437.sh [LOG_PATH]
#
# Default LOG_PATH: logs/error1.log
#

set -uo pipefail

LOG_PATH="${1:-logs/error1.log}"
DURATION_MINUTES=30
CHECK_INTERVAL_SECONDS=10
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_MINUTES * 60))

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO:${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN:${NC} $*"; }
error() { echo -e "${RED}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR:${NC} $*"; }
info()  { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)] STAT:${NC} $*"; }

# Patterns to watch
PATTERNS=(
  "Operation advancedtickets.find() buffering timed out after 10000ms"
  "Operation nphiesclaims.find() buffering timed out after 10000ms"
  "[llm-anomaly-history] save failed:"
)

# Counters
 declare -A COUNTS
 declare -A FIRST_SEEN
 declare -A LAST_SEEN

for p in "${PATTERNS[@]}"; do
  COUNTS["$p"]=0
  FIRST_SEEN["$p"]=""
  LAST_SEEN["$p"]=""
done

log "Starting W1437 post-deploy monitor"
log "Watching: $LOG_PATH"
log "Duration: $DURATION_MINUTES minutes"

if [[ ! -f "$LOG_PATH" ]]; then
  warn "Log file not found yet: $LOG_PATH. Will retry every ${CHECK_INTERVAL_SECONDS}s."
fi

# If the log exists, remember its current size so we only scan new lines.
LAST_SIZE=0
if [[ -f "$LOG_PATH" ]]; then
  LAST_SIZE=$(stat -c%s "$LOG_PATH" 2>/dev/null || stat -f%z "$LOG_PATH" 2>/dev/null || echo 0)
fi

while [[ $(date +%s) -lt $END_TIME ]]; do
  NOW=$(date +%s)
  REMAINING=$((END_TIME - NOW))
  MINUTES=$((REMAINING / 60))
  SECONDS=$((REMAINING % 60))

  if [[ -f "$LOG_PATH" ]]; then
    CURRENT_SIZE=$(stat -c%s "$LOG_PATH" 2>/dev/null || stat -f%z "$LOG_PATH" 2>/dev/null || echo 0)

    if [[ $CURRENT_SIZE -gt $LAST_SIZE ]]; then
      # Read only new bytes
      tail -c +$((LAST_SIZE + 1)) "$LOG_PATH" 2>/dev/null | while IFS= read -r line || [[ -n "$line" ]]; do
        for p in "${PATTERNS[@]}"; do
          if [[ "$line" == *"$p"* ]]; then
            TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
            echo "[$TIMESTAMP] MATCH: $p"
            echo "  LINE: ${line:0:200}"
          fi
        done
      done > "/tmp/w1437-monitor-hits.$$"

      # Update counters from hits file
      if [[ -s "/tmp/w1437-monitor-hits.$$" ]]; then
        while IFS= read -r line; do
          for p in "${PATTERNS[@]}"; do
            if [[ "$line" == *"MATCH: $p"* ]]; then
              COUNTS["$p"]=$((COUNTS["$p"] + 1))
              if [[ -z "${FIRST_SEEN[$p]}" ]]; then
                FIRST_SEEN["$p"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
              fi
              LAST_SEEN["$p"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
            fi
          done
        done < "/tmp/w1437-monitor-hits.$$"
        rm -f "/tmp/w1437-monitor-hits.$$"
      fi

      LAST_SIZE=$CURRENT_SIZE
    fi
  fi

  # Progress report every 60 seconds
  if [[ $(( (NOW - START_TIME) % 60 )) -lt $CHECK_INTERVAL_SECONDS ]]; then
    info "Time remaining: ${MINUTES}m ${SECONDS}s"
    for p in "${PATTERNS[@]}"; do
      count=${COUNTS[$p]:-0}
      if [[ $count -gt 0 ]]; then
        error "  '$p' => $count occurrence(s) (first: ${FIRST_SEEN[$p]}, last: ${LAST_SEEN[$p]})"
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
log "W1437 post-deploy monitoring COMPLETE ($DURATION_MINUTES minutes)"
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
