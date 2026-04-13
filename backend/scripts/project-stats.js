#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Project Statistics & Info
 * نظام الأوائل — إحصائيات المشروع
 * ════════════════════════════════════════════════════════════════
 *
 * Usage: node scripts/project-stats.js
 *
 * Displays:
 *  - Code statistics (lines, files, languages)
 *  - Model/Route/Controller counts
 *  - Test coverage summary
 *  - Dependency overview
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const ROOT = path.resolve(__dirname, '..');

// ─── Helpers ────────────────────────────────────────────────────────────────
function countFiles(
  dir,
  extensions,
  exclude = ['node_modules', '.git', 'coverage', '.jest-cache', '_archived', 'archive']
) {
  let count = 0;
  let lines = 0;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = countFiles(fullPath, extensions, exclude);
        count += sub.count;
        lines += sub.lines;
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        count++;
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          lines += content.split('\n').length;
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }

  return { count, lines };
}

function countInDir(dir, pattern = null) {
  if (!fs.existsSync(dir)) return 0;
  try {
    const entries = fs.readdirSync(dir);
    if (pattern) {
      return entries.filter(f => pattern.test(f)).length;
    }
    return entries.filter(f => !f.startsWith('.')).length;
  } catch {
    return 0;
  }
}

function formatNumber(num) {
  return num.toLocaleString();
}

// ═══════════════════════════════════════════════════════════════════════════════
function main() {
  console.log(
    `\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`
  );
  console.log(
    `${C.bold}${C.cyan}║       Al-Awael ERP — Project Statistics                  ║${C.reset}`
  );
  console.log(
    `${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}\n`
  );

  // ─── Code Stats ───────────────────────────────────────────────────────────
  console.log(`${C.bold}📊 Code Statistics (Backend)${C.reset}`);

  const jsStats = countFiles(ROOT, ['.js']);
  const jsonStats = countFiles(ROOT, ['.json']);
  const mdStats = countFiles(ROOT, ['.md']);

  console.log(
    `   JavaScript:  ${C.green}${formatNumber(jsStats.count).padStart(6)} files${C.reset}  ${C.dim}(${formatNumber(jsStats.lines)} lines)${C.reset}`
  );
  console.log(
    `   JSON:        ${C.cyan}${formatNumber(jsonStats.count).padStart(6)} files${C.reset}`
  );
  console.log(
    `   Markdown:    ${C.yellow}${formatNumber(mdStats.count).padStart(6)} files${C.reset}`
  );
  console.log(`   ${C.bold}Total Lines:  ${formatNumber(jsStats.lines)}${C.reset}`);

  // ─── Architecture ─────────────────────────────────────────────────────────
  console.log(`\n${C.bold}🏗️  Architecture${C.reset}`);

  const dirs = {
    Models: path.join(ROOT, 'models'),
    Routes: path.join(ROOT, 'routes'),
    Controllers: path.join(ROOT, 'controllers'),
    Middleware: path.join(ROOT, 'middleware'),
    Services: path.join(ROOT, 'services'),
    Utils: path.join(ROOT, 'utils'),
    Validators: path.join(ROOT, 'validators'),
    Config: path.join(ROOT, 'config'),
    Seeds: path.join(ROOT, 'seed'),
    Migrations: path.join(ROOT, 'migrations'),
  };

  for (const [label, dir] of Object.entries(dirs)) {
    const count = countInDir(dir, /\.js$/);
    if (count > 0) {
      console.log(`   ${label.padEnd(15)} ${C.green}${String(count).padStart(4)}${C.reset} files`);
    }
  }

  // ─── Test Files ───────────────────────────────────────────────────────────
  console.log(`\n${C.bold}🧪 Test Files${C.reset}`);

  const testStats = countFiles(path.join(ROOT, '__tests__'), ['.test.js', '.spec.js']);
  const e2eStats = countFiles(path.join(ROOT, 'e2e'), ['.test.js', '.spec.js']);

  console.log(`   Unit/Integration: ${C.green}${testStats.count}${C.reset} test files`);
  console.log(`   E2E:              ${C.green}${e2eStats.count}${C.reset} test files`);

  // ─── Dependencies ─────────────────────────────────────────────────────────
  console.log(`\n${C.bold}📦 Dependencies${C.reset}`);

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.keys(pkg.dependencies || {}).length;
    const devDeps = Object.keys(pkg.devDependencies || {}).length;

    console.log(`   Production:   ${C.green}${deps}${C.reset}`);
    console.log(`   Development:  ${C.yellow}${devDeps}${C.reset}`);

    // Key dependencies
    const keyDeps = ['express', 'mongoose', 'ioredis', 'socket.io', 'jsonwebtoken', 'winston'];
    console.log(`\n   ${C.bold}Key Dependencies:${C.reset}`);
    for (const dep of keyDeps) {
      const version = (pkg.dependencies || {})[dep] || (pkg.devDependencies || {})[dep];
      if (version) {
        console.log(`     ${C.cyan}${dep.padEnd(20)}${C.reset} ${version}`);
      }
    }
  } catch {
    console.log(`   ${C.yellow}Could not read package.json${C.reset}`);
  }

  // ─── Folder Structure ────────────────────────────────────────────────────
  console.log(`\n${C.bold}📂 Domain Modules${C.reset}`);

  const domainDirs = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter(
      e =>
        e.isDirectory() &&
        !e.name.startsWith('.') &&
        !e.name.startsWith('_') &&
        ![
          'node_modules',
          'coverage',
          'logs',
          'uploads',
          'backups',
          'certs',
          'public',
          'static',
          'templates',
        ].includes(e.name)
    )
    .map(e => e.name);

  const columns = 3;
  for (let i = 0; i < domainDirs.length; i += columns) {
    const row = domainDirs.slice(i, i + columns);
    console.log(`   ${row.map(d => `${C.cyan}${d.padEnd(28)}${C.reset}`).join('')}`);
  }

  // ─── Environment ──────────────────────────────────────────────────────────
  console.log(`\n${C.bold}⚙️  Environment${C.reset}`);
  console.log(`   Node.js:      ${process.version}`);
  console.log(`   Platform:     ${process.platform} ${process.arch}`);
  console.log(`   NODE_ENV:     ${process.env.NODE_ENV || 'not set'}`);

  const envExists = fs.existsSync(path.join(ROOT, '.env'));
  console.log(
    `   .env:         ${envExists ? `${C.green}present${C.reset}` : `${C.yellow}missing${C.reset}`}`
  );

  console.log(`\n${C.green}${C.bold}✅ Statistics gathered!${C.reset}\n`);
}

main();
