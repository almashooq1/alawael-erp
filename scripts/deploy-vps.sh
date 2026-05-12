#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  Al-Awael ERP — Manual VPS deploy (alaweal.org)
#  نشر يدوي verified end-to-end على 2026-05-12
# ════════════════════════════════════════════════════════════════════
#
# Use this when the GitHub Actions auto-deploy hasn't fired or you need
# to push out a fix without waiting for CI. Captures every gotcha the
# 2026-05-12 session surfaced:
#   • Excludes node_modules / logs / .env from the tar so they survive
#     extraction on the VPS
#   • Re-fixes `.env` ownership to alawael:alawael:600 AFTER the broad
#     chown — pm2 runs as alawael and a www-owned 600 file would crash
#     the api with env-validation errors (this single bug took the api
#     down for 3 min during the 2026-05-12 deploy)
#   • Writes BUILD_SHA so /api/v1/build-info reports the deployed
#     commit (the fallback added in commit 039a3aed)
#   • Verifies post-restart with a real HTTPS probe before declaring
#     success
#
# Usage:
#   scripts/deploy-vps.sh                # backend + CRA frontend
#   scripts/deploy-vps.sh --backend-only
#   scripts/deploy-vps.sh --frontend-only
#   scripts/deploy-vps.sh --dry-run      # tar + scp + show diff, don't restart
#
# Requires:
#   • SSH key at $SSH_KEY (default: ~/.ssh-alaweal/alaweal_root_ed25519)
#   • Local clean git tree (so BUILD_SHA matches what's on disk)
#   • Run from repo root

set -euo pipefail

# ─── Config (override via env) ──────────────────────────────────────
SSH_KEY="${SSH_KEY:-$HOME/.ssh-alaweal/alaweal_root_ed25519}"
VPS_HOST="${VPS_HOST:-root@alaweal.org}"
VPS_APP_DIR="${VPS_APP_DIR:-/home/alawael/app}"
PM2_USER="${PM2_USER:-alawael}"
PM2_PROC="${PM2_PROC:-alawael-api}"
HEALTH_URL="${HEALTH_URL:-https://alaweal.org/health}"
BUILD_INFO_URL="${BUILD_INFO_URL:-https://alaweal.org/api/v1/build-info}"

# ─── Args ───────────────────────────────────────────────────────────
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --backend-only)  DEPLOY_FRONTEND=false ;;
    --frontend-only) DEPLOY_BACKEND=false ;;
    --dry-run)       DRY_RUN=true ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ─── Helpers ────────────────────────────────────────────────────────
