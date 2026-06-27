#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Comprehensive Docker Deployment Script for VPS
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: ./scripts/deploy.sh [OPTIONS]
#
# Options:
#   --restart     Restart all services (docker compose down && up)
#   --stop        Stop all services
#   --logs        Tail logs after deployment
#   --update      Pull latest code, rebuild images, and restart
#   --help        Show this help message
#
# Environment Variables:
#   APP_DIR       Application directory on VPS (default: /opt/alawael-erp)
#   REPO_URL      Git repository URL (optional, for initial clone)
#   COMPOSE_FILE  Docker Compose file (default: docker-compose.yml)
#   BACKEND_PORT  Backend port (default: 3001)
#   HEALTH_PATH   Health endpoint path (default: /health)
#
# Examples:
#   ./scripts/deploy.sh                    # Standard deploy
#   ./scripts/deploy.sh --restart          # Restart all services
#   ./scripts/deploy.sh --update           # Update to latest code
#   ./scripts/deploy.sh --logs             # Deploy and tail logs
#   ./scripts/deploy.sh --stop             # Stop all services
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration & Defaults
# ═══════════════════════════════════════════════════════════════════════════════
APP_DIR="${APP_DIR:-/opt/alawael-erp}"
REPO_URL="${REPO_URL:-}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
HEALTH_URL="http://localhost:${BACKEND_PORT}${HEALTH_PATH}"
NGINX_HEALTH_URL="http://localhost${HEALTH_PATH}"
MAX_HEALTH_WAIT="${MAX_HEALTH_WAIT:-60}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"

MONGO_VOLUME="alawael-mongodb-prod-data"
REDIS_VOLUME="alawael-redis-prod-data"
UPLOADS_VOLUME="alawael-uploads-prod-data"
LOGS_VOLUME="alawael-logs-prod-data"

# ─── Color helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
log_ok()    { echo -e "${GREEN}✓${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
log_error() { echo -e "${RED}✗${NC}  $*" >&2; }
log_step()  { echo -e "${CYAN}▶${NC}  ${BOLD}$*${NC}"; }

# ─── Print banner ─────────────────────────────────────────────────────────────
print_banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════════════════════════════╗"
  echo "║           Al-Awael ERP — Docker Deployment Script                             ║"
  echo "║           VPS Production Deployment                                          ║"
  echo "╚══════════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# ─── Print help ─────────────────────────────────────────────────────────────────
print_help() {
  sed -n '4,30p' "$0"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Parse CLI Arguments
# ═══════════════════════════════════════════════════════════════════════════════
DO_RESTART=false
DO_STOP=false
DO_LOGS=false
DO_UPDATE=false

for arg in "$@"; do
  case "$arg" in
    --restart)    DO_RESTART=true ;;
    --stop)       DO_STOP=true ;;
    --logs)       DO_LOGS=true ;;
    --update)     DO_UPDATE=true ;;
    --help|-h)    print_help; exit 0 ;;
    *)
      log_error "Unknown argument: $arg"
      print_help
      exit 2
      ;;
  esac
done

# ═══════════════════════════════════════════════════════════════════════════════
# Pre-flight Checks
# ═══════════════════════════════════════════════════════════════════════════════
check_docker() {
  log_step "Checking Docker installation..."

  if ! command -v docker &>/dev/null; then
    log_error "Docker is not installed. Please install Docker first:"
    log_info "  curl -fsSL https://get.docker.com | sh"
    exit 1
  fi
  log_ok "Docker installed: $(docker --version | awk '{print $3}' | tr -d ',')"

  if ! command -v docker compose &>/dev/null; then
    log_error "Docker Compose (plugin) is not installed. Please install it:"
    log_info "  sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
    exit 1
  fi
  log_ok "Docker Compose installed: $(docker compose version --short 2>/dev/null || docker compose version | head -1)"

  # Check if docker daemon is running
  if ! docker info &>/dev/null; then
    log_error "Docker daemon is not running. Start it with:"
    log_info "  sudo systemctl start docker"
    exit 1
  fi
  log_ok "Docker daemon is running"
}

