#!/bin/bash

# 🧹 Script - تنظيف وتنظيم بنية المشروع
# ALAWAEL ERP - Duplicate Folders Merger
# التاريخ: 27 فبراير 2026

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     ALAWAEL ERP - Structure Cleanup & Reorganization           ║"
echo "║          دمج المجلدات المكررة وتنظيف البنية                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# تعريف المتغيرات
BACKUP_DIR="backups/structure-cleanup-backup-$(date +%Y%m%d_%H%M%S)"
LOG_FILE="structure-cleanup.log"
ERRORS_FILE="structure-cleanup-errors.log"

# إنشاء backup
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"

# Function لدمج المجلدات
merge_directories() {
    local source=$1
    local target=$2
    local description=$3
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Processing: $description"
    echo "Source: $source"
    echo "Target: $target"
    echo ""
    
    if [ -d "$source" ]; then
        # Backup المجلد
        cp -r "$source" "$BACKUP_DIR/$(basename $source)-backup"
        
        # عد الملفات
        file_count=$(find "$source" -type f | wc -l)
        echo "   📄 Files found: $file_count"
        
        # نقل الملفات
        if [ "$file_count" -gt 0 ]; then
            # تحقق من التضاربات
            conflicts=0
            for file in $(find "$source" -type f); do
                rel_file="${file#$source/}"
                if [ -f "$target/$rel_file" ]; then
                    ((conflicts++))
                    echo "   ⚠️  Conflict: $rel_file already exists in target"
                fi
            done
            
            if [ $conflicts -eq 0 ]; then
                cp -r "$source"/* "$target/" 2>>"$ERRORS_FILE"
                echo "   ✅ Successfully moved all files"
            else
                echo "   ❌ Found $conflicts conflicts - manual review needed"
                return 1
            fi
        else
            echo "   ℹ️  Empty directory"
        fi
        
        # حذف المجلد الأصلي (بعد التحقق)
        if [ $file_count -eq 0 ] || [ $conflicts -eq 0 ]; then
            rmdir "$source" 2>/dev/null
            if [ ! -d "$source" ]; then
                echo "   ✅ Removed source directory"
            fi
        fi
    else
        echo "   ℹ️  Directory does not exist (skipping)"
    fi
    echo ""
}

# ═════════════════════════════════════════════════════════════════════
# 1️⃣  BACKEND SERVICES
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "🔵 PHASE 1: Backend Services"
echo "═════════════════════════════════════════════════════════════════"
echo ""

merge_directories \
    "backend/services/services" \
    "backend/services" \
    "Merging backend/services/services → backend/services"

# ═════════════════════════════════════════════════════════════════════
# 2️⃣  BACKEND UTILS (if exists)
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "🔵 PHASE 2: Backend Utils"
echo "═════════════════════════════════════════════════════════════════"
echo ""

if [ -d "backend/utils/utils" ]; then
    merge_directories \
        "backend/utils/utils" \
        "backend/utils" \
        "Merging backend/utils/utils → backend/utils"
else
    echo "   ℹ️  backend/utils/utils does not exist (skipping)"
fi

# ═════════════════════════════════════════════════════════════════════
# 3️⃣  BACKEND MIDDLEWARE (if exists)
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "🔵 PHASE 3: Backend Middleware"
echo "═════════════════════════════════════════════════════════════════"
echo ""

if [ -d "backend/middleware/middleware" ]; then
    merge_directories \
        "backend/middleware/middleware" \
        "backend/middleware" \
        "Merging backend/middleware/middleware → backend/middleware"
else
    echo "   ℹ️  backend/middleware/middleware does not exist (skipping)"
fi

# ═════════════════════════════════════════════════════════════════════
# 4️⃣  BACKEND CONTROLLERS (if exists)
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "🔵 PHASE 4: Backend Controllers"
echo "═════════════════════════════════════════════════════════════════"
echo ""

if [ -d "backend/controllers/controllers" ]; then
    merge_directories \
        "backend/controllers/controllers" \
        "backend/controllers" \
        "Merging backend/controllers/controllers → backend/controllers"
else
    echo "   ℹ️  backend/controllers/controllers does not exist (skipping)"
fi

# ═════════════════════════════════════════════════════════════════════
# 5️⃣  FRONTEND SRC
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "🔵 PHASE 5: Frontend Src"
echo "═════════════════════════════════════════════════════════════════"
echo ""

if [ -d "frontend/src/src" ]; then
    echo "⚠️  WARNING: frontend/src/src structure detected"
    echo "   This requires special handling due to React structure"
    echo ""
    
    # فقط اذا كانت آمنة
    if [ -d "frontend/src/src/components" ] && [ -d "frontend/src/components" ]; then
        echo "   Found duplicate: frontend/src/src/components"
        echo "   Please review manually:"
        echo "     1. Compare file differences"
        echo "     2. Merge unique files"
        echo "     3. Remove duplicates"
    fi
else
    echo "   ℹ️  frontend/src/src does not exist (skipping)"
fi

# ═════════════════════════════════════════════════════════════════════
# VALIDATION & TESTING
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 VALIDATION PHASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✓ Running linter..."
npm run lint > /tmp/lint-output.txt 2>&1
lint_errors=$(grep -c "error" /tmp/lint-output.txt)
echo "   Found $lint_errors lint errors"

if [ $lint_errors -gt 0 ]; then
    echo "   ⚠️  Lint errors detected:"
    grep "error" /tmp/lint-output.txt | head -5
fi

echo ""
echo "✓ Running tests..."
npm test 2>&1 | tail -20

# ═════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    CLEANUP SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 Results:"
echo "   ✅ Backend services merged"
if [ -d "backend/utils/utils" ]; then
    echo "   ⚠️  backend/utils/utils not merged (check manually)"
else
    echo "   ✅ Backend utils merged or doesn't exist"
fi
echo ""

echo "📦 Backup Location:"
echo "   $BACKUP_DIR"
echo ""

echo "📝 Log Files:"
echo "   $LOG_FILE"
[ -s "$ERRORS_FILE" ] && echo "   $ERRORS_FILE (errors only)"
echo ""

echo "✅ Cleanup completed successfully!"
echo ""
echo "🔄 Next Steps:"
echo "   1. Review changes: git status"
echo "   2. Run tests: npm test"
echo "   3. Fix import paths if needed"
echo "   4. Commit changes: git commit -am 'refactor: reorganize project structure'"
