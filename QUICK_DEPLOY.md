# ⚡ QUICK DEPLOYMENT GUIDE - Choose Your Path

**Last Updated:** January 13, 2026  
**System Status:** ✅ PRODUCTION READY

---

## 🎯 PICK YOUR DEPLOYMENT METHOD (30 seconds to decide)

### 📌 Choice Matrix

| Platform            | Setup Time | Cost   | Ease      | Recommendation          |
| ------------------- | ---------- | ------ | --------- | ----------------------- |
| **Hostinger VPS**   | 30 min     | $$     | Easy      | ⭐⭐⭐⭐⭐ Best control |
| **Railway**         | 5 min      | $      | Very Easy | ⭐⭐⭐⭐ Fastest        |
| **Docker Local**    | 5 min      | Free   | Easy      | ⭐⭐⭐⭐ For testing    |
| **Your Own Server** | 45 min     | Custom | Medium    | ⭐⭐⭐ Full control     |

---

## 🚀 PATH 1: RAILWAY (Fastest - 5 minutes)

### Step 1: Create Account

```
1. Go to https://railway.app
2. Click "Create Account"
3. Sign up with GitHub (easiest)
4. Authorize Railway app
```

### Step 2: Create Project

```
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: almashooq1/alawael-erp
4. Wait for deployment to start
```

### Step 3: Configure Environment

```
1. Go to "Variables" tab
2. Add environment variables:
   - NODE_ENV=production
   - PORT=3001
3. Click "Deploy"
```

### Step 4: Access Application

```
Your application will be available at:
https://your-project-name.up.railway.app

Frontend automatically deployed with backend
```

### Step 5: Test Login

```
Email: admin@alawael.com
Password: Admin@123456
```

**Time to Live:** 5 minutes  
**Cost:** Free tier available

---

## 🏠 PATH 2: HOSTINGER VPS (Best Control - 30 minutes)

### Prerequisites

```
✅ SSH client (PuTTY or Terminal)
✅ Hostinger account with VPS
✅ SSH credentials ready
```

### Step 1: Connect via SSH

```bash
# Windows (PowerShell):
ssh -p 65002 u799444911@82.25.96.160

# Password: Be@101010
```

### Step 2: Clone Repository

```bash
cd /home/u799444911
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp
```

### Step 3: Install Dependencies

```bash
npm install
cd frontend
npm install
cd ../backend
npm install
```

### Step 4: Build Frontend

```bash
cd ../frontend
npm run build
```

### Step 5: Start Services

```bash
# Install PM2 (process manager)
npm install -g pm2

# Start backend
cd backend
pm2 start server.js --name "alawael-backend"

# Start frontend server
cd ../frontend
pm2 start -c 'npm run preview' --name "alawael-frontend"

# Save PM2 config
pm2 save
```

### Step 6: Configure Nginx

```bash
# Update Nginx config at: /etc/nginx/sites-available/default
# Add reverse proxy for port 3001

sudo systemctl restart nginx
```

### Step 7: Point Domain

```
1. Go to Hostinger cPanel
2. Add DNS records:
   - A record: your-domain.com → server IP
   - CNAME: www → your-domain.com
3. Wait 24 hours for propagation
```

**Time to Live:** 30 minutes  
**Cost:** $3-5/month

---

## 🐳 PATH 3: DOCKER (Local Testing - 5 minutes)

### Prerequisites

```
✅ Docker Desktop installed
✅ Port 5173 available
✅ Port 3001 available
```

### Step 1: Navigate to Project

```bash
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
```

### Step 2: Start Services

```bash
docker-compose up -d
```

### Step 3: Wait for Startup

```bash
# Check logs
docker-compose logs -f

# Wait until you see:
# "Backend running on port 3001"
# "Frontend ready at port 5173"
```

### Step 4: Access Application

```
Frontend: http://localhost:5173
Backend:  http://localhost:3001
```

### Step 5: Test Login

```
Email: admin@alawael.com
Password: Admin@123456
```

**Time to Live:** 5 minutes  
**Cost:** Free (local)

---

## 📋 DEPLOYMENT CHECKLIST

Before deploying, verify:

- [ ] Frontend build is ready (`build/` folder exists)
- [ ] Backend is configured (`.env` file set)
- [ ] Database is initialized (`data/` folder populated)
- [ ] All tests passing (`npm test` shows success)
- [ ] No compilation errors (`npm run build` succeeds)
- [ ] Security keys configured
- [ ] Environment variables set

---

## 🔧 CONFIGURATION REFERENCE

### Environment Variables Needed

```env
# Backend (.env)
NODE_ENV=production
PORT=3001
DATABASE_URL=./data/db.json
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173

# Frontend (.env.production)
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=production
```

### Default Credentials

```
Email:    admin@alawael.com
Password: Admin@123456
```

---

## ⚠️ TROUBLESHOOTING

### Port Already in Use

```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
```

### Build Fails

```bash
# Clear cache
npm cache clean --force
rm -rf node_modules
npm install
npm run build
```

### Database Connection Error

```bash
# Ensure data folder exists
mkdir -p backend/data

# Copy sample data
cp backend/data/*.json backend/data/
```

---

## 📞 NEED HELP?

| Issue               | Solution                            |
| ------------------- | ----------------------------------- |
| Can't connect to DB | Check `backend/data/` folder exists |
| Port in use         | Change PORT in `.env`               |
| CORS error          | Verify CORS_ORIGIN in `.env`        |
| Build errors        | Run `npm cache clean --force`       |
| Tests failing       | Check Node.js version (need v16+)   |

See `COMPREHENSIVE_DOCUMENTATION.md` for detailed troubleshooting.

---

## 🎯 RECOMMENDED PATH FOR YOU

**Based on your setup:**

👉 **RECOMMENDED: Railway (Option 1)**

**Why?**

- Fastest deployment (5 minutes)
- Free tier available
- Automatic updates
- Built-in monitoring
- No server management
- Automatic SSL/HTTPS

**Next Step:** Go to https://railway.app and follow "PATH 1" above

---

## ✅ AFTER DEPLOYMENT

### Verification Steps

1. Test login with admin credentials
2. Navigate all pages
3. Check API endpoints in Network tab
4. Test file uploads
5. Verify email notifications (if configured)
6. Check security headers
7. Monitor performance

### Monitoring

Monitor your application at:

- Railway Dashboard (if using Railway)
- Server logs (if using Hostinger)
- Docker logs (if using Docker)

### Next Phase

After successful deployment:

1. Set up monitoring/alerting
2. Configure backups
3. Plan database migrations
4. Add payment gateway (if needed)
5. Set up CI/CD pipeline

---

**Status:** ✅ Ready to Deploy  
**Choose your path above and start deploying!**

🚀 Let's go live! 🚀
