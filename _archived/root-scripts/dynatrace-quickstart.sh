#!/bin/bash

# 🔍 Dynatrace OneAgent Quick Start Script
# ==========================================
# ملف سريع لتشغيل التطبيقات مع Dynatrace

echo "🔍 ================================"
echo "   DYNATRACE QUICK START"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure .env exists
echo -e "${BLUE}📝 Checking .env file...${NC}"
if [ ! -f erp_new_system/backend/.env ]; then
    echo -e "${YELLOW}⚠️  Creating .env file...${NC}"
    cp erp_new_system/backend/.env.example erp_new_system/backend/.env
    echo -e "${GREEN}✅ .env created${NC}"
else
    echo -e "${GREEN}✅ .env exists${NC}"
fi

# Check Dynatrace Service
echo -e "\n${BLUE}🔍 Checking Dynatrace Service...${NC}"
if powershell -Command "Get-Service | Where-Object {\\$_.Name -like '*Dynatrace*'}" &>/dev/null; then
    echo -e "${GREEN}✅ Dynatrace OneAgent is running${NC}"
else
    echo -e "${YELLOW}⚠️  Dynatrace OneAgent not found${NC}"
fi

# Validate Installation
echo -e "\n${BLUE}🧪 Running Dynatrace Validation...${NC}"
cd erp_new_system/backend
node dynatrace-validation.js
VALIDATION_RESULT=$?
cd ../..

if [ $VALIDATION_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}✅ VALIDATION PASSED${NC}"
else
    echo -e "\n${YELLOW}⚠️  VALIDATION FAILED - Check logs${NC}"
fi

# Option to start Backend
echo -e "\n${BLUE}🚀 Start Backend?${NC}"
read -p "Start Backend (y/n)? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Starting Backend...${NC}"
    cd erp_new_system/backend
    npm start
fi
