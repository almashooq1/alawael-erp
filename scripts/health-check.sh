#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Comprehensive Health Check Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: ./scripts/health-check.sh [OPTIONS]
#
# Checks:
#   • All Docker containers are running
#   • Backend health endpoint responds
#   • MongoDB connectivity (ping)
#   • Redis connectivity (PING)
#   • Memory and CPU usage per container
#   • Disk space usage
#
# Exit codes:
#   0 — All systems healthy
#   1 — One or more checks failed
#
# Environment Variables:
#   BACKEND_PORT   Backend port (default: 3001)
#   HEALTH_PATH    Health endpoint path (default: /health)
#   COMPOSE_FILE   Docker Compose file (default: docker-compose.yml)
#   APP_DIR        Application directory (default: /opt/alawael-erp)
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════
APP_DIR="${APP_DIR:-/opt/alawael-erp}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
HEALTH_URL="http://localhost:${BACKEND_PORT}${HEALTH_PATH}"
NGINX_HEALTH_URL="http://localhost${HEALTH_PATH}"

# Thresholds
CPU_WARN_THRESHOLD="${CPU_WARN_THRESHOLD:-80.0}"    # % CPU warning
MEM_WARN_THRESHOLD="${MEM_WARN_THRESHOLD:-85.0}"  # % memory warning
DISK_WARN_THRESHOLD="${DISK_WARN_THRESHOLD:-85}"    # % disk warning

