#!/usr/bin/env node

/**
 * Simple server launcher without encoding issues
 * Runs from any directory and navigates to backend automatically
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, 'backend');

// Verify backend directory exists
if (!fs.existsSync(backendDir)) {
  console.error('❌ Error: backend directory not found at', backendDir);
  process.exit(1);
}

// Verify server.js exists
const serverPath = path.join(backendDir, 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error('❌ Error: server.js not found at', serverPath);
  process.exit(1);
}

console.log('🚀 Starting AlAwael ERP Backend Server...');
console.log('📁 Backend directory:', backendDir);
console.log('📄 Server file:', serverPath);
console.log('');

// Spawn node process in backend directory
const server = spawn('node', ['server.js'], {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Handle process exit
server.on('exit', (code) => {
  console.log(`\n⛔ Server process exited with code ${code}`);
  process.exit(code);
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down...');
  server.kill('SIGINT');
});
