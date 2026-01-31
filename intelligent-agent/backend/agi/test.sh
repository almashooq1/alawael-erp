#!/bin/bash

# 🧪 Test Scripts for Rehab AGI System
# اختبر جميع ميزات النظام

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🏥 Rehab AGI - Test Suite${NC}"
echo "================================"
echo ""

# Test 1: Unit Tests
echo -e "${BLUE}📋 Test 1: Running Unit Tests...${NC}"
if npm test -- --passWithNoTests; then
  echo -e "${GREEN}✓ Unit Tests Passed${NC}"
else
  echo -e "${RED}✗ Unit Tests Failed${NC}"
  exit 1
fi

echo ""

# Test 2: Build
echo -e "${BLUE}📋 Test 2: Building Project...${NC}"
if npm run build; then
  echo -e "${GREEN}✓ Build Successful${NC}"
else
  echo -e "${RED}✗ Build Failed${NC}"
  exit 1
fi

echo ""

# Test 3: Linting
echo -e "${BLUE}📋 Test 3: Running Linter...${NC}"
if npm run lint 2>/dev/null; then
  echo -e "${GREEN}✓ Lint Check Passed${NC}"
else
  echo -e "${YELLOW}⚠ Some Lint Warnings${NC}"
fi

echo ""

# Test 4: API Health Check (if server is running)
echo -e "${BLUE}📋 Test 4: Checking API Health...${NC}"
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ API is Running${NC}"
else
  echo -e "${YELLOW}⚠ API is Not Running (start with 'npm start' or 'docker-compose up')${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Test Suite Complete!${NC}"
echo -e "${GREEN}================================${NC}"
