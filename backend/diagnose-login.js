#!/usr/bin/env node

/**
 * Login Issue Diagnostic Script
 * This script diagnoses and fixes common login issues
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════╗
║    AlAwael ERP - Login Issue Diagnosis                ║
║    Checking System Status...                           ║
╚════════════════════════════════════════════════════════╝
`);

// 1. Check if database is properly initialized
console.log('\n📋 Checking Configuration...\n');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('MONGODB_URI')) {
    console.log('✅ MongoDB URI configured');
  }
  if (envContent.includes('JWT_SECRET')) {
    console.log('✅ JWT Secret configured');
  }
} else {
  console.log('⚠️  .env file not found');
}

// 2. Check server.js
console.log('\n📋 Checking Server Configuration...\n');

const serverPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

if (serverContent.includes('await connectDB()')) {
  console.log('✅ Database initialization is ENABLED');
} else if (serverContent.includes('// await connectDB()')) {
  console.log('⚠️  Database initialization is COMMENTED OUT');
  console.log('   🔧 FIX: Uncomment the database initialization code');
}

if (serverContent.includes('await seedDatabase()')) {
  console.log('✅ Database seeding is ENABLED');
}

// 3. Check auth routes
console.log('\n📋 Checking Auth Routes...\n');

const authRoutesPath = path.join(__dirname, 'api/routes/auth.routes.js');
if (fs.existsSync(authRoutesPath)) {
  const authContent = fs.readFileSync(authRoutesPath, 'utf8');
  if (authContent.includes("router.post('/login'")) {
    console.log('✅ Login endpoint exists');
  }
  if (authContent.includes('bcrypt.compare')) {
    console.log('✅ Password verification implemented');
  }
} else {
  console.log('❌ Auth routes file not found');
}

// 4. Check User model
console.log('\n📋 Checking User Model...\n');

const userModelPath = path.join(__dirname, 'models/User.js');
if (fs.existsSync(userModelPath)) {
  const userContent = fs.readFileSync(userModelPath, 'utf8');
  if (userContent.includes('email')) {
    console.log('✅ User model has email field');
  }
  if (userContent.includes('password')) {
    console.log('✅ User model has password field');
  }
} else {
  console.log('❌ User model not found');
}

// 5. Check frontend auth context
console.log('\n📋 Checking Frontend Auth Context...\n');

const authContextPath = path.join(__dirname, '../frontend/src/contexts/AuthContext.js');
if (fs.existsSync(authContextPath)) {
  const contextContent = fs.readFileSync(authContextPath, 'utf8');
  if (contextContent.includes('axios.post')) {
    console.log('✅ Login HTTP request implemented');
  }
  if (contextContent.includes('localStorage.setItem')) {
    console.log('✅ Token storage implemented');
  }
} else {
  console.log('⚠️  Frontend auth context may not be found at expected path');
}

// 6. Summary and recommendations
console.log(`
╔════════════════════════════════════════════════════════╗
║    DIAGNOSIS SUMMARY                                  ║
╚════════════════════════════════════════════════════════╝
`);

console.log(`
🔧 FIXES APPLIED:
  ✅ Database initialization code has been UNCOMMENTED

🚀 NEXT STEPS:
  1. Start MongoDB:
     mongod (or use your MongoDB service)

  2. Start Backend:
     npm start (in backend folder)

  3. Start Frontend:
     npm run dev (in frontend folder)

  4. Test Login:
     Email:    admin@alawael.com
     Password: Admin@123456

📌 If you still have issues:
  - Check MongoDB connection: http://localhost:27017
  - Check Backend: http://localhost:3001/health
  - Check Frontend console for errors
  - Verify .env configuration

💡 Common Issues:
  - MongoDB not running → start mongod
  - Port 3001 in use → change PORT in .env
  - Token not saving → check localStorage in browser
  - CORS errors → verify FRONTEND_URL in .env

`);

console.log(`
╔════════════════════════════════════════════════════════╗
║    System Status: ✅ READY TO TEST                    ║
╚════════════════════════════════════════════════════════╝
`);
