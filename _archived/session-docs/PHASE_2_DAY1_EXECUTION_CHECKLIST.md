# 📋 PHASE 2 - Step-by-Step Execution Checklist

**Start Date:** February 20, 2026  
**Target:** Complete in 3-5 days

---

## 🎯 TODAY'S GOALS (Day 1)

### ✅ Must Complete Today:

1. MongoDB Atlas Account + Cluster (90 min)
2. Redis Cloud Account + Database (30 min)
3. SendGrid Account + API Key (45 min)
4. Update .env.production (30 min)

**Total: 4-5 hours | Deadline: EOD Today**

---

# 📖 STEP 1: MONGODB ATLAS SETUP

## Part A: Create Account (15 minutes)

### 1. Go to MongoDB Atlas

```
URL: https://www.mongodb.com/cloud/atlas
```

### 2. Click "Sign Up"

```
Fill in:
- Email: [YOUR EMAIL]
- Password: [STRONG PASSWORD - 12+ chars]
- First Name: [YOUR NAME]
- Last Name: [YOUR SURNAME]
- Accept Terms
- Click "Create Account"
```

### 3. Verify Your Email

```
✓ Check your email inbox
✓ Click the verification link
✓ You'll be logged in automatically
```

### 4. Complete Onboarding Questions

```
"What are you building?" → ERP System
"Which language?" → Node.js
"What do you want to learn about first?" → Skip (Deployment)
```

---

## Part B: Create Cluster (30 minutes)

### 1. Click "Build a Cluster"

```
Or: "Create" → "Build a Database"
```

### 2. Select Hosting Options

```
Cloud Provider: AWS
Region: us-east-1 (us-east-1a preferred)
Cluster Tier: M0 (FREE - Perfect for dev)
Cluster Name: alawael-erp-prod
```

### 3. Configure Security

```
Automatic Security Configuration: ✓ YES
Version: Latest MongoDB (stable)
```

### 4. Click "Create Deployment"

```
Status: Creating Cluster...
⏳ Wait 5-15 minutes
🔔 You'll get email when ready
```

**Expected Output:**

```
Cluster Status: AVAILABLE ✓
Region: us-east-1 ✓
```

---

## Part C: Create Database User (15 minutes)

### 1. Go to "Security" Tab

```
Left Menu → Security → Database Access
```

### 2. Click "Add New Database User"

```
Method: Password
```

### 3. Enter Credentials

```
Username: alawael_prod_user
Password: [GENERATE STRONG PASSWORD]
   ↓
   SAVE THIS PASSWORD SOMEWHERE SAFE!
   ↓
Database User Privileges: Read and write to any database
```

### 4. Click "Add User"

```
Status: User Created ✓
```

---

## Part D: Allow IP Access (10 minutes)

### 1. Go to "Security" Tab

```
Left Menu → Security → Network Access
```

### 2. Click "Add IP Address"

```
Options:
a) Add Current IP Address (RECOMMENDED)
b) Allow Access from Anywhere (0.0.0.0/0)
   ↓ Only for testing!
```

### 3. For Production:

```
Click "Add Current IP Address"
Your IP will be auto-detected
Add a description: "Office Network"
Click "Confirm"
```

---

## Part E: Get Connection String (10 minutes)

### 1. Click "Databases" (top menu)

```
Your cluster appears in the list
```

### 2. Click "Connect" Button

```
A popup appears with connection options
```

### 3. Select "Drivers"

```
Language: Node.js
Driver: mongodb (Node.js SDK)
Version: 3.x
```

### 4. Copy Connection String

```
Format:
mongodb+srv://alawael_prod_user:PASSWORD@cluster.mongodb.net/database?retryWrites=true&w=majority

⚠️ IMPORTANT: Replace PASSWORD with your actual password!
```

### 5. You should see:

```
✓ Connection URL ready
✓ Database name field (default: test)
✓ Sample connection code
```

---

## 💾 MongoDB Setup Complete! ✅

**Save These Values:**

```
Connection String:
mongodb+srv://alawael_prod_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/alawael_production?retryWrites=true&w=majority

Username: alawael_prod_user
Password: [SAVED PASSWORD]
Cluster Name: alawael-erp-prod
```

**Time Spent:** ~90 minutes
**Status:** ✅ COMPLETE

---

# 📖 STEP 2: REDIS CLOUD SETUP

## Part A: Create Account (10 minutes)

### 1. Go to Redis Cloud

```
URL: https://redis.com/try-free
```

### 2. Click "Get Started"

```
Fill in:
- Email: [YOUR EMAIL]
- Password: [STRONG PASSWORD]
- First Name: [NAME]
- Last Name: [SURNAME]
- Accept Terms
```

### 3. Verify Email

```
✓ Check inbox
✓ Click verification link
✓ Set up your free plan
```

---

## Part B: Create Database (15 minutes)

### 1. Click "Create Database"

```
Or: New Database → Free Tier
```

### 2. Configure Database

```
Cloud Provider: AWS
Region: us-east-1
Database: alawael-cache
Memory: 30MB (FREE)
Throughput: ~20k ops/sec
Durability: Enabled
```

### 3. Click "Create Database"

```
Status: Provisioning...
⏳ Wait 2-3 minutes
🔔 Watch status = Active
```

---

## Part C: Get Connection Details (10 minutes)

### 1. Click on Your Database

```
Shows: alawael-cache
```

### 2. Find "Configuration" or "Connect"

```
You'll see:
- Public endpoint: redis-xxxxx.cloud.redislabs.com:xxxxx
- Password: YOUR_REDIS_PASSWORD
```

### 3. Copy These Values

