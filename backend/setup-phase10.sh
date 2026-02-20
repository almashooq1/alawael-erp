#!/bin/bash

# Phase 10 Setup and Testing Script
# This script sets up all optimization features and runs tests

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}"
echo "════════════════════════════════════════════"
echo "   Phase 10: Optimization & Advanced Features"
echo "════════════════════════════════════════════"
echo -e "${NC}"

# 1. Check if in backend directory
if [ ! -f "package.json" ]; then
    echo -e "${COLOR_RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the backend directory"
    exit 1
fi

# 2. Install dependencies
echo -e "\n${COLOR_BLUE}📦 Installing dependencies...${NC}"
npm install redis compression helmet

if [ $? -ne 0 ]; then
    echo -e "${COLOR_RED}❌ npm install failed${NC}"
    exit 1
fi

echo -e "${COLOR_GREEN}✅ Dependencies installed${NC}"

# 3. Check if Redis is running
echo -e "\n${COLOR_BLUE}🔍 Checking Redis...${NC}"

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${COLOR_GREEN}✅ Redis is running${NC}"
    else
        echo -e "${COLOR_YELLOW}⚠️  Redis not running${NC}"
        echo "   Start Redis with: redis-server"
    fi
else
    echo -e "${COLOR_YELLOW}⚠️  Redis CLI not found${NC}"
    echo "   Some features require Redis"
fi

# 4. Check if backend server is running
echo -e "\n${COLOR_BLUE}🔍 Checking backend server...${NC}"

if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    echo -e "${COLOR_GREEN}✅ Backend server is running${NC}"
else
    echo -e "${COLOR_YELLOW}⚠️  Backend server not running${NC}"
    echo "   Start with: npm run dev"
fi

# 5. Show available commands
echo -e "\n${COLOR_BLUE}════════════════════════════════════════════${NC}"
echo -e "${COLOR_BLUE}Available Commands:${NC}"
echo -e "${COLOR_BLUE}════════════════════════════════════════════${NC}"

echo "Development:"
echo "  npm run dev        - Start with hot reload"
echo "  npm start          - Start production"
echo ""

echo "Testing:"
echo "  npm run test       - Run Jest tests"
echo "  npm run test:api   - Run API tests"
echo "  npm run test:system - Run system tests (Phase 10)"
echo ""

echo "Code Quality:"
echo "  npm run lint       - Run ESLint"
echo "  npm run format     - Format code with Prettier"
echo ""

echo "Database:"
echo "  npm run seed       - Seed database"
echo ""

# 6. Ask to run tests
echo -e "\n${COLOR_BLUE}════════════════════════════════════════════${NC}"
read -p "Do you want to run system tests now? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${COLOR_BLUE}🧪 Running Phase 10 system tests...${NC}\n"
    npm run test:system
else
    echo -e "\n${COLOR_GREEN}✅ Setup complete!${NC}"
    echo -e "To run system tests later: ${COLOR_YELLOW}npm run test:system${NC}"
fi

echo -e "\n${COLOR_GREEN}════════════════════════════════════════════${NC}"
echo -e "${COLOR_GREEN}Phase 10 Setup Complete!${NC}"
echo -e "${COLOR_GREEN}════════════════════════════════════════════${NC}\n"
