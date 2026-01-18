# 🚀 FileZilla Pro Deployment Guide - AlAwael ERP Backend

**Date**: January 15, 2026  
**Status**: ✅ Ready for Production  
**Tests Passing**: 961/961

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [FileZilla Setup](#filezilla-setup)
3. [Hostinger Configuration](#hostinger-configuration)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Setup](#post-deployment-setup)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

- ✅ FileZilla Pro (version 3.40+)
- ✅ Hostinger account with cPanel access
- ✅ SSH access enabled on Hostinger
- ✅ Domain pointing to Hostinger servers

### Required Information (from Hostinger)

- cPanel username
- cPanel password
- Server hostname (e.g., `xxx.hostinger.com`)
- Primary domain
- SSH port (usually 22)

### System Requirements

- Node.js 14.0+ support
- 500MB+ disk space
- 1GB+ RAM
- 1GB+ bandwidth for dependencies

---

## FileZilla Setup

### Step 1: Install FileZilla Pro

1. Download from: https://filezilla-project.org/download.php
2. Install on your local machine
3. Launch FileZilla Pro
4. Accept license agreement

### Step 2: Create New Site Connection

```
File → Site Manager → New Site
```

**Configuration:**

| Setting        | Value                             |
| -------------- | --------------------------------- |
| **Site Name**  | AlAwael-Production                |
| **Protocol**   | SFTP - SSH File Transfer Protocol |
| **Host**       | youraccount.hostinger.com         |
| **Port**       | 22                                |
| **Logon Type** | Normal                            |
| **User**       | cpanel_username                   |
| **Password**   | cpanel_password                   |
| **Charset**    | UTF-8                             |

**Advanced Tab:**

| Setting                  | Value                              |
| ------------------------ | ---------------------------------- |
| **Server Type**          | Unix                               |
| **Default Remote Path**  | /home/cpanel_username/public_html/ |
| **Sync Browsing**        | ✓ Enabled                          |
| **Directory Comparison** | ✓ Enabled                          |

### Step 3: Test Connection

1. Click **"Connect"** button
2. Wait for connection to establish
3. You should see the remote file structure

If **connection fails**:

- Verify SSH is enabled in Hostinger
- Check credentials are correct
- Ensure firewall allows port 22
- Try resetting password in cPanel

---

## Hostinger Configuration

### Step 1: Enable SSH Access

1. Login to Hostinger cPanel
2. Go to: **Security** → **SSH Access**
3. Click **"Manage SSH Keys"**
4. Generate or upload SSH key (optional but recommended)
5. Ensure SSH is **enabled**

### Step 2: Create Application Directory

1. Go to: **File Manager**
2. Navigate to: `/public_html/`
3. Create new folder: `backend`
4. Set permissions: `755`

### Step 3: Create Subdirectories

Via cPanel File Manager or FileZilla:

```
/public_html/backend/
├── api/
├── config/
├── logs/           ← Create this
├── middleware/
├── models/
├── routes/
├── uploads/        ← Create this
├── utils/
├── backups/        ← Create this (optional)
└── node_modules/   ← Will be created by npm
```

**Permissions:**

- Directories: `755`
- Log files: `644`
- .env file: `600`

---

## Deployment Process

### Method A: Complete Upload via FileZilla

#### Step 1: Prepare Files

**On your local machine:**

```bash
cd c:\...\66666\backend

# Clean up unnecessary files
Remove: node_modules/
Remove: .git/
Remove: __tests__/
Remove: .DS_Store
```

#### Step 2: Upload via FileZilla

**In FileZilla:**

1. **Local side** (left panel):
   - Navigate to: `C:\...\66666\backend\`

2. **Remote side** (right panel):
   - Navigate to: `/home/cpanel_username/public_html/backend/`

3. **Select files to upload:**
   - ✓ All files and folders EXCEPT:
     - `node_modules/` (too large - install on server)
     - `.git/` (not needed)
     - `.env` (create on server)
     - `logs/` (will be created)
     - `uploads/` (will be created)

4. **Upload method:**
   - Select all needed files
   - Right-click → **Upload**
   - Or drag-and-drop to remote panel

5. **Monitor upload:**
   - Watch the transfer queue at bottom
   - Wait for "Transfer complete" message
   - Verify file count matches

#### Step 3: Create .env File

1. **Via FileZilla Editor:**
   - Right-click in `backend/` folder (remote)
   - Select **"Create New File"**
   - Name it `.env`
   - Click **"Edit"**

2. **Add configuration:**

```
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
USE_MOCK_DB=false

JWT_SECRET=your_strong_random_secret_key_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
JWT_EXPIRY=7d

FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

3. **Save and upload**

#### Step 4: Set File Permissions

**Via FileZilla:**

1. Select all uploaded files
2. Right-click → **File attributes**
3. Set permissions:
   - **Numeric**: 644
   - Or: Read ✓, Write ✓, Execute ☐ for all

4. For directories:
   - Numeric: 755
   - Or: Read ✓, Write ✓, Execute ✓ for all

5. For `.env` file:
   - Numeric: 600 (owner only)

---

## Post-Deployment Setup

### Step 1: Connect via SSH

**Option A: Terminal/PowerShell**

```bash
ssh cpanel_username@yourdomain.com
# or
ssh -p 22 cpanel_username@yourdomain.com
```

**Option B: Hostinger Terminal**

1. Go to cPanel
2. Go to: **Terminal**
3. Use direct SSH there

### Step 2: Navigate to Application

```bash
cd /home/cpanel_username/public_html/backend
pwd  # Verify location
ls -la  # List files
```

### Step 3: Install Production Dependencies

```bash
# Install npm dependencies (production only)
npm ci --only=production

# Verify installation
npm list --depth=0
```

**Expected output:**

```
alawael-erp-backend@1.0.0
├── axios@1.13.2
├── bcryptjs@3.0.3
├── express@4.22.1
├── mongoose@9.1.2
├── jsonwebtoken@9.0.3
└── ... (other dependencies)
```

### Step 4: Install PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 -v
```

### Step 5: Start Application with PM2

```bash
# Start the application
pm2 start ecosystem.config.js

# Verify it's running
pm2 status
pm2 logs alawael-backend
```

**Expected output from pm2 status:**

```
id  │ name                  │ namespace   │ version │ mode    │ pid      │ status    │ uptime
───┼───────────────────────┼─────────────┼─────────┼─────────┼──────────┼───────────┼──────────
 0  │ alawael-backend       │ default     │ 1.0.0   │ cluster │ 12345    │ online    │ 2m 34s
```

### Step 6: Enable Auto-Restart on Reboot

```bash
# Generate startup script
pm2 startup

# Save PM2 configuration
pm2 save

# Verify auto-startup
pm2 show alawael-backend
```

---

## Verification

### Test 1: Health Check Endpoint

```bash
# Test locally (from server)
curl http://localhost:3001/api/health

# Test remotely (from your machine)
curl https://yourdomain.com/api/health
```

**Expected response:**

```json
{
  "status": "ok",
  "message": "AlAwael ERP Backend - Healthy",
  "timestamp": "2026-01-15T10:30:45.123Z",
  "uptime": 125.456
}
```

### Test 2: Authentication Endpoints

```bash
# Register new user
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@12345",
    "fullName": "Test User"
  }'

# Login
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@12345"
  }'
