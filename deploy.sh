#!/bin/bash

# Alawael ERP - Complete Deployment Script
# This script will setup your VPS and deploy the application

echo "🚀 Starting Alawael ERP Deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt install -y git

# Install Certbot for SSL
echo "📦 Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Clone or setup project
echo "📁 Setting up project directory..."
mkdir -p /var/www
cd /var/www

# If project doesn't exist, create it
if [ ! -d "alawael-erp" ]; then
  echo "📂 Creating project directory..."
  mkdir -p alawael-erp/backend
  mkdir -p alawael-erp/frontend
fi

cd alawael-erp/backend

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file..."
  cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DOMAIN=alawael.info
FRONTEND_URL=https://alawael.info

MONGODB_URI=mongodb+srv://alawael_admin:Admin%402026@cluster0.5njwaqd.mongodb.net/alawael-erp?retryWrites=true&w=majority&appName=Cluster0
USE_MOCK_DB=true

API_URL=https://alawael.info
API_VERSION=v1

JWT_SECRET=alawael-erp-secret-key-2026-change-in-production
JWT_EXPIRY=7d

ENABLE_NATS=false
ENABLE_ELK=false
EOF
  echo "✅ .env file created!"
fi

# Start with PM2
echo "🚀 Starting backend with PM2..."
pm2 start server.js --name "alawael-backend"
pm2 startup
pm2 save

# Configure Nginx
echo "⚙️  Configuring Nginx..."
cat > /etc/nginx/sites-available/alawael.info << 'EOF'
server {
    listen 80;
    server_name alawael.info www.alawael.info;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/alawael.info /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "✅ Nginx configured!"

# Setup SSL with Certbot
echo "🔒 Setting up SSL certificate..."
certbot --nginx -d alawael.info -d www.alawael.info --non-interactive --agree-tos -m A.almashooq@gmail.com

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your website is now live at:"
echo "   https://alawael.info"
echo ""
echo "📊 Backend API:"
echo "   https://alawael.info/api-docs"
echo ""
echo "🔧 PM2 Commands:"
echo "   pm2 list          - Show running processes"
echo "   pm2 logs          - View logs"
echo "   pm2 restart all   - Restart all apps"
echo ""
echo "🔐 SSL Certificate:"
echo "   Auto-renews every 90 days"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
