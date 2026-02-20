const net = require('net');
const path = require('path');
const fs = require('fs');

const PORTS = {
    '3000': 'Frontend (React)',
    '3001': 'Backend API (Express)',
    '5432': 'PostgreSQL',
    '6379': 'Redis',
    '9200': 'Elasticsearch',
    '27017': 'MongoDB'
};

async function checkPort(port, serviceName) {
    return new Promise((resolve) => {
        const socket = net.createConnection(port, 'localhost');
        socket.setTimeout(1000);

        socket.on('connect', () => {
            socket.destroy();
            resolve({ port, service: serviceName, status: 'OPEN ✅' });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, service: serviceName, status: 'TIMEOUT ⏳' });
        });

        socket.on('error', (err) => {
            resolve({ port, service: serviceName, status: `CLOSED ❌ (${err.code})` });
        });
    });
}

async function checkFileExists(filePath) {
    return fs.existsSync(filePath);
}

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          🔧 SYSTEM DIAGNOSTIC - تشخيص شامل            ║');
    console.log('║                  February 20, 2026                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Check services
    console.log('📡 SERVICE PORT STATUS:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const results = [];
    for (const [port, service] of Object.entries(PORTS)) {
        const result = await checkPort(port, service);
        results.push(result);
        const padding = ' '.repeat(40 - service.length);
        console.log(`  [${result.port}]  ${service}${padding}${result.status}`);
    }

    // Count open services
    const openServices = results.filter(r => r.status.includes('✅')).length;
    console.log(`\n  Services Running: ${openServices}/6`);

    // Check directory structure
    console.log('\n\n📁 DIRECTORY STRUCTURE:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const dirs = [
        { path: 'erp_new_system/backend', desc: 'Backend Service' },
        { path: 'erp_new_system/frontend', desc: 'Frontend Service' },
        { path: 'supply-chain-management', desc: 'Supply Chain Module' }
    ];

    for (const dir of dirs) {
        const exists = checkFileExists(dir.path);
        const status = exists ? '✅ EXISTS' : '❌ MISSING';
        console.log(`  ${status}  ${dir.desc.padEnd(30)} (${dir.path})`);
    }

    // Check key files
    console.log('\n\n📋 KEY FILES:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const files = [
        { path: 'erp_new_system/backend/server.js', desc: 'Backend Server Entry' },
        { path: 'erp_new_system/backend/package.json', desc: 'Backend Dependencies' },
        { path: 'erp_new_system/frontend/package.json', desc: 'Frontend Dependencies' },
        { path: 'docker-compose.yml', desc: 'Docker Compose Config' }
    ];

    for (const file of files) {
        const exists = checkFileExists(file.path);
        const status = exists ? '✅ EXISTS' : '❌ MISSING';
        console.log(`  ${status}  ${file.desc.padEnd(30)} (${file.path})`);
    }

    // Summary
    console.log('\n\n🎯 DIAGNOSTIC SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (openServices === 6) {
        console.log('  ✅ ALL SERVICES OPERATIONAL');
    } else if (openServices > 3) {
        console.log(`  ⚠️  PARTIAL OPERATION (${openServices}/6 services running)`);
    } else {
        console.log(`  ❌ CRITICAL: Only ${openServices}/6 services running`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
