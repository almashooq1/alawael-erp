#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# سكربت النشر السريع - نظام الأوائل ERP على Hostinger VPS
# Quick Deploy Script - Al-Awael ERP on Hostinger VPS
# ═══════════════════════════════════════════════════════════════════════════════
# الاستخدام / Usage:
#   chmod +x quick-deploy.sh
#   ./quick-deploy.sh [--force]   # --force لإعادة بناء جميع الصور
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Variables ────────────────────────────────────────────────────────────────
PROJECT_DIR="${PROJECT_DIR:-/opt/alawael-erp}"
FORCE_REBUILD=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --force) FORCE_REBUILD=true ;;
    esac
done

# ─── Functions ────────────────────────────────────────────────────────────────
log_info()    { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; }

# ─── Main Deployment ──────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}   🚀 Al-Awael ERP - Quick Deploy               ${NC}"
echo -e "${CYAN}   $(date '+%Y-%m-%d %H:%M:%S')                  ${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

# Check project directory
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory not found: $PROJECT_DIR"
    log_error "Run setup-vps-fresh.sh first!"
    exit 1
fi

cd "$PROJECT_DIR"

# ─── Step 1: Pull Latest Code ─────────────────────────────────────────────────
log_info "📥 Pulling latest code from GitHub..."
git fetch origin 2>&1 | tail -3

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log_info "Current branch: $CURRENT_BRANCH"

git reset --hard "origin/$CURRENT_BRANCH" 2>&1 | tail -2
COMMIT=$(git log -1 --format="%h - %s (%an)")
log_success "Updated to: $COMMIT"

# ─── Step 2: Check Environment ────────────────────────────────────────────────
if [ ! -f .env ]; then
    log_warning ".env not found! Copying from .env.example..."
    cp .env.example .env
    log_warning "⚠️  Please edit .env before continuing: nano .env"
    read -r -p "Press Enter to continue after editing .env..."
fi

# ─── Step 3: Check Docker ─────────────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running! Start it with: systemctl start docker"
    exit 1
fi
log_success "Docker is running"

# ─── Step 4: Deploy Services ──────────────────────────────────────────────────
log_info "🐳 Deploying services..."

if [ "$FORCE_REBUILD" = true ]; then
    log_warning "Force rebuild enabled - this will take longer..."
    docker compose up -d --build --force-recreate 2>&1
else
    docker compose up -d --build 2>&1
fi

# ─── Step 5: Wait and Verify ──────────────────────────────────────────────────
log_info "⏳ Waiting for services to start (30s)..."
sleep 30

# Check core services
echo ""
log_info "📊 Service Status:"
echo "─────────────────────────────────────────────"

SERVICES=(
    "alawael-backend:Backend API"
    "alawael-frontend:Frontend"
    "alawael-gateway:API Gateway"
    "alawael-mongodb:MongoDB"
    "alawael-redis:Redis"
    "alawael-minio:MinIO Storage"
    "alawael-nats:NATS Messaging"
    "erp-elasticsearch:Elasticsearch"
    "erp-postgres:PostgreSQL"
)

HEALTHY=0
UNHEALTHY=0

for entry in "${SERVICES[@]}"; do
    CONTAINER="${entry%%:*}"
    NAME="${entry##*:}"
    STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not_found")
    HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$CONTAINER" 2>/dev/null || echo "unknown")

    if [ "$STATUS" = "running" ]; then
        if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "no-healthcheck" ]; then
            echo -e "  ${GREEN}✓${NC} $NAME"
            HEALTHY=$((HEALTHY + 1))
        else
            echo -e "  ${YELLOW}⟳${NC} $NAME (starting...)"
            HEALTHY=$((HEALTHY + 1))
        fi
    else
        echo -e "  ${RED}✗${NC} $NAME ($STATUS)"
        UNHEALTHY=$((UNHEALTHY + 1))
    fi
done

echo "─────────────────────────────────────────────"
echo -e "  ${GREEN}Healthy: $HEALTHY${NC}  |  ${RED}Unhealthy: $UNHEALTHY${NC}"
echo ""

# ─── Step 6: Cleanup ──────────────────────────────────────────────────────────
log_info "🧹 Cleaning up dangling images..."
docker image prune -f > /dev/null 2>&1 || true
log_success "Cleanup done"

# ─── Step 7: Show Access URLs ─────────────────────────────────────────────────
VPS_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Deployment Complete!                      ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}🌐 Access URLs:${NC}"
echo "   Frontend:    http://${VPS_IP}:3004"
echo "   API Gateway: http://${VPS_IP}:8080"
echo "   Backend:     http://${VPS_IP}:3001"
echo "   GraphQL:     http://${VPS_IP}:4000/graphql"
echo ""
echo -e "${CYAN}📋 Useful Commands:${NC}"
echo "   Check logs:    docker compose logs -f --tail=50"
echo "   List services: docker compose ps"
echo "   Stop all:      docker compose down"
echo "   Restart:       docker compose restart"
echo ""

if [ $UNHEALTHY -gt 0 ]; then
    log_warning "Some services failed. Check logs: docker compose logs --tail=100"
    exit 1
fi

exit 0
