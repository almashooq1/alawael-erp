#!/bin/bash

# 🚀 Start Scripts for Rehab AGI System
# هذا السكريبت يوفر طرق متعددة لتشغيل النظام

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${BLUE}[Rehab AGI]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Banner
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║            🧠 AGI System - Quick Start 🚀            ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
print_status "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
print_success "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm >= 9.0.0"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm version: $NPM_VERSION"

# Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file..."
    cp .env.example .env
    print_success ".env file created"
else
    print_warning ".env file already exists"
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "All tests passed!"
else
    print_warning "Some tests failed, but continuing..."
fi

# Start the server
print_status "Starting AGI System..."
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║              🚀 AGI System is starting...            ║"
echo "║                                                       ║"
echo "║  Server will be available at:                         ║"
echo "║  📡 http://localhost:5001                            ║"
echo "║                                                       ║"
echo "║  Press Ctrl+C to stop the server                     ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

npm run dev
