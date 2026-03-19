#!/usr/bin/env node

/**
 * CONTINUOUS MONITORING DASHBOARD
 * لوحة المراقبة المستمرة للمشروع
 */

const fs = require('fs');
const net = require('net');
const { execSync } = require('child_process');

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.clear();

// Display header
console.log(`${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════════╗
║        CONTINUOUS MONITORING DASHBOARD                          ║
║               Project Health Tracker                            ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);

// Session start
const sessionStart = new Date();
console.log(`Started: ${sessionStart.toLocaleString()}\n`);

// Create log file
const logFile = `monitoring_log_${Date.now()}.txt`;
let logContent = `Session started: ${sessionStart.toLocaleString()}\n\n`;

// Function to add to log
function addLog(msg) {
  logContent += msg + '\n';
}

// Monitor structure
console.log(`${colors.blue}FILE SYSTEM MONITORING${colors.reset}`);
console.log('─'.repeat(64));

const criticalFiles = ['package.json', '.env', 'docker-compose.yml', '.gitignore'];
const criticalDirs = ['backend', 'frontend', 'node_modules'];

let allGood = true;

criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  console.log(`  ${status} ${file}`);
  addLog(`${exists ? '[OK]' : '[MISSING]'} ${file}`);
  
  if (!exists) allGood = false;
});

criticalDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  console.log(`  ${status} ${dir}/`);
  addLog(`${exists ? '[OK]' : '[MISSING]'} ${dir}/`);
  
  if (!exists) allGood = false;
});

// Monitor services
console.log(`\n${colors.blue}SERVICE MONITORING${colors.reset}`);
console.log('─'.repeat(64));

const services = [
  { name: 'Frontend', port: 3000 },
  { name: 'Backend', port: 3001 },
  { name: 'MongoDB', port: 27017 },
  { name: 'Redis', port: 6379 },
  { name: 'PostgreSQL', port: 5432 },
];

let runningServices = 0;
let checkedServices = 0;

function checkPort(service) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(200);
    
    socket.on('connect', () => {
      console.log(`  ${colors.green}✓${colors.reset} ${service.name.padEnd(20)} (online)`);
      addLog(`[OK] ${service.name} is running on port ${service.port}`);
      runningServices++;
      socket.destroy();
      resolve();
    });
    
    socket.on('timeout', () => {
      console.log(`  ${colors.red}✗${colors.reset} ${service.name.padEnd(20)} (offline)`);
      addLog(`[DOWN] ${service.name} is not responding on port ${service.port}`);
      socket.destroy();
      resolve();
    });
    
    socket.on('error', () => {
      console.log(`  ${colors.red}✗${colors.reset} ${service.name.padEnd(20)} (offline)`);
      addLog(`[DOWN] ${service.name} is not running`);
      resolve();
    });
    
    socket.connect(service.port, 'localhost');
  });
}

(async () => {
  for (const service of services) {
    await checkPort(service);
    checkedServices++;
  }
  
  // Monitor system
  console.log(`\n${colors.blue}SYSTEM MONITORING${colors.reset}`);
  console.log('─'.repeat(64));
  
  try {
    // Node version
    const nodeVersion = execSync('node --version 2>&1', { encoding: 'utf8' }).trim();
    console.log(`  ${colors.green}✓${colors.reset} Node.js: ${nodeVersion}`);
    addLog(`[OK] Node.js ${nodeVersion}`);
    
    // npm version
    const npmVersion = execSync('npm --version 2>&1', { encoding: 'utf8' }).trim();
    console.log(`  ${colors.green}✓${colors.reset} npm: ${npmVersion}`);
    addLog(`[OK] npm ${npmVersion}`);
  } catch (e) {
    console.log(`  ${colors.red}✗${colors.reset} Node tools error`);
    addLog('[ERROR] Node tools check failed');
  }
  
  // Overall health
  console.log(`\n${colors.cyan}${colors.bright}HEALTH ASSESSMENT${colors.reset}`);
  console.log('═'.repeat(64));
  
  const fileScore = (criticalFiles.length + criticalDirs.length);
  const filesOk = criticalFiles.filter(f => fs.existsSync(f)).length + 
                  criticalDirs.filter(d => fs.existsSync(d)).length;
  const filePercent = (filesOk / fileScore) * 100;
  const servicePercent = (runningServices / services.length) * 100;
  const overallScore = (filePercent + servicePercent) / 2;
  
  console.log(`\nFiles/Dirs:    ${filesOk}/${fileScore} (${Math.round(filePercent)}%)`);
  console.log(`Services:      ${runningServices}/${services.length} (${Math.round(servicePercent)}%)`);
  console.log(`Overall Score: ${Math.round(overallScore)}/100`);
  
  // Status indicator
  let statusEmoji = colors.red + '🔴' + colors.reset; // red
  let statusText = 'CRITICAL';
  
  if (overallScore >= 80) {
    statusEmoji = colors.green + '🟢' + colors.reset; // green
    statusText = 'EXCELLENT';
  } else if (overallScore >= 60) {
    statusEmoji = colors.yellow + '🟡' + colors.reset; // yellow
    statusText = 'GOOD';
  } else if (overallScore >= 40) {
    statusEmoji = colors.yellow + '🟠' + colors.reset; // orange
    statusText = 'FAIR';
  }
  
  console.log(`\nStatus: ${statusEmoji} ${statusText}`);
  
  addLog(`\nOVERALL SCORE: ${Math.round(overallScore)}/100 [${statusText}]`);
  
  // Recommendations
  console.log(`\n${colors.blue}NEXT STEPS${colors.reset}`);
  console.log('─'.repeat(64));
  
  const recs = [];
  
  if (!fs.existsSync('backend')) recs.push('Create backend directory');
  if (!fs.existsSync('frontend')) recs.push('Create frontend directory');
  if (!fs.existsSync('.env')) recs.push('Configure .env file');
  if (runningServices === 0) recs.push('Start services: npm run dev');
  if (filePercent === 100 && servicePercent >= 50) recs.push('Run tests: npm test');
  if (filePercent === 100 && servicePercent === 100) recs.push('Deploy to production');
  
  if (recs.length === 0) {
    console.log('  ✓ All recommended actions completed!');
    addLog('All recommendations satisfied.');
  } else {
    recs.slice(0, 5).forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
      addLog(`TODO: ${rec}`);
    });
  }
  
  // Session end
  console.log(`\n${'═'.repeat(64)}`);
  const sessionEnd = new Date();
  const duration = (sessionEnd - sessionStart) / 1000;
  console.log(`Monitoring duration: ${duration.toFixed(2)} seconds`);
  console.log(`Log file: ${logFile}`);
  console.log('═'.repeat(64) + '\n');
  
  addLog(`\nSession ended: ${sessionEnd.toLocaleString()}`);
  addLog(`Duration: ${duration.toFixed(2)} seconds`);
  
  // Save log
  fs.writeFileSync(logFile, logContent);
  
})();
