#!/bin/bash
# ============================================
# 🧹 سكريبت التنظيف والتحسين السريع
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================
# المهمة 1: تنظيف الملفات المؤقتة
# ============================================
print_header "1️⃣ تنظيف الملفات المؤقتة"

print_warning "حذف .DS_Store..."
find . -type f -name ".DS_Store" -delete
print_success "تم حذف .DS_Store"

print_warning "حذف Thumbs.db..."
find . -type f -name "Thumbs.db" -delete
print_success "تم حذف Thumbs.db"

print_warning "حذف ملفات log..."
find . -type f -name "*.log" -delete
find . -type d -name "logs" -prune -exec rm -rf {} + 2>/dev/null || true
print_success "تم حذف ملفات log"

# ============================================
# المهمة 2: تنظيف Build artifacts
# ============================================
print_header "2️⃣ حذف Build artifacts"

print_warning "حذف dist و build..."
find . -type d -name "dist" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "build" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "out" -prune -exec rm -rf {} + 2>/dev/null || true
print_success "تم حذف build artifacts"

# ============================================
# المهمة 3: تنظيف coverage reports
# ============================================
print_header "3️⃣ حذف coverage reports"

find . -type d -name "coverage" -prune -exec rm -rf {} + 2>/dev/null || true
print_success "تم حذف coverage reports"

# ============================================
# المهمة 4: تنظيف ملفات البيئة المضاعفة
# ============================================
print_header "4️⃣ تنظيف ملفات البيئة"

print_warning "حذف .env.backup..."
find . -type f -name ".env.*.backup" -delete
print_success "تم حذف .env.backup"

# ============================================
# المهمة 5: تنظيف المجلدات الفارغة
# ============================================
print_header "5️⃣ حذف المجلدات الفارغة"

find . -type d -empty -not -path "./.git/*" -delete 2>/dev/null || true
print_success "تم حذف المجلدات الفارغة"

# ============================================
# المهمة 6: إزالة نسخ مكررة
# ============================================
print_header "6️⃣ حذف النسخ المكررة"

print_warning "حذف ملفات معروفة مكررة..."
find . -type f \( \
    -name "*COPY*" \
    -o -name "*BACKUP*" \
    -o -name "*OLD*" \
    -o -name "*DUPLICATE*" \
    -o -name "*~" \
    \) -not -path "./.git/*" -not -path "./node_modules/*" -delete 2>/dev/null || true
print_success "تم حذف النسخ المكررة"

# ============================================
# المهمة 7: إصلاح أذونات الملفات
# ============================================
print_header "7️⃣ إصلاح أذونات الملفات"

print_warning "تعديل أذونات المجلدات..."
find . -type d -not -path "./.git/*" -exec chmod 755 {} + 2>/dev/null || true
print_success "تم إصلاح أذونات المجلدات"

print_warning "تعديل أذونات الملفات..."
find . -type f -not -path "./.git/*" -exec chmod 644 {} + 2>/dev/null || true
print_success "تم إصلاح أذونات الملفات"

# ============================================
# المهمة 8: تنسيق ملفات GitHub
# ============================================
print_header "8️⃣ تحسينات GitHub"

# تحديث .gitignore
if [ ! -f ".gitignore.improved" ]; then
    print_warning "ملف .gitignore.improved غير موجود"
else
    print_warning "استخدام .gitignore محسّن..."
    cp .gitignore .gitignore.bak
    cp .gitignore.improved .gitignore
    print_success "تم تحديث .gitignore"
fi

# ============================================
# المهمة 9: إحصائيات المشروع
# ============================================
print_header "9️⃣ إحصائيات المشروع"

echo ""
echo "📊 إحصائيات الملفات:"
echo "عدد ملفات JS:"
find . -type f -name "*.js" -not -path "./node_modules/*" | wc -l

echo "عدد ملفات TS:"
find . -type f -name "*.ts" -o -name "*.tsx" -not -path "./node_modules/*" | wc -l

echo "عدد ملفات JSON:"
find . -type f -name "*.json" -not -path "./node_modules/*" | wc -l

echo "عدد ملفات MD:"
find . -type f -name "*.md" | wc -l

echo ""
echo "📁 حجم المشروع:"
du -sh . 2>/dev/null || echo "N/A"

# ============================================
# تقرير النتائج
# ============================================
print_header "🎉 اكتمل التنظيف"

echo ""
echo -e "${GREEN}تم إنجاز المهام التالية:${NC}"
echo "✅ تنظيف الملفات المؤقتة"
echo "✅ حذف build artifacts"
echo "✅ حذف coverage reports"
echo "✅ تنظيف ملفات البيئة"
echo "✅ حذف المجلدات الفارغة"
echo "✅ حذف النسخ المكررة"
echo "✅ إصلاح أذونات الملفات"
echo "✅ تحسينات GitHub"
echo "✅ إحصائيات المشروع"

echo ""
echo -e "${YELLOW}الخطوات التالية:${NC}"
echo "1. راجع التغييرات: git status"
echo "2. أضف التغييرات: git add ."
echo "3. Commit التغييرات: git commit -m 'chore: cleanup project'"
echo "4. Push للمستودع: git push"

echo ""
echo -e "${BLUE}تم الانتهاء في: $(date)${NC}"
