#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Development Environment Setup
 * نظام الأوائل — إعداد بيئة التطوير
 * ════════════════════════════════════════════════════════════════
 *
 * Usage: node scripts/dev-setup.js [--skip-install] [--force]
 *
 * Checks & sets up:
 *  1. Node.js & npm versions
 *  2. .env file from .env.example
 *  3. MongoDB connectivity
 *  4. Redis connectivity
 *  5. npm dependencies installation
 *  6. Database seed (optional)
 *  7. Directory structure (uploads, logs, backups)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(ROOT, '..');

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const args = process.argv.slice(2);
const skipInstall = args.includes('--skip-install');
const force = args.includes('--force');

let errors = 0;
let warnings = 0;
let passed = 0;

function pass(msg) {
  console.log(`  ${C.green}✅ ${msg}${C.reset}`);
  passed++;
}
function warn(msg) {
  console.log(`  ${C.yellow}⚠️  ${msg}${C.reset}`);
  warnings++;
}
function fail(msg) {
  console.log(`  ${C.red}❌ ${msg}${C.reset}`);
  errors++;
}
function info(msg) {
  console.log(`  ${C.cyan}ℹ️  ${msg}${C.reset}`);
}
function header(msg) {
  console.log(`\n${C.bold}${C.cyan}━━━ ${msg} ━━━${C.reset}`);
}

// ─── Port Check Helper ──────────────────────────────────────────────────────
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

// ─── Exec Helper ────────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(
    `\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`
  );
  console.log(
    `${C.bold}${C.cyan}║       Al-Awael ERP — Dev Environment Setup              ║${C.reset}`
  );
  console.log(
    `${C.bold}${C.cyan}║       نظام الأوائل — إعداد بيئة التطوير                  ║${C.reset}`
  );
  console.log(
    `${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}\n`
  );

  // ─── 1. Node.js & npm ──────────────────────────────────────────────────────
  header('1. Node.js & npm Versions');

  const nodeVersion = run('node --version');
  if (nodeVersion) {
    const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
    if (major >= 18) {
      pass(`Node.js ${nodeVersion} (>= 18 required)`);
    } else {
      fail(`Node.js ${nodeVersion} — version 18+ required`);
    }
  } else {
    fail('Node.js not found in PATH');
  }

  const npmVersion = run('npm --version');
  if (npmVersion) {
    const major = parseInt(npmVersion.split('.')[0], 10);
    if (major >= 9) {
      pass(`npm ${npmVersion} (>= 9 required)`);
    } else {
      warn(`npm ${npmVersion} — version 9+ recommended`);
    }
  } else {
    fail('npm not found in PATH');
  }

  // ─── 2. Environment File ──────────────────────────────────────────────────
  header('2. Environment Configuration');

  const envPath = path.join(ROOT, '.env');
  const envExamplePath = path.join(ROOT, '.env.example');

  if (fs.existsSync(envPath)) {
    pass('.env file exists');

    // Check critical vars
    const envContent = fs.readFileSync(envPath, 'utf8');
    const criticalVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    for (const v of criticalVars) {
      const regex = new RegExp(`^${v}=.+`, 'm');
      if (regex.test(envContent)) {
        pass(`${v} is set`);
      } else {
        warn(`${v} is not set in .env`);
      }
    }

    // Check for default secrets
    if (envContent.includes('change-me')) {
      warn('Some secrets still have default values — change them before production');
    }
  } else if (fs.existsSync(envExamplePath)) {
    info('Creating .env from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    pass('.env file created from .env.example');
    warn('Update .env with your actual values (MongoDB URI, JWT secrets, etc.)');
  } else {
    fail('.env file not found and no .env.example to copy from');
  }

  // ─── 3. Required Directories ──────────────────────────────────────────────
  header('3. Required Directories');

  const requiredDirs = [
    path.join(ROOT, 'uploads'),
    path.join(ROOT, 'logs'),
    path.join(ROOT, 'backups'),
    path.join(ROOT, 'uploads', 'documents'),
    path.join(ROOT, 'uploads', 'images'),
    path.join(ROOT, 'uploads', 'temp'),
  ];

  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      pass(`${path.relative(ROOT, dir)}/`);
    } else {
      fs.mkdirSync(dir, { recursive: true });
      pass(`${path.relative(ROOT, dir)}/ (created)`);
    }
  }

  // ─── 4. Service Connectivity ──────────────────────────────────────────────
  header('4. Service Connectivity');

  // MongoDB
  const mongoPort = 27017;
  const mongoUp = await checkPort('127.0.0.1', mongoPort);
  if (mongoUp) {
    pass(`MongoDB is reachable on port ${mongoPort}`);
  } else {
    warn(`MongoDB not reachable on port ${mongoPort} — start it or use Docker`);
  }

  // Redis
  const redisPort = 6379;
  const redisUp = await checkPort('127.0.0.1', redisPort);
  if (redisUp) {
    pass(`Redis is reachable on port ${redisPort}`);
  } else {
    warn(`Redis not reachable on port ${redisPort} — set DISABLE_REDIS=true in .env to skip`);
  }

  // ─── 5. Dependencies ─────────────────────────────────────────────────────
  header('5. Dependencies');

  if (skipInstall) {
    info('Skipping dependency install (--skip-install)');
  } else {
    const nodeModulesBackend = path.join(ROOT, 'node_modules');
    const nodeModulesFrontend = path.join(PROJECT_ROOT, 'frontend', 'node_modules');
    const needsInstall =
      force || !fs.existsSync(nodeModulesBackend) || !fs.existsSync(nodeModulesFrontend);

    if (needsInstall) {
      info('Installing all dependencies (this may take a while)...');
      try {
        execSync('npm run install:all', {
          cwd: PROJECT_ROOT,
          stdio: 'inherit',
        });
        pass('All dependencies installed');
      } catch {
        fail('Dependency installation failed — run "npm run install:all" manually');
      }
    } else {
      pass('node_modules already exist (use --force to reinstall)');
    }
  }

  // ─── 6. Git Hooks ────────────────────────────────────────────────────────
  header('6. Git Hooks (Husky)');

  const huskyDir = path.join(PROJECT_ROOT, '.husky');
  if (fs.existsSync(huskyDir)) {
    pass('Husky hooks directory exists');
  } else {
    try {
      execSync('npx husky', { cwd: PROJECT_ROOT, stdio: 'pipe' });
      pass('Husky hooks initialized');
    } catch {
      warn('Could not initialize Husky — run "npx husky" manually');
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}━━━ Summary ━━━${C.reset}`);
  console.log(`  ${C.green}✅ Passed:   ${passed}${C.reset}`);
  console.log(`  ${C.yellow}⚠️  Warnings: ${warnings}${C.reset}`);
  console.log(`  ${C.red}❌ Errors:   ${errors}${C.reset}`);

  if (errors > 0) {
    console.log(`\n${C.red}${C.bold}Fix the errors above before starting development.${C.reset}\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`\n${C.yellow}${C.bold}Setup complete with warnings. Review them above.${C.reset}`);
    console.log(`${C.cyan}Run: npm run dev${C.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${C.green}${C.bold}✨ Everything looks great! Ready to develop.${C.reset}`);
    console.log(`${C.cyan}Run: npm run dev${C.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:`, err.message, C.reset);
  process.exit(1);
});
