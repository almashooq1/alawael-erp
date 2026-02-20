#!/usr/bin/env node

/**
 * STARTUP_BACKEND.js - Start backend and capture output
 */

const { spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = 'c:\\Users\\x-be\\OneDrive\\المستندات\\04-10-2025\\66666\\erp_new_system\\backend';

console.log('🚀 Starting Backend Service...\n');
console.log(`📁 Working directory: ${BACKEND_DIR}\n`);

// Try to start the server
const backendProcess = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
});

// Capture stdout
backendProcess.stdout.on('data', (data) => {
    console.log(data.toString());
});

// Capture stderr
backendProcess.stderr.on('data', (data) => {
    console.error(data.toString());
});

// Handle process exit
backendProcess.on('close', (code) => {
    if (code !== 0) {
        console.error(`\n❌ Backend process exited with code ${code}`);
    } else {
        console.log(`\n✅ Backend process exited with code 0`);
    }
    process.exit(code);
});

// Handle errors
backendProcess.on('error', (err) => {
    console.error('❌ Failed to start backend:', err.message);
    process.exit(1);
});

// Cleanup on parent process exit
process.on('SIGINT', () => {
    console.log('\n📴 Stopping backend...');
    backendProcess.kill('SIGINT');
});
