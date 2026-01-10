#!/bin/bash

# 🚀 AlAwael ERP Deployment Script for Hostinger
# دليل النشر التلقائي لـ AlAwael ERP على Hostinger

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AlAwael ERP Deployment to Hostinger${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 1. Clone from GitHub
echo -e "${YELLOW}📥 Step 1: Cloning from GitHub...${NC}"
if git clone https://github.com/almashooq1/alawael-erp.git alawael-erp; then
    echo -e "${GREEN}✅ GitHub clone successful${NC}\n"
    cd alawael-erp
else
    echo -e "${RED}❌ GitHub clone failed${NC}"
    exit 1
fi

# 2. Setup Backend
echo -e "${YELLOW}⚙️  Step 2: Setting up Backend...${NC}"
cd backend

echo -e "${YELLOW}  Installing dependencies...${NC}"
if npm install --production; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

# Create .env file
echo -e "${YELLOW}  Creating .env file...${NC}"
cat > .env << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-12345
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-67890
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=https://yourdomain.com
EOF
echo -e "${GREEN}✅ Backend .env created${NC}\n"

cd ..

# 3. Setup Frontend
echo -e "${YELLOW}🎨 Step 3: Setting up Frontend...${NC}"
cd frontend

echo -e "${YELLOW}  Installing dependencies...${NC}"
if npm install --production; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

# Create .env file
echo -e "${YELLOW}  Creating .env.production file...${NC}"
cat > .env.production << EOF
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_API_BASE=/api
PORT=3000
BROWSER=none
EOF
echo -e "${GREEN}✅ Frontend .env created${NC}"

# Build Frontend
echo -e "${YELLOW}  Building Frontend...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}\n"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

cd ..

# 4. Install PM2 globally
echo -e "${YELLOW}🔧 Step 4: Installing PM2...${NC}"
if npm install -g pm2 &>/dev/null; then
    echo -e "${GREEN}✅ PM2 installed${NC}\n"
else
    echo -e "${YELLOW}⚠️  PM2 might already be installed${NC}\n"
fi

# 5. Start services with PM2
echo -e "${YELLOW}🚀 Step 5: Starting services with PM2...${NC}"

cd backend
pm2 start server.js --name "alawael-backend"
echo -e "${GREEN}✅ Backend started${NC}"

cd ../frontend
pm2 start "npm start" --name "alawael-frontend"
echo -e "${GREEN}✅ Frontend started${NC}\n"

# 6. PM2 startup
echo -e "${YELLOW}⚙️  Step 6: Configuring PM2 startup...${NC}"
pm2 startup &>/dev/null
pm2 save
echo -e "${GREEN}✅ PM2 startup configured${NC}\n"

# 7. Display status
echo -e "${YELLOW}📊 Checking Service Status...${NC}\n"
pm2 list

# 8. Display logs
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}✅ Services deployed successfully${NC}\n"

echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "  1. Configure your domain in Hostinger control panel"
echo -e "  2. Point yourdomain.com to: $(pwd)/frontend/build"
echo -e "  3. Point api.yourdomain.com to: localhost:3001"
echo -e "  4. Install SSL certificate"
echo -e "  5. Update JWT_SECRET in backend/.env\n"

echo -e "${YELLOW}📊 Monitor logs:${NC}"
echo -e "  ${BLUE}pm2 logs alawael-backend${NC}"
echo -e "  ${BLUE}pm2 logs alawael-frontend${NC}"
echo -e "  ${BLUE}pm2 monit${NC}\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  AlAwael ERP is now deploying!${NC}"
echo -e "${BLUE}========================================${NC}\n"
