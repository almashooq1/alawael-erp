#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Service Health Check
 * نظام الأوائل — فحص الخدمات
 * ════════════════════════════════════════════════════════════════
 *
 * Usage: node scripts/check-services.js [--wait] [--timeout=30]
 *
 * Checks:
 *  - MongoDB connection
 *  - Redis connection
 *  - Backend API health endpoint
 *  - Frontend dev server (optional)
 */

const net = require('net');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const args = process.argv.slice(2);
const waitMode = args.includes('--wait');
const timeoutArg = args.find(a => a.startsWith('--timeout='));
const timeoutSec = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 30;

// ─── Port Check ──────────────────────────────────────────────────────────────
function checkPort(host, port, timeoutMs = 2000) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// ─── HTTP Check ──────────────────────────────────────────────────────────────
function checkHttp(url, timeoutMs = 5000) {
  return new Promise(resolve => {
    const req = http.get(url, { timeout: timeoutMs }, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// ─── Wait for Port ──────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function waitForPort(host, port, maxWaitMs) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkPort(host, port)) return true;
    await sleep(1000);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${C.bold}${C.cyan}🔍 Al-Awael ERP — Service Health Check${C.reset}\n`);
  console.log(`  ${C.cyan}Time: ${new Date().toISOString()}${C.reset}\n`);

  const services = [
    { name: 'MongoDB', host: '127.0.0.1', port: 27017, critical: true },
    { name: 'Redis', host: '127.0.0.1', port: 6379, critical: false },
    {
      name: 'Backend API',
      host: '127.0.0.1',
      port: parseInt(process.env.PORT, 10) || 3001,
      critical: false,
      httpPath: '/health',
    },
    { name: 'Frontend Dev', host: '127.0.0.1', port: 3000, critical: false },
  ];

  let allOk = true;
  let criticalFail = false;

  for (const svc of services) {
    const label = `${svc.name} (${svc.host}:${svc.port})`;

    if (waitMode && svc.critical) {
      process.stdout.write(`  ⏳ Waiting for ${label}...`);
      const ready = await waitForPort(svc.host, svc.port, timeoutSec * 1000);
      if (ready) {
        console.log(` ${C.green}✅ UP${C.reset}`);
      } else {
        console.log(` ${C.red}❌ TIMEOUT after ${timeoutSec}s${C.reset}`);
        criticalFail = true;
        allOk = false;
      }
      continue;
    }

    const up = await checkPort(svc.host, svc.port);
    if (up) {
      if (svc.httpPath) {
        const res = await checkHttp(`http://${svc.host}:${svc.port}${svc.httpPath}`);
        if (res && res.status === 200) {
          console.log(`  ${C.green}✅ ${label} — HTTP 200${C.reset}`);
          if (res.data && typeof res.data === 'object') {
            const keys = Object.keys(res.data).slice(0, 4);
            for (const k of keys) {
              console.log(`     ${C.cyan}${k}: ${JSON.stringify(res.data[k])}${C.reset}`);
            }
          }
        } else {
          console.log(
            `  ${C.yellow}⚠️  ${label} — port open but HTTP ${res?.status || 'error'}${C.reset}`
          );
          allOk = false;
        }
      } else {
        console.log(`  ${C.green}✅ ${label} — UP${C.reset}`);
      }
    } else {
      const icon = svc.critical ? '❌' : '⚠️';
      const color = svc.critical ? C.red : C.yellow;
      console.log(`  ${color}${icon} ${label} — DOWN${C.reset}`);
      if (svc.critical) criticalFail = true;
      allOk = false;
    }
  }

  // ─── Docker Status ────────────────────────────────────────────────────────
  console.log(`\n${C.bold}  Docker Containers:${C.reset}`);
  try {
    const { execSync } = require('child_process');
    const output = execSync('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1', {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    if (output.trim()) {
      console.log(
        output
          .split('\n')
          .map(l => `    ${l}`)
          .join('\n')
      );
    } else {
      console.log(`    ${C.yellow}No running containers${C.reset}`);
    }
  } catch {
    console.log(`    ${C.yellow}Docker not available or not running${C.reset}`);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('');
  if (criticalFail) {
    console.log(
      `${C.red}${C.bold}❌ Critical services are down. Start MongoDB before running the app.${C.reset}\n`
    );
    process.exit(1);
  } else if (!allOk) {
    console.log(`${C.yellow}${C.bold}⚠️  Some optional services are not running.${C.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${C.green}${C.bold}✅ All services are healthy!${C.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${C.red}Fatal:`, err.message, C.reset);
  process.exit(1);
});
