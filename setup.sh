#!/bin/bash
# Enterprise Management System - Quick Start Script
# نظام الإدارة المتكامل - سكريبت البدء السريع

set -e

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║  🚀 Enterprise Management System - Quick Start                          ║"
echo "║  نظام الإدارة المتكامل - البدء السريع                                    ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi
echo "✅ npm $(npm -v)"

# Create directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p logs uploads backups data

# Backend setup
echo ""
echo "🔧 Setting up Backend..."
cd backend

if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update backend/.env with your configuration"
fi

if [ ! -d node_modules ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "✅ Backend setup complete"
cd ..

# Frontend setup
echo ""
echo "🎨 Setting up Frontend..."
cd frontend

if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update frontend/.env with your configuration"
fi

if [ ! -d node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "✅ Frontend setup complete"
cd ..

# Database setup (optional)
echo ""
read -p "Do you want to setup databases now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Setting up databases..."

    # MongoDB
    if command -v mongosh &> /dev/null; then
        echo "MongoDB found. Initializing..."
        mongosh < scripts/setup-mongo.js
        echo "✅ MongoDB initialized"
    else
        echo "⚠️  MongoDB not found. Install MongoDB or skip."
    fi

    # PostgreSQL
    if command -v psql &> /dev/null; then
        echo "PostgreSQL found. Initializing..."
        psql -U postgres < scripts/setup-postgres.sql
        echo "✅ PostgreSQL initialized"
    else
        echo "⚠️  PostgreSQL not found. Install PostgreSQL or skip."
    fi
fi

# Run tests (optional)
echo ""
read -p "Do you want to run tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Running tests..."
    cd backend
    npm test 2>&1 | head -20
    cd ..
fi

# Setup complete
echo ""
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                                     ║"
echo "╠════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                        ║"
echo "║  Next steps:                                                           ║"
echo "║  1. Update backend/.env with your configuration                       ║"
echo "║  2. Update frontend/.env with your configuration                      ║"
echo "║  3. Start backend:   cd backend && npm start                          ║"
echo "║  4. Start frontend:  cd frontend && npm start                         ║"
echo "║                                                                        ║"
echo "║  Default URLs:                                                         ║"
echo "║  - Frontend:  http://localhost:3000                                   ║"
echo "║  - Backend:   http://localhost:5000                                   ║"
echo "║  - API Docs:  http://localhost:5000/api/docs                          ║"
echo "║                                                                        ║"
echo "║  📖 Documentation: FINAL_COMPREHENSIVE_DOCUMENTATION.md               ║"
echo "║  🔌 API Guide:     API_INTEGRATION_GUIDE.md                           ║"
echo "║  🚀 Deployment:    DEPLOYMENT_GUIDE.md                                ║"
echo "║                                                                        ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
