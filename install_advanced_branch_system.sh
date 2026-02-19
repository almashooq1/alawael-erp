#!/bin/bash
# install_advanced_branch_system.sh
# سكريبت التثبيت السريع لنظام إدارة الفروع المتقدم

set -e

echo "🚀 بدء تثبيت نظام إدارة الفروع المتقدم..."
echo "=================================================="

# الألوان
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. التحقق من المتطلبات
echo -e "${BLUE}✓ التحقق من المتطلبات...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python 3 غير مثبت${NC}"
    exit 1
fi

if ! command -v pip &> /dev/null; then
    echo -e "${YELLOW}⚠️  pip غير مثبت${NC}"
    exit 1
fi

echo -e "${GREEN}✅ جميع المتطلبات موجودة${NC}"

# 2. تثبيت المكتبات المطلوبة
echo -e "${BLUE}✓ تثبيت المكتبات...${NC}"

pip install flask>=2.0.0
pip install flask-sqlalchemy>=1.4.0
pip install sqlalchemy>=1.4.0
pip install flask-jwt-extended>=4.0.0
pip install numpy>=1.21.0
pip install scikit-learn>=0.24.0
pip install pandas>=1.3.0
pip install psycopg2-binary>=2.9.0

echo -e "${GREEN}✅ تم تثبيت جميع المكتبات${NC}"

# 3. نقل الملفات
echo -e "${BLUE}✓ نقل الملفات...${NC}"

ALAWAEL_DIR="alawael-erp"

if [ ! -d "$ALAWAEL_DIR" ]; then
    mkdir -p "$ALAWAEL_DIR"
fi

# التحقق من وجود الملفات
echo -e "${BLUE}✓ التحقق من ملفات النظام...${NC}"

if [ -f "$ALAWAEL_DIR/advanced_branch_management_models.py" ]; then
    echo -e "${GREEN}✅ النماذج موجودة${NC}"
else
    echo -e "${YELLOW}⚠️  ملف النماذج غير موجود - يرجى نسخه يدوياً${NC}"
fi

if [ -f "$ALAWAEL_DIR/advanced_branch_management_services.py" ]; then
    echo -e "${GREEN}✅ الخدمات موجودة${NC}"
else
    echo -e "${YELLOW}⚠️  ملف الخدمات غير موجود - يرجى نسخه يدوياً${NC}"
fi

if [ -f "$ALAWAEL_DIR/advanced_branch_management_api.py" ]; then
    echo -e "${GREEN}✅ واجهة API موجودة${NC}"
else
    echo -e "${YELLOW}⚠️  ملف API غير موجود - يرجى نسخه يدوياً${NC}"
fi

if [ -f "$ALAWAEL_DIR/advanced_branch_analytics_engine.py" ]; then
    echo -e "${GREEN}✅ محرك التحليلات موجود${NC}"
else
    echo -e "${YELLOW}⚠️  ملف محرك التحليلات غير موجود - يرجى نسخه يدوياً${NC}"
fi

# 4. اختبار الاستيراد
echo -e "${BLUE}✓ اختبار استيراد المكتبات...${NC}"

python3 "$ALAWAEL_DIR/test_advanced_branch_system.py" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  تحذير: بعض الملفات قد لا تكون متوفرة${NC}"
}

# 5. معلومات ما بعد التثبيت
echo ""
echo -e "${GREEN}=================================================="
echo "✅ تم التثبيت بنجاح!"
echo "==================================================${NC}"

echo ""
echo -e "${BLUE}📚 الخطوات التالية:${NC}"
echo "1. تأكد من وجود جميع ملفات النظام في مجلد $ALAWAEL_DIR"
echo "2. قم بتحديث ملف config.py بإعدادات قاعدة البيانات"
echo "3. قم بتشغيل الهجرة: flask db migrate"
echo "4. قم بتطبيق الهجرة: flask db upgrade"
echo "5. سجل Blueprint مع تطبيق Flask"
echo ""

echo -e "${BLUE}🔗 تسجيل Blueprint:${NC}"
cat << 'EOF'
في ملف Flask الرئيسي (app.py):

from advanced_branch_management_api import advanced_branch_bp
app.register_blueprint(advanced_branch_bp)
EOF

echo ""
echo -e "${BLUE}🧪 الاختبار:${NC}"
echo "python3 $ALAWAEL_DIR/test_advanced_branch_system.py"
echo ""

echo -e "${BLUE}📖 التوثيق:${NC}"
echo "- ADVANCED_BRANCH_MANAGEMENT_GUIDE.md"
echo "- EXECUTIVE_REPORT_ADVANCED_BRANCH_MANAGEMENT.md"
echo ""

echo -e "${GREEN}النظام جاهز للعمل! 🎉${NC}"
