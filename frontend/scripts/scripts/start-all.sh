#!/bin/bash

# Phase 12 - Complete System Startup Script
# Starts both backend and frontend servers

echo "🚀 Starting Phase 12 ERP System..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend directory exists
if [ ! -d "../backend" ]; then
  echo "❌ Backend directory not found!"
  exit 1
fi

# Check if node_modules exist
if [ ! -d "../backend/node_modules" ]; then
  echo "${YELLOW}⚠️  Installing backend dependencies...${NC}"
  cd ../backend && npm install
  cd ../frontend
fi

if [ ! -d "node_modules" ]; then
  echo "${YELLOW}⚠️  Installing frontend dependencies...${NC}"
  npm install
fi

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}✓ Dependencies installed${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start backend in background
echo "${BLUE}Starting backend server on port 3001...${NC}"
cd ../backend && npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "${BLUE}Starting frontend server on port 3000...${NC}"
cd ../frontend && npm start &
FRONTEND_PID=$!

# Trap Ctrl+C
trap "echo ''; echo '${YELLOW}Shutting down servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}✓ System is starting!${NC}"
echo "${BLUE}Backend:  http://localhost:3001${NC}"
echo "${BLUE}Frontend: http://localhost:3000${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
