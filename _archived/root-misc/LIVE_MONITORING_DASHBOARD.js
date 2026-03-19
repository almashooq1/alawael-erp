#!/usr/bin/env node

/**
 * LIVE SYSTEM MONITORING DASHBOARD
 * Real-time monitoring of all services and infrastructure
 * Auto-refresh with color-coded status indicators
 */

const net = require('net');
const { execSync } = require('child_process');
const os = require('os');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  // Background colors
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Service definitions
const SERVICES = [
  { name: 'Frontend (React)', port: 3000, type: 'node', critical: true },
  { name: 'Backend (Express)', port: 3001, type: 'node', critical: true },
  { name: 'MongoDB', port: 27017, type: 'docker', critical: true },
  { name: 'PostgreSQL', port: 5432, type: 'docker', critical: true },
  { name: 'Redis', port: 6379, type: 'docker', critical: true },
  { name: 'Elasticsearch', port: 9200, type: 'docker', critical: true },
];

const DOCKER_CONTAINERS = [
  'erp-postgres',
  'erp-redis',
  'erp-elasticsearch',
];

/**
 * Check if a port is open (service responding)
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, '127.0.0.1');
    
    let isOpen = false;
    
    socket.on('connect', () => {
      isOpen = true;
      socket.destroy();
    });
    
    socket.setTimeout(1000);
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.on('close', () => {
      resolve(isOpen);
    });
  });
}

/**
 * Get Docker container status
 */
