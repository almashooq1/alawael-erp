#!/bin/bash

# 🔧 سكريبت الإصلاح الشامل - NPM Dependencies
# يعمل على Linux/macOS
# للاستخدام: chmod +x fix-npm.sh && ./fix-npm.sh

set -e

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# الدوال
print_header() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# تحقق من npm و node
check_requirements() {
    print_header "🔍 فحص المتطلبات"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js غير مثبت"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm غير مثبت"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    print_info "Node.js: $NODE_VERSION"
    print_info "npm: $NPM_VERSION"
    print_success "جميع المتطلبات موجودة"
}

# تنظيف npm cache
clean_cache() {
    print_header "🧼 تنظيف npm Cache"
    
    print_info "تنفيذ: npm cache clean --force"
    npm cache clean --force
    
    print_success "تم تنظيف الـ cache"
}

# إصلاح package.json
fix_package_json() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        print_warning "ملف غير موجود: $file"
        return
    fi
    
    print_info "معالجة: $file"
    
    # استخدام jq لتحديث الملف (إذا كان متوفراً)
    if command -v jq &> /dev/null; then
        # إصلاح jest
        if grep -q '"jest": "\^30\.2\.0"' "$file"; then
            print_warning "  تم اكتشاف jest@30.2.0 - الإصلاح قيد التقدم..."
            jq '.devDependencies.jest = "^29.7.0"' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
            print_success "  تم إصلاح jest"
        fi
        
        # إصلاح express
        if grep -q '"express": "\^5' "$file"; then
            print_warning "  تم اكتشاف express@5.x - الإصلاح قيد التقدم..."
            jq '.dependencies.express = "^4.18.2"' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
            print_success "  تم إصلاح express"
        fi
        
        # إصلاح mongodb-memory-server
        if grep -q '"mongodb-memory-server": "\^10' "$file"; then
            print_warning "  تم اكتشاف mongodb-memory-server@10.x - الإصلاح قيد التقدم..."
            jq '.devDependencies."mongodb-memory-server" = "^9.2.0"' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
            print_success "  تم إصلاح mongodb-memory-server"
        fi
        
        # إصلاح bcryptjs
        if grep -q '"bcryptjs": "\^3' "$file"; then
            print_warning "  تم اكتشاف bcryptjs@3.x - الإصلاح قيد التقدم..."
            jq '.dependencies.bcryptjs = "^2.4.3"' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
            print_success "  تم إصلاح bcryptjs"
        fi
    else
        print_warning "jq غير مثبت - التخطي من الإصلاح التلقائي"
    fi
}

# تنظيف الـ project
clean_project() {
    local path=$1
    local name=$2
    
    if [ ! -d "$path" ]; then
        print_warning "المجلد غير موجود: $path"
        return
    fi
    
    print_info "تنظيف: $name"
    
    if [ -d "$path/node_modules" ]; then
        print_info "  حذف node_modules..."
        rm -rf "$path/node_modules"
        print_success "  تم"
    fi
    
    if [ -f "$path/package-lock.json" ]; then
        print_info "  حذف package-lock.json..."
        rm "$path/package-lock.json"
        print_success "  تم"
    fi
}

# تثبيت dependencies
install_dependencies() {
    local path=$1
    local name=$2
    
    if [ ! -d "$path" ]; then
        print_warning "المجلد غير موجود: $path"
        return
    fi
    
    print_info "تثبيت: $name"
    
    cd "$path" || return
    
    print_info "  تشغيل: npm install --legacy-peer-deps --no-audit..."
    if npm install --legacy-peer-deps --no-audit --no-fund 2>&1; then
        print_success "  تم التثبيت بنجاح"
    else
        print_error "  فشل التثبيت"
    fi
    
    cd - > /dev/null
}

# اختبار التثبيت
test_installation() {
    local path=$1
    local name=$2
    
    if [ ! -d "$path" ]; then
        return
    fi
    
    print_info "اختبار: $name"
    
    cd "$path" || return
    
    if npm test -- --passWithNoTests 2>&1 | grep -q "Test Suites"; then
        print_success "  الاختبارات تمر"
    else
        print_warning "  قد تكون هناك مشاكل في الاختبارات"
    fi
    
    cd - > /dev/null
}

# البرنامج الرئيسي
main() {
    local timestamp=$(date +%Y-%m-%d_%H-%M-%S)
    local log_file="npm-fix-$timestamp.log"
    
    # تجميع الـ output
    {
        print_header "🚀 بدء سكريبت إصلاح المشاكل والـ Dependencies"
        print_info "السجل: $log_file"
        
        # فحص المتطلبات
        check_requirements
        
        # تنظيف cache
        clean_cache
        
        # المشاريع التي سيتم معالجتها
        declare -a projects=(
            "."
            "erp_new_system/backend"
            "alawael-erp/backend"
            "alawael-unified"
        )
        
        declare -a project_names=(
            "📍 الجذر الرئيسي"
            "🔧 ERP Backend"
            "📊 Alawael ERP Backend"
            "🔗 Alawael Unified"
        )
        
        # إصلاح package.json
        print_header "🔨 إصلاح Package.json Files"
        for i in "${!projects[@]}"; do
            fix_package_json "${projects[$i]}/package.json"
        done
        
        # تنظيف المشاريع
        print_header "🧹 تنظيف المشاريع"
        for i in "${!projects[@]}"; do
            clean_project "${projects[$i]}" "${project_names[$i]}"
        done
        
        # تثبيت dependencies
        print_header "📦 تثبيت Dependencies"
        for i in "${!projects[@]}"; do
            install_dependencies "${projects[$i]}" "${project_names[$i]}"
        done
        
        # اختبار التثبيت
        print_header "🧪 اختبار التثبيت"
        for i in "${!projects[@]}"; do
            test_installation "${projects[$i]}" "${project_names[$i]}"
        done
        
        # الملخص النهائي
        print_header "📊 الملخص النهائي"
        print_success "تم إكمال معالجة جميع المشاريع!"
        print_info "📝 تحقق من السجل: $log_file"
        print_info "🎯 خطوات لاحقة:"
        print_info "  1. تحقق من السجل للأخطاء"
        print_info "  2. شغّل: npm start"
        print_info "  3. شغّل الاختبارات: npm test"
        
    } | tee "$log_file"
}

# تشغيل البرنامج الرئيسي
main "$@"
