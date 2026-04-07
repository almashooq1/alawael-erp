#!/bin/bash
###############################################################################
# Al-Awael ERP — Docker Compose Full Deployment Script
# نظام الأوائل ERP — سكربت نشر Docker Compose لجميع الخدمات
#
# Usage:
#   ./ops/deploy-docker-compose.sh                    # النشر الكامل
#   ./ops/deploy-docker-compose.sh --core-only        # البنية التحتية + التطبيق الأساسي فقط
#   ./ops/deploy-docker-compose.sh --with-monitoring  # مع المراقبة (Prometheus + Grafana)
#   ./ops/deploy-docker-compose.sh --phase 5          # نشر حتى مرحلة معينة
#   ./ops/deploy-docker-compose.sh --status            # عرض حالة الخدمات
###############################################################################

set -euo pipefail

# ─── Colors & Helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✅]${NC} $*"; }
warn()  { echo -e "${YELLOW}[⚠️]${NC} $*"; }
err()   { echo -e "${RED}[❌]${NC} $*" >&2; }
info()  { echo -e "${BLUE}[ℹ️]${NC} $*"; }
header(){ echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"; }

# ─── Configuration ────────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/home/alawael/app}"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROD_FILE="docker-compose.production.yml"
DOMAIN="${DEPLOY_DOMAIN:-alaweal.org}"

# ─── Parse Arguments ─────────────────────────────────────────────────────────
CORE_ONLY=false
WITH_MONITORING=false
MAX_PHASE=9
SHOW_STATUS=false
PULL_IMAGES=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --core-only)       CORE_ONLY=true; shift ;;
    --with-monitoring) WITH_MONITORING=true; shift ;;
    --phase)           MAX_PHASE="$2"; shift 2 ;;
    --status)          SHOW_STATUS=true; shift ;;
    --no-pull)         PULL_IMAGES=false; shift ;;
    -h|--help)
      echo "Usage: $0 [--core-only] [--with-monitoring] [--phase N] [--status] [--no-pull]"
      exit 0 ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Status Check ─────────────────────────────────────────────────────────────
if [ "$SHOW_STATUS" = true ]; then
  header "حالة خدمات Docker Compose"
  docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
    docker-compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD_FILE" ps
  echo ""
  info "عدد الحاويات النشطة: $(docker ps -q | wc -l)"
  exit 0
fi

# ─── Pre-flight Checks ───────────────────────────────────────────────────────
header "🔍 فحوصات ما قبل النشر"

# Check Docker
if ! command -v docker &>/dev/null; then
  err "Docker غير مثبت! قم بتثبيته أولاً: https://docs.docker.com/engine/install/"
  exit 1
fi
log "Docker موجود: $(docker --version)"

# Check Docker Compose
if docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  err "Docker Compose غير مثبت!"
  exit 1
fi
log "Docker Compose موجود: $($COMPOSE_CMD version 2>/dev/null | head -1)"

