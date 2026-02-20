#!/usr/bin/env node

/**
 * START_REPAIR.js - Start the repair process
 * Diagnoses and fixes system issues
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const WORKSPACE = 'c:\\Users\\x-be\\OneDrive\\المستندات\\04-10-2025\\66666';
const BACKEND_DIR = path.join(WORKSPACE, 'erp_new_system\\backend');
const FRONTEND_DIR = path.join(WORKSPACE, 'erp_new_system\\frontend');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║        🔧 SYSTEM REPAIR PROCESS INITIATED              ║');
console.log('║              البدء في الاصلاح                            ║');
console.log('║                February 20, 2026                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Step 1: Verify dependencies
console.log('📦 Step 1: Checking Dependencies...\n');

try {
    // Check Node.js installation
    console.log('  Checking Node.js : ', execSync('node --version').toString().trim());
    console.log('  Checking npm     : ', execSync('npm --version').toString().trim());
} catch (e) {
    console.error('  ❌ Node.js/npm not found!');
    process.exit(1);
}

// Step 2: Check backend directory
console.log('\n📁 Step 2: Checking Backend Directory...\n');

if (!fs.existsSync(BACKEND_DIR)) {
    console.error(`  ❌ Backend directory not found: ${BACKEND_DIR}`);
    process.exit(1);
}

console.log(`  ✅ Backend found: ${BACKEND_DIR}`);

if (!fs.existsSync(path.join(BACKEND_DIR, 'node_modules'))) {
    console.log('  ⚠️  node_modules not found in backend - installing...');
    try {
        console.log('\n  Running: npm install in backend...\n');
        execSync('npm install', {
            cwd: BACKEND_DIR,
            stdio: 'inherit',
            timeout: 120000
        });
        console.log('\n  ✅ Backend dependencies installed\n');
    } catch (e) {
        console.error('  ❌ Failed to install backend dependencies');
        process.exit(1);
    }
} else {
    console.log('  ✅ node_modules found in backend');
}

// Step 3: Check if server.js exists
if (!fs.existsSync(path.join(BACKEND_DIR, 'server.js'))) {
    console.error(`  ❌ server.js not found in backend`);
    process.exit(1);
}
console.log('  ✅ server.js found');

// Step 4: Check frontend
console.log('\n📁 Step 3: Checking Frontend Directory...\n');

if (!fs.existsSync(FRONTEND_DIR)) {
    console.error(`  ❌ Frontend directory not found: ${FRONTEND_DIR}`);
    process.exit(1);
}

console.log(`  ✅ Frontend found: ${FRONTEND_DIR}`);

if (!fs.existsSync(path.join(FRONTEND_DIR, 'node_modules'))) {
    console.log('  ⚠️  node_modules not found in frontend - installing...');
    try {
        console.log('\n  Running: npm install in frontend...\n');
        execSync('npm install', {
            cwd: FRONTEND_DIR,
            stdio: 'inherit',
            timeout: 120000
        });
        console.log('\n  ✅ Frontend dependencies installed\n');
    } catch (e) {
        console.error('  ❌ Failed to install frontend dependencies');
        process.exit(1);
    }
} else {
    console.log('  ✅ node_modules found in frontend');
}

// Step 5: Prepare to start services
console.log('\n═══════════════════════════════════════════════════════════\n');
console.log('🎯 REPAIR DIAGNOSIS COMPLETE - READY TO START SERVICES\n');
console.log('📋 Summary:\n');
console.log('  ✅ Node.js dependencies verified');
console.log('  ✅ Backend directory verified');
console.log('  ✅ Backend dependencies ready');
console.log('  ✅ Frontend directory verified');
console.log('  ✅ Frontend dependencies ready');

console.log('\n═══════════════════════════════════════════════════════════\n');
console.log('🚀 NEXT STEP: Starting services...\n');

// Export success for external use
process.exitCode = 0;
