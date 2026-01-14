#!/usr/bin/env node

/**
 * AlAwael ERP - Quick Start Script
 * This script helps start the entire system quickly
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════╗
║    AlAwael ERP - Quick Start                          ║
║    Starting all services...                           ║
╚════════════════════════════════════════════════════════╝
`);

// Check prerequisites
console.log('\n📋 Checking prerequisites...\n');

const backendPath = path.join(__dirname, 'backend/package.json');
const frontendPath = path.join(__dirname, 'frontend/package.json');

if (!fs.existsSync(backendPath)) {
  console.error('❌ Backend folder not found');
  process.exit(1);
}

if (!fs.existsSync(frontendPath)) {
  console.error('❌ Frontend folder not found');
  process.exit(1);
}

console.log('✅ Backend folder found');
console.log('✅ Frontend folder found');

// Start Backend
console.log('\n🚀 Starting Backend Server...\n');

const backendProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
});

// Wait for backend to start
setTimeout(() => {
  // Start Frontend
  console.log('\n🚀 Starting Frontend Server...\n');

  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true,
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n📴 Shutting down services...');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });
}, 5000);

console.log(`
╔════════════════════════════════════════════════════════╗
║    SYSTEM STARTUP SEQUENCE                            ║
╚════════════════════════════════════════════════════════╝

✅ MongoDB:      Required (mongod running)
🚀 Backend:      Starting on http://localhost:3001
🚀 Frontend:     Starting on http://localhost:3000 or 5173
🔐 Test Login:
   Email:       admin@alawael.com
   Password:    Admin@123456

📌 Services will start in sequence
   Press Ctrl+C to stop all services
`);
