#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  alaweal.org uptime watchdog — runs via cron (user: alawael)
#  Created 2026-05-29 after web-admin sat DOWN for 9 days unnoticed.
# ════════════════════════════════════════════════════════════════════
#
# Self-contained: uses only curl + pm2 + bash, so it still works when the
# app stack is down. For each critical surface:
#   • backend   /health        (pm2 alawael-api      on :5000)
#   • web-admin /admin/welcome  (pm2 alawael-web-admin on :3100)
#   • legacy    /              (static nginx root)
# If a pm2-backed surface is unhealthy it is auto-restarted (with a
# per-process cooldown so a genuinely-broken service can't thrash), and
# every anomaly + action is appended to the log. Set ALERT_WEBHOOK to a
# Slack/WhatsApp/generic webhook URL to also receive a push on failure.
#
# Install: cron every 3 min as alawael —
#   */3 * * * * /home/alawael/uptime-watchdog.sh >/dev/null 2>&1
set -uo pipefail

BASE="${BASE:-https://alaweal.org}"
LOG="${LOG:-/home/alawael/logs/uptime-watchdog.log}"
COOLDOWN="${COOLDOWN:-600}"          # min seconds between auto-restarts of the same proc
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"   # optional: POST {text} here on failure
STATE_DIR="/home/alawael/logs"

mkdir -p "$STATE_DIR"
ts()  { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "$(ts) $*" >> "$LOG"; }

probe() { local c; c=$(curl -sk -m 10 -o /dev/null -w '%{http_code}' "$1" 2>/dev/null); echo "${c:-000}"; }

alert() {
  [ -n "$ALERT_WEBHOOK" ] || return 0
  curl -sk -m 10 -X POST -H 'Content-Type: application/json' \
       --data "{\"text\":\"[alaweal watchdog] $1\"}" "$ALERT_WEBHOOK" >/dev/null 2>&1 || true
}

maybe_restart() {  # $1=pm2 proc name  $2=surface label  $3=observed code
  local proc="$1" label="$2" code="$3"
  local statef="$STATE_DIR/.watchdog-$proc.last" now last
  now=$(date +%s); last=$(cat "$statef" 2>/dev/null || echo 0)
  if [ $(( now - last )) -ge "$COOLDOWN" ]; then
    if pm2 restart "$proc" >/dev/null 2>&1; then
      log "ACTION restarted $proc ($label was $code)"
      alert "$label down ($code) — restarted $proc"
    else
      log "ERROR  restart of $proc failed ($label=$code) — process may be deleted; needs manual start"
      alert "$label down ($code) and pm2 restart FAILED — manual fix needed"
    fi
    echo "$now" > "$statef"
  else
    log "SKIP   $proc restart — cooldown ($(( now - last ))s < ${COOLDOWN}s); $label=$code"
  fi
}

B=$(probe "$BASE/health")
A=$(probe "$BASE/admin/welcome")   # 302 here = nginx fallback = :3100 down
L=$(probe "$BASE/")

# backend
[ "$B" = "200" ] || { log "WARN   backend /health=$B"; maybe_restart alawael-api "backend" "$B"; }
# web-admin (200 healthy; anything else incl. 302 fallback = unhealthy)
[ "$A" = "200" ] || { log "WARN   web-admin /admin/welcome=$A"; maybe_restart alawael-web-admin "web-admin" "$A"; }
# legacy static (nginx-served; no pm2 proc to restart — alert only)
case "$L" in
  200|301|302) ;;
  *) log "WARN   legacy /=$L (nginx/static)"; alert "legacy site / down ($L)";;
esac

# hourly heartbeat (top of the hour) so the log proves the watchdog is alive
[ "$(date +%M)" = "00" ] && log "OK     heartbeat backend=$B web-admin=$A legacy=$L"
exit 0
