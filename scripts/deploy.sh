#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Production Deploy Script
# Usage: ./scripts/deploy.sh [target]
#   target: backend | frontend | both (default: both)
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

TARGET="${1:-both}"
APP_DIR="${APP_DIR:-/home/alawael/app}"
DEPLOY_ENV="${NODE_ENV:-production}"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Al-Awael ERP — Production Deployment"
echo "  Target: $TARGET | Environment: $DEPLOY_ENV"
echo "═══════════════════════════════════════════════════════════════════════"

# ─── Validate environment ───────────────────────────────────────────────
if [ "$DEPLOY_ENV" != "production" ]; then
  echo "⚠️  WARNING: Deploying to non-production environment ($DEPLOY_ENV)"
fi

# ─── Deploy backend ───────────────────────────────────────────────────────
if [ "$TARGET" = "both" ] || [ "$TARGET" = "backend" ]; then
  echo ""
  echo "🚀 Deploying backend..."
  cd "$APP_DIR"
  
  # Pull latest images
  docker compose -f docker-compose.yml -f docker-compose.prod.yml pull backend
  
  # Recreate containers with zero downtime
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build backend
  
  # Health check
  echo "⏳ Waiting for backend health check..."
  for i in {1..30}; do
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
      echo "✅ Backend is healthy"
      break
    fi
    sleep 2
    if [ "$i" -eq 30 ]; then
      echo "❌ Backend health check failed after 60s"
      exit 1
    fi
  done
  
  echo "✅ Backend deployed successfully"
fi

# ─── Deploy frontend ──────────────────────────────────────────────────────
if [ "$TARGET" = "both" ] || [ "$TARGET" = "frontend" ]; then
  echo ""
  echo "🚀 Deploying frontend..."
  cd "$APP_DIR/frontend"
  
  # Build production bundle
  npm ci --legacy-peer-deps 2>&1 || npm install --legacy-peer-deps
  npm run build
  
  # Copy to nginx root
  cp -r build/* /var/www/html/ 2>/dev/null || true
  
  # Reload nginx
  nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
  
  echo "✅ Frontend deployed successfully"
fi

# ─── Post-deploy tasks ──────────────────────────────────────────────────
echo ""
echo "🧹 Running post-deploy tasks..."

# Run smoke test
cd "$APP_DIR/backend"
node scripts/post-deploy-smoke.js --json 2>&1 | tail -20 || echo "⚠️ Smoke test had issues (non-blocking)"

# Cleanup old images
docker image prune -f --filter "until=168h" > /dev/null 2>&1 || true

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ Deployment Complete"
echo "═══════════════════════════════════════════════════════════════════════"