check_app_directory() {
  log_step "Checking application directory..."

  if [[ ! -d "$APP_DIR" ]]; then
    if [[ -n "$REPO_URL" ]]; then
      log_info "App directory not found. Cloning repository..."
      mkdir -p "$(dirname "$APP_DIR")"
      git clone "$REPO_URL" "$APP_DIR" || {
        log_error "Failed to clone repository: $REPO_URL"
        exit 1
      }
      log_ok "Repository cloned to $APP_DIR"
    else
      log_error "App directory does not exist: $APP_DIR"
      log_info "Set REPO_URL to clone automatically, or create the directory manually."
      exit 1
    fi
  fi

  if [[ ! -f "$APP_DIR/$COMPOSE_FILE" ]]; then
    log_error "Docker Compose file not found: $APP_DIR/$COMPOSE_FILE"
    exit 1
  fi

  log_ok "Application directory ready: $APP_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Git Operations (for --update)
# ═══════════════════════════════════════════════════════════════════════════════
update_code() {
  if [[ "$DO_UPDATE" != true ]]; then
    return 0
  fi

  log_step "Pulling latest code..."
  cd "$APP_DIR"

  if [[ ! -d ".git" ]]; then
    log_warn "Not a git repository. Skipping code update."
    return 0
  fi

  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  log_info "Current branch: $current_branch"

  git fetch origin || {
    log_warn "Git fetch failed — proceeding with local code"
    return 0
  }

  local local_sha remote_sha
  local_sha=$(git rev-parse HEAD)
  remote_sha=$(git rev-parse "origin/$current_branch" 2>/dev/null || echo "")

  if [[ -n "$remote_sha" && "$local_sha" != "$remote_sha" ]]; then
    git pull origin "$current_branch" || {
      log_warn "Git pull failed — proceeding with local code"
      return 0
    }
    log_ok "Code updated to: ${remote_sha:0:8}"
  else
    log_ok "Code is already up-to-date: ${local_sha:0:8}"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Environment Setup
# ═══════════════════════════════════════════════════════════════════════════════
setup_environment() {
  log_step "Setting up environment..."
  cd "$APP_DIR"

  # Copy .env.example to .env if .env doesn't exist
  if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
      cp .env.example .env
      log_warn "Copied .env.example → .env — PLEASE REVIEW AND EDIT SECRETS!"
      log_info "  nano $APP_DIR/.env"
    elif [[ -f "backend/.env.example" ]]; then
      cp backend/.env.example .env
      log_warn "Copied backend/.env.example → .env — PLEASE REVIEW AND EDIT SECRETS!"
      log_info "  nano $APP_DIR/.env"
    else
      log_warn ".env not found and no .env.example available."
      log_info "Please create .env manually at: $APP_DIR/.env"
    fi
  else
    log_ok ".env exists"
  fi

  # Check for critical secrets in .env
  if [[ -f ".env" ]]; then
    local missing=()
    grep -q '^MONGO_ROOT_PASSWORD=' .env && grep -q '^MONGO_ROOT_PASSWORD=\s*$' .env && missing+=("MONGO_ROOT_PASSWORD")
    grep -q '^JWT_SECRET=' .env && grep -q '^JWT_SECRET=\s*$' .env && missing+=("JWT_SECRET")
    grep -q '^JWT_REFRESH_SECRET=' .env && grep -q '^JWT_REFRESH_SECRET=\s*$' .env && missing+=("JWT_REFRESH_SECRET")

    if [[ ${#missing[@]} -gt 0 ]]; then
      log_warn "Missing required secrets in .env: ${missing[*]}"
      log_info "Please set them before deploying: nano $APP_DIR/.env"
      exit 1
    fi
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Volume Checks
# ═══════════════════════════════════════════════════════════════════════════════
check_volumes() {
  log_step "Checking Docker volumes..."

  local volumes=()
  local all_exist=true

  for vol in "$MONGO_VOLUME" "$REDIS_VOLUME" "$UPLOADS_VOLUME" "$LOGS_VOLUME"; do
    if docker volume inspect "$vol" &>/dev/null; then
      log_ok "Volume exists: $vol"
    else
      log_warn "Volume missing: $vol (will be created on start)"
      all_exist=false
    fi
  done

  if [[ "$all_exist" == true ]]; then
    log_ok "All data volumes are present"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Docker Compose Operations
# ═══════════════════════════════════════════════════════════════════════════════
build_images() {
  log_step "Building Docker images..."
  cd "$APP_DIR"

  docker compose -f "$COMPOSE_FILE" build --no-cache || {
    log_error "Docker build failed"
    exit 1
  }
  log_ok "Docker images built successfully"
}

start_services() {
  log_step "Starting services in correct order..."
  cd "$APP_DIR"

  # ─── Start infrastructure first ─────────────────────────────────────────────
  log_info "1/4 Starting MongoDB..."
  docker compose -f "$COMPOSE_FILE" up -d mongodb
  wait_for_service "alawael-mongodb" "mongodb" "mongosh --eval 'db.adminCommand(\"ping\")' --quiet"
  log_ok "MongoDB is healthy"

  log_info "2/4 Starting Redis..."
  docker compose -f "$COMPOSE_FILE" up -d redis
  wait_for_service "alawael-redis" "redis" "redis-cli ping"
  log_ok "Redis is healthy (PONG)"

  # ─── Start application layer ──────────────────────────────────────────────────
  log_info "3/4 Starting Backend..."
  docker compose -f "$COMPOSE_FILE" up -d backend

  log_info "Waiting for backend health check..."
  wait_for_backend
  log_ok "Backend is healthy"

  # ─── Start reverse proxy ──────────────────────────────────────────────────────
  log_info "4/4 Starting NGINX..."
  docker compose -f "$COMPOSE_FILE" up -d nginx
  wait_for_service "alawael-nginx" "nginx" "wget -q --spider http://localhost/health"
  log_ok "NGINX is healthy"
}

stop_services() {
  log_step "Stopping all services..."
  cd "$APP_DIR"
  docker compose -f "$COMPOSE_FILE" down
  log_ok "All services stopped"
}

restart_services() {
  log_step "Restarting all services..."
  cd "$APP_DIR"
  docker compose -f "$COMPOSE_FILE" down
  build_images
  start_services
}

# ═══════════════════════════════════════════════════════════════════════════════
# Health Check Helpers
# ═══════════════════════════════════════════════════════════════════════════════
wait_for_service() {
  local container_name="$1"
  local service_name="$2"
  local health_cmd="$3"
  local max_wait=30
  local waited=0

  while [[ $waited -lt $max_wait ]]; do
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
      if docker exec "$container_name" sh -c "$health_cmd" &>/dev/null; then
        return 0
      fi
    fi
    sleep 1
    ((waited++))
    if ((waited % 5 == 0)); then
      log_info "  Still waiting for $service_name... ($waited/${max_wait}s)"
    fi
  done

  log_error "$service_name failed to become healthy after ${max_wait}s"
  return 1
}

wait_for_backend() {
  local waited=0

  while [[ $waited -lt $MAX_HEALTH_WAIT ]]; do
    if curl -sf "$HEALTH_URL" &>/dev/null; then
      return 0
    fi
    sleep "$HEALTH_INTERVAL"
    ((waited += HEALTH_INTERVAL))
    if ((waited % 10 == 0)); then
      log_info "  Still waiting for backend... (${waited}/${MAX_HEALTH_WAIT}s)"
      log_info "  Try: curl -sf $HEALTH_URL"
    fi
  done

  log_error "Backend health check failed after ${MAX_HEALTH_WAIT}s"
  log_info "Check logs: docker compose -f $APP_DIR/$COMPOSE_FILE logs backend"
  return 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# Final Status
# ═══════════════════════════════════════════════════════════════════════════════
show_status() {
  echo ""
  log_step "Deployment Status"
  echo "═══════════════════════════════════════════════════════════════════════════════"

  cd "$APP_DIR"
  local containers
  containers=$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Name}} {{.Status}}' 2>/dev/null || true)

  if [[ -n "$containers" ]]; then
    echo ""
    echo -e "${BOLD}Running Containers:${NC}"
    echo "$containers" | while read -r name status; do
      if echo "$status" | grep -q "healthy\|Up"; then
        echo -e "  ${GREEN}●${NC} $name — $status"
      else
        echo -e "  ${YELLOW}●${NC} $name — $status"
      fi
    done
  fi

  echo ""
  echo -e "${BOLD}Access URLs:${NC}"
  echo -e "  ${CYAN}App (HTTP):${NC}  http://<your-vps-ip>/"
  echo -e "  ${CYAN}Health:${NC}      $NGINX_HEALTH_URL"
  echo -e "  ${CYAN}Backend:${NC}     $HEALTH_URL"
  echo -e "  ${CYAN}MongoDB:${NC}     localhost:27017 (internal)"
  echo -e "  ${CYAN}Redis:${NC}       localhost:6379 (internal)"

  # Try to get external IP
  local external_ip
  external_ip=$(curl -sf -4 icanhazip.com 2>/dev/null || curl -sf -4 ifconfig.me 2>/dev/null || echo "<your-vps-ip>")
  echo ""
  echo -e "  ${GREEN}Public URL:${NC}  http://${external_ip}/"

  echo ""
  echo -e "${BOLD}Useful Commands:${NC}"
  echo -e "  View logs:      ${YELLOW}docker compose -f $APP_DIR/$COMPOSE_FILE logs -f${NC}"
  echo -e "  Backend logs:   ${YELLOW}docker compose -f $APP_DIR/$COMPOSE_FILE logs -f backend${NC}"
  echo -e "  Restart:        ${YELLOW}docker compose -f $APP_DIR/$COMPOSE_FILE restart${NC}"
  echo -e "  Stop:           ${YELLOW}docker compose -f $APP_DIR/$COMPOSE_FILE down${NC}"
  echo -e "  Health check:   ${YELLOW}./scripts/health-check.sh${NC}"
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# Cleanup
# ═══════════════════════════════════════════════════════════════════════════════
cleanup_images() {
  log_step "Cleaning up old Docker images..."
  docker image prune -f --filter "until=168h" &>/dev/null || true
  log_ok "Cleanup complete"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════════
main() {
  print_banner

  # ─── Handle --stop first ────────────────────────────────────────────────────
  if [[ "$DO_STOP" == true ]]; then
    stop_services
    log_ok "Al-Awael ERP stopped successfully"
    exit 0
  fi

  # ─── Standard deployment flow ─────────────────────────────────────────────────
  check_docker
  check_app_directory
  update_code
  setup_environment
  check_volumes

  # ─── Restart or fresh start ─────────────────────────────────────────────────
  if [[ "$DO_RESTART" == true ]]; then
    restart_services
  elif [[ "$DO_UPDATE" == true ]]; then
    restart_services
  else
    build_images
    start_services
  fi

  cleanup_images
  show_status

  # ─── Tail logs if requested ─────────────────────────────────────────────────
  if [[ "$DO_LOGS" == true ]]; then
    log_step "Tailing logs (Ctrl+C to exit)..."
    cd "$APP_DIR"
    docker compose -f "$COMPOSE_FILE" logs -f
  fi

  log_ok "Al-Awael ERP deployed successfully!"
}

# Run main
main "$@"

# ─── Make this script executable ──────────────────────────────────────────────
# chmod +x scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════════