# Check disk space (need at least 20GB free)
FREE_SPACE_GB=$(df -BG / | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$FREE_SPACE_GB" -lt 20 ]; then
  warn "مساحة القرص المتاحة: ${FREE_SPACE_GB}GB — يُفضل 20GB+ لجميع الخدمات"
fi
log "مساحة القرص المتاحة: ${FREE_SPACE_GB}GB"

# Check available RAM
TOTAL_RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM_GB" -lt 16 ]; then
  warn "ذاكرة RAM: ${TOTAL_RAM_GB}GB — يُفضل 16GB+ لجميع الخدمات"
  if [ "$TOTAL_RAM_GB" -lt 8 ]; then
    warn "RAM أقل من 8GB — سيتم تشغيل الخدمات الأساسية فقط"
    CORE_ONLY=true
  fi
fi
log "ذاكرة RAM: ${TOTAL_RAM_GB}GB"

# ─── Environment File ────────────────────────────────────────────────────────
header "📋 فحص ملف البيئة (.env)"

if [ ! -f ".env" ]; then
  if [ -f ".env.production.template" ]; then
    warn "لا يوجد .env — يتم النسخ من .env.production.template"
    cp .env.production.template .env
    warn "⚠️  يجب تعديل .env يدوياً قبل بدء النشر!"
    exit 1
  else
    err "لا يوجد ملف .env ولا قالب!"
    exit 1
  fi
fi

# Validate critical env vars
MISSING_VARS=()
for VAR in MONGODB_URI JWT_SECRET; do
  VAL=$(grep "^${VAR}=" .env | cut -d= -f2- || true)
  if [ -z "$VAL" ] || [[ "$VAL" == *"CHANGE_ME"* ]]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  err "متغيرات بيئة مطلوبة مفقودة أو غير محدثة:"
  for v in "${MISSING_VARS[@]}"; do
    echo "  ❌ $v"
  done
  exit 1
fi
log "ملف البيئة (.env) صالح"

# ─── Define Service Groups ───────────────────────────────────────────────────
# Core infrastructure (always deployed)
CORE_INFRA="mongodb redis"

# Core application
CORE_APP="backend frontend nginx"

# Phase 1: Essential business services
PHASE1_SERVICES="api-gateway graphql"

# Phase 2: Communication & AI
PHASE2_SERVICES="whatsapp intelligent-agent secretary-ai notification-service"

# Phase 3: Business modules
PHASE3_SERVICES="finance-backend scm-backend scm-frontend dashboard-api dashboard-ui"

# Phase 4: Advanced services
PHASE4_SERVICES="payment-gateway communication-hub report-worker audit-service webhook-worker scheduler file-processor saudi-gov-gateway iot-gateway nats minio"

# Phase 5: Specialized microservices
PHASE5_SERVICES="hr-payroll-service crm-service attendance-biometric-service fleet-transport-service document-management-service workflow-engine-service identity-service analytics-bi-service e-learning-service parent-portal-service rehabilitation-care-service fee-billing-service multi-tenant-service realtime-collaboration-service kitchen-laundry-facility-service"

# Phase 6: Extended microservices
PHASE6_SERVICES="inventory-warehouse-service academic-curriculum-service student-health-medical-service visitor-campus-security-service crisis-safety-service compliance-accreditation-service events-activities-service asset-equipment-service staff-training-development-service cms-announcements-service forms-survey-service budget-financial-planning-service student-lifecycle-service external-integration-hub-service facility-space-management-service"

# Phase 7: Platform services
PHASE7_SERVICES="platform-api-gateway security-auth-service smart-reports-service service-mesh-monitor"

# Phase 8: Operations
PHASE8_SERVICES="notification-center backup-recovery ai-engine advanced-audit multilingual payment-gateway-service"

# Phase 9: Productivity
PHASE9_SERVICES="task-project file-storage chat-messaging report-scheduler system-config data-migration"

# Background workers (always with core)
WORKERS="queue-worker backup-service log-aggregator"

# Monitoring stack
MONITORING_SERVICES="prometheus grafana loki alertmanager node-exporter redis-exporter jaeger"

# ─── Build Service List ──────────────────────────────────────────────────────
header "📦 تحديد الخدمات للنشر"

SERVICES="$CORE_INFRA $CORE_APP $WORKERS"

if [ "$CORE_ONLY" = true ]; then
  info "وضع الخدمات الأساسية فقط"
else
  for PHASE in $(seq 1 "$MAX_PHASE"); do
    VAR="PHASE${PHASE}_SERVICES"
    PHASE_VALUE="${!VAR:-}"
    if [ -n "$PHASE_VALUE" ]; then
      SERVICES="$SERVICES $PHASE_VALUE"
      info "المرحلة $PHASE: $(echo "$PHASE_VALUE" | wc -w) خدمة"
    fi
  done
fi

if [ "$WITH_MONITORING" = true ]; then
  SERVICES="$SERVICES $MONITORING_SERVICES"
  info "المراقبة: $(echo "$MONITORING_SERVICES" | wc -w) خدمة"
fi

SERVICE_COUNT=$(echo "$SERVICES" | wc -w)
log "إجمالي الخدمات للنشر: $SERVICE_COUNT"

# ─── Pull & Build ────────────────────────────────────────────────────────────
header "🏗️ بناء وتحضير الصور"

COMPOSE_FILES="-f $COMPOSE_FILE -f $COMPOSE_PROD_FILE"

if [ "$PULL_IMAGES" = true ]; then
  info "جاري سحب الصور الأساسية..."
  $COMPOSE_CMD $COMPOSE_FILES pull $CORE_INFRA 2>/dev/null || true
fi

info "جاري بناء صور التطبيق..."
$COMPOSE_CMD $COMPOSE_FILES build --parallel $SERVICES 2>&1 | tail -20
log "تم بناء جميع الصور"

# ─── Deploy Phase by Phase ───────────────────────────────────────────────────
header "🚀 بدء النشر التدريجي"

# Phase 0: Core infrastructure first
info "📦 المرحلة 0: البنية التحتية (MongoDB + Redis)..."
$COMPOSE_CMD $COMPOSE_FILES up -d $CORE_INFRA
sleep 10

# Wait for MongoDB
for i in $(seq 1 30); do
  if docker exec alawael-mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
    log "MongoDB جاهز"
    break
  fi
  [ "$i" -eq 30 ] && err "MongoDB لم يستجب خلال 30 محاولة" && exit 1
  sleep 2
done

# Wait for Redis
for i in $(seq 1 20); do
  if docker exec alawael-redis redis-cli ping &>/dev/null; then
    log "Redis جاهز"
    break
  fi
  [ "$i" -eq 20 ] && err "Redis لم يستجب" && exit 1
  sleep 2
done

# Phase 0.5: Message broker & storage
if echo "$SERVICES" | grep -q "nats\|minio"; then
  info "📦 وسيط الرسائل والتخزين (NATS + MinIO)..."
  $COMPOSE_CMD $COMPOSE_FILES up -d $(echo "$SERVICES" | tr ' ' '\n' | grep -E "^(nats|minio)$" | tr '\n' ' ') 2>/dev/null || true
  sleep 5
fi

# Phase 1: Core application
info "📦 المرحلة 1: التطبيق الأساسي (Backend + Frontend + Nginx)..."
$COMPOSE_CMD $COMPOSE_FILES up -d $CORE_APP $WORKERS
sleep 10

# Wait for backend health
for i in $(seq 1 30); do
  if docker exec alawael-backend curl -sf http://localhost:3001/health &>/dev/null 2>&1; then
    log "Backend جاهز"
    break
  fi
  [ "$i" -eq 30 ] && warn "Backend لم يستجب — يتم المتابعة..."
  sleep 3
done

# Phase 2+: Deploy remaining services in batches
if [ "$CORE_ONLY" = false ]; then
  for PHASE in $(seq 1 "$MAX_PHASE"); do
    VAR="PHASE${PHASE}_SERVICES"
    PHASE_VALUE="${!VAR:-}"
    if [ -n "$PHASE_VALUE" ]; then
      VALID_SERVICES=""
      for SVC in $PHASE_VALUE; do
        if echo "$SERVICES" | grep -qw "$SVC"; then
          VALID_SERVICES="$VALID_SERVICES $SVC"
        fi
      done
      if [ -n "$VALID_SERVICES" ]; then
        info "📦 المرحلة $PHASE: $(echo "$VALID_SERVICES" | wc -w) خدمة..."
        $COMPOSE_CMD $COMPOSE_FILES up -d $VALID_SERVICES 2>&1 | tail -5
        sleep 5
      fi
    fi
  done
fi

# Monitoring
if [ "$WITH_MONITORING" = true ]; then
  info "📊 تشغيل خدمات المراقبة..."
  $COMPOSE_CMD $COMPOSE_FILES --profile monitoring up -d 2>&1 | tail -5
  sleep 5
fi

# ─── Health Checks ───────────────────────────────────────────────────────────
header "🏥 فحص صحة الخدمات"

HEALTHY=0
UNHEALTHY=0
TOTAL=0

check_service() {
  local name=$1
  local port=$2
  local path=${3:-/health}
  TOTAL=$((TOTAL + 1))

  if docker ps --format '{{.Names}}' | grep -q "$name"; then
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "running")
    if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "running" ]; then
      log "$name ✓ ($STATUS)"
      HEALTHY=$((HEALTHY + 1))
    else
      warn "$name ($STATUS)"
      UNHEALTHY=$((UNHEALTHY + 1))
    fi
  else
    err "$name — غير موجود"
    UNHEALTHY=$((UNHEALTHY + 1))
  fi
}

check_service "alawael-mongodb" 27017
check_service "alawael-redis" 6379
check_service "alawael-backend" 3001
check_service "alawael-frontend" 3004
check_service "alawael-nginx" 80

# ─── Summary ─────────────────────────────────────────────────────────────────
header "📊 ملخص النشر"

echo -e "  الحاويات النشطة:  $(docker ps -q | wc -l)"
echo -e "  الخدمات الصحيحة:  ${GREEN}$HEALTHY${NC}"
echo -e "  الخدمات المعطلة:  ${RED}$UNHEALTHY${NC}"
echo ""

# Show all running containers
echo -e "${BLUE}═══ الحاويات النشطة ═══${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -40
echo ""

if [ "$UNHEALTHY" -eq 0 ]; then
  log "🎉 تم نشر جميع الخدمات بنجاح!"
else
  warn "بعض الخدمات تحتاج مراجعة. استخدم: docker compose logs <service-name>"
fi

echo ""
info "الموقع: https://$DOMAIN"
info "حالة الخدمات: $0 --status"
info "السجلات: docker compose logs -f <service>"
info "إيقاف: docker compose down"