```
Host: redis-xxxxx.cloud.redislabs.com
Port: xxxxx
Password: [SAVE THIS]
```

---

## 💾 Redis Setup Complete! ✅

**Save These Values:**

```
Host: redis-xxxxx.cloud.redislabs.com
Port: xxxxx
Password: [SAVED PASSWORD]
Connection: redis://:PASSWORD@HOST:PORT
```

**Time Spent:** ~30 minutes
**Status:** ✅ COMPLETE

---

# 📖 STEP 3: SENDGRID SETUP

## Part A: Create Account (10 minutes)

### 1. Go to SendGrid

```
URL: https://sendgrid.com
```

### 2. Click "Sign Up"

```
Email: [YOUR EMAIL]
Password: [STRONG PASSWORD]
Company: Alawael
```

### 3. Verify Email

```
✓ Check inbox → Click link
```

---

## Part B: Configure Sender (15 minutes)

### 1. Go to "Sender Authentication"

```
Settings → Sender Authentication
Or search "Sender Authentication"
```

### 2. Click "Verify a Single Sender"

```
Or "Create Sender"
```

### 3. Enter Details

```
From Email: noreply@alawael-erp.com
   Note: Use your domain or personal email
From Name: Alawael ERP System
Reply To: support@alawael-erp.com
Address: [Your Company Address]
City: [City]
State: [State]
Zip: [Zip]
Country: [Country]
```

### 4. Verify Sender

```
✓ Check email inbox
✓ Click "Verify Sender Email"
Status should show: VERIFIED ✓
```

---

## Part C: Create API Key (15 minutes)

### 1. Go to "API Keys"

```
Settings → API Keys
Or search "API Keys"
```

### 2. Click "Create API Key"

```
Button top right
```

### 3. Configure Key

```
API Key Name: Alawael Production
Permissions: Full Access (for now)
  Note: Restrict later to Mail Send only
```

### 4. Click "Create & Copy"

```
⚠️ IMPORTANT: Copy immediately!
⚠️ You can't see it again!
Format: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. Save the Key

```
Keep in secure location:
SENDGRID_API_KEY=SG.YOUR_FULL_KEY
```

---

## 💾 SendGrid Setup Complete! ✅

**Save These Values:**

```
API Key: SG.XXXX_XXXX_XXXXXXX (FULL KEY)
Sender Email: noreply@alawael-erp.com
Sender Name: Alawael ERP System
```

**Time Spent:** ~40 minutes
**Status:** ✅ COMPLETE

---

# ⚙️ STEP 4: UPDATE .env.production

## File Location:

```
erp_new_system/backend/.env.production
```

## Part A: Open File

```
Open in VS Code:
Ctrl+O → Navigate to .env.production
```

## Part B: Update Database Section

```env
# BEFORE:
MONGODB_URL=mongodb+srv://erp_user:CHANGE_THIS_PASSWORD@cluster0.mongodb.net/erp_production?retryWrites=true&w=majority

# AFTER:
MONGODB_URL=mongodb+srv://alawael_prod_user:YOUR_ACTUAL_PASSWORD@cluster0.xxxxx.mongodb.net/alawael_production?retryWrites=true&w=majority
```

## Part C: Update Cache Section

```env
# BEFORE:
REDIS_URL=redis://:PASSWORD@redis-endpoint.cache.amazonaws.com:6379
REDIS_PASSWORD=CHANGE_THIS

# AFTER:
REDIS_URL=redis://:YOUR_PASSWORD@redis-xxxxx.cloud.redislabs.com:xxxxx
REDIS_PASSWORD=YOUR_PASSWORD
```

## Part D: Update Email Section

```env
# ADD (if not present):
SENDGRID_API_KEY=SG.YOUR_FULL_API_KEY
EMAIL_FROM=noreply@alawael-erp.com
```

## Part E: Save File

```
Ctrl+S
Status: ✓ Saved
```

---

## ✅ DAILY SUMMARY

### What You Accomplished Today:

- ✅ MongoDB Atlas: Cluster + User + Connection String
- ✅ Redis Cloud: Database + Credentials
- ✅ SendGrid: Account + Sender + API Key
- ✅ .env.production: Updated with real credentials

### Time Invested:

- MongoDB: 90 minutes
- Redis: 30 minutes
- SendGrid: 45 minutes
- Config Update: 30 minutes
- **TOTAL: ~3.25 hours** ⏱️

### Files Modified:

- ✅ .env.production

### Ready for Tomorrow:

- ✅ Infrastructure backend ready
- ⏳ Azure App Insights setup
- ⏳ Security & SSL/TLS configuration

---

## 🎯 TOMORROW'S GOALS (Day 2)

### Morning Tasks:

1. Azure App Insights Setup (60 min)
2. Security Configuration (60 min)
3. System Testing (30 min)

**Estimated: 3-4 hours**

---

## 📞 TROUBLESHOOTING

### MongoDB Issues:

- Can't find connection string?
  → Go to Cluster → Connect → Drivers
- Forgot password?
  → Security → Database Access → Reset Password

### Redis Issues:

- Can't connect?
  → Check IP whitelist in Network
- Forgot password?
  → Database Details → Change Password

### SendGrid Issues:

- Email not verified?
  → Resend verification email
- Can't find API key?
  → Create a new one (old one lost)

---

## ✨ NEXT STEP

**Tomorrow Morning:**

```
1. Azure App Insights Setup (60 min)
2. Final Validation (30 min)
3. Ready for Deployment!
```

**Celebrate Today's Progress! 🎉**
You've completed the core infrastructure setup!

---

**Date Completed:** February 20, 2026
**Sessions Used:** 1
**Status:** ✅ PHASE 2 DAY 1 COMPLETE
