#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
# استبدال YOUR_DOMAIN.com في جميع ملفات الإعداد
# Usage: bash configure-domain.sh alawael.com
# ════════════════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
  echo -e "${RED}❌ أدخل الدومين: bash configure-domain.sh alawael.com${NC}"
  exit 1
fi

DOMAIN="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo -e "${GREEN}🔧 ضبط الدومين: ${DOMAIN}${NC}"
echo ""

# Files to update
FILES=(
  "${SCRIPT_DIR}/.env.production"
  "${SCRIPT_DIR}/nginx-alawael.conf"
  "${ROOT_DIR}/frontend/.env.production"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    count=$(grep -c "YOUR_DOMAIN.com" "$f" 2>/dev/null || echo "0")
    sed -i "s/YOUR_DOMAIN\.com/${DOMAIN}/g" "$f"
    echo -e "${GREEN}  ✅ ${f} (${count} replacements)${NC}"
  else
    echo -e "${YELLOW}  ⚠️  ${f} — غير موجود${NC}"
  fi
done

echo ""
echo -e "${GREEN}✅ تم! تأكد من:${NC}"
echo -e "  1. ربط الدومين بـ IP السيرفر (DNS A Record)"
echo -e "  2. إعادة بناء Frontend: cd frontend && npm run build"
echo -e "  3. نسخ Nginx config: sudo cp ${SCRIPT_DIR}/nginx-alawael.conf /etc/nginx/sites-available/alawael"
echo ""
