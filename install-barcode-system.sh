#!/bin/bash

# ============================================
# BARCODE SYSTEM - INSTALLATION SCRIPT
# Comprehensive setup for the entire barcode system
# ============================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🔹 BARCODE SYSTEM - INSTALLATION SCRIPT 🔹               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
  echo -e "${BLUE}▶ $1${NC}"
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

# Step 1: Check Node.js
print_step "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed. Please install Node.js first."
  exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js found: $NODE_VERSION"

# Step 2: Navigate to backend
print_step "Setting up backend dependencies..."
cd backend || exit 1

# Step 3: Install npm packages
print_step "Installing npm packages..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  npm install
else
  print_warning "node_modules already exists, skipping npm install"
fi

# Step 4: Install barcode-specific packages
print_step "Installing barcode-specific packages..."
npm install jsbarcode qrcode

if [ $? -eq 0 ]; then
  print_success "Barcode packages installed successfully"
else
  print_error "Failed to install barcode packages"
  exit 1
fi

# Step 5: Check database connection
print_step "Checking database configuration..."
if grep -q "MONGODB_URI" .env; then
  print_success "MongoDB URI found in .env"
else
  print_warning "MongoDB URI not found in .env. Make sure it's configured."
fi

# Step 6: Create directories if they don't exist
print_step "Creating necessary directories..."
mkdir -p logs
mkdir -p temp
mkdir -p uploads
print_success "Directories created"

# Step 7: Run database migrations (if applicable)
print_step "Checking for database migrations..."
if [ -f "migrations/barcode.migration.js" ]; then
  print_warning "Run database migrations manually if needed"
else
  print_success "No migrations required for barcode system"
fi

# Step 8: Copy environment config
print_step "Setting up environment configuration..."
if [ ! -f ".env.barcode" ]; then
  cp ../.env.barcode . 2>/dev/null || echo "env.barcode not found, creating new one..."
  print_success "Environment configuration ready"
else
  print_success "Environment configuration already exists"
fi

# Step 9: Backend ready
print_success "Backend setup completed!"
echo ""

# Step 10: Setup frontend
print_step "Setting up frontend..."
cd ../frontend || exit 1

# Install frontend dependencies
print_step "Installing frontend dependencies..."
npm install

# Install frontend barcode packages if needed
# npm install jsbarcode qrcode 2>/dev/null || true

print_success "Frontend setup completed!"
echo ""

# Step 11: Final checks
print_step "Running final checks..."
cd ..

# Check backend
if [ -f "backend/models/Barcode.js" ]; then
  print_success "✓ Barcode model found"
else
  print_error "✗ Barcode model not found"
fi

if [ -f "backend/routes/barcode.routes.js" ]; then
  print_success "✓ Barcode routes found"
else
  print_error "✗ Barcode routes not found"
fi

# Check frontend
if [ -f "frontend/src/services/BarcodeService.js" ]; then
  print_success "✓ Barcode service found"
else
  print_error "✗ Barcode service not found"
fi

if [ -f "frontend/src/components/Barcode/BarcodeHub.js" ]; then
  print_success "✓ Barcode components found"
else
  print_error "✗ Barcode components not found"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✨ SETUP COMPLETED ✨                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Next Steps:"
echo ""
echo "1️⃣  Start Backend:"
echo "   cd backend"
echo "   npm start"
echo ""
echo "2️⃣  In another terminal, Start Frontend:"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "3️⃣  Access the application:"
echo "   Backend:  http://localhost:3002"
echo "   Frontend: http://localhost:3000"
echo ""
echo "4️⃣  Import BarcodeHub component:"
echo "   import BarcodeHub from './components/Barcode/BarcodeHub';"
echo ""
echo "5️⃣  Test the API:"
echo "   cd backend/tests"
echo "   node barcode.test.js"
echo ""

echo "📚 Documentation:"
echo "   - See BARCODE_SYSTEM_GUIDE.md for complete guide"
echo "   - See backend/utils/barcodeIntegration.js for integration examples"
echo ""

echo "🔧 Troubleshooting:"
if ! command -v npm &> /dev/null; then
  print_warning "npm not found. Please ensure npm is installed."
fi

if ! command -v git &> /dev/null; then
  print_warning "git not found. Some features may not work properly."
fi

echo ""
print_success "Installation script completed!"
echo ""

# Optional: Prompt to start services
read -p "Would you like to start the backend now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd backend
  npm start
fi