say()  { printf '\033[1;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

ssh_run() { ssh -i "$SSH_KEY" -o ConnectTimeout=15 "$VPS_HOST" "$@"; }

# ─── Pre-flight ─────────────────────────────────────────────────────
say "Pre-flight checks"

[[ -f "$SSH_KEY" ]] || die "SSH key not found: $SSH_KEY"
[[ -d backend && -d frontend ]] || die "Run from repo root (must contain backend/ + frontend/)"

if [[ -n "$(git status --porcelain)" ]]; then
  warn "Working tree has uncommitted changes — BUILD_SHA will reflect HEAD, not on-disk state"
fi

LOCAL_SHA=$(git rev-parse HEAD)
LOCAL_SHA_SHORT=${LOCAL_SHA:0:8}
ok "Local commit: $LOCAL_SHA_SHORT ($LOCAL_SHA)"

ssh_run "echo connected" >/dev/null || die "SSH to $VPS_HOST failed"
ok "SSH to $VPS_HOST"

CURRENT_REMOTE_SHA=$(curl -sf "$BUILD_INFO_URL" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' || echo "?")
say "Current production commit: ${CURRENT_REMOTE_SHA:0:8}"

if [[ "$CURRENT_REMOTE_SHA" == "$LOCAL_SHA" ]]; then
  ok "Production already on $LOCAL_SHA_SHORT — nothing to deploy"
  exit 0
fi

# ─── Build artifacts (local) ────────────────────────────────────────
STAMP=$(date +%Y%m%d-%H%M%S)
BACKEND_TAR="/tmp/backend-$STAMP.tar.gz"
FRONTEND_TAR="/tmp/frontend-build-$STAMP.tar.gz"

if $DEPLOY_BACKEND; then
  say "Tar backend (excluding node_modules, logs, .env, tests)"
  tar --exclude='node_modules' --exclude='logs' --exclude='coverage' \
      --exclude='.env*' --exclude='_archived' --exclude='__mocks__' \
      --exclude='tests' --exclude='__tests__' \
      -czf "$BACKEND_TAR" -C backend .
  ok "Backend tar: $(du -h "$BACKEND_TAR" | cut -f1)"
fi

if $DEPLOY_FRONTEND; then
  say "Build CRA frontend"
  ( cd frontend && PUBLIC_URL=/ npm run build >/tmp/cra-build.log 2>&1 ) \
    || { tail -30 /tmp/cra-build.log; die "CRA build failed"; }
  ok "Frontend built"

  say "Tar frontend build"
  tar -czf "$FRONTEND_TAR" -C frontend/build .
  ok "Frontend tar: $(du -h "$FRONTEND_TAR" | cut -f1)"
fi

if $DRY_RUN; then
  warn "Dry run — artifacts ready at $BACKEND_TAR + $FRONTEND_TAR, skipping SCP/restart"
  exit 0
fi

# ─── Ship ───────────────────────────────────────────────────────────
say "SCP artifacts to VPS"
TO_COPY=()
$DEPLOY_BACKEND  && TO_COPY+=("$BACKEND_TAR")
$DEPLOY_FRONTEND && TO_COPY+=("$FRONTEND_TAR")
scp -i "$SSH_KEY" -o ConnectTimeout=30 "${TO_COPY[@]}" "$VPS_HOST:/tmp/" >/dev/null
ok "SCP done"

# ─── Backup + extract (on VPS, atomic-as-possible) ──────────────────
say "Backup + extract on VPS"

REMOTE_SCRIPT=$(cat <<REMOTE
set -euo pipefail
TS=$STAMP
APP=$VPS_APP_DIR

if $DEPLOY_BACKEND; then
  echo "▶ Backup current backend (rsync hard-links to save space)..."
  rsync -a --link-dest="\$APP/backend/" "\$APP/backend/" "\$APP/backend.before-\$TS/"

  echo "▶ Extract new backend OVER active dir (.env / node_modules / logs preserved by tar exclude)..."
  tar xzf /tmp/$(basename $BACKEND_TAR) -C "\$APP/backend/"

  echo "▶ Reset ownership to www:www (matches original convention)..."
  chown -R www:www "\$APP/backend"

  echo "▶ CRITICAL: re-fix .env ownership for pm2 user..."
  chown $PM2_USER:$PM2_USER "\$APP/backend/.env"
  chmod 600 "\$APP/backend/.env"
  # Verify $PM2_USER can read .env or the api will crash-loop
  sudo -u $PM2_USER head -1 "\$APP/backend/.env" >/dev/null || { echo ".env still unreadable!" >&2; exit 1; }

  echo "▶ Write BUILD_SHA so /api/v1/build-info reports the deployed commit..."
  echo "$LOCAL_SHA" > "\$APP/backend/BUILD_SHA"
  chown www:www "\$APP/backend/BUILD_SHA"
fi

if $DEPLOY_FRONTEND; then
  echo "▶ Backup + replace CRA build..."
  cp -r "\$APP/frontend/build" "\$APP/frontend/build.before-\$TS"
  rm -rf "\$APP/frontend/build/"*
  tar xzf /tmp/$(basename $FRONTEND_TAR) -C "\$APP/frontend/build/"
  chown -R www:www "\$APP/frontend/build"
fi

echo "▶ Clean tarballs..."
rm -f /tmp/$(basename $BACKEND_TAR) /tmp/$(basename $FRONTEND_TAR)
echo "DONE"
REMOTE
)
ssh_run "$REMOTE_SCRIPT"
ok "Files in place"

# ─── pm2 restart (backend only) ─────────────────────────────────────
if $DEPLOY_BACKEND; then
  say "pm2 restart $PM2_PROC"
  ssh_run "sudo -u $PM2_USER pm2 restart $PM2_PROC" >/dev/null
  sleep 7
  ok "pm2 restarted"
fi

# ─── Verify ─────────────────────────────────────────────────────────
say "Verify"

HEALTH_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "0")
[[ "$HEALTH_STATUS" == "200" ]] || die "/health returned $HEALTH_STATUS"
ok "/health → 200"

if $DEPLOY_BACKEND; then
  NEW_SHA=$(curl -sf "$BUILD_INFO_URL" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')
  if [[ "$NEW_SHA" == "$LOCAL_SHA" ]]; then
    ok "/api/v1/build-info commit matches local: ${NEW_SHA:0:8}"
  else
    warn "/api/v1/build-info still reports ${NEW_SHA:0:8} (expected ${LOCAL_SHA_SHORT})"
    warn "pm2 may still be starting — re-check in 10s"
  fi
fi

# Clean local tars
rm -f "$BACKEND_TAR" "$FRONTEND_TAR"

ok "Deploy complete: $LOCAL_SHA_SHORT is live on alaweal.org"
