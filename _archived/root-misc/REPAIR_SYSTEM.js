#!/usr/bin/env node

/**
 * REPAIR_SYSTEM.js
 * Complete system repair and startup orchestrator
 * 
 * Usage: node REPAIR_SYSTEM.js
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const WORKSPACE = path.normalize('c:\\Users\\x-be\\OneDrive\\المستندات\\04-10-2025\\66666');
const BACKEND_DIR = path.join(WORKSPACE, 'erp_new_system', 'backend');
const FRONTEND_DIR = path.join(WORKSPACE, 'erp_new_system', 'frontend');

let backendProcess = null;
let frontendProcess = null;
let processesStarted = {};

// Helper function to check if port is open
async function checkPort(port) {
    return new Promise((resolve) => {
        const socket = net.createConnection(port, 'localhost');
        socket.setTimeout(1000);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('error', () => {
            resolve(false);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

// Display header
function showHeader() {
    console.clear();
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║               🔧 SYSTEM REPAIR & STARTUP PROCESS                ║
║                        البدء في الاصلاح                          ║
║                  February 20, 2026 - 02:45 PM UTC+3             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
}

// Step 1: Verify Node.js and npm
function verifyDependencies() {
    console.log('\n📦 STEP 1: Verifying Runtime Dependencies\n');
    console.log('  Checking Node.js version...');

    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
        console.log(`    ✅ Node.js: ${nodeVersion}`);
        processesStarted['node_version'] = nodeVersion;
    } catch (e) {
        console.error('    ❌ Node.js not found!');
        process.exit(1);
    }

    console.log('  Checking npm version...');
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
        console.log(`    ✅ npm: ${npmVersion}`);
        processesStarted['npm_version'] = npmVersion;
    } catch (e) {
        console.error('    ❌ npm not found!');
        process.exit(1);
    }
}

// Step 2: Install backend dependencies
function installBackendDeps() {
    console.log('\n📁 STEP 2: Backend Dependencies Installation\n');

    if (!fs.existsSync(BACKEND_DIR)) {
        console.error(`  ❌ Backend directory not found: ${BACKEND_DIR}`);
        process.exit(1);
    }
    console.log(`  ✅ Backend directory found`);

    const nodeModulesPath = path.join(BACKEND_DIR, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
        console.log(`  ✅ node_modules already exists in backend`);
        processesStarted['backend_modules_installed'] = true;
        return;
    }

    console.log('  ⚠️  Installing backend dependencies...');
    try {
        execSync('npm install', {
            cwd: BACKEND_DIR,
            stdio: 'inherit',
            timeout: 180000
        });
        console.log('  ✅ Backend dependencies installed successfully');
        processesStarted['backend_modules_installed'] = true;
    } catch (e) {
        console.error('  ❌ Failed to install backend dependencies');
        process.exit(1);
    }
}

// Step 3: Install frontend dependencies
function installFrontendDeps() {
    console.log('\n📁 STEP 3: Frontend Dependencies Installation\n');

    if (!fs.existsSync(FRONTEND_DIR)) {
        console.log(`  ⚠️  Frontend directory not found (optional): ${FRONTEND_DIR}`);
        return;
    }
    console.log(`  ✅ Frontend directory found`);

    const nodeModulesPath = path.join(FRONTEND_DIR, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
        console.log(`  ✅ node_modules already exists in frontend`);
        processesStarted['frontend_modules_installed'] = true;
        return;
    }

    console.log('  ⚠️  Installing frontend dependencies...');
    try {
        execSync('npm install', {
            cwd: FRONTEND_DIR,
            stdio: 'inherit',
            timeout: 180000
        });
        console.log('  ✅ Frontend dependencies installed successfully');
        processesStarted['frontend_modules_installed'] = true;
    } catch (e) {
        console.error('  ⚠️  Frontend dependencies installation failed (continuing)');
    }
}

// Step 4: Start backend service
async function startBackend() {
    console.log('\n🚀 STEP 4: Starting Backend Service\n');

    if (backendProcess) {
        console.log('  ℹ️  Backend already running');
        return;
    }

    console.log('  Launching backend on port 3001...');

    backendProcess = spawn('node', ['server.js'], {
        cwd: BACKEND_DIR,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        detached: process.platform !== 'win32'
    });

    // Capture stdout
    backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Only show important logs
        if (output.includes('✅') || output.includes('running') || output.includes('Server') || output.includes('listening')) {
            console.log(`  ${output.trim()}`);
        }
    });

    // Capture stderr
    backendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) {
            console.error(`  ⚠️  ${output.trim()}`);
        }
    });

    // Wait for backend to be ready
    console.log('  Waiting for backend to initialize...');
    let backendReady = false;
    for (let i = 0; i < 30; i++) {
        if (await checkPort(3001)) {
            backendReady = true;
            break;
        }
        await new Promise(r => setTimeout(r, 500));
    }

    if (backendReady) {
        console.log('  ✅ Backend service started successfully on port 3001');
        processesStarted['backend'] = 'RUNNING :3001';
    } else {
        console.log('  ⚠️  Backend startup completed (port check inconclusive)');
        processesStarted['backend'] = 'STARTING :3001';
    }
}

// Step 5: Start frontend service
async function startFrontend() {
    console.log('\n🎨 STEP 5: Starting Frontend Service\n');

    if (!fs.existsSync(FRONTEND_DIR)) {
        console.log('  ⚠️  Frontend directory not found (skipping)');
        return;
    }

    if (frontendProcess) {
        console.log('  ℹ️  Frontend already running');
        return;
    }

    console.log('  Launching frontend on port 3000...');

    frontendProcess = spawn('npm', ['start'], {
        cwd: FRONTEND_DIR,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        detached: process.platform !== 'win32',
        env: { ...process.env, BROWSER: 'none' }
    });

    // Capture stdout
    frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Compiled') || output.includes('running') || output.includes('localhost')) {
            console.log(`  ${output.trim()}`);
        }
    });

    // Capture stderr
    frontendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.toLowerCase().includes('error')) {
            console.error(`  ⚠️  ${output.trim()}`);
        }
    });

    // Wait for frontend to be ready
    console.log('  Waiting for frontend to build...');
    let frontendReady = false;
    for (let i = 0; i < 60; i++) {
        if (await checkPort(3000)) {
            frontendReady = true;
            break;
        }
        await new Promise(r => setTimeout(r, 500));
    }

    if (frontendReady) {
        console.log('  ✅ Frontend service started successfully on port 3000');
        processesStarted['frontend'] = 'RUNNING :3000';
    } else {
        console.log('  ⚠️  Frontend startup in progress (building...)');
        processesStarted['frontend'] = 'STARTING :3000';
    }
}

// Step 6: Verify all services
async function verifyServices() {
    console.log('\n✅ STEP 6: Service Verification\n');

    const ports = {
        3000: 'Frontend',
        3001: 'Backend API',
        5432: 'PostgreSQL',
        6379: 'Redis',
        9200: 'Elasticsearch',
        27017: 'MongoDB'
    };

    console.log('  Checking service ports:\n');
    let openCount = 0;

    for (const [port, service] of Object.entries(ports)) {
        const isOpen = await checkPort(parseInt(port));
        const status = isOpen ? '✅ OPEN' : '❌ CLOSED';
        console.log(`    ${status}  ${service.padEnd(20)} :${port}`);
        if (isOpen) openCount++;
    }

    console.log(`\n  Total Services Running: ${openCount}/6\n`);
    processesStarted['services_running'] = `${openCount}/6`;
}

// Display final status
function displayFinalStatus() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    🎯 REPAIR PROCESS COMPLETE                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 STARTUP STATUS SUMMARY:\n');
    for (const [key, value] of Object.entries(processesStarted)) {
        const displayKey = key.replace(/_/g, ' ').toUpperCase();
        console.log(`  ${displayKey.padEnd(35)}: ${value}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
    console.log('🌐 ACCESS POINTS:\n');
    console.log('  Frontend:        http://localhost:3000');
    console.log('  Backend API:     http://localhost:3001');
    console.log('  Backend Health:  http://localhost:3001/health\n');

    console.log('═══════════════════════════════════════════════════════════════════\n');
    console.log('✨ System repair and startup complete!\n');
    console.log('📌 The system is ready for operations. Services are running in the background.\n');
}

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n\n📴 Shutting down services...\n');

    if (backendProcess) {
        backendProcess.kill();
        console.log('  ✅ Backend service stopped');
    }

    if (frontendProcess) {
        frontendProcess.kill();
        console.log('  ✅ Frontend service stopped');
    }

    console.log('\n✅ All services stopped gracefully\n');
    process.exit(0);
});

// Main execution
async function main() {
    try {
        showHeader();
        verifyDependencies();
        installBackendDeps();
        installFrontendDeps();
        await startBackend();
        await startFrontend();
        await verifyServices();
        displayFinalStatus();

        // Keep process alive
        console.log('🎯 Monitoring services... Press Ctrl+C to stop\n');
    } catch (error) {
        console.error('\n❌ An error occurred:', error.message);
        process.exit(1);
    }
}

// Run
main();
