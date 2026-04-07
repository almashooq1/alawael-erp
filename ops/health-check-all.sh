#!/bin/bash
###############################################################################
# Al-Awael ERP — Health Check for All Docker Compose Services
# فحص صحة جميع خدمات Docker Compose
#
# Usage: ./ops/health-check-all.sh [--json] [--watch]
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

JSON_MODE=false
WATCH_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --json)  JSON_MODE=true; shift ;;
    --watch) WATCH_MODE=true; shift ;;
    *) shift ;;
  esac
done

# ─── Service Definitions ────────────────────────────────────────────────────
# Format: "name|port|health_path|category"
SERVICES=(
  # Core Infrastructure
  "mongodb|27017|/|البنية التحتية"
  "redis|6379|/|البنية التحتية"
  "nats|8222|/healthz|البنية التحتية"
  "minio|9000|/minio/health/live|البنية التحتية"

  # Core Application
  "backend|3001|/health|التطبيق الأساسي"
  "frontend|3004|/|التطبيق الأساسي"
  "nginx|80|/health|التطبيق الأساسي"
  "api-gateway|8080|/health|التطبيق الأساسي"
  "graphql|4000|/.well-known/apollo/server-health|التطبيق الأساسي"

  # Communication & AI
  "whatsapp|3010|/health|التواصل والذكاء الاصطناعي"
  "intelligent-agent|3020|/health|التواصل والذكاء الاصطناعي"
  "secretary-ai|3050|/health|التواصل والذكاء الاصطناعي"
  "python-ml|5001|/health|التواصل والذكاء الاصطناعي"

  # Business Modules
  "finance-backend|3030|/health|وحدات الأعمال"
  "scm-backend|3040|/health|وحدات الأعمال"
  "scm-frontend|3045|/|وحدات الأعمال"
  "dashboard-api|3006|/health|وحدات الأعمال"
  "dashboard-ui|3007|/|وحدات الأعمال"

  # Advanced Services
  "notification-service|3070|/health|الخدمات المتقدمة"
  "payment-gateway|3200|/health|الخدمات المتقدمة"
  "communication-hub|3210|/health|الخدمات المتقدمة"
  "report-worker|3220|/health|الخدمات المتقدمة"
  "audit-service|3230|/health|الخدمات المتقدمة"
  "search-service|3240|/health|الخدمات المتقدمة"
  "webhook-worker|3250|/health|الخدمات المتقدمة"
  "scheduler|3260|/health|الخدمات المتقدمة"
  "file-processor|3270|/health|الخدمات المتقدمة"
  "saudi-gov-gateway|3280|/health|الخدمات المتقدمة"
  "iot-gateway|3290|/health|الخدمات المتقدمة"

  # Background Workers
  "queue-worker|3080|/health|العمال الخلفيون"
  "backup-service|3090|/health|العمال الخلفيون"
  "log-aggregator|3095|/health|العمال الخلفيون"

  # Phase 5: Specialized
  "hr-payroll-service|3300|/health|الموارد البشرية"
  "crm-service|3310|/health|إدارة العلاقات"
  "attendance-biometric-service|3320|/health|الحضور والانصراف"
  "fleet-transport-service|3330|/health|الأسطول والنقل"
  "document-management-service|3340|/health|إدارة الوثائق"
  "workflow-engine-service|3350|/health|محرك سير العمل"
  "identity-service|3360|/health|إدارة الهوية"
  "analytics-bi-service|3370|/health|التحليلات"
  "e-learning-service|3380|/health|التعلم الإلكتروني"
  "parent-portal-service|3390|/health|بوابة أولياء الأمور"
  "rehabilitation-care-service|3400|/health|التأهيل والرعاية"
  "fee-billing-service|3410|/health|الرسوم والفوترة"
  "multi-tenant-service|3420|/health|تعدد المستأجرين"
  "realtime-collaboration-service|3430|/health|التعاون اللحظي"
  "kitchen-laundry-facility-service|3440|/health|المرافق"

  # Phase 6: Extended
  "inventory-warehouse-service|3450|/health|المخزون"
  "academic-curriculum-service|3460|/health|المناهج"
  "student-health-medical-service|3470|/health|صحة الطلاب"
  "visitor-campus-security-service|3480|/health|أمن الحرم"
  "crisis-safety-service|3490|/health|إدارة الأزمات"
  "compliance-accreditation-service|3500|/health|الاعتماد"
  "events-activities-service|3510|/health|الفعاليات"
  "asset-equipment-service|3520|/health|الأصول"
  "staff-training-development-service|3530|/health|التدريب"
  "cms-announcements-service|3540|/health|إدارة المحتوى"
  "forms-survey-service|3550|/health|النماذج"
  "budget-financial-planning-service|3560|/health|الميزانية"
  "student-lifecycle-service|3570|/health|دورة حياة الطالب"
  "external-integration-hub-service|3580|/health|التكامل الخارجي"
  "facility-space-management-service|3590|/health|إدارة المرافق"

  # Phase 7-9
  "platform-api-gateway|3600|/health|المنصة"
  "security-auth-service|3610|/health|الأمان"
  "smart-reports-service|3620|/health|التقارير الذكية"
  "service-mesh-monitor|3630|/health|مراقبة الشبكة"
  "notification-center|3640|/health|مركز الإشعارات"
  "backup-recovery|3650|/health|النسخ الاحتياطي"
  "ai-engine|3660|/health|محرك الذكاء الاصطناعي"
  "advanced-audit|3670|/health|التدقيق المتقدم"
  "multilingual|3680|/health|متعدد اللغات"
  "payment-gateway-service|3690|/health|بوابة الدفع"
  "task-project|3700|/health|المهام والمشاريع"
  "file-storage|3710|/health|تخزين الملفات"
  "chat-messaging|3720|/health|المراسلة"
  "report-scheduler|3730|/health|جدولة التقارير"
  "system-config|3740|/health|إعدادات النظام"
  "data-migration|3750|/health|ترحيل البيانات"
)

