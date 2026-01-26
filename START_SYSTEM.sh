#!/bin/bash

# ========================================
#   Phase 12 - Complete System Startup
#   Backend + Frontend Together
# ========================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  Starting Phase 12 ERP System"
echo "========================================"
echo ""

# Check directories
if [ ! -d "backend" ]; then
    echo -e "${RED}[ERROR] Backend directory not found!${NC}"
    echo "Make sure you're in the project root"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo -e "${RED}[ERROR] Frontend directory not found!${NC}"
    echo "Make sure you're in the project root"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found! Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${BLUE}[INFO] Checking dependencies...${NC}"
echo ""

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}[INFO] Installing backend dependencies...${NC}"
    cd backend
    npm install
    cd ..
    echo ""
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[INFO] Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
    echo ""
fi

echo -e "${GREEN}========================================"
echo "  All Dependencies Ready"
echo "========================================${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}[INFO] Starting Backend Server (Port 3001)...${NC}"
cd backend && npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start frontend in background
echo -e "${BLUE}[INFO] Starting Frontend Server (Port 3000)...${NC}"
cd frontend && npm start &
FRONTEND_PID=$!
cd ..

# Trap Ctrl+C
trap "echo ''; echo -e '${YELLOW}[INFO] Shutting down servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

echo ""
echo -e "${GREEN}========================================"
echo "  System Started Successfully!"
echo "========================================${NC}"
echo ""
echo -e "${BLUE}Backend:  http://localhost:3001${NC}"
echo -e "${BLUE}Frontend: http://localhost:3000${NC}"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
