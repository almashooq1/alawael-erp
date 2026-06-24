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
#   scripts/deploy-vps.sh --rollback     # swap back to most recent backend.before-* backup + restart
#
# Requires:
#   • SSH key at $SSH_KEY (default: ~/.ssh-alaweal/alaweal_root_ed25519)
#   • Local clean git tree (so BUILD_SHA matches what's on disk)
#   • Run from repo root

set +H -euo pipefail

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
ROLLBACK=false
W1437_MIGRATION=false

for arg in "$@"; do
  case "$arg" in
    --backend-only)         DEPLOY_FRONTEND=false ;;
    --frontend-only)        DEPLOY_BACKEND=false ;;
    --dry-run)              DRY_RUN=true ;;
    --rollback)             ROLLBACK=true ;;
    --with-w1437-migration) W1437_MIGRATION=true ;;
    -h|--help)
      sed -n '2,31p' "$0"
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

# ─── Rollback path (short-circuits everything else) ─────────────────
if $ROLLBACK; then
  say "Rollback: find most recent backend.before-* on VPS"
  [[ -f "$SSH_KEY" ]] || die "SSH key not found: $SSH_KEY"

  LATEST=$(ssh_run "ls -dt $VPS_APP_DIR/backend.before-*/ 2>/dev/null | head -1 | tr -d '/'")
  [[ -n "$LATEST" ]] || die "No backend.before-* backup found on VPS — cannot rollback"
  ok "Latest backup: $LATEST"

  CUR_SHA=$(curl -sf "$BUILD_INFO_URL" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' || echo "?")
  warn "Current production commit: ${CUR_SHA:0:8} — about to swap to $(basename "$LATEST")"
  warn "Continue? [y/N]"
  read -r ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || die "Rollback cancelled"

  STAMP=$(date +%Y%m%d-%H%M%S)
  ssh_run "sudo -u $PM2_USER bash -c '
    set -e
    mv $VPS_APP_DIR/backend $VPS_APP_DIR/backend.rolled-back-$STAMP
    mv $LATEST $VPS_APP_DIR/backend
    pm2 restart $PM2_PROC
  '"
  sleep 7

  HEALTH_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "0")
  [[ "$HEALTH_STATUS" == "200" ]] || die "/health returned $HEALTH_STATUS after rollback"
  ok "/health → 200 after rollback"

  NEW_SHA=$(curl -sf "$BUILD_INFO_URL" 2>/dev/null | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' || echo "?")
  ok "Rolled back: production now reports ${NEW_SHA:0:8} (was ${CUR_SHA:0:8})"
  warn "The forward state is preserved at $VPS_APP_DIR/backend.rolled-back-$STAMP for forensics"
  exit 0
fi

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

# ─── W1437 pre-deploy migration (optional) ──────────────────────────
if $W1437_MIGRATION; then
  say "W1437 pre-deploy migration requested"

  MONGODB_URI="${MONGODB_URI:-${MONGO_URI:-}}"
  [[ -n "$MONGODB_URI" ]] || die "MONGODB_URI/MONGO_URI is required for --with-w1437-migration"

  # Copy migration script to VPS (idempotent, atomic temp path)
  STAMP_MIG=$(date +%Y%m%d-%H%M%S)
  REMOTE_MIG_DIR="$VPS_APP_DIR/.w1437-migration-$STAMP_MIG"

  ssh_run "mkdir -p $REMOTE_MIG_DIR/backend/scripts"
  scp -i "$SSH_KEY" -o ConnectTimeout=30 \
    backend/scripts/migrate-nphies-claim-updatedAt.js \
    "$VPS_HOST:$REMOTE_MIG_DIR/backend/scripts/"

  ok "Migration script copied to $REMOTE_MIG_DIR/backend/scripts"

  # Run migration on VPS via a temporary env file (avoids leaking URI in ssh ps)
  MIG_ENV_FILE="/tmp/.w1437-migration-env-$STAMP_MIG"
  ssh_run "cat > $MIG_ENV_FILE <<'EOF'
export MONGODB_URI='$MONGODB_URI'
export NODE_ENV=production
EOF
chown $PM2_USER:$PM2_USER $MIG_ENV_FILE
chmod 600 $MIG_ENV_FILE"

  say "Running W1437 migration on VPS (host only: $(echo "$MONGODB_URI" | sed -E 's#^mongodb(\+srv)?://([^:@]+)(:[^@]+)?@([^/]+)/.*#\4#'))"
  ssh_run "bash -c 'set +H -e; source $MIG_ENV_FILE; cp $REMOTE_MIG_DIR/backend/scripts/migrate-nphies-claim-updatedAt.js $VPS_APP_DIR/backend/scripts/migrate-nphies-claim-updatedAt.js; cd $VPS_APP_DIR/backend; node scripts/migrate-nphies-claim-updatedAt.js'" || die "W1437 migration failed — aborting deploy"

  # Cleanup
  ssh_run "rm -f $MIG_ENV_FILE; rm -rf $REMOTE_MIG_DIR" || true
  ok "W1437 migration completed"
fi

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
  # Atomic, chunk-retaining frontend deploy.
  #
  # The OLD path was \`rm -rf build/* && tar x\`. That had two failure modes that
  # surfaced as the React error boundary ("حدث خطأ غير متوقع" / ChunkLoadError):
  #   1. Non-atomic window: between the rm and the end of tar, old chunks are gone
  #      and new ones not yet written, so any in-flight request 404s.
  #   2. Stale-tab clients: a browser still running the PREVIOUS index.html requests
  #      the previous build's hashed chunks, which the rm just deleted → 404 forever.
  # Vite/CRA asset filenames are content-hashed, so old and new chunks never collide.
  # We therefore ADD the new assets next to the old ones, swap index.html last via an
  # atomic rename, and prune only assets untouched for 14d (bounds disk growth).
  echo "▶ Deploy CRA build (atomic; retains old hashed chunks for stale-tab clients)..."
  STAGE="\$APP/frontend/build.stage-\$TS"
  rm -rf "\$STAGE"; mkdir -p "\$STAGE"
  tar xzf /tmp/$(basename $FRONTEND_TAR) -C "\$STAGE/"

  # Lightweight rollback point: index.html alone determines which chunk hashes load.
  cp -pf "\$APP/frontend/build/index.html" "\$APP/frontend/build/index.html.before-\$TS" 2>/dev/null || true

  # 1) Add new content-hashed assets alongside the old ones (no clobber, old chunks survive).
  if [ -d "\$STAGE/assets" ]; then
    mkdir -p "\$APP/frontend/build/assets"
    cp -rf "\$STAGE/assets/." "\$APP/frontend/build/assets/"
  fi
  # 2) Copy remaining top-level files (logos, manifest, ...) EXCEPT index.html.
  for f in "\$STAGE"/*; do
    [ -f "\$f" ] || continue
    bn=\$(basename "\$f")
    [ "\$bn" = "index.html" ] && continue
    cp -f "\$f" "\$APP/frontend/build/\$bn"
  done
  # 3) Swap index.html LAST via atomic rename — no window points at not-yet-copied chunks.
  cp -f "\$STAGE/index.html" "\$APP/frontend/build/.index.html.new-\$TS"
  mv -f "\$APP/frontend/build/.index.html.new-\$TS" "\$APP/frontend/build/index.html"

  # 4) Prune assets untouched for 14d + keep only the last ~10 index.html backups.
  find "\$APP/frontend/build/assets" -type f -mtime +14 -delete 2>/dev/null || true
  { ls -1t "\$APP/frontend/build/"index.html.before-* 2>/dev/null | tail -n +11 | xargs -r rm -f; } || true

  chown -R www:www "\$APP/frontend/build"
  rm -rf "\$STAGE"
  echo "▶ Frontend in place (old chunks retained 14d)."
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
  NEW_SHA=$(curl -sf "$BUILD_INFO_URL" 2>/dev/null | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' || echo "?")
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
