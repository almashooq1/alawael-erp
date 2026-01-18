# 🎯 Quick Deployment Reference Card

**Project**: AlAwael ERP Backend | **Status**: ✅ Ready | **Date**: Jan 15, 2026

---

## 📌 Essential Credentials (Save Securely)

```
HOSTINGER CPANEL LOGIN:
- Host: xxx.hostinger.com
- Username: [YOUR_CPANEL_USER]
- Password: [YOUR_CPANEL_PASS]
- Port: 22 (SSH)

MONGODB ATLAS:
- Connection: mongodb+srv://[USER]:[PASS]@cluster.mongodb.net/[DB]
- User: [USERNAME]
- Password: [PASSWORD]

JWT SECRETS (Generate Strong Random Values):
- JWT_SECRET: [GENERATE 32+ CHAR RANDOM STRING]
- JWT_REFRESH_SECRET: [GENERATE 32+ CHAR RANDOM STRING]
```

---

## 🚀 5-Minute Quick Start

### 1. FileZilla Upload (10 minutes)

```
FileZilla → Connect → /public_html/backend/
Drag-drop all files (except node_modules/, .git/)
Set permissions: dirs 755, files 644, .env 600
```

### 2. Create .env on Server (2 minutes)

```
Copy .env.example to .env
Edit with production values
Save and set chmod 600
```

### 3. SSH Commands (5 minutes)

```bash
ssh cpanel_user@yourdomain.com
cd /home/cpanel_user/public_html/backend

npm ci --only=production
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### 4. Verify (2 minutes)

```bash
pm2 status
curl https://yourdomain.com/api/health
pm2 logs alawael-backend
```

---

## 📋 FileZilla Configuration

```
Protocol: SFTP (SSH File Transfer Protocol)
Host: youraccount.hostinger.com
Port: 22
Username: cpanel_username
Password: cpanel_password
Remote Path: /home/cpanel_username/public_html/backend/
Charset: UTF-8
Server Type: Unix
```

---

## 🔑 SSH Quick Commands

```bash
# Connect
ssh cpanel_user@yourdomain.com

# Navigate to app
cd /home/cpanel_user/public_html/backend

# Install dependencies (production only)
npm ci --only=production

# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# View status
pm2 status
pm2 logs alawael-backend

# Enable auto-restart on reboot
pm2 startup
pm2 save

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart alawael-backend
```

---

## 🧪 Verification Tests

```bash
# Health check
curl https://yourdomain.com/api/health

# Register
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123","fullName":"Test"}'

# Login
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123"}'

# Check logs
pm2 logs alawael-backend --lines 50
```

---

## ⚠️ Critical Do's & Don'ts

**DO:**
✅ Use strong random values for JWT secrets
✅ Set .env file permissions to 600
✅ Test all endpoints after deployment
✅ Monitor logs for 24 hours
✅ Keep local backup before uploading
✅ Whitelist server IP in MongoDB Atlas

**DON'T:**
❌ Upload node_modules/ folder
❌ Upload .git/ folder
❌ Commit .env file to git
❌ Use development values in production
❌ Share .env file with anyone
❌ Run as root user
❌ Skip backup procedures

---

## 🔄 Quick Rollback (If Something Breaks)

```bash
# Stop application
pm2 stop alawael-backend

# Restore backup (if exists)
cp -r ../backup-[timestamp]/* .

# Reinstall
npm ci --only=production

# Restart
pm2 start ecosystem.config.js

# Verify
pm2 logs alawael-backend
```

---

## 📞 Emergency Contacts

- **Hostinger Support**: support.hostinger.com
- **MongoDB Support**: mongodb.com/support
- **Node.js Issues**: nodejs.org/docs
- **Application Issues**: Check logs with `pm2 logs`

---

## ✅ Pre-Upload Checklist

- [ ] Tests passing locally (961/961)
- [ ] .env prepared with production values
- [ ] ecosystem.config.js ready
- [ ] Hostinger SFTP credentials ready
- [ ] MongoDB URI verified
- [ ] JWT secrets generated
- [ ] FileZilla configured
- [ ] node_modules/ removed locally
- [ ] .git/ removed from upload
- [ ] Backup created

---

## 📊 Status Dashboard

| Component    | Status      | Details           |
| ------------ | ----------- | ----------------- |
| Code Tests   | ✅ 961/961  | All passing       |
| Files        | ✅ Ready    | Organized         |
| Config       | ✅ Ready    | Templates created |
| Dependencies | ✅ Verified | npm ls checked    |
| Security     | ✅ Baseline | Credentials safe  |
| Deployment   | ⏳ Ready    | Awaiting action   |

---

**🚀 Next Action**: Open FileZilla → Connect to Hostinger → Upload backend files

**Estimated Time**: 20-30 minutes total  
**Downtime**: None (new deployment)  
**Rollback Time**: 5 minutes
