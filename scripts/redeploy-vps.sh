#!/usr/bin/env bash
###############################################################################
# redeploy-vps.sh — VPS-side reliable backend deploy (fallback for the
# intermittent GitHub-Actions-runner -> Hostinger:22 SSH SYN-drop, see
# memory project_prod_deploy_topology_nginx_outage_2026-06-29).
#
# Runs ON the VPS and only reaches OUT to GitHub:443 (git fetch) — so it is
# immune to the inbound-SSH flake that makes the CI "Deploy to Production" job
# fail at "Setup SSH". Replicates the CI deploy's rsync exactly, then adds a
# backup + post-restart health check + AUTOMATIC ROLLBACK.
#
# Usage (as root on the VPS):
#   bash /opt/alawael-erp/scripts/redeploy-vps.sh            # deploy if origin/main changed
#   bash /opt/alawael-erp/scripts/redeploy-vps.sh --force    # redeploy even if unchanged
#   bash /opt/alawael-erp/scripts/redeploy-vps.sh --check    # dry-run: report only, no changes
#
# Safe to run repeatedly: no-ops when prod already matches origin/main.
###############################################################################
set -euo pipefail

SRC=/opt/alawael-erp                 # git clone used only as a build source
APP=/home/alawael/app                # live app dir (file-overlay deploy target)
BR=backend
STAMP="$APP/DEPLOY_STAMP"
HEALTH_URL="http://127.0.0.1:5000/health"
LOGFILE=/home/alawael/logs/redeploy.log
LOCK=/tmp/redeploy-vps.lock

MODE="${1:-}"
log(){ echo "[$(date -u +%FT%TZ)] $*" | tee -a "$LOGFILE"; }

# single-flight
exec 9>"$LOCK"; flock -n 9 || { echo "another redeploy is running; abort"; exit 1; }

log "=== redeploy-vps start (mode='${MODE:-auto}') ==="

# 1) refresh source from GitHub (outbound 443 — the reliable direction)
git -C "$SRC" fetch --quiet origin main
NEW=$(git -C "$SRC" rev-parse origin/main)
CUR=$(sed -n '2p' "$STAMP" 2>/dev/null || echo none)
log "deployed=$CUR  origin/main=$NEW"

if [ "$MODE" = "--check" ]; then
  [ "$NEW" = "$CUR" ] && log "CHECK: up to date" || log "CHECK: deploy WOULD update $CUR -> $NEW"
  exit 0
fi
if [ "$NEW" = "$CUR" ] && [ "$MODE" != "--force" ]; then
  log "already up to date; nothing to do (use --force to redeploy)"; exit 0
fi

git -C "$SRC" reset --hard "$NEW" --quiet
git -C "$SRC" clean -fd "$BR" >/dev/null 2>&1 || true

# 2) backup current live backend (code only — fast; excludes heavy/runtime dirs)
BAK="$APP/$BR.bak-$(date -u +%Y%m%d-%H%M%S)"
log "backup live backend -> $BAK"
rsync -a --exclude node_modules --exclude logs --exclude uploads "$APP/$BR/" "$BAK/"

# 3) sync new code onto live backend (CI-faithful excludes + --delete)
log "rsync $SRC/$BR/ -> $APP/$BR/"
rsync -a --delete \
  --exclude='node_modules' --exclude='.env' \
  --exclude='logs/' --exclude='uploads/' \
  --exclude='__tests__/' --exclude='*.test.js' \
  --exclude='coverage/' --exclude='data/' \
  "$SRC/$BR/" "$APP/$BR/"
chown -R www:www "$APP/$BR" 2>/dev/null || true
# logs/ + uploads/ MUST stay writable by the process user (alawael) — else Winston
# file logging and file uploads break silently (the 2026-06-23 incident). rsync
# excludes them, but the chown -R above recurses in and re-breaks them; restore.
chown -R alawael:alawael "$APP/$BR/logs" "$APP/$BR/uploads" 2>/dev/null || true

# 4) production deps + restart
log "npm install --production"
( cd "$APP/$BR" && npm install --production --no-audit --no-fund >/dev/null 2>&1 ) || log "WARN: npm install non-zero"
log "pm2 restart alawael-api"
su - alawael -c "pm2 restart alawael-api --update-env" >/dev/null 2>&1 || true
sleep 6

# 5) health check; ROLL BACK on failure
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$HEALTH_URL" || echo 000)
if [ "$CODE" != "200" ]; then
  log "HEALTH CHECK FAILED (HTTP $CODE) — ROLLING BACK to previous backend"
  rsync -a --delete --exclude node_modules --exclude .env --exclude logs --exclude uploads "$BAK/" "$APP/$BR/"
  chown -R www:www "$APP/$BR" 2>/dev/null || true
  chown -R alawael:alawael "$APP/$BR/logs" "$APP/$BR/uploads" 2>/dev/null || true
  su - alawael -c "pm2 restart alawael-api --update-env" >/dev/null 2>&1 || true
  sleep 5
  RB=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$HEALTH_URL" || echo 000)
  log "rollback complete (post-rollback health HTTP $RB). NOT advancing DEPLOY_STAMP."
  exit 3
fi

# 6) success: stamp + BUILD_SHA + nginx self-heal
printf '%s\n%s\n%s\n' "vps-$(date -u +%s)" "$NEW" "$(date -u +%FT%TZ)" > "$STAMP"
echo "$NEW" > "$APP/$BR/BUILD_SHA"; chown www:www "$APP/$BR/BUILD_SHA" 2>/dev/null || true
nginx -t >/dev/null 2>&1 && systemctl reload-or-restart nginx 2>/dev/null || true
systemctl enable nginx >/dev/null 2>&1 || true

# 7) retain only the last 3 backups
ls -dt "$APP/$BR".bak-* 2>/dev/null | tail -n +4 | xargs -r rm -rf

log "=== redeploy-vps OK -> $NEW (health 200) ==="