# ─── Color helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
log_ok()    { echo -e "${GREEN}✓${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
log_error() { echo -e "${RED}✗${NC}  $*" >&2; }
log_section() { echo -e "${CYAN}▶${NC}  ${BOLD}$*${NC}"; }

# ─── State tracking ─────────────────────────────────────────────────────────────
OVERALL_HEALTHY=true
ISSUES=()

record_issue() {
  ISSUES+=("$1")
  OVERALL_HEALTHY=false
}

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Check Docker Containers
# ═══════════════════════════════════════════════════════════════════════════════
check_containers() {
  log_section "Checking Docker Containers"

  local expected_containers=(
    "alawael-mongodb"
    "alawael-redis"
    "alawael-backend"
    "alawael-nginx"
  )

  local all_running=true
  for container in "${expected_containers[@]}"; do
    local status
    status=$(docker ps --filter "name=${container}" --format '{{.Status}}' 2>/dev/null | head -1)

    if [[ -z "$status" ]]; then
      log_error "Container '$container' is NOT running"
      record_issue "Container '$container' not running"
      all_running=false
    elif echo "$status" | grep -q "healthy"; then
      log_ok "$container — $status"
    elif echo "$status" | grep -q "unhealthy"; then
      log_warn "$container — $status (unhealthy)"
      record_issue "Container '$container' is unhealthy"
      all_running=false
    elif echo "$status" | grep -q "Up"; then
      log_ok "$container — $status"
    else
      log_warn "$container — $status (unknown state)"
      record_issue "Container '$container' in unknown state: $status"
      all_running=false
    fi
  done

  if [[ "$all_running" == true ]]; then
    log_ok "All containers are running"
  fi
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Check Backend Health Endpoint
# ═══════════════════════════════════════════════════════════════════════════════
check_backend_health() {
  log_section "Checking Backend Health Endpoint"

  # Check via backend port
  local backend_status backend_body
  backend_status=$(curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

  if [[ "$backend_status" == "200" ]]; then
    backend_body=$(curl -sf "$HEALTH_URL" 2>/dev/null | head -c 200 || echo "")
    log_ok "Backend health check: HTTP 200"
    log_info "  Response: ${backend_body}"
  else
    log_error "Backend health check failed: HTTP $backend_status"
    log_info "  URL: $HEALTH_URL"
    record_issue "Backend health endpoint returned HTTP $backend_status"
  fi

  # Check via nginx (reverse proxy)
  local nginx_status
  nginx_status=$(curl -sf -o /dev/null -w "%{http_code}" "$NGINX_HEALTH_URL" 2>/dev/null || echo "000")

  if [[ "$nginx_status" == "200" ]]; then
    log_ok "NGINX health check: HTTP 200"
  else
    log_error "NGINX health check failed: HTTP $nginx_status"
    log_info "  URL: $NGINX_HEALTH_URL"
    record_issue "NGINX health endpoint returned HTTP $nginx_status"
  fi
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Check MongoDB Connectivity
# ═══════════════════════════════════════════════════════════════════════════════
check_mongodb() {
  log_section "Checking MongoDB Connectivity"

  local mongo_ping
  mongo_ping=$(docker exec alawael-mongodb mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null || echo "FAIL")

  if echo "$mongo_ping" | grep -q "ok.*1"; then
    log_ok "MongoDB ping: OK"
  else
    log_error "MongoDB ping failed"
    record_issue "MongoDB connectivity check failed"
  fi

  # Check MongoDB version
  local mongo_version
  mongo_version=$(docker exec alawael-mongodb mongosh --eval "db.version()" --quiet 2>/dev/null || echo "unknown")
  log_info "  Version: $mongo_version"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4. Check Redis Connectivity
# ═══════════════════════════════════════════════════════════════════════════════
check_redis() {
  log_section "Checking Redis Connectivity"

  local redis_ping
  redis_ping=$(docker exec alawael-redis redis-cli ping 2>/dev/null || echo "FAIL")

  if [[ "$redis_ping" == "PONG" ]]; then
    log_ok "Redis ping: PONG"
  else
    log_error "Redis ping failed: $redis_ping"
    record_issue "Redis connectivity check failed (got: $redis_ping)"
  fi

  # Check Redis info
  local redis_info
  redis_info=$(docker exec alawael-redis redis-cli info replication 2>/dev/null | grep "^role:" | cut -d: -f2 | tr -d '\r' || echo "unknown")
  log_info "  Role: $redis_info"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. Report Resource Usage (Memory / CPU)
# ═══════════════════════════════════════════════════════════════════════════════
report_resources() {
  log_section "Resource Usage Report"

  local containers=("alawael-mongodb" "alawael-redis" "alawael-backend" "alawael-nginx")
  local stats
  stats=$(docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}" "${containers[@]}" 2>/dev/null || true)

  if [[ -z "$stats" ]]; then
    log_warn "Could not retrieve container stats"
    return
  fi

  echo ""
  printf "  ${BOLD}%-20s %12s %20s %12s${NC}\n" "Container" "CPU" "Memory" "Mem %"
  echo "  ───────────────────────────────────────────────────────────────────────"

  while IFS='|' read -r name cpu mem_usage mem_perc; do
    local cpu_val mem_perc_val
    cpu_val=$(echo "$cpu" | tr -d '%')
    mem_perc_val=$(echo "$mem_perc" | tr -d '%')

    # Color-code based on thresholds
    local cpu_color="$GREEN" mem_color="$GREEN"
    if [[ -n "$cpu_val" && "$(echo "$cpu_val > $CPU_WARN_THRESHOLD" | bc 2>/dev/null || echo "0")" == "1" ]]; then
      cpu_color="$YELLOW"
      record_issue "High CPU usage on $name: $cpu"
    fi
    if [[ -n "$mem_perc_val" && "$(echo "$mem_perc_val > $MEM_WARN_THRESHOLD" | bc 2>/dev/null || echo "0")" == "1" ]]; then
      mem_color="$YELLOW"
      record_issue "High memory usage on $name: $mem_perc"
    fi

    printf "  %-20s %b%12s%b %20s %b%12s%b\n" \
      "$name" "$cpu_color" "$cpu" "$NC" "$mem_usage" "$mem_color" "$mem_perc" "$NC"
  done <<< "$stats"

  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 6. Disk Space Usage
# ═══════════════════════════════════════════════════════════════════════════════
report_disk() {
  log_section "Disk Space Usage"

  local df_output
  df_output=$(df -h / 2>/dev/null | tail -1 || true)

  if [[ -n "$df_output" ]]; then
    local usage_percent
    usage_percent=$(echo "$df_output" | awk '{print $5}' | tr -d '%')
    local size used avail
    size=$(echo "$df_output" | awk '{print $2}')
    used=$(echo "$df_output" | awk '{print $3}')
    avail=$(echo "$df_output" | awk '{print $4}')

    if [[ "$usage_percent" -ge "$DISK_WARN_THRESHOLD" ]]; then
      log_warn "Disk usage at ${usage_percent}% (used: $used / $size, available: $avail)"
      record_issue "Disk usage critical: ${usage_percent}%"
    else
      log_ok "Disk usage: ${usage_percent}% (used: $used / $size, available: $avail)"
    fi
  fi
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 7. Docker Compose Service Status
# ═══════════════════════════════════════════════════════════════════════════════
report_compose_status() {
  log_section "Docker Compose Service Status"

  if [[ -f "$APP_DIR/$COMPOSE_FILE" ]]; then
    cd "$APP_DIR"
    local compose_status
    compose_status=$(docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || true)
    if [[ -n "$compose_status" ]]; then
      echo "$compose_status" | sed 's/^/  /'
    else
      log_warn "No running services found in compose project"
    fi
  else
    log_warn "Compose file not found: $APP_DIR/$COMPOSE_FILE"
  fi
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 8. System Load
# ═══════════════════════════════════════════════════════════════════════════════
report_system_load() {
  log_section "System Load"

  local load1 load5 load15 uptime_str
  if command -v uptime &>/dev/null; then
    uptime_str=$(uptime 2>/dev/null || true)
    load1=$(echo "$uptime_str" | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
    load5=$(echo "$uptime_str" | awk -F'load average:' '{print $2}' | awk '{print $2}' | tr -d ',')
    load15=$(echo "$uptime_str" | awk -F'load average:' '{print $2}' | awk '{print $3}' | tr -d ',')
    log_info "Load average: 1m=$load1, 5m=$load5, 15m=$load15"
  fi

  local mem_total mem_free mem_avail
  if [[ -f /proc/meminfo ]]; then
    mem_total=$(awk '/MemTotal:/ {print int($2/1024)}' /proc/meminfo)
    mem_free=$(awk '/MemFree:/ {print int($2/1024)}' /proc/meminfo)
    mem_avail=$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)
    log_info "Memory: ${mem_avail}MB available / ${mem_total}MB total"
  fi
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# Final Summary
# ═══════════════════════════════════════════════════════════════════════════════
print_summary() {
  echo "═══════════════════════════════════════════════════════════════════════════════"

  if [[ "$OVERALL_HEALTHY" == true ]]; then
    echo -e "${GREEN}${BOLD}✓ ALL CHECKS PASSED — Al-Awael ERP is healthy${NC}"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    return 0
  else
    echo -e "${RED}${BOLD}✗ HEALTH CHECK FAILED — Issues detected:${NC}"
    for issue in "${ISSUES[@]}"; do
      echo -e "  ${RED}•${NC} $issue"
    done
    echo "═══════════════════════════════════════════════════════════════════════════════"
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════════
main() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════════════════════════════╗"
  echo "║           Al-Awael ERP — Health Check Report                                  ║"
  echo "╚══════════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  check_containers
  check_backend_health
  check_mongodb
  check_redis
  report_resources
  report_disk
  report_compose_status
  report_system_load

  print_summary
}

# Run and capture exit code
main
exit_code=$?

exit $exit_code

# ─── Make this script executable ──────────────────────────────────────────────
# chmod +x scripts/health-check.sh
# ═══════════════════════════════════════════════════════════════════════════════
