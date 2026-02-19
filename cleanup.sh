#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== نظام تحسين وتنظيف المشروع ===${NC}\n"

# 1. Clean cache
echo -e "${YELLOW}تنظيف الـ cache...${NC}"
npm cache clean --force 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
echo -e "${GREEN}✓ تم تنظيف الـ cache${NC}\n"

# 2. Remove old logs
echo -e "${YELLOW}حذف الملفات المؤقتة...${NC}"
find . -name "*.log" -type f -delete 2>/dev/null
find . -name "*test*.txt" -type f -delete 2>/dev/null
find . -name "debug.log" -type f -delete 2>/dev/null
echo -e "${GREEN}✓ تم حذف الملفات المؤقتة${NC}\n"

# 3. Install dependencies
echo -e "${YELLOW}تثبيت المكتبات...${NC}"
npm install 2>&1 | tail -5
echo -e "${GREEN}✓ تم تثبيت المكتبات${NC}\n"

# 4. Run linter
echo -e "${YELLOW}فحص الأكواد...${NC}"
npm run lint 2>&1 | tail -5
echo -e "${GREEN}✓ تم الفحص${NC}\n"

# 5. Format code
echo -e "${YELLOW}تنسيق الأكواد...${NC}"
npm run format 2>&1 | tail -3
echo -e "${GREEN}✓ تم التنسيق${NC}\n"

echo -e "${GREEN}=== تم إنهاء عملية التحسين بنجاح ===${NC}"
