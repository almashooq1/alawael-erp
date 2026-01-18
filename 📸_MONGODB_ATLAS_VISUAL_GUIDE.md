# 📸 MongoDB Atlas Visual Guide - شرح بالصور

## How to Setup MongoDB Atlas (10 Minutes)

---

## ✅ Step 1: Register

### Go to:

```
https://www.mongodb.com/cloud/atlas/register
```

### What you'll see:

```
┌─────────────────────────────────┐
│  MongoDB Atlas                  │
│  Sign up with:                  │
│  [Google] [Email] [GitHub]      │
└─────────────────────────────────┘
```

**Click:** Sign up with Google (fastest)

### Fill in:

- Email / Google account
- Password (create one)
- Accept terms

**Click:** Create account

✅ **Now you're in Dashboard**

---

## ✅ Step 2: Create Cluster

### After login, you'll see:

```
┌───────────────────────────────────┐
│ Welcome to MongoDB Atlas!         │
│                                   │
│ [Create Deployment] ← CLICK HERE  │
└───────────────────────────────────┘
```

### In Create Deployment window:

**Choose Tier:**

```
Free Tier (M0 Sandbox) ← SELECT THIS
Shared Tier
Dedicated Tier
```

**Choose Provider:**

```
AWS ← SELECT THIS
Azure
Google Cloud
```

**Choose Region:**

```
Asia
  - Singapore (ap-southeast-1)
Europe
  - Frankfurt (eu-central-1) ← GOOD CHOICE
  - Ireland (eu-west-1)
```

**Cluster Name:**

```
Input: alawael-erp
```

**Click:** Create Deployment

### You'll see:

```
⏳ Provisioning cluster...
   30% ... 60% ... 100%
✅ Cluster created!
```

**Wait 2-3 minutes for green checkmark ✅**

---

## ✅ Step 3: Create Database User

### From left menu, click: **Database Access**

```
┌──────────────────┐
│ Deployment       │
│ Database Access  ← CLICK HERE
│ Network Access   │
│ ...              │
└──────────────────┘
```

### Click: **Add New Database User**

### Fill in:

```
┌─────────────────────────────┐
│ Create MongoDB Database User│
│                             │
│ Username:                   │
│ [alawael_admin        ]     │
│                             │
│ Password:                   │
│ [Admin@2026           ]     │
│                             │
│ Confirm Password:           │
│ [Admin@2026           ]     │
│                             │
│ [Create User]               │
└─────────────────────────────┘
```

**Click:** Create User

✅ **User created!**

---

## ✅ Step 4: Allow Connections

### From left menu, click: **Network Access**

```
┌──────────────────┐
│ Deployment       │
│ Database Access  │
│ Network Access   ← CLICK HERE
│ ...              │
└──────────────────┘
```

### Click: **Add IP Address**

### You'll see:

```
┌─────────────────────────────┐
│ Add IP Address              │
│                             │
│ [Allow from Anywhere]       │
│                             │
│ IP: 0.0.0.0/0               │
│                             │
│ [Confirm] ← CLICK THIS      │
└─────────────────────────────┘
```

**Click:** Confirm

✅ **IP added!**

---

## ✅ Step 5: Get Connection String

### From left menu, click: **Databases**

```
┌──────────────────┐
│ Deployment       │
│ Databases ← CLICK HERE
│ Database Access  │
│ ...              │
└──────────────────┘
```

### You'll see your cluster: **alawael-erp**

### Click: **Connect**

### Choose: **Connect your application**

### In next screen:

```
Driver:    Node.js ← SELECT
Version:   5.5 or later ← SELECT
```

### You'll see Connection String:

```
mongodb+srv://alawael_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 📋 Copy this entire string!

---

## ✅ Step 6: Edit Connection String

### Take the string you copied:

```
mongodb+srv://alawael_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Replace `<password>` with `Admin@2026`:

```
mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Replace `/?` with `/alawael-erp?`:

```
mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

✅ **Connection String ready!**

---

## ✅ Step 7: Update Your Code

### Open Terminal:

```powershell
cd backend
notepad .env
```

### Find this section:

```env
# Database Configuration (MongoDB)
MONGODB_URI=mongodb://localhost:27017/alawael-erp
USE_MOCK_DB=true
```

### Replace with:

```env
# Database Configuration (MongoDB)
MONGODB_URI=mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
USE_MOCK_DB=false
```

### Save: `Ctrl+S`

### Close: `Ctrl+Q`

✅ **.env updated!**

---

## ✅ Step 8: Import Sample Data

### In Terminal:

```powershell
cd backend
node scripts\seed.js
```

### You should see:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
🧹 Clearing existing data...
🏢 Inserting organization data...
   ✅ Organization created: منظمة الأوائل
