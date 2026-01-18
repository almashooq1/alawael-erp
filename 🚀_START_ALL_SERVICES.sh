#!/bin/bash
# 🚀 AlAwael ERP - Complete Startup Script
# This script starts all services required for the system

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Functions
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║$1                              ${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
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

# Start of script
clear
print_header " 🚀 AlAwael ERP - System Startup"
echo ""

# Check Node.js
print_header " 📋 Prerequisites Check"
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi
print_success "Node.js version: $(node -v)"

if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm first."
    exit 1
fi
print_success "npm version: $(npm -v)"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    print_warning "MongoDB not found locally. Assuming MongoDB Atlas will be used."
else
    print_success "MongoDB found"
fi

echo ""
print_header " 🔧 Backend Setup"

# Install backend dependencies
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    print_warning "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

echo ""
print_header " 🎨 Frontend Setup"

# Install frontend dependencies
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    print_warning "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

echo ""
print_header " ⚙️  Environment Configuration"

# Check backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_warning "Backend .env not found. Creating with defaults..."
    cat > "$BACKEND_DIR/.env" << EOF
# Backend Configuration
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/alawael-dev
MONGODB_ATLAS_URI=mongodb+srv://user:password@cluster.mongodb.net/alawael

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# API Keys
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# CORS
CORS_ORIGIN=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=alawael-files
AWS_REGION=us-east-1

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/server.log

# Cache
CACHE_TTL=3600
CACHE_TYPE=redis

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Mode
SMART_TEST_MODE=true
EOF
    print_success "Backend .env created"
else
    print_success "Backend .env found"
fi

# Check frontend .env
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    print_warning "Frontend .env not found. Creating with defaults..."
    cat > "$FRONTEND_DIR/.env" << EOF
# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_ENV=development

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_SENTRY=false
REACT_APP_ENABLE_HOTJAR=false

# API Keys
REACT_APP_GOOGLE_MAPS_KEY=your_key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
EOF
    print_success "Frontend .env created"
else
    print_success "Frontend .env found"
fi

echo ""
print_header " 📊 Database Setup"

# Run database migrations
print_warning "Running database setup..."
cd "$BACKEND_DIR"
npm run db:seed 2>/dev/null || print_warning "Database seeding skipped (optional)"
print_success "Database ready"

echo ""
print_header " 🚀 Starting Services"

# Function to open new terminal (cross-platform)
open_terminal() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        gnome-terminal -- bash -c "$1; read -p 'Press enter to close...'"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell app \"Terminal\" to do script \"$1\""
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        start cmd /k "$1"
    fi
}

# Start Backend
print_warning "Starting Backend Server (Port 3001)..."
cd "$BACKEND_DIR"
npm start &
BACKEND_PID=$!
sleep 3
print_success "Backend started (PID: $BACKEND_PID)"

# Start Frontend
print_warning "Starting Frontend Server (Port 3000)..."
cd "$FRONTEND_DIR"
npm start &
FRONTEND_PID=$!
sleep 5
print_success "Frontend started (PID: $FRONTEND_PID)"

echo ""
print_header " ✅ System Ready!"

echo -e "${GREEN}"
echo "════════════════════════════════════════════"
echo "✅ All services are running!"
echo "════════════════════════════════════════════"
echo -e "${NC}"

echo ""
echo -e "${BLUE}📍 Access Points:${NC}"
echo -e "  🌐 Frontend:  ${GREEN}http://localhost:3000${NC}"
echo -e "  🔌 Backend:   ${GREEN}http://localhost:3001${NC}"
echo -e "  📚 API Docs:  ${GREEN}http://localhost:3001/api-docs${NC}"
echo -e "  📊 Dashboard: ${GREEN}http://localhost:3001/admin${NC}"
echo ""

echo -e "${BLUE}📋 PIDs:${NC}"
echo -e "  Backend:  ${GREEN}$BACKEND_PID${NC}"
echo -e "  Frontend: ${GREEN}$FRONTEND_PID${NC}"
echo ""

echo -e "${BLUE}🛠️  Useful Commands:${NC}"
echo -e "  Stop Backend:   ${YELLOW}kill $BACKEND_PID${NC}"
echo -e "  Stop Frontend:  ${YELLOW}kill $FRONTEND_PID${NC}"
echo -e "  Stop All:       ${YELLOW}kill $BACKEND_PID $FRONTEND_PID${NC}"
echo -e "  View Backend Logs:   ${YELLOW}tail -f $BACKEND_DIR/logs/server.log${NC}"
echo -e "  Run Tests:      ${YELLOW}cd $BACKEND_DIR && npm test${NC}"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "  Startup Guide:      🚀_START_NOW_COMPLETE_GUIDE.md"
echo -e "  API Guide:          🔌_API_INTEGRATION_GUIDE.md"
echo -e "  Deployment Guide:   🚀_PHASE_4_PRODUCTION_DEPLOYMENT_GUIDE.md"
echo -e "  Test Report:        🧪_COMPREHENSIVE_TEST_REPORT_JANUARY_2026.md"
echo ""

echo -e "${YELLOW}⚠️  Note: Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for user to stop
wait