# ─── Check Functions ─────────────────────────────────────────────────────────
check_docker_service() {
  local name=$1
  local container_name="alawael-${name}"

  # Check if container exists and is running
  local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")
  local health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no_healthcheck{{end}}' "$container_name" 2>/dev/null || echo "unknown")

  echo "${status}|${health}"
}

run_checks() {
  local total=0
  local running=0
  local healthy=0
  local stopped=0
  local not_found=0
  local current_category=""

  if [ "$JSON_MODE" = true ]; then
    echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","services":['
    local first=true
  fi

  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name port path category <<< "$entry"
    total=$((total + 1))

    # Print category header
    if [ "$JSON_MODE" = false ] && [ "$category" != "$current_category" ]; then
      current_category="$category"
      echo ""
      echo -e "${CYAN}── $category ──${NC}"
    fi

    local result=$(check_docker_service "$name")
    IFS='|' read -r status health <<< "$result"

    if [ "$JSON_MODE" = true ]; then
      [ "$first" = true ] && first=false || echo ","
      echo -n "  {\"name\":\"$name\",\"port\":$port,\"status\":\"$status\",\"health\":\"$health\",\"category\":\"$category\"}"
    else
      if [ "$status" = "running" ]; then
        running=$((running + 1))
        if [ "$health" = "healthy" ]; then
          healthy=$((healthy + 1))
          echo -e "  ${GREEN}✅${NC} $name (:$port) — healthy"
        elif [ "$health" = "no_healthcheck" ]; then
          healthy=$((healthy + 1))
          echo -e "  ${GREEN}⬆️${NC} $name (:$port) — running"
        else
          echo -e "  ${YELLOW}⚠️${NC} $name (:$port) — $health"
        fi
      elif [ "$status" = "not_found" ]; then
        not_found=$((not_found + 1))
        echo -e "  ${RED}⬜${NC} $name (:$port) — not deployed"
      else
        stopped=$((stopped + 1))
        echo -e "  ${RED}❌${NC} $name (:$port) — $status"
      fi
    fi
  done

  if [ "$JSON_MODE" = true ]; then
    echo ""
    echo "],\"summary\":{\"total\":$total,\"running\":$running,\"healthy\":$healthy,\"stopped\":$stopped,\"not_found\":$not_found}}"
  else
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "  ${GREEN}إجمالي الخدمات:${NC}    $total"
    echo -e "  ${GREEN}تعمل:${NC}              $running"
    echo -e "  ${GREEN}صحيحة:${NC}             $healthy"
    echo -e "  ${RED}متوقفة:${NC}            $stopped"
    echo -e "  ${YELLOW}غير منشورة:${NC}        $not_found"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

    # Overall health percentage
    if [ "$total" -gt 0 ]; then
      PCT=$((running * 100 / total))
      echo -e "  نسبة التشغيل: ${PCT}%"
    fi
  fi
}

# ─── Main ────────────────────────────────────────────────────────────────────
if [ "$WATCH_MODE" = true ]; then
  while true; do
    clear
    echo -e "${CYAN}══ فحص صحة خدمات الأوائل ERP — $(date '+%Y-%m-%d %H:%M:%S') ══${NC}"
    run_checks
    echo ""
    echo "تحديث كل 30 ثانية... (Ctrl+C للإيقاف)"
    sleep 30
  done
else
  echo -e "${CYAN}══ فحص صحة خدمات الأوائل ERP ══${NC}"
  run_checks
fi
