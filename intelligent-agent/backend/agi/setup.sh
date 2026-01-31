#!/bin/bash

# 🚀 Rehab AGI System - Development Setup Script

set -e

echo "🏥 Rehab AGI System - Development Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}📍 Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Check npm
echo -e "${BLUE}📍 Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"

# Navigate to AGI directory
echo ""
echo -e "${BLUE}📍 Navigating to AGI directory...${NC}"
cd "intelligent-agent/backend/agi" || exit 1
echo -e "${GREEN}✓ In AGI directory${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}📍 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build the project
echo ""
echo -e "${BLUE}📍 Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Project built${NC}"

# Run tests
echo ""
echo -e "${BLUE}📍 Running tests...${NC}"
if npm test -- --passWithNoTests; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some tests may have issues${NC}"
fi

# Display configuration info
echo ""
echo -e "${GREEN}=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Copy .env.example to .env and configure:"
echo "   cp .env.example .env"
echo "   nano .env"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Or start the production server:"
echo "   npm start"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- Quick Start:       ${YELLOW}QUICK_START.md${NC}"
echo "- Complete Guide:    ${YELLOW}REHAB_AGI_README.md${NC}"
echo "- Examples:          ${YELLOW}REHAB_AGI_EXAMPLES.md${NC}"
echo "- ERP Integration:   ${YELLOW}ERP_INTEGRATION_GUIDE.md${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "npm start              - Start production server"
echo "npm run dev            - Start development server with auto-reload"
echo "npm test               - Run all tests"
echo "npm run build          - Build TypeScript"
echo ""
echo -e "${BLUE}Access:${NC}"
echo "Server:               ${YELLOW}http://localhost:5001${NC}"
echo "Dashboard:            ${YELLOW}http://localhost:5001/dashboard${NC}"
echo "Health Check:         ${YELLOW}http://localhost:5001/health${NC}"
echo "Metrics:              ${YELLOW}http://localhost:5001/api/agi/metrics${NC}"
echo ""
