#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  سكربت رفع ونشر التطبيق - Alawael ERP Deploy Script
#  يُشغّل بعد setup-server.sh
# ════════════════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/home/alawael/app"
LOG_DIR="/home/alawael/logs"
BACKUP_DIR="/home/alawael/backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  نشر تطبيق الأوائل ERP${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. Backup current deployment ─────────────────────────────────────
if [ -d "${APP_DIR}/backend/node_modules" ]; then
  echo -e "${YELLOW}📦 حفظ نسخة احتياطية...${NC}"
  mkdir -p ${BACKUP_DIR}
  cp -r ${APP_DIR}/backend/.env ${BACKUP_DIR}/.env.backup 2>/dev/null || true
  pm2 save 2>/dev/null || true
  echo -e "${GREEN}  ✅ النسخة الاحتياطية: ${BACKUP_DIR}${NC}"
fi

# ─── 2. Install Backend Dependencies ──────────────────────────────────
echo -e "${GREEN}[1/5] تثبيت حزم Backend...${NC}"
cd ${APP_DIR}/backend

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ ملف .env غير موجود! أنشئه أولاً من .env.production${NC}"
  echo -e "${YELLOW}  cp ${APP_DIR}/deploy/hostinger/.env.production ${APP_DIR}/backend/.env${NC}"
  echo -e "${YELLOW}  ثم عدّل القيم: nano ${APP_DIR}/backend/.env${NC}"
  exit 1
fi

npm ci --production --no-audit
echo -e "${GREEN}  ✅ تم تثبيت حزم Backend${NC}"

# ─── 3. Build Frontend ────────────────────────────────────────────────
echo -e "${GREEN}[2/5] بناء Frontend...${NC}"
cd ${APP_DIR}/frontend

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  echo -e "${RED}❌ ملف .env.production غير موجود في frontend!${NC}"
  exit 1
fi

npm ci --no-audit
npm run build

if [ ! -d "build" ]; then
  echo -e "${RED}❌ فشل بناء Frontend!${NC}"
  exit 1
fi
echo -e "${GREEN}  ✅ تم بناء Frontend بنجاح${NC}"

# ─── 4. Setup Logs ────────────────────────────────────────────────────
echo -e "${GREEN}[3/5] إعداد ملفات السجلات...${NC}"
mkdir -p ${LOG_DIR}
touch ${LOG_DIR}/app-out.log ${LOG_DIR}/app-error.log

# ─── 5. Start/Restart PM2 ─────────────────────────────────────────────
echo -e "${GREEN}[4/5] تشغيل التطبيق مع PM2...${NC}"
cd ${APP_DIR}

# Copy PM2 config
if [ -f "deploy/hostinger/ecosystem.config.js" ]; then
  cp deploy/hostinger/ecosystem.config.js ${APP_DIR}/ecosystem.config.js
fi

# Stop existing processes
pm2 delete alawael-api 2>/dev/null || true

# Start
pm2 start ecosystem.config.js
pm2 save

echo -e "${GREEN}  ✅ التطبيق يعمل الآن${NC}"

# ─── 6. Verify ─────────────────────────────────────────────────────────
echo -e "${GREEN}[5/5] التحقق من التشغيل...${NC}"
sleep 3

# Check PM2 status
pm2 list

# Check health endpoint
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/health 2>/dev/null || echo "000")
if [ "${HEALTH}" = "200" ]; then
  echo -e "${GREEN}  ✅ Backend يعمل بنجاح (HTTP 200)${NC}"
else
  echo -e "${YELLOW}  ⚠️  Backend لم يبدأ بعد (HTTP ${HEALTH})${NC}"
  echo -e "${YELLOW}  تحقق من السجلات:  pm2 logs alawael-api${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ تم النشر بنجاح!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   🌐 الموقع:    https://YOUR_DOMAIN (غيّر الدومين)"
echo -e "   📊 PM2:       pm2 monit"
echo -e "   📝 السجلات:   pm2 logs alawael-api"
echo -e "   🔄 إعادة تشغيل: pm2 restart alawael-api"
echo ""
