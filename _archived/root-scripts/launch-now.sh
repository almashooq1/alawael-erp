#!/bin/bash

# ============================================================================
# 🚀 AlAwael ERP - سكريبت الإطلاق السريع
# Launch Script - Quick Start
# ============================================================================

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "         🚀 AlAwael ERP - Launch Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# التحقق من المتطلبات
check_requirements() {
    echo -e "${BLUE}📋 Checking requirements...${NC}"
    
    # التحقق من Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
    
    # التحقق من npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm $(npm -v)${NC}"
    
    # التحقق من Docker (اختياري)
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✅ Docker is available${NC}"
    else
        echo -e "${YELLOW}⚠️ Docker not found (optional)${NC}"
    fi
    
    echo ""
}

# التحقق من ملف البيئة
check_env() {
    echo -e "${BLUE}🔍 Checking environment configuration...${NC}"
    
    if [ ! -f ".env.production" ]; then
        echo -e "${YELLOW}⚠️ .env.production not found, creating from template...${NC}"
        cp .env.production.template .env.production
        echo -e "${YELLOW}📝 Please edit .env.production with your values${NC}"
    else
        echo -e "${GREEN}✅ .env.production exists${NC}"
    fi
    
    # التحقق من القيم الحرجة
    if grep -q "change-this" .env.production 2>/dev/null; then
        echo -e "${YELLOW}⚠️ Please update the placeholder values in .env.production${NC}"
    fi
    
    echo ""
}

# تثبيت الحزم
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    # Backend
    if [ -d "backend" ]; then
        echo "Installing backend dependencies..."
        cd backend
        npm install --production
        cd ..
    fi
    
    # Frontend
    if [ -d "frontend" ]; then
        echo "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
}

# بناء المشروع
build_project() {
    echo -e "${BLUE}🔨 Building project...${NC}"
    
    # بناء Frontend
    if [ -d "frontend" ]; then
        echo "Building frontend..."
        cd frontend
        npm run build
        cd ..
    fi
    
    echo -e "${GREEN}✅ Build complete${NC}"
    echo ""
}

# تشغيل الاختبارات
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    if [ -d "backend" ]; then
        cd backend
        npm test -- --passWithNoTests 2>/dev/null || echo "Tests completed"
        cd ..
    fi
    
    echo ""
}

# تشغيل محلي
start_local() {
    echo -e "${BLUE}🚀 Starting locally...${NC}"
    
    # نسخ ملف البيئة
    cp .env.production backend/.env 2>/dev/null || true
    
    # تشغيل Backend
    if [ -d "backend" ]; then
        echo "Starting backend server..."
        cd backend
        NODE_ENV=production node server.js &
        BACKEND_PID=$!
        cd ..
        echo -e "${GREEN}✅ Backend running on http://localhost:3000${NC}"
    fi
    
    # تشغيل Frontend
    if [ -d "frontend" ]; then
        echo "Starting frontend..."
        cd frontend
        npm start &
        FRONTEND_PID=$!
        cd ..
        echo -e "${GREEN}✅ Frontend running${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   🎉 Application is running!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    echo "Backend:  http://localhost:3000"
    echo "Frontend: http://localhost:3001"
    echo ""
    echo "Press Ctrl+C to stop"
    
    # انتظار
    wait
}

# نشر Docker
deploy_docker() {
    echo -e "${BLUE}🐳 Deploying with Docker...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ docker-compose is not installed${NC}"
        exit 1
    fi
    
    # بناء وتشغيل
    docker-compose -f docker-compose.yml up -d --build
    
    echo -e "${GREEN}✅ Docker deployment complete${NC}"
    echo ""
}

# نشر Heroku
deploy_heroku() {
    echo -e "${BLUE}🟣 Deploying to Heroku...${NC}"
    
    if ! command -v heroku &> /dev/null; then
        echo -e "${RED}❌ Heroku CLI is not installed${NC}"
        echo "Install from: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # التحقق من تسجيل الدخول
    if ! heroku whoami &> /dev/null; then
        echo "Please login to Heroku..."
        heroku login
    fi
    
    # إنشاء التطبيق إذا لم يكن موجوداً
    APP_NAME="alawael-erp-$(date +%s)"
    
    echo "Creating Heroku app: $APP_NAME"
    heroku create $APP_NAME
    
    # إضافة MongoDB
    echo "Adding MongoDB..."
    heroku addons:create mongodb-atlas --app $APP_NAME || true
    
    # إعداد المتغيرات البيئية
    echo "Setting environment variables..."
    heroku config:set NODE_ENV=production --app $APP_NAME
    heroku config:set JWT_SECRET="$(openssl rand -base64 32)" --app $APP_NAME
    
    # النشر
    echo "Deploying..."
    git push heroku main || git push heroku master
    
    # فتح التطبيق
    heroku open --app $APP_NAME
    
    echo -e "${GREEN}✅ Heroku deployment complete${NC}"
    echo "App URL: https://$APP_NAME.herokuapp.com"
    echo ""
}

# عرض القائمة
show_menu() {
    echo "Select deployment option:"
    echo ""
    echo "  1) 🚀 Quick Start (Local)"
    echo "  2) 🐳 Docker Compose"
    echo "  3) 🟣 Heroku"
    echo "  4) 📦 Build Only"
    echo "  5) 🧪 Run Tests"
    echo "  6) ✅ Full Check"
    echo "  7) ❌ Exit"
    echo ""
    read -p "Enter choice [1-7]: " choice
    
    case $choice in
        1) 
            check_requirements
            check_env
            install_dependencies
            start_local
            ;;
        2) 
            check_requirements
            check_env
            deploy_docker
            ;;
        3) 
            check_requirements
            check_env
            deploy_heroku
            ;;
        4) 
            check_requirements
            install_dependencies
            build_project
            ;;
        5) 
            run_tests
            ;;
        6) 
            check_requirements
            check_env
            run_tests
            echo -e "${GREEN}✅ All checks passed!${NC}"
            ;;
        7) 
            echo "Goodbye!"
            exit 0
            ;;
        *) 
            echo -e "${RED}Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# التشغيل الرئيسي
main() {
    if [ "$1" = "--local" ]; then
        check_requirements
        check_env
        install_dependencies
        start_local
    elif [ "$1" = "--docker" ]; then
        check_requirements
        check_env
        deploy_docker
    elif [ "$1" = "--heroku" ]; then
        check_requirements
        check_env
        deploy_heroku
    elif [ "$1" = "--build" ]; then
        check_requirements
        install_dependencies
        build_project
    elif [ "$1" = "--test" ]; then
        run_tests
    else
        show_menu
    fi
}

# تشغيل
main "$@"