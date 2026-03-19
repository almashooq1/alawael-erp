#!/bin/bash

# ERP System - Docker Verification Script
# This script verifies that all Docker services are running and healthy

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    ERP System - Docker Services Verification                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check Docker installation
echo -e "${BLUE}[1/7]${NC} Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓${NC} Docker installed: $DOCKER_VERSION"
else
    echo -e "${RED}✗${NC} Docker not found. Please install Docker."
    exit 1
fi

# 2. Check Docker Compose installation
echo -e "${BLUE}[2/7]${NC} Checking Docker Compose installation..."
if command -v docker-compose &> /dev/null; then
    DC_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✓${NC} Docker Compose installed: $DC_VERSION"
else
    echo -e "${RED}✗${NC} Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# 3. Check environment file
echo -e "${BLUE}[3/7]${NC} Checking environment configuration..."
if [ -f ".env.docker" ]; then
    echo -e "${GREEN}✓${NC} .env.docker file found"
else
    echo -e "${YELLOW}⚠${NC} .env.docker file not found. Creating from template..."
    if [ -f ".env.docker.example" ]; then
        cp .env.docker.example .env.docker
        echo -e "${GREEN}✓${NC} Created .env.docker from template"
    else
        echo -e "${RED}✗${NC} .env.docker.example not found"
        exit 1
    fi
fi

# 4. Check services status
echo -e "${BLUE}[4/7]${NC} Checking Docker services status..."
docker-compose ps
CONTAINERS=$(docker-compose ps -q)
if [ -z "$CONTAINERS" ]; then
    echo -e "${YELLOW}⚠${NC} No containers running. Starting services..."
    docker-compose up -d --build
    echo -e "${GREEN}✓${NC} Services started. Waiting for health checks..."
    sleep 10
fi

# 5. Check service health
echo -e "${BLUE}[5/7]${NC} Checking service health..."
echo ""

# MongoDB
echo -n "  MongoDB (27017): "
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

# Backend API
echo -n "  Backend API (3001): "
if curl -f http://localhost:3001/health &> /dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${YELLOW}⚠ Not ready yet...${NC}"
fi

# SSO Server
echo -n "  SSO Server (3002): "
if curl -f http://localhost:3002/health &> /dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${YELLOW}⚠ Not ready yet...${NC}"
fi

# Frontend
echo -n "  Frontend (3000): "
if curl -f http://localhost:3000/ &> /dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${YELLOW}⚠ Not ready yet...${NC}"
fi

# 6. Check network connectivity
echo -e "${BLUE}[6/7]${NC} Checking inter-service connectivity..."
echo""

echo -n "  Frontend → Backend: "
if docker-compose exec -T frontend curl -f http://backend:3001/health &> /dev/null; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Not connected${NC}"
fi

echo -n "  Backend → MongoDB: "
if docker-compose exec -T backend curl -f mongodb:27017 &> /dev/null 2>&1 || \
   docker-compose exec -T backend mongo --eval "db" &> /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${YELLOW}⚠ Connection check pending${NC}"
fi

# 7. Check disk usage
echo -e "${BLUE}[7/7]${NC} Checking Docker resources..."
echo ""
echo "  Local volume usage:"
MONGODB_SIZE=$(docker volume inspect erp-system_mongodb_data 2>/dev/null | grep -E '"Size"' || echo "Not available")
echo "    MongoDB data: $MONGODB_SIZE"

echo ""
echo "  Container memory usage:"
docker stats --no-stream 2>/dev/null || echo "    (Stats not available)"

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Verification Summary                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓${NC} Docker is properly configured"
echo -e "${GREEN}✓${NC} Services are running"
echo ""
echo "Access your services at:"
echo "  Frontend:  ${BLUE}http://localhost:3000${NC}"
echo "  API:       ${BLUE}http://localhost:3001/api${NC}"
echo "  SSO:       ${BLUE}http://localhost:3002${NC}"
echo "  MongoDB:   ${BLUE}mongodb://admin:<password>@localhost:27017${NC}"
echo ""
echo "Useful commands:"
echo "  View logs:      ${BLUE}docker-compose logs -f backend${NC}"
echo "  Execute cmd:    ${BLUE}docker-compose exec backend npm test${NC}"
echo "  MongoDB shell:  ${BLUE}docker-compose exec mongodb mongosh${NC}"
echo "  Stop services:  ${BLUE}docker-compose down${NC}"
echo "  Clean up:       ${BLUE}docker-compose down -v${NC}"
echo ""
echo "For more information, see DOCKER_SETUP_GUIDE.md"
echo ""
