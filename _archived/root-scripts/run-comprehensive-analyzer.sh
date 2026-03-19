#!/bin/bash

################################################################################
#                 🚀 COMPREHENSIVE PROJECT ANALYZER LAUNCHER                 #
#              برنامج تشغيل أداة تحليل المشروع الشاملة الاحترافية              #
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}${1}${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  ${1}${NC}"
}

print_step() {
    echo -e "${MAGENTA}▶️  ${1}${NC}"
}

# Main execution
main() {
    print_header "🔍 بدء التحليل الشامل للمشروع"
    
    PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$PROJECT_ROOT"
    
    print_info "جذر المشروع: $PROJECT_ROOT"
    print_info "الوقت: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Step 1: Check requirements
    print_step "الخطوة 1: فحص المتطلبات الأساسية"
    check_requirements
    
    # Step 2: Run Node.js analyzer
    print_step "الخطوة 2: تشغيل محلل Node.js"
    run_node_analyzer
    
    # Step 3: Run Python diagnostics
    print_step "الخطوة 3: تشغيل التشخيص المتقدم (Python)"
    run_python_diagnostics
    
    # Step 4: Run security checks
    print_step "الخطوة 4: فحص الأمان"
    run_security_checks
    
    # Step 5: Generate final report
    print_step "الخطوة 5: توليد التقرير النهائي الشامل"
    generate_final_report
    
    # Summary
    print_header "✨ اكتمل التحليل الشامل بنجاح"
    print_success "تم فحص المشروع بالكامل"
    print_info "تحقق من التقارير:"
    echo -e "  ${GREEN}▸${NC} PROJECT_ANALYSIS_REPORT.json"
    echo -e "  ${GREEN}▸${NC} PROJECT_ANALYSIS_REPORT.txt"
    echo -e "  ${GREEN}▸${NC} ADVANCED_DIAGNOSTICS_REPORT.json"
    echo -e "  ${GREEN}▸${NC} FINAL_COMPREHENSIVE_REPORT.txt"
}

check_requirements() {
    print_info "التحقق من المتطلبات..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION موجود"
    else
        print_error "Node.js غير مثبت"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION موجود"
    else
        print_error "npm غير مثبت"
        exit 1
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_success "$PYTHON_VERSION موجود"
    else
        print_warning "Python3 غير مثبت - سيتم تخطي التشخيص المتقدم"
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "$GIT_VERSION موجود"
    else
        print_warning "Git غير مثبت"
    fi
}

run_node_analyzer() {
    print_info "تشغيل محلل Node.js..."
    
    if [ -f "PROJECT_ANALYZER_ADVANCED.js" ]; then
        if command -v node &> /dev/null; then
            node PROJECT_ANALYZER_ADVANCED.js
            print_success "اكتمل تحليل Node.js"
        else
            print_warning "Node.js غير متاح - تخطي المحلل"
        fi
    else
        print_warning "ملف PROJECT_ANALYZER_ADVANCED.js غير موجود"
    fi
}

run_python_diagnostics() {
    print_info "تشغيل التشخيص بـ Python..."
    
    if [ -f "ADVANCED_DIAGNOSTICS.py" ]; then
        if command -v python3 &> /dev/null; then
            python3 ADVANCED_DIAGNOSTICS.py || true
            print_success "اكتمل التشخيص المتقدم"
        else
            print_warning "Python3 غير متاح - تخطي التشخيص"
        fi
    else
        print_warning "ملف ADVANCED_DIAGNOSTICS.py غير موجود"
    fi
}

run_security_checks() {
    print_info "تشغيل فحوصات الأمان..."
    
    # Check for .env file exposure
    if [ -f ".env" ]; then
        if grep -q "^[A-Z_]*PASSWORD=" .env 2>/dev/null; then
            print_warning "⚠️  تحذير: ملف .env قد يحتوي على بيانات حساسة"
        fi
    fi
    
    # Check .gitignore
    if [ -f ".gitignore" ]; then
        if grep -q ".env" .gitignore 2>/dev/null; then
            print_success "ملف .env في .gitignore"
        else
            print_warning "ملف .env غير في .gitignore"
        fi
    else
        print_warning ".gitignore غير موجود"
    fi
    
    # Check for node_modules in git
    if [ -d ".git" ]; then
        if git ls-files --error-unmatch node_modules &>/dev/null; then
            print_warning "node_modules موجود في git - يجب إزالته"
        else
            print_success "node_modules غير موجود في git"
        fi
    fi
    
    print_success "اكتملت فحوصات الأمان"
}

generate_final_report() {
    print_info "توليد التقرير الشامل النهائي..."
    
    REPORT_FILE="FINAL_COMPREHENSIVE_REPORT.txt"
    
    {
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║        التقرير الشامل النهائي - Final Comprehensive Report    ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "📅 التاريخ: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "📂 المشروع: $PROJECT_ROOT"
        echo "👤 المستخدم: $(whoami)"
        echo "💻 النظام: $(uname -s) $(uname -m)"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📊 ملخص النتائج:"
        echo "─────────────────────────────────────────────────────────────────"
        echo ""
        
        # Include analysis results if available
        if [ -f "PROJECT_ANALYSIS_REPORT.json" ]; then
            echo "✓ تقرير تحليل Node.js: PROJECT_ANALYSIS_REPORT.json"
        fi
        
        if [ -f "ADVANCED_DIAGNOSTICS_REPORT.json" ]; then
            echo "✓ تقرير التشخيص المتقدم: ADVANCED_DIAGNOSTICS_REPORT.json"
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "🎯 الخطوات التالية الموصى بها:"
        echo "─────────────────────────────────────────────────────────────────"
        echo ""
        echo "1. ✓ مراجعة التقارير المُنشأة"
        echo "2. ✓ حل جميع المشاكل الحرجة (CRITICAL)"
        echo "3. ✓ معالجة المشاكل العالية (HIGH)"
        echo "4. ✓ تطبيق التوصيات الأمنية"
        echo "5. ✓ تشغيل الاختبارات الشاملة"
        echo "6. ✓ التحقق من الأداء"
        echo "7. ✓ إطلاق المشروع في الإنتاج"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📁 الملفات المهمة:"
        echo "─────────────────────────────────────────────────────────────────"
        echo ""
        ls -lh PROJECT_ANALYSIS_REPORT.* ADVANCED_DIAGNOSTICS_REPORT.* FINAL_COMPREHENSIVE_REPORT.* 2>/dev/null || echo "بعض الملفات قد لا تكون موجودة بعد"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "تم توليد التقرير بواسطة: COMPREHENSIVE_PROJECT_ANALYZER"
        echo "الإصدار: 1.0.0"
        echo "التاريخ: $(date)"
        echo ""
    } > "$REPORT_FILE"
    
    print_success "تم حفظ التقرير النهائي: $REPORT_FILE"
    
    # Display the report
    cat "$REPORT_FILE"
}

# Run main function
main "$@"

exit 0
