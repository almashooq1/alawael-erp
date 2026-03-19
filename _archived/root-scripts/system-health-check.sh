#!/bin/bash
# System Health Check and Verification Script
# فحص شامل وسريع لصحة النظام

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     بحث شامل وفحص صحة نظام ERP - System Audit        ║"
echo "║     24 فبراير 2026 - February 24, 2026               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
BACKEND_DIR="erp_new_system/backend"
FRONTEND_DIR="supply-chain-management/frontend"
AGENT_DIR="intelligent-agent/backend"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}1️⃣  فحص المتطلبات الأساسية${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check Node version
echo -n "✓ Node.js: "
if command -v node &> /dev/null; then
    echo -e "${GREEN}$(node -v)${NC}"
else
    echo -e "${RED}NOT FOUND${NC}"
fi

# Check npm
echo -n "✓ npm: "
if command -v npm &> /dev/null; then
    echo -e "${GREEN}$(npm -v)${NC}"
else
    echo -e "${RED}NOT FOUND${NC}"
fi

# Check MongoDB
echo -n "✓ MongoDB: "
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}installed${NC}"
else
    echo -e "${YELLOW}NOT INSTALLED (using Mock DB)${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}2️⃣  فحص ملفات المشروع${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check backend directory
echo -n "✓ Backend directory: "
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${GREEN}found${NC}"
    echo "  ├─ Checking package.json..."
    if [ -f "$BACKEND_DIR/package.json" ]; then
        echo "  │  ${GREEN}✓ package.json found${NC}"
    fi
    echo "  ├─ Checking app.js..."
    if [ -f "$BACKEND_DIR/app.js" ]; then
        echo "  │  ${GREEN}✓ app.js found${NC}"
    fi
    echo "  ├─ Checking server.js..."
    if [ -f "$BACKEND_DIR/server.js" ]; then
        echo "  │  ${GREEN}✓ server.js found${NC}"
    fi
    echo "  └─ Checking .env..."
    if [ -f "$BACKEND_DIR/.env" ]; then
        echo "     ${GREEN}✓ .env found${NC}"
    else
        echo "     ${RED}⚠ .env NOT found${NC}"
    fi
else
    echo -e "${RED}NOT FOUND${NC}"
fi

echo ""

# Check frontend directory
echo -n "✓ Frontend directory: "
if [ -d "$FRONTEND_DIR" ]; then
    echo -e "${GREEN}found${NC}"
else
    echo -e "${YELLOW}NOT FOUND${NC}"
fi

echo ""

# Check agent directory
echo -n "✓ Intelligent Agent directory: "
if [ -d "$AGENT_DIR" ]; then
    echo -e "${GREEN}found${NC}"
else
    echo -e "${YELLOW}NOT FOUND${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}3️⃣  فحص Dependencies${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

cd "$BACKEND_DIR"

echo "Checking backend dependencies..."
echo -n "  ├─ express: "
if grep -q '"express"' package.json; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  ├─ mongoose: "
if grep -q '"mongoose"' package.json; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  ├─ dotenv: "
if grep -q '"dotenv"' package.json; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  └─ cors: "
if grep -q '"cors"' package.json; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

cd - > /dev/null

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}4️⃣  فحص ملفات الإعدادات${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo "Database configs:"
echo -n "  ├─ config/database.js: "
if [ -f "$BACKEND_DIR/config/database.js" ]; then
    if grep -q "USE_MOCK_DB\|MONGODB_URI" "$BACKEND_DIR/config/database.js"; then
        echo -e "${GREEN}✓ (properly configured)${NC}"
    else
        echo -e "${YELLOW}⚠ (needs review)${NC}"
    fi
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  └─ config/production.js: "
if [ -f "$BACKEND_DIR/config/production.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}5️⃣  Quick Start Instructions${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📋 للبدء مع النظام:${NC}"
echo ""
echo "1. تثبيت المتطلبات:"
echo "   cd $BACKEND_DIR"
echo "   npm install"
echo ""
echo "2. التحقق من .env (تأكد من USE_MOCK_DB=true للتطوير):"
echo "   cat .env | grep -E 'MONGODB|USE_MOCK|NODE_ENV'"
echo ""
echo "3. بدء الخادم:"
echo "   npm start"
echo ""
echo "4. الاختبار (في نافذة أخرى):"
echo "   curl http://localhost:3000/api/cache-stats"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ الفحص الشامل اكتمل بنجاح${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
