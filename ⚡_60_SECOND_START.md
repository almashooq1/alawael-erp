# ⚡ START IN 60 SECONDS - Quick Launch Guide

## 🚀 The Fastest Way

### Windows (PowerShell):

```powershell
# 1. Open PowerShell as Administrator
# 2. Allow script execution (one time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 3. Run the script
.\START_ALL_SERVICES_V3.ps1
```

Done! 🎉 This will open 3 windows for Backend, Frontend, and Gateway.

---

## 📋 Manual Way (Step by Step)

### 1. MongoDB

```powershell
# Check if running
Get-Process | Where-Object { $_.ProcessName -like "*mongod*" }

# If not, start it
mongod --dbpath C:\data\db
```

### 2. Backend

```powershell
cd backend
npm start
```

### 3. Frontend (new window)

```powershell
cd frontend
npm run start
```

### 4. Gateway (new window)

```powershell
cd gateway
npm start
```

---

## ✅ Verify (30 seconds)

Open browser:

- http://localhost:3001/health - Backend
- http://localhost:3004 - Frontend (admin/admin123)
- http://localhost:8080/health - Gateway

---

## 📚 Full Documentation

- [📖_COMPLETE_FOLLOWUP_GUIDE.md](./📖_COMPLETE_FOLLOWUP_GUIDE.md)
- [🚀_QUICK_START_V3.md](./🚀_QUICK_START_V3.md)

**Version:** 3.0.0 | **Date:** Jan 24, 2026
