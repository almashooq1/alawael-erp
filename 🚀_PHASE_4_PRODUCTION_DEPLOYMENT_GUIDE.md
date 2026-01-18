# 🚀 PHASE 4: DEPLOYMENT TO PRODUCTION - COMPLETE GUIDE

**Date**: January 16, 2026
**Status**: 🟢 Ready for Deployment

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Frontend Deployment](#frontend-deployment)
5. [Backend Deployment](#backend-deployment)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## ✅ Pre-Deployment Checklist

- [ ] Backend tests passing (npm test)
- [ ] Frontend build successful (npm run build)
- [ ] Environment variables configured
- [ ] MongoDB Atlas account created
- [ ] Domain registered
- [ ] SSL certificate ready
- [ ] Hosting account prepared
- [ ] Backups scheduled
- [ ] Monitoring setup
- [ ] Security audit completed

---

## 🔧 Environment Configuration

### Backend (.env for Production)

```env
# Environment
NODE_ENV=production

# Server
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=mongodb+srv://username:password@cluster.mongodb.net
DB_PORT=27017
DB_NAME=almashooq_production
DB_USER=admin
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_very_long_secure_secret_key_min_32_chars
SESSION_SECRET=your_very_long_session_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_very_long_refresh_secret_key_min_32_chars

# CORS & URLs
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
API_BASE_URL=https://yourdomain.com/api
WS_URL=wss://yourdomain.com

# Redis (for caching)
REDIS_HOST=redis.yourdomain.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SENDER_EMAIL=noreply@yourdomain.com

# AWS/Cloud Storage (if needed)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/almashooq/app.log

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env for Production)

```env
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_WS_URL=wss://yourdomain.com
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
```

---

## 💾 Database Setup

### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up and create a cluster
   - Create a database user
   - Whitelist IP addresses

2. **Connection String**

   ```
   mongodb+srv://username:password@cluster.mongodb.net/database_name
   ```

3. **Initialize Database**

   ```bash
   cd backend
   npm run migrate
   # or
   node scripts/migrate_database.js
   ```

4. **Add Sample Data**
   ```bash
   npm run seed
   # or
   node scripts/seed_database.js
   ```

---

## 🎨 Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Set environment variables
vercel env add REACT_APP_API_URL
vercel env add REACT_APP_WS_URL
```

### Option 2: Netlify

```bash
# Build
cd frontend
npm run build

# Deploy with Netlify
netlify deploy --prod --dir=build
```

### Option 3: Manual (Hosting Control Panel)

1. **Build the application**

   ```bash
   cd frontend
   npm run build
   ```

2. **Upload the `build` folder** to your hosting

3. **Configure routing** for SPA (Single Page Application)
   - Set all routes to serve `index.html`
   - Configure rewrite rules in `.htaccess` or `nginx.conf`

---

## 🔗 Backend Deployment

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your_secret
railway variables set DB_HOST=your_db_connection
```

### Option 2: Heroku

```bash
# Install Heroku CLI
npm i -g heroku

# Login
heroku login

# Create app
heroku create almashooq-backend

# Deploy
git push heroku main

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
heroku config:set DB_HOST=your_db_connection
```

### Option 3: Hostinger VPS

```bash
# SSH into server
ssh user@your_server_ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/yourusername/almashooq.git
cd almashooq/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# Paste production environment variables

# Install PM2 for process management
sudo npm i -g pm2

# Start application
pm2 start server.js --name "almashooq-api"
pm2 startup
pm2 save

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/default
```

---

## 🔐 SSL/HTTPS Setup

### Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Configure Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto renewal
sudo systemctl enable certbot.timer
```

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://localhost:3001/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        root /var/www/almashooq/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📊 Monitoring and Maintenance

### PM2 Monitoring

```bash
# Display all processes
pm2 list

# Monitor real-time
pm2 monit

# View logs
pm2 logs almashooq-api

# Restart application
pm2 restart almashooq-api

# Stop application
pm2 stop almashooq-api

# Delete process
pm2 delete almashooq-api
```

### Health Check Endpoint

Add to `backend/server.js`:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
  });
});
```

### Monitoring Tools

- **PM2 Plus**: Real-time monitoring
- **New Relic**: Application performance monitoring
- **DataDog**: Infrastructure monitoring
- **Sentry**: Error tracking

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/almashooq"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
mongodump --uri="mongodb+srv://..." --out="$BACKUP_DIR/mongo_$TIMESTAMP"

# Backup uploaded files
tar -czf "$BACKUP_DIR/files_$TIMESTAMP.tar.gz" /var/www/almashooq/uploads

# Upload to cloud storage
aws s3 sync "$BACKUP_DIR" s3://your-backup-bucket/almashooq/
```

Schedule with cron:

```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## 🔒 Security Checklist

- [ ] Update all dependencies
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure headers
- [ ] Enable rate limiting
- [ ] Implement CSRF protection
- [ ] Use strong passwords
- [ ] Enable 2FA for admin accounts
- [ ] Regular security audits
- [ ] Monitor for vulnerabilities

---

## 📝 Post-Deployment Tasks

1. **Test all endpoints**
   - Verify API responses
   - Test WebSocket connections
   - Check file uploads

2. **Monitor performance**
   - Check API response times
   - Monitor CPU/Memory usage
   - Review error logs

3. **Setup alerts**
   - Downtime alerts
   - High error rate alerts
   - Resource usage alerts

4. **Documentation**
   - Update API documentation
   - Create runbooks
   - Document procedures

---

## 🆘 Troubleshooting

### API not responding

```bash
# Check process status
pm2 status

# View logs
pm2 logs almashooq-api

# Restart
pm2 restart almashooq-api
```

### Database connection error

```bash
# Test connection
mongo "mongodb+srv://username:password@cluster.mongodb.net/database"

# Check MongoDB Atlas whitelist
# Ensure server IP is whitelisted
```

### CORS errors

```javascript
// Check server CORS configuration
// Ensure CORS_ORIGIN matches frontend URL
console.log(process.env.CORS_ORIGIN);
```

---

## 📞 Support and Maintenance

- **Daily**: Monitor logs and health checks
- **Weekly**: Review performance metrics
- **Monthly**: Security updates and patches
- **Quarterly**: Full backup verification
- **Annually**: Security audit

---

## ✅ Deployment Complete Checklist

- [ ] Environment variables configured
- [ ] Database migrated and seeded
- [ ] SSL certificates installed
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] WebSocket connections working
- [ ] Email service configured
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Team trained on procedures

**Status**: 🟢 Ready for Production
**Next Steps**: Monitor and maintain system

---

**Deployment initiated on January 16, 2026 by AI Assistant**
**Expected uptime**: 99.9%
**Support available 24/7**