function getDockerStatus() {
  try {
    const output = execSync('docker ps --format "{{.Names}}|{{.Status}}"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    
    if (!output) return {};
    
    const containers = {};
    output.split('\n').forEach((line) => {
      const [name, status] = line.split('|');
      if (name && status) {
        containers[name] = {
          running: status.startsWith('Up'),
          status: status,
        };
      }
    });
    
    return containers;
  } catch {
    return {};
  }
}

/**
 * Get system resources
 */
function getSystemResources() {
  try {
    const totalMem = os.totalmem() / (1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024);
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    
    const cpucount = os.cpus().length;
    const avgLoad = os.loadavg()[0].toFixed(2);
    
    return {
      totalMem: totalMem.toFixed(0),
      usedMem: usedMem.toFixed(0),
      freeMem: freeMem.toFixed(0),
      memPercent,
      cpucount,
      avgLoad,
      uptime: (os.uptime() / 3600).toFixed(1),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get process count
 */
function getNodeProcessCount() {
  try {
    const output = execSync('tasklist | find /c "node.exe"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    
    return parseInt(output) || 0;
  } catch {
    return 0;
  }
}

/**
 * Format status with color
 */
function formatStatus(isOpen, name) {
  if (isOpen) {
    return `${colors.green}✓ OPEN${colors.reset}`;
  }
  return `${colors.red}✗ CLOSED${colors.reset}`;
}

/**
 * Format container status
 */
function formatContainerStatus(container) {
  if (!container) {
    return `${colors.red}✗ NOT FOUND${colors.reset}`;
  }
  if (container.running) {
    return `${colors.green}✓ RUNNING${colors.reset}`;
  }
  return `${colors.red}✗ STOPPED${colors.reset}`;
}

/**
 * Calculate health score
 */
function calculateHealthScore(statuses, containers) {
  let score = 0;
  const total = SERVICES.length;
  
  SERVICES.forEach((service) => {
    if (service.type === 'docker') {
      const container = containers[`erp-${service.name.split('(')[1]?.replace(')', '').toLowerCase()}`];
      if (container?.running) {
        score += 1;
      }
    } else {
      if (statuses[service.port]) {
        score += 1;
      }
    }
  });
  
  return Math.round((score / total) * 100);
}

/**
 * Clear screen and draw header
 */
function clearScreen() {
  console.clear();
  console.log(
    `${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}║           🚀 LIVE SYSTEM MONITORING DASHBOARD 🚀                   ║${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════════════╝${colors.reset}`
  );
}

/**
 * Draw service table
 */
function drawServiceTable(statuses) {
  console.log(`\n${colors.bright}${colors.blue}┌─ SERVICES STATUS ─────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.blue}│ Service                          Port      Status              │${colors.reset}`);
  console.log(`${colors.blue}├─────────────────────────────────────────────────────────────┤${colors.reset}`);
  
  SERVICES.forEach((service) => {
    const isOpen = statuses[service.port];
    const status = formatStatus(isOpen, service.name);
    const padding = ' '.repeat(Math.max(0, 33 - service.name.length));
    console.log(
      `${colors.blue}│${colors.reset} ${service.name}${padding} ${service.port} ${' '.repeat(Math.max(0, 6 - service.port.toString().length))} ${status}${colors.blue} │${colors.reset}`
    );
  });
  
  console.log(`${colors.blue}└─────────────────────────────────────────────────────────────┘${colors.reset}`);
}

/**
 * Draw Docker containers status
 */
function drawDockerStatus(containers) {
  console.log(`\n${colors.bright}${colors.blue}┌─ DOCKER CONTAINERS ──────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.blue}│ Container                      Status                        │${colors.reset}`);
  console.log(`${colors.blue}├─────────────────────────────────────────────────────────────┤${colors.reset}`);
  
  DOCKER_CONTAINERS.forEach((containerName) => {
    const container = containers[containerName];
    const status = formatContainerStatus(container);
    const padding = ' '.repeat(Math.max(0, 31 - containerName.length));
    console.log(
      `${colors.blue}│${colors.reset} ${containerName}${padding} ${status}${colors.blue} │${colors.reset}`
    );
  });
  
  console.log(`${colors.blue}└─────────────────────────────────────────────────────────────┘${colors.reset}`);
}

/**
 * Draw system resources
 */
function drawSystemResources(resources) {
  if (!resources) {
    console.log(`\n${colors.red}⚠ Could not retrieve system resources${colors.reset}`);
    return;
  }
  
  const memoryBar = drawBar(parseFloat(resources.memPercent), 50);
  const loadPercent = (parseFloat(resources.avgLoad) / resources.cpucount) * 100;
  const loadBar = drawBar(Math.min(100, loadPercent), 50);
  
  console.log(`\n${colors.bright}${colors.blue}┌─ SYSTEM RESOURCES ────────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.blue}│${colors.reset}  Memory     ${memoryBar} ${resources.memPercent}% (${resources.usedMem}/${resources.totalMem} MB)${colors.blue} │${colors.reset}`);
  console.log(`${colors.blue}│${colors.reset}  CPU Load   ${loadBar} ${loadPercent.toFixed(1)}% (${resources.avgLoad}/${resources.cpucount} cores)${colors.blue} │${colors.reset}`);
  console.log(`${colors.blue}│${colors.reset}  Uptime: ${resources.uptime} hours | Node Processes: ${getNodeProcessCount()}${colors.blue} │${colors.reset}`);
  console.log(`${colors.blue}└─────────────────────────────────────────────────────────────┘${colors.reset}`);
}

/**
 * Draw progress bar
 */
function drawBar(percent, width) {
  const filled = Math.round((percent / 100) * width);
  let barColor = colors.green;
  
  if (percent > 80) barColor = colors.red;
  else if (percent > 60) barColor = colors.yellow;
  
  const bar = `${barColor}${'█'.repeat(filled)}${colors.reset}${'░'.repeat(width - filled)}`;
  return bar;
}

/**
 * Draw footer with info
 */
function drawFooter(healthScore) {
  console.log(`\n${colors.bright}${colors.blue}┌─ SYSTEM HEALTH ──────────────────────────────────────────────────┐${colors.reset}`);
  
  let healthColor = colors.green;
  let healthText = 'EXCELLENT';
  
  if (healthScore < 50) {
    healthColor = colors.red;
    healthText = 'CRITICAL';
  } else if (healthScore < 70) {
    healthColor = colors.yellow;
    healthText = 'WARNING';
  } else if (healthScore < 90) {
    healthColor = colors.yellow;
    healthText = 'GOOD';
  }
  
  const scoreBar = drawBar(healthScore, 40);
  const statusLine = `${healthColor}${healthText}${colors.reset}`;
  
  console.log(`${colors.blue}│${colors.reset}  Health Score: ${scoreBar} ${healthScore}/100 [${statusLine}]${colors.blue} │${colors.reset}`);
  console.log(`${colors.blue}│${colors.reset}  Last Update: ${new Date().toLocaleTimeString()}${colors.blue} │${colors.reset}`);
  console.log(`${colors.blue}│${colors.reset}  Auto-refresh: Every 5 seconds | Press Ctrl+C to stop${colors.blue} │${colors.reset}`);
  console.log(`${colors.blue}└─────────────────────────────────────────────────────────────┘${colors.reset}`);
}

/**
 * Main monitoring loop
 */
async function monitor() {
  // Initial setup message
  console.log('${colors.yellow}Initializing monitoring dashboard...${colors.reset}');
  
  // Continuous monitoring
  setInterval(async () => {
    clearScreen();
    
    try {
      // Check all ports
      const statuses = {};
      const portChecks = SERVICES.map(async (service) => {
        statuses[service.port] = await checkPort(service.port);
      });
      
      await Promise.all(portChecks);
      
      // Get Docker status
      const containers = getDockerStatus();
      
      // Get system resources
      const resources = getSystemResources();
      
      // Calculate health score
      const healthScore = calculateHealthScore(statuses, containers);
      
      // Draw dashboard
      drawServiceTable(statuses);
      drawDockerStatus(containers);
      drawSystemResources(resources);
      drawFooter(healthScore);
      
    } catch (err) {
      console.error(`${colors.red}Error during monitoring: ${err.message}${colors.reset}`);
    }
  }, 5000); // Refresh every 5 seconds
}

// Start monitoring
console.log(`${colors.cyan}Starting Live Monitoring Dashboard...${colors.reset}`);
console.log(`${colors.yellow}Note: Ensure all services are running for accurate status${colors.reset}\n`);

// Give time to read message before first refresh
setTimeout(() => {
  monitor();
}, 2000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Monitoring stopped. Goodbye!${colors.reset}`);
  process.exit(0);
});
