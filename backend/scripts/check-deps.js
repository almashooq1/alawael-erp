#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Dependency Audit & Check
 * نظام الأوائل — فحص الاعتماديات
 * ════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/check-deps.js                # Full audit
 *   node scripts/check-deps.js --outdated     # Check outdated only
 *   node scripts/check-deps.js --security     # Security audit only
 *   node scripts/check-deps.js --duplicates   # Check duplicates
 *   node scripts/check-deps.js --size         # Show package sizes
 */

const { execSync } = require('child_process');
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
const args = process.argv.slice(2);
const checkOutdated = args.includes('--outdated') || args.length === 0;
const checkSecurity = args.includes('--security') || args.length === 0;
const checkDuplicates = args.includes('--duplicates') || args.length === 0;
const checkSize = args.includes('--size');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', cwd: ROOT, ...opts }).trim();
  } catch (err) {
    return err.stdout ? err.stdout.trim() : null;
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getDirSize(dirPath) {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        size += fs.statSync(full).size;
      } else if (entry.isDirectory()) {
        size += getDirSize(full);
      }
    }
  } catch {
    /* ignore */
  }
  return size;
}

// ═══════════════════════════════════════════════════════════════════════════════
function main() {
  console.log(`\n${C.bold}${C.cyan}📦 Al-Awael ERP — Dependency Audit${C.reset}\n`);

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const depCount = Object.keys(pkg.dependencies || {}).length;
  const devDepCount = Object.keys(pkg.devDependencies || {}).length;

  console.log(`  Dependencies:     ${C.green}${depCount}${C.reset}`);
  console.log(`  Dev Dependencies: ${C.yellow}${devDepCount}${C.reset}`);
  console.log(`  Total:            ${C.bold}${depCount + devDepCount}${C.reset}\n`);

  // ─── Security Audit ──────────────────────────────────────────────────────
  if (checkSecurity) {
    console.log(`${C.bold}🔒 Security Audit${C.reset}`);
    const audit = run('npm audit --json 2>&1');
    if (audit) {
      try {
        const data = JSON.parse(audit);
        const vulns = data.metadata?.vulnerabilities || {};
        const total =
          (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0) + (vulns.low || 0);

        if (total === 0) {
          console.log(`  ${C.green}✅ No known vulnerabilities!${C.reset}`);
        } else {
          if (vulns.critical > 0) console.log(`  ${C.red}🔴 Critical: ${vulns.critical}${C.reset}`);
          if (vulns.high > 0) console.log(`  ${C.red}🟠 High:     ${vulns.high}${C.reset}`);
          if (vulns.moderate > 0)
            console.log(`  ${C.yellow}🟡 Moderate: ${vulns.moderate}${C.reset}`);
          if (vulns.low > 0) console.log(`  ${C.dim}🟢 Low:      ${vulns.low}${C.reset}`);
          console.log(`\n  ${C.yellow}Run: npm audit fix${C.reset}`);
        }
      } catch {
        console.log(`  ${C.yellow}⚠️  Could not parse audit results${C.reset}`);
      }
    } else {
      console.log(`  ${C.yellow}⚠️  npm audit failed${C.reset}`);
    }
    console.log('');
  }

  // ─── Outdated Packages ──────────────────────────────────────────────────
  if (checkOutdated) {
    console.log(`${C.bold}📋 Outdated Packages${C.reset}`);
    const outdated = run('npm outdated --json 2>&1');
    if (outdated) {
      try {
        const data = JSON.parse(outdated);
        const entries = Object.entries(data);
        if (entries.length === 0) {
          console.log(`  ${C.green}✅ All packages are up to date!${C.reset}`);
        } else {
          // Classify by severity
          const major = [];
          const minor = [];
          const patch = [];

          for (const [name, info] of entries) {
            const current = info.current || 'N/A';
            const latest = info.latest || 'N/A';
            const wanted = info.wanted || 'N/A';
            const entry = { name, current, wanted, latest };

            if (current !== 'N/A' && latest !== 'N/A') {
              const currMajor = parseInt(current.split('.')[0], 10);
              const latestMajor = parseInt(latest.split('.')[0], 10);
              if (latestMajor > currMajor) major.push(entry);
              else if (wanted !== current) minor.push(entry);
              else patch.push(entry);
            } else {
              minor.push(entry);
            }
          }

          if (major.length > 0) {
            console.log(`\n  ${C.red}🔴 Major updates (${major.length}):${C.reset}`);
            for (const p of major.slice(0, 10)) {
              console.log(
                `     ${p.name}: ${C.dim}${p.current}${C.reset} → ${C.green}${p.latest}${C.reset}`
              );
            }
            if (major.length > 10)
              console.log(`     ${C.dim}...and ${major.length - 10} more${C.reset}`);
          }
          if (minor.length > 0) {
            console.log(`\n  ${C.yellow}🟡 Minor/Patch updates (${minor.length}):${C.reset}`);
            for (const p of minor.slice(0, 10)) {
              console.log(
                `     ${p.name}: ${C.dim}${p.current}${C.reset} → ${C.green}${p.wanted}${C.reset}`
              );
            }
            if (minor.length > 10)
              console.log(`     ${C.dim}...and ${minor.length - 10} more${C.reset}`);
          }

          console.log(`\n  ${C.cyan}Run: npm update       (safe updates)${C.reset}`);
          console.log(`  ${C.cyan}Run: npm outdated     (full details)${C.reset}`);
        }
      } catch {
        console.log(`  ${C.yellow}⚠️  Could not parse outdated results${C.reset}`);
      }
    } else {
      console.log(`  ${C.green}✅ All packages are up to date!${C.reset}`);
    }
    console.log('');
  }

  // ─── Duplicate Check ──────────────────────────────────────────────────────
  if (checkDuplicates) {
    console.log(`${C.bold}🔍 Potential Duplicate Dependencies${C.reset}`);

    const deps = Object.keys(pkg.dependencies || {});
    const devDeps = Object.keys(pkg.devDependencies || {});
    const duplicates = deps.filter(d => devDeps.includes(d));

    if (duplicates.length > 0) {
      console.log(`  ${C.yellow}⚠️  Found in both dependencies and devDependencies:${C.reset}`);
      duplicates.forEach(d => console.log(`     ${C.yellow}${d}${C.reset}`));
    } else {
      console.log(`  ${C.green}✅ No duplicates found${C.reset}`);
    }

    // Check for similar packages
    const similar = [
      ['moment', 'date-fns', 'dayjs', 'luxon'],
      ['lodash', 'underscore', 'ramda'],
      ['axios', 'node-fetch', 'got', 'superagent'],
      ['winston', 'pino', 'bunyan', 'log4js'],
      ['joi', 'yup', 'zod', 'ajv'],
    ];

    const allDeps = [...deps, ...devDeps];
    const foundSimilar = [];

    for (const group of similar) {
      const found = group.filter(d => allDeps.includes(d));
      if (found.length > 1) {
        foundSimilar.push(found);
      }
    }

    if (foundSimilar.length > 0) {
      console.log(`\n  ${C.yellow}⚠️  Similar packages that might be consolidatable:${C.reset}`);
      for (const group of foundSimilar) {
        console.log(`     ${group.join(', ')}`);
      }
    }
    console.log('');
  }

  // ─── Package Size ─────────────────────────────────────────────────────────
  if (checkSize) {
    console.log(`${C.bold}📏 node_modules Size${C.reset}`);
    const nmPath = path.join(ROOT, 'node_modules');
    if (fs.existsSync(nmPath)) {
      const size = getDirSize(nmPath);
      console.log(`  Total: ${C.bold}${formatSize(size)}${C.reset}`);

      // Top 10 largest packages
      console.log(`\n  ${C.bold}Top 10 Largest Packages:${C.reset}`);
      try {
        const packages = fs
          .readdirSync(nmPath, { withFileTypes: true })
          .filter(e => e.isDirectory() && !e.name.startsWith('.'))
          .map(e => {
            const pkgPath = path.join(nmPath, e.name);
            return { name: e.name, size: getDirSize(pkgPath) };
          })
          .sort((a, b) => b.size - a.size)
          .slice(0, 10);

        for (const p of packages) {
          const bar = '█'.repeat(Math.ceil((p.size / packages[0].size) * 20));
          console.log(
            `  ${C.cyan}${p.name.padEnd(25)}${C.reset} ${formatSize(p.size).padStart(10)} ${C.dim}${bar}${C.reset}`
          );
        }
      } catch {
        console.log(`  ${C.yellow}Could not read packages${C.reset}`);
      }
    } else {
      console.log(`  ${C.yellow}node_modules not found — run npm install${C.reset}`);
    }
    console.log('');
  }

  console.log(`${C.green}${C.bold}✅ Audit complete!${C.reset}\n`);
}

main();
