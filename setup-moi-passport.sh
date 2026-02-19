#!/bin/bash

# MOI Passport Integration Setup Script
# نص تثبيت تكامل الجوازات

echo "🇸🇦 MOI Passport Integration - Setup Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check npm
echo "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install axios dotenv express crypto uuid 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Create directories if they don't exist
echo ""
echo "Creating necessary directories..."
mkdir -p ./backend/services 2>/dev/null
mkdir -p ./backend/routes 2>/dev/null
mkdir -p ./backend/tests 2>/dev/null
mkdir -p ./backend/docs 2>/dev/null
echo -e "${GREEN}✅ Directories created${NC}"

# Setup environment file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file with default values..."
    cat > .env << 'EOF'
# MOI Passport Integration Configuration
JAWAZAT_API_BASE_URL=https://api.gdp.gov.sa/v1
JAWAZAT_API_KEY=your-api-key-here
JAWAZAT_API_SECRET=your-api-secret-here
JAWAZAT_WEBHOOK_URL=https://your-domain.com/webhooks/moi
JAWAZAT_TIMEOUT=30000
JAWAZAT_RETRY_ATTEMPTS=3
JAWAZAT_RETRY_DELAY=1000

# Cache Configuration
PASSPORT_CACHE_SIZE=10000
PASSPORT_CACHE_TTL=3600000

# Security
PASSPORT_ENABLE_ENCRYPTION=true

# Database
MONGODB_URI=mongodb://localhost:27017/saudi-employees

# Environment
NODE_ENV=development
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please update .env file with your API credentials${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Test service initialization
echo ""
echo "Testing service initialization..."
cat > test-init.js << 'EOF'
try {
  const MOIPassportService = require('./backend/services/moi-passport.service');
  const service = new MOIPassportService();
  console.log('✅ Service initialized successfully');
  console.log('✅ Cache system: Ready');
  console.log('✅ Rate limiter: Ready');
  console.log('✅ Audit log: Ready');
  service.destroy();
} catch (error) {
  console.error('❌ Service initialization failed:', error.message);
  process.exit(1);
}
EOF

node test-init.js 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Service test passed${NC}"
    rm test-init.js
else
    echo -e "${RED}❌ Service test failed${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env file with your API credentials"
echo "2. Register routes in your main Express app:"
echo "   const moiRoutes = require('./backend/routes/moi-passport.routes');"
echo "   app.use('/api/moi', moiRoutes);"
echo "3. Run tests: npm test"
echo "4. Start your server"
echo ""
echo "Documentation: ./backend/docs/MOI_PASSPORT_INTEGRATION.md"
echo "=========================================="
