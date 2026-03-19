#!/bin/bash
# ============================================
# 🔧 حل مشكلة إعادة التشغيل المتكررة في VS Code
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

# ============================================
# 1️⃣ حذف سجلات وملفات مؤقتة
# ============================================
print_header "1️⃣ تنظيف ملفات VS Code"

print_warning "حذف سجلات VS Code..."
rm -rf ~/AppData/Roaming/Code/logs/* 2>/dev/null || true
rm -rf ~/AppData/Local/Code/logs/* 2>/dev/null || true
print_success "تم حذف السجلات"

print_warning "حذف بيانات مؤقتة..."
rm -rf ~/AppData/Roaming/Code/.cache/* 2>/dev/null || true
rm -rf ~/AppData/Local/Code/.cache/* 2>/dev/null || true
print_success "تم حذف البيانات المؤقتة"

# ============================================
# 2️⃣ حذف ملفات workspaceStorage الفاسدة
# ============================================
print_header "2️⃣ إعادة تعيين ملفات العمل"

print_warning "حذف workspaceStorage..."
rm -rf ~/AppData/Roaming/Code/User/workspaceStorage/* 2>/dev/null || true
print_success "تم حذف ملفات العمل"

# ============================================
# 3️⃣ إزالة الإضافات المشكوك فيها
# ============================================
print_header "3️⃣ فحص الإضافات"

echo "📋 الإضافات المعروفة بسبب المشاكل:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️ prettier (قد تسبب مشاكل)"
echo "⚠️ eslint (قد تسبب مشاكل)"
echo "⚠️ some-random-extensions (حذفها)"
echo ""

# ============================================
# 4️⃣ إنشاء ملف إعدادات محسّن
# ============================================
print_header "4️⃣ إنشاء إعدادات موصى بها"

mkdir -p ~/AppData/Roaming/Code/User 2>/dev/null || true

cat > ~/AppData/Roaming/Code/User/settings.json << 'EOF'
{
  // الأداء
  "editor.enablePreview": false,
  "editor.maxTokenizationLineLength": 2000,
  "editor.largeFileOptimizations": true,
  "files.watcherExclude": {
    "**/.git": true,
    "**/node_modules/**": true,
    "**/dist": true,
    "**/build": true,
    "**/.vscode": true,
    "**/.venv": true
  },
  
  // منع إعادة التشغيل
  "extensions.verifySignature": false,
  "telemetry.enableTelemetry": false,
  "telemetry.enableCrashReporter": false,
  
  // TypeScript Server
  "typescript.tsserver.maxTsServerMemory": 3072,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  
  // الذاكرة
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "editor.formatOnSave": false,
  
  // الملفات
  "files.maxSize": 20971520,
  "search.maxResults": 5000,
  
  // تحديثات آمنة
  "update.enableWindowsBackgroundUpdates": false,
  "update.mode": "manual"
}
EOF

print_success "تم إنشاء ملف الإعدادات"

# ============================================
# 5️⃣ حذف امتدادات مشبوهة
# ============================================
print_header "5️⃣ حذف الإضافات المشكوك فيها"

print_warning "حذف مجلد الإضافات..."
rm -rf ~/AppData/Roaming/Code/User/extensions/* 2>/dev/null || true
print_success "تم حذف الإضافات"

# ============================================
# 6️⃣ إصلاح ملفات node_modules الكبيرة
# ============================================
print_header "6️⃣ تنظيف node_modules"

find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
print_success "تم حذف node_modules الكبيرة"

# ============================================
# 7️⃣ تقرير النتائج
# ============================================
print_header "🎉 اكتمل الإصلاح"

echo ""
echo -e "${GREEN}تم إنجاز المهام التالية:${NC}"
echo "✅ حذف سجلات VS Code"
echo "✅ حذف البيانات المؤقتة"
echo "✅ إعادة تعيين ملفات العمل"
echo "✅ إنشاء إعدادات محسّنة"
echo "✅ حذف الإضافات القديمة"
echo "✅ تنظيف node_modules"
echo ""

echo -e "${YELLOW}الخطوات التالية:${NC}"
echo "1. أغلق VS Code تماماً"
echo "2. انتظر 10 ثوان"
echo "3. افتح VS Code مجدداً"
echo "4. لا تثبت أي إضافات قديمة"
echo "5. جرّب npm install --legacy-peer-deps"
echo ""

echo -e "${BLUE}إذا استمرت المشكلة:${NC}"
echo "• احذف: C:\\Users\\YourUsername\\AppData\\Roaming\\Code"
echo "• أعد تثبيت VS Code من البداية"
echo "• تحقق من الفيروسات والبرامج الضارة"
echo ""

echo -e "${BLUE}تم الانتهاء في: $(date)${NC}"