👥 Inserting employee data...
   ✅ أحمد المحمد
   ✅ فاطمة العلي
   ✅ خالد السعيد
📊 Inserting department data...
🏢 Inserting branch data...
✅ Data seeding completed successfully!
```

✅ **Data imported!**

---

## ✅ Step 9: Verify Connection

### In Terminal:

```powershell
node scripts\verify-mongodb.js
```

### You should see:

```
🔍 MongoDB Connection Verification

1. Reading .env configuration...
   MongoDB URI: mongodb+srv://alawael_admin...
   USE_MOCK_DB: false

2. Connecting to MongoDB...
✅ Connected to MongoDB!

3. Database Information:
   Database Name: alawael-erp
   Collections: 5
   Data Size: 0.15 MB

4. Collections:
   ✅ organizations: 1 documents
   ✅ employees: 3 documents
   ✅ departments: 4 documents
   ✅ branches: 2 documents
   ✅ kpis: 10 documents

5. Testing Data Read:
   ✅ Found 1 organization(s)
      Name: منظمة الأوائل

✅ Connection Verification Complete!
```

✅ **Everything working!**

---

## 🚀 Step 10: Start the System

### Terminal 1 (Backend):

```powershell
cd backend
npm start
```

### Should show:

```
✅ Connected to MongoDB: alawael-erp
🚀 Server is running on port 3001
```

### Terminal 2 (Frontend):

```powershell
cd frontend
npm start
```

### Should start React on port 3002

### In Browser:

```
http://localhost:3002
```

✅ **Done!** 🎉

---

## 🔄 Verify Data Persistence

### To confirm data stays after restart:

**Step 1:** Start system (as above)

**Step 2:** In new Terminal, get data:

```powershell
$response = Invoke-RestMethod http://localhost:3001/api/organizations
$response | ConvertTo-Json
```

**Step 3:** Stop Backend (Ctrl+C in Terminal 1)

**Step 4:** Start Backend again:

```powershell
npm start
```

**Step 5:** Get data again:

```powershell
$response = Invoke-RestMethod http://localhost:3001/api/organizations
$response | ConvertTo-Json
```

**Result:** Same data! ✅

---

## ❌ Troubleshooting

### Problem: "MongoServerError: bad auth"

**Cause:** Wrong password or username

**Fix:**

1. Open .env
2. Check: `alawael_admin` and `Admin@2026` are correct
3. Double-check in MongoDB Atlas that user exists

---

### Problem: "ECONNREFUSED" or "MongooseServerSelectionError"

**Cause:** IP not allowed

**Fix:**

1. Go to MongoDB Atlas → Network Access
2. Click: Add IP Address
3. Select: Allow from Anywhere (0.0.0.0/0)
4. Confirm

---

### Problem: "getaddrinfo ENOTFOUND cluster0.xxxxx.mongodb.net"

**Cause:** Internet issue or typo in connection string

**Fix:**

1. Check internet connection
2. Copy connection string again from MongoDB Atlas
3. Make sure you replaced `<password>` and `/?`

---

### Problem: Data not showing after restart

**Cause:** USE_MOCK_DB is still true

**Fix:**

```powershell
# Check current setting
cat .env | Select-String "USE_MOCK_DB"

# Should show:
# USE_MOCK_DB=false

# If it shows true, change it to false in .env
```

---

## 📋 Complete Checklist

- [ ] Registered at mongodb.com
- [ ] Created M0 Sandbox cluster
- [ ] Created user (alawael_admin / Admin@2026)
- [ ] Added IP address (0.0.0.0/0)
- [ ] Got connection string
- [ ] Updated .env with MONGODB_URI
- [ ] Set USE_MOCK_DB=false
- [ ] Ran: node scripts\seed.js
- [ ] Verified: node scripts\verify-mongodb.js
- [ ] Started: npm start (Backend)
- [ ] Started: npm start (Frontend)
- [ ] Opened: http://localhost:3002
- [ ] Tested API: /api/organizations
- [ ] Restarted and verified data persistence

---

## 📱 Quick Reference Commands

```powershell
# Verify MongoDB connection
node scripts\verify-mongodb.js

# Import sample data
node scripts\seed.js

# Start backend
npm start

# Start frontend
cd frontend; npm start

# Get all organizations via API
Invoke-RestMethod http://localhost:3001/api/organizations

# Backup database
node scripts\backup.js

# List backups
node scripts\backup.js list
```

---

## 🎯 What's Next?

After successful MongoDB setup:

1. **Priority 2:** Schedule Backups (30 min)
2. **Priority 3:** Domain + SSL (1 hour)
3. **Priority 4:** Testing (1 hour)
4. **Priority 5:** Production (1 hour 10 min)

**Total:** 4 hours to production! 🚀

---

**Created:** 17 يناير 2026  
**Version:** 1.0  
**Status:** Ready to use ✅