```

### Test 3: Monitor Application

```bash
# View real-time logs
pm2 logs alawael-backend

# Monitor resources
pm2 monit

# Check specific log file
tail -f /home/cpanel_username/public_html/backend/logs/app.log
```

---

## Troubleshooting

### Issue: Connection Refused

**Problem**: `curl: (7) Failed to connect to yourdomain.com port 443`

**Solutions**:

1. Check if application is running: `pm2 status`
2. Check logs: `pm2 logs alawael-backend`
3. Verify port configuration: Check `.env` PORT value
4. Check firewall: Ensure port 3001 is not blocked

### Issue: Module Not Found

**Problem**: `Cannot find module 'express'`

**Solutions**:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm ci --only=production

# Verify Node.js version
node -v  # Should be 14.0+
npm -v
```

### Issue: Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::3001`

**Solutions**:

```bash
# Find process on port 3001
lsof -i :3001
# or
fuser 3001/tcp

# Kill process
kill -9 <PID>

# Or restart with PM2
pm2 restart alawael-backend
```

### Issue: .env File Not Found

**Problem**: Application can't read environment variables

**Solutions**:

1. Verify .env file exists: `ls -la .env`
2. Check file is in correct directory
3. Verify permissions: `644` minimum
4. Restart application: `pm2 restart alawael-backend`

### Issue: Database Connection Fails

**Problem**: `MongooseError: Cannot connect to MongoDB`

**Solutions**:

```bash
# Verify connection string in .env
cat .env | grep MONGODB_URI

# Test connection manually
node -e "require('mongoose').connect(process.env.MONGODB_URI)"

# Check MongoDB Atlas:
# - Whitelist server IP in security rules
# - Verify username/password
# - Check database name in connection string
```

---

## Maintenance

### Daily Tasks

```bash
# Check application status
pm2 status

# Review error logs
tail -f logs/error.log

# Monitor resources
pm2 monit
```

### Weekly Tasks

```bash
# Check for security updates
npm audit

# Review all logs
pm2 logs --lines 1000 alawael-backend

# Verify backups are running
ls -la backups/
```

### Monthly Tasks

```bash
# Update dependencies
npm audit fix
npm update

# Full restart to ensure stability
pm2 restart alawael-backend

# Verify database backups
# Check MongoDB Atlas backup status
```

### Updating Code

**When deploying updates:**

```bash
# 1. Backup current version
cp -r . ../backup-$(date +%s)

# 2. Upload new files via FileZilla

# 3. Install any new dependencies
npm ci --only=production

# 4. Zero-downtime restart
pm2 reload alawael-backend

# 5. Verify
pm2 logs alawael-backend
curl https://yourdomain.com/api/health
```

### Rollback Procedure

**If something goes wrong:**

```bash
# 1. Stop application
pm2 stop alawael-backend

# 2. Restore from backup
rm -rf *
cp -r ../backup-<timestamp>/* .

# 3. Reinstall dependencies
npm ci --only=production

# 4. Restart
pm2 start alawael-backend

# 5. Verify
pm2 logs alawael-backend
```

---

## Security Reminders

⚠️ **CRITICAL**:

- [ ] Change JWT_SECRET to unique strong value
- [ ] Change JWT_REFRESH_SECRET to unique strong value
- [ ] Whitelist server IP in MongoDB Atlas
- [ ] Enable HTTPS/SSL on domain
- [ ] Set CORS_ORIGIN to your domain only
- [ ] Disable test endpoints in production
- [ ] Review and harden security headers
- [ ] Monitor logs for attacks

---

## Support & Documentation

- **API Docs**: https://yourdomain.com/api-docs
- **Health Check**: https://yourdomain.com/api/health
- **Error Logs**: `/logs/error.log`
- **Application Logs**: `/logs/app.log`

---

**Last Updated**: January 15, 2026  
**Tested With**: Node.js 18+, npm 9+, Hostinger cPanel  
**Status**: ✅ Production Ready
