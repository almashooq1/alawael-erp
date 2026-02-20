# ⚡ Phase 5 - Database Integration: Quick Start Guide

## تشغيل قاعدة البيانات وربطها بالنظام

---

## 🚀 Step-by-Step Execution

### **Step 1: Install Dependencies** (3 minutes)

```bash
# Navigate to backend
cd backend

# Install Mongoose and Bcryptjs
npm install mongoose bcryptjs

# Verify installation
npm list mongoose bcryptjs
```

**Expected Output:**

```
├── bcryptjs@2.4.3
└── mongoose@7.x.x
```

---

### **Step 2: Start MongoDB Server** (2 minutes)

#### Option A: Local MongoDB (Windows)

```bash
# If MongoDB is installed locally
mongod

# Should show: "waiting for connections on port 27017"
```

#### Option B: MongoDB Atlas (Cloud)

```bash
# Update .env with your connection string
# MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/erp_new
```

#### Option C: Docker MongoDB

```bash
# If using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verify running
docker ps | grep mongodb
```

**What to Check:**

- ✅ MongoDB listens on `localhost:27017`
- ✅ No connection errors in logs
- ✅ Database name: `erp_new`

---

### **Step 3: Verify Database Configuration** (2 minutes)

```bash
# Check .env file
cat backend/.env | grep -i mongo

# Should show:
# MONGODB_URL=mongodb://localhost:27017/erp_new
```

---

### **Step 4: Start Backend Server** (3 minutes)

```bash
# From backend directory
npm run dev

# Or manually:
node server.js
```

**Expected Logs:**

```
🚀 Starting server...
[MongoDB] Attempting connection to mongodb://localhost:27017/erp_new
✅ MongoDB connected successfully!
✅ Server running on http://localhost:3005
```

**Troubleshooting:**

- ❌ "connection refused" → MongoDB not running
- ❌ "ENOENT: no such file" → Missing database.js or schemas.js
- ❌ "validation error" → Check .env variables

---

### **Step 5: Run Database Seeding Script** (2 minutes)

```bash
# In new terminal, navigate to backend
cd backend

# Run seeding script
node scripts/seed.js

# Or using npm script (if configured)
npm run seed
```

**Expected Output:**

```
🌱 Starting database seeding...
✅ Database cleared and reset
✅ Created 3 users:
   - Email: admin@example.com (Admin)
   - Email: manager@example.com (Manager)
   - Email: user@example.com (User)
✅ Created 2 pages:
   - Home Page (Published)
   - About Page (Published)
✅ Created 1 blog post:
   - ERP System Introduction
✅ Database seeding completed successfully!

📋 Admin Credentials:
   Email: admin@example.com
   Password: admin123456
```

---

### **Step 6: Test Database Connection** (5 minutes)

#### Test 1: Check Users in Database

```bash
# Using curl or Postman
POST http://localhost:3005/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123456"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "...",
      "name": "Ahmed",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

#### Test 2: Get All Users

```bash
GET http://localhost:3005/api/users
Authorization: Bearer <your_token>
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Ahmed",
      "email": "admin@example.com",
      "role": "admin",
      "status": "active"
    }
    // ... more users
  ],
  "total": 3
}
```

#### Test 3: Get Pages

```bash
GET http://localhost:3005/api/cms/pages
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Home",
      "slug": "home",
      "status": "published",
      "author": "Ahmed"
    }
    // ... more pages
  ]
}
```

---

## 📊 Database Schema Overview

### Users Collection (3 Documents)

```javascript
{
  _id: ObjectId(...),
  name: "Ahmed",
  email: "admin@example.com", // Unique
  password: "$2a$10$...", // Hashed
  role: "admin", // admin|manager|user
  department: "IT",
  phone: "+20100000000",
  status: "active", // active|inactive|suspended
  emailVerified: true,
  loginAttempts: 0,
  lastLogin: 2026-01-20T10:00:00Z,
  createdAt: 2026-01-20T08:00:00Z
}
```

### Pages Collection (2 Documents)

```javascript
{
  _id: ObjectId(...),
  title: "Home",
  slug: "home", // Unique
  content: "Welcome to ERP System",
  status: "published", // draft|published|scheduled
  author: ObjectId(...), // Ref: User
  views: 0,
  seoTitle: "Home | ERP System",
  seoDescription: "Welcome to our ERP System",
  createdAt: 2026-01-20T08:00:00Z
}
```

### Posts Collection (1 Document)

```javascript
{
  _id: ObjectId(...),
  title: "ERP System Introduction",
  slug: "erp-introduction",
  content: "Learn about our new ERP System",
  author: ObjectId(...), // Ref: User
  status: "published",
  category: "News",
  tags: ["erp", "introduction"],
  createdAt: 2026-01-20T08:00:00Z
}
```

### Indexes Created

```javascript
User.index({ email: 1 }); // Fast email lookup
Page.index({ slug: 1 }); // Fast slug lookup
Post.index({ slug: 1 }); // Fast slug lookup
Analytics.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // TTL 90 days
AuditLog.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // TTL 1 year
```

---

## 🔧 Configuration Details

### Database Configuration File: `backend/config/database.js`

**Features:**

- ✅ Multi-environment support (dev/prod/test)
- ✅ Automatic retry on connection failure (every 5 seconds)
- ✅ Connection pooling for performance
- ✅ Event listeners for monitoring
- ✅ Graceful disconnection

**Environment Variables Used:**

```bash
MONGODB_URL=mongodb://localhost:27017/erp_new # Development
MONGODB_PROD_URL=mongodb+srv://... # Production
MONGODB_TEST_URL=mongodb://localhost:27017/erp_test # Testing
```

---

## 🎯 What's Changed

### Before Phase 5:

```
All data was in-memory (RAM)
Services used mock/fake data
No persistence between restarts
All users lost when server stopped
```

### After Phase 5:

```
✅ All data persists in MongoDB
✅ Services use real database
✅ Data survives server restarts
✅ Multiple servers can share same database
✅ Ready for scaling
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "connect ECONNREFUSED"

