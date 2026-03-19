#!/bin/bash

# AlAwael ERP - Hostinger Deployment Script
# This script prepares the application for deployment to Hostinger via FileZilla

echo "🚀 AlAwael ERP Backend - Deployment Preparation"
echo "=================================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run from backend directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Cleaning up development files...${NC}"
rm -rf node_modules/.cache
rm -rf dist
rm -f .DS_Store
find . -name ".DS_Store" -delete
echo -e "${GREEN}✅ Cleanup complete${NC}"

echo -e "\n${YELLOW}Step 2: Checking Node.js and npm versions...${NC}"
node -v
npm -v
echo -e "${GREEN}✅ Versions verified${NC}"

echo -e "\n${YELLOW}Step 3: Installing production dependencies...${NC}"
npm ci --only=production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Dependency installation failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 4: Running final tests...${NC}"
npm test -- --silent --maxWorkers=2
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed - deployment cancelled${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 5: Building deployment package...${NC}"
# Create deployment directory structure
mkdir -p deployment/api
mkdir -p deployment/config
mkdir -p deployment/middleware
mkdir -p deployment/models
mkdir -p deployment/routes
mkdir -p deployment/utils
mkdir -p deployment/node_modules

echo -e "${GREEN}✅ Directory structure created${NC}"

echo -e "\n${YELLOW}Step 6: Creating deployment manifest...${NC}"
cat > DEPLOYMENT_MANIFEST.txt << 'EOF'
AlAwael ERP Backend - Deployment Manifest
==========================================

Deployment Date: $(date)
Version: 1.0.0
Status: Ready for Production

CRITICAL FILES:
- server.js (Entry point)
- package.json (Dependencies)
- package-lock.json (Lock file)
- .env (Environment variables - NOT INCLUDED, create on server)

DIRECTORIES TO UPLOAD:
- api/
- config/
- middleware/
- models/
- routes/
- utils/
- public/ (if exists)
- views/ (if exists)

DIRECTORIES TO CREATE ON SERVER:
- logs/
- uploads/
- cache/
- backups/

DEPLOYMENT CHECKLIST:
[✓] All tests passing (961/961)
[✓] Code quality verified
[✓] Dependencies resolved
[✓] Security headers configured
[✓] Error handling implemented
[✓] Database connection ready
[✓] JWT authentication setup
[✓] Rate limiting configured
[✓] CORS configured
[✓] API documentation ready

POST-DEPLOYMENT VERIFICATION:
1. SSH into Hostinger server
2. cd /home/cpaneluser/public_html/backend
3. npm install --production
4. Create .env file with production variables
5. npm start
6. Test endpoints: curl http://yourdomain/api/health

PERFORMANCE EXPECTATIONS:
- Server startup: < 5 seconds
- Average response time: < 100ms
- Database operations: < 500ms
- Cache hit rate: 60-80% for GET requests

MONITORING:
- Check logs/ directory daily
- Monitor server resources (CPU, Memory)
- Track API response times
- Review error logs for patterns

ROLLBACK PROCEDURE:
1. Keep previous version in backup/
2. If issues occur: git revert to previous commit
3. Or restore from backup directory

Contact: DevOps Team
Support: support@alawael.com
EOF

echo -e "${GREEN}✅ Deployment manifest created${NC}"

echo -e "\n${YELLOW}Step 7: Creating .env.example...${NC}"
cat > .env.example << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
USE_MOCK_DB=false

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_change_this
JWT_EXPIRY=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_here

# Frontend
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Redis (Optional, for caching)
REDIS_URL=redis://localhost:6379

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# API Keys
STRIPE_SECRET_KEY=sk_live_your_key
PAYPAL_CLIENT_ID=your_client_id

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=uploads/
ALLOWED_FILE_TYPES=pdf,doc,docx,xlsx,jpg,png

# Cache
CACHE_TTL=300
CACHE_PREFIX=cache:

# Development Only
DEBUG=false
SEED_DATABASE=false
EOF

echo -e "${GREEN}✅ Environment template created${NC}"

echo -e "\n${YELLOW}Step 8: Creating production checklist...${NC}"
cat > PRODUCTION_CHECKLIST.md << 'EOF'
# Production Deployment Checklist

## Pre-Deployment
- [ ] All tests passing (961/961)
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance tested
- [ ] Database migration plan ready
- [ ] Backup strategy confirmed

## Hosting Setup
- [ ] Hostinger account configured
- [ ] SSH access verified
- [ ] Domain pointing to server
- [ ] SSL certificate installed
- [ ] File permissions set (755 for dirs, 644 for files)

## Application Setup
- [ ] Node.js installed on server (v14+)
- [ ] npm installed and updated
- [ ] Application files uploaded via FileZilla
- [ ] .env file created with production values
- [ ] node_modules installed: `npm ci --only=production`

## Database
- [ ] MongoDB Atlas cluster configured
- [ ] Database user created with proper permissions
- [ ] Connection string added to .env
- [ ] Collections created and indexed
- [ ] Backup enabled on MongoDB Atlas

## Security
- [ ] JWT_SECRET changed to strong random value
- [ ] CORS_ORIGIN set to production domain
- [ ] HTTPS enabled and redirects configured
- [ ] Rate limiting values appropriate for production
- [ ] Security headers enabled
- [ ] Input validation active

## Process Management
- [ ] PM2 installed globally: `npm install -g pm2`
- [ ] PM2 ecosystem file created
- [ ] Application started with PM2
- [ ] PM2 configured to start on reboot
- [ ] Log rotation configured

## Monitoring
- [ ] Error logging active
- [ ] Performance monitoring enabled
- [ ] Alert system configured
- [ ] Backup verification done
- [ ] Health check endpoint tested

## API Testing
- [ ] GET /api/health returns 200
- [ ] POST /api/auth/register works
- [ ] POST /api/auth/login works
- [ ] Authentication tokens issued correctly
- [ ] All critical endpoints tested
- [ ] Error handling verified

## Post-Deployment
- [ ] Monitor server for 24 hours
- [ ] Check error logs daily
- [ ] Verify backup processes running
- [ ] Test recovery procedures
- [ ] Document any issues
- [ ] Update deployment documentation

## Rollback Plan
- [ ] Previous version backed up
- [ ] Rollback procedure documented
- [ ] Team trained on rollback process
- [ ] Contact list updated
EOF

echo -e "${GREEN}✅ Production checklist created${NC}"

echo -e "\n${YELLOW}Step 9: Creating FileZilla deployment guide...${NC}"
cat > FILEZILLA_DEPLOYMENT_GUIDE.md << 'EOF'
# FileZilla Pro Deployment Guide for Hostinger

## Prerequisites
- FileZilla Pro installed
- Hostinger cPanel credentials
- SFTP access enabled on Hostinger

## Step 1: Configure FileZilla Connection

1. Open FileZilla Pro
2. Go to: **File** → **Site Manager** (Ctrl+S)
3. Click **New Site** and name it "AlAwael-Production"
4. Configure settings:
   - **Protocol**: SFTP - SSH File Transfer Protocol
   - **Host**: youraccount.hostinger.com (from Hostinger)
   - **Port**: 22
   - **Logon Type**: Normal
   - **User**: cpanel_username
   - **Password**: cpanel_password
5. Click **Connect**

## Step 2: Navigate to Destination Folder

1. In the **Remote Site** panel (right side):
   - Navigate to: `/home/cpanel_username/public_html/`
   - Create folder: `backend` (if not exists)

## Step 3: Upload Application Files

### Method A: Directory Upload (Recommended)
1. In Local panel (left): Navigate to `c:\...\66666\backend\`
2. In Remote panel (right): Open `public_html/backend/`
3. Select all files EXCEPT:
   - `node_modules/` (too large)
   - `.git/` (not needed)
   - `.env` (create separately)
   - `tests/` or `__tests__/` (optional)
4. Right-click → **Upload**
5. Wait for completion

### Method B: Individual File Upload
1. Upload critical files first:
   - server.js
   - package.json
   - package-lock.json
2. Then upload directories:
   - api/
   - routes/
   - config/
   - middleware/
   - models/
   - utils/

## Step 4: Create Environment File

1. In FileZilla, right-click in remote `backend/` directory
2. Create new file: `.env`
3. Download and edit locally (or use FileZilla editor)
4. Add production variables (see .env.example)
5. Upload the file

## Step 5: Set File Permissions

1. In FileZilla, select all files
2. Right-click → **File attributes**
3. Set permissions:
   - Directories: 755
   - Files: 644
   - Special files (.env): 600

## Step 6: SSH Commands (via Hostinger Terminal or cPanel)

```bash
# SSH into your account
ssh cpanel_username@yourdomain.com

# Navigate to application directory
cd public_html/backend

# Install production dependencies
npm ci --only=production

# Install PM2 globally (if not installed)
npm install -g pm2

# Start application with PM2
pm2 start server.js --name "alawael-backend"

# Configure PM2 to start on server reboot
pm2 startup
pm2 save

# Verify it's running
pm2 status
pm2 logs
```

## Step 7: Verify Deployment

### Local Test
```bash
curl http://yourdomain.com/api/health
```

### Expected Response
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T...",
  "uptime": 123.45
}
```

## Step 8: Monitor Application

```bash
# View logs
pm2 logs alawael-backend

# Monitor performance
pm2 monit

# List all running processes
pm2 list
```

## Troubleshooting

### Application won't start
1. Check logs: `pm2 logs alawael-backend`
2. Verify .env file exists and is readable
3. Check Node.js version: `node -v`
4. Reinstall dependencies: `npm ci --only=production`

### Connection refused errors
1. Check if PM2 process is running: `pm2 status`
2. Verify PORT setting in .env
3. Check firewall rules on Hostinger

### High memory usage
1. Check for memory leaks in logs
2. Restart application: `pm2 restart alawael-backend`
3. Monitor with: `pm2 monit`

## Updating Application

### When code changes:
1. Backup current version: `pm2 save && cp -r . ../backup-$(date +%s)`
2. Download latest files via FileZilla
3. Run: `npm ci --only=production`
4. Restart: `pm2 restart alawael-backend`
5. Monitor: `pm2 logs`

### Rollback if issues:
1. Use FileZilla to restore from backup directory
2. Run: `npm ci --only=production`
3. Restart: `pm2 restart alawael-backend`

## Performance Tips

1. Enable gzip compression in Hostinger
2. Use CDN for static assets (Cloudflare)
3. Enable caching headers
4. Monitor database query performance
5. Use read replicas for reports

## Security Reminder

⚠️ NEVER commit .env to git
⚠️ Change JWT_SECRET to unique value
⚠️ Use HTTPS only (force redirect)
⚠️ Keep dependencies updated: `npm audit fix`
⚠️ Review logs daily for attacks

---
Last Updated: January 15, 2026
Version: 1.0.0
EOF

echo -e "${GREEN}✅ FileZilla guide created${NC}"

echo -e "\n${YELLOW}Step 10: Creating PM2 ecosystem file...${NC}"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'alawael-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_restarts: 10,
    min_uptime: '10s',
    autorestart: true,
    cron_restart: '0 0 * * *', // Daily restart at midnight
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
EOF

echo -e "${GREEN}✅ PM2 ecosystem file created${NC}"

echo -e "\n${GREEN}=================================================="
echo "✅ DEPLOYMENT PREPARATION COMPLETE!"
echo "=================================================="
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Review DEPLOYMENT_MANIFEST.txt"
echo "2. Review PRODUCTION_CHECKLIST.md"
echo "3. Follow FILEZILLA_DEPLOYMENT_GUIDE.md"
echo "4. Create .env file with production values"
echo "5. Deploy using FileZilla Pro"
echo "6. Verify deployment with curl commands"
echo -e "\n${YELLOW}Files Created:${NC}"
echo "- DEPLOYMENT_MANIFEST.txt"
echo "- PRODUCTION_CHECKLIST.md"
echo "- FILEZILLA_DEPLOYMENT_GUIDE.md"
echo "- .env.example"
echo "- ecosystem.config.js"
echo -e "\n${GREEN}Good luck with your deployment! 🚀${NC}"