**Cause:** MongoDB not running **Solution:**

```bash
# Windows - Start MongoDB
mongod

# Mac/Linux - Start MongoDB
brew services start mongodb-community

# Docker - Start MongoDB container
docker start mongodb
```

### Issue 2: "MongooseError: cannot connect to mongodb"

**Cause:** Wrong connection string **Solution:**

```bash
# Check .env
cat backend/.env | grep MONGODB

# Verify MongoDB is listening
netstat -an | grep 27017 (Windows)
lsof -i :27017 (Mac/Linux)
```

### Issue 3: "Authentication failed"

**Cause:** Wrong credentials in connection string **Solution:**

```bash
# For local development (no auth needed)
MONGODB_URL=mongodb://localhost:27017/erp_new

# For MongoDB Atlas (with auth)
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/erp_new?retryWrites=true
```

### Issue 4: "seed script fails"

**Cause:** Database schema not loaded or connection not working **Solution:**

```bash
# Ensure server started first
npm run dev

# In separate terminal, run seed
node scripts/seed.js

# Check for errors in both terminals
```

---

## ✅ Verification Checklist

After completing Phase 5, verify:

- [ ] MongoDB running and accessible
- [ ] `npm install` completed without errors
- [ ] Server starts with "✅ MongoDB connected successfully"
- [ ] Seed script runs and creates sample data
- [ ] Login endpoint returns JWT token
- [ ] Users endpoint returns data from database
- [ ] Pages endpoint returns data from database
- [ ] Password hashing working (can't read raw passwords)
- [ ] Data persists after server restart

**If all checked:** Phase 5 ✅ COMPLETE

---

## 📈 Next Steps After Phase 5

### Immediate (Phase 5 Completion):

1. Update all services to use MongoDB models instead of mock data
2. Remove any remaining in-memory data structures
3. Test all endpoints with real database data

### Phase 6 (Validation & Error Handling):

1. Add input validation to all endpoints
2. Implement comprehensive error handling
3. Add request/response logging middleware
4. Standardize API responses

### Phase 7 (Real-time & WebSocket):

1. Set up Socket.io for real-time notifications
2. Implement chat functionality
3. Add live update capabilities

---

## 📚 Database Relationships

```
User ──┬─→ (Author) Posts
       ├─→ (Author) Pages
       ├─→ (Author) Comments
       ├─→ (Owner) Media
       ├─→ (User) Analytics
       └─→ (Actor) AuditLogs

Post ──┬─→ Comments
       └─→ Media (attached files)

Page ──┬─→ Comments
       └─→ Media (attached files)

Media → (UploadedBy) User
```

---

## 🔐 Security Notes

✅ **What's Secured:**

- Passwords hashed with bcryptjs (10 salt rounds)
- User emails are unique (preventing duplicates)
- Audit logs track all changes
- TTL indexes auto-delete old analytics
- Rate limiting configured
- CORS enabled selectively

⚠️ **What's Not Yet (Phases 6+):**

- Input validation on endpoints
- Request rate limiting middleware
- API key management
- Role-based access control (RBAC) validation
- Two-factor authentication enforcement
- Encryption for sensitive fields

---

## 📞 Useful Commands

```bash
# Check MongoDB version
mongod --version

# Connect to database directly
mongo mongodb://localhost:27017/erp_new

# Show all databases
db.adminCommand({ listDatabases: 1 })

# Show all collections in current database
db.getCollectionNames()

# Count documents in users collection
db.users.countDocuments()

# Find all users
db.users.find()

# Drop database (careful!)
db.dropDatabase()
```

---

## 🎓 Learning Resources

- [Mongoose Documentation](https://mongoosejs.com)
- [MongoDB Manual](https://docs.mongodb.com/manual)
- [Bcryptjs Module](https://github.com/dcodeIO/bcrypt.js)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)

---

**Phase 5 Status:** Foundation Ready 🚀 **Estimated Time to Complete:** 15
minutes **Difficulty Level:** Medium **Prerequisites:** MongoDB installed or
MongoDB Atlas account
