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

// ─── Machine-readable collector (W1305, GAPS Item 5) ─────────────────────────
// Returns the same numbers main() renders, as a plain object. This is the
// prerequisite for auto-updating README / failing CI on doc drift — a script
// can `JSON.parse(execSync('npm run stats:json'))` and diff against a marker
// block instead of anyone hand-editing stale counts. Pure (reads only), so
// it's covered by project-stats-script.test.js.
function collectStats(root = ROOT) {
  const js = countFiles(root, ['.js']);
  const json = countFiles(root, ['.json']);
  const md = countFiles(root, ['.md']);

  const archDirs = {
    models: 'models',
    routes: 'routes',
    controllers: 'controllers',
    middleware: 'middleware',
    services: 'services',
    utils: 'utils',
    validators: 'validators',
    config: 'config',
    seeds: 'seed',
    migrations: 'migrations',
  };
  const architecture = {};
  for (const [key, sub] of Object.entries(archDirs)) {
    architecture[key] = countInDir(path.join(root, sub), /\.js$/);
  }

  const tests = countFiles(path.join(root, '__tests__'), ['.test.js', '.spec.js']);
  const e2e = countFiles(path.join(root, 'e2e'), ['.test.js', '.spec.js']);

  let deps = 0;
  let devDeps = 0;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    deps = Object.keys(pkg.dependencies || {}).length;
    devDeps = Object.keys(pkg.devDependencies || {}).length;
  } catch {
    /* ignore */
  }

  return {
    generatedAt: new Date().toISOString(),
    code: {
      jsFiles: js.count,
      jsLines: js.lines,
      jsonFiles: json.count,
      mdFiles: md.count,
    },
    architecture,
    tests: { unitIntegration: tests.count, e2e: e2e.count },
    dependencies: { production: deps, development: devDeps },
  };
}

// ─── Stats-block automation (GAPS Item 5: doc-drift gate) ────────────────────
// A doc opts in by embedding the two markers below. `npm run stats:write <file>`
// fills/refreshes the block; `npm run stats:check <file>` fails CI when the
// embedded block no longer matches the live counts. Deliberately renders ONLY
// drift-meaningful counts (files + architecture + tests + deps) — NOT volatile
// jsLines or the generatedAt timestamp — so the gate fires on real structural
// drift (a model/route/service added or removed) and not on every line edit.
const STATS_MARKER_START =
  '<!-- PROJECT-STATS:START (auto-generated — run `npm run stats:write <file>`) -->';
const STATS_MARKER_END = '<!-- PROJECT-STATS:END -->';

/**
 * Render the deterministic markdown stats block (markers included) from a stats
 * object. Pure: same stats in → same string out (no timestamp, no line counts).
 * @param {ReturnType<typeof collectStats>} stats
 * @returns {string}
 */
function renderStatsBlock(stats) {
  const a = stats.architecture || {};
  const rows = [
    ['JavaScript files', stats.code.jsFiles],
    ['JSON files', stats.code.jsonFiles],
    ['Markdown files', stats.code.mdFiles],
    ['Models', a.models],
    ['Routes', a.routes],
    ['Controllers', a.controllers],
    ['Middleware', a.middleware],
    ['Services', a.services],
    ['Validators', a.validators],
    ['Migrations', a.migrations],
    ['Tests (unit/integration)', stats.tests.unitIntegration],
    ['Tests (e2e)', stats.tests.e2e],
    ['Dependencies (prod)', stats.dependencies.production],
    ['Dependencies (dev)', stats.dependencies.development],
  ];
  const body = rows.map(([label, value]) => `| ${label} | ${value} |`).join('\n');
  return [STATS_MARKER_START, '| Metric | Count |', '| --- | --- |', body, STATS_MARKER_END].join(
    '\n'
  );
}

/**
 * Extract the inclusive marker-to-marker block from a markdown string.
 * @param {string} markdown
 * @returns {string|null} the block (markers included) or null if absent/malformed.
 */
function extractStatsBlock(markdown) {
  if (typeof markdown !== 'string') return null;
  const start = markdown.indexOf(STATS_MARKER_START);
  if (start === -1) return null;
  const end = markdown.indexOf(STATS_MARKER_END, start);
  if (end === -1) return null;
  return markdown.slice(start, end + STATS_MARKER_END.length);
}

/**
 * Insert (or replace) the stats block in a markdown string. Pure — returns the
 * new string, does no IO. Appends at EOF when no block is present yet.
 * @param {string} markdown
 * @param {string} block rendered block (markers included)
 * @returns {string}
 */
function applyStatsBlock(markdown, block) {
  const existing = extractStatsBlock(markdown);
  if (existing !== null) return markdown.replace(existing, block);
  const sep = markdown.length === 0 || markdown.endsWith('\n') ? '' : '\n';
  return `${markdown}${sep}\n${block}\n`;
}

/**
 * Normalize a rendered/embedded stats block for whitespace-insensitive
 * comparison. Markdown formatters (Prettier, markdownlint --fix) re-pad table
 * cells to align columns, which would make a byte-exact compare flap on every
 * save. This collapses per-cell padding and treats any separator run of dashes
 * (`| --- |` ↔ `| ------ |`) as equal, while preserving cell CONTENT — so a
 * real count drift (a changed value) is still detected. Pure.
 * @param {string} block
 * @returns {string}
 */
function normalizeStatsBlock(block) {
  return String(block)
    .split('\n')
    .map(line => {
      const t = line.trim();
      if (!t.startsWith('|')) return t;
      const cells = t.split('|').map(c => c.trim());
      // separator cells (`---`, `:--:`, `------`) collapse to a single token
      return cells.map(c => (/^:?-{2,}:?$/.test(c) ? '---' : c)).join('|');
    })
    .filter(l => l.length > 0)
    .join('\n');
}

/**
 * Compare the block embedded in a markdown string against a freshly rendered
 * one. Pure. Invalidity (missing block / drift) is reported, never thrown.
 * Comparison is whitespace-insensitive for table formatting (see
 * normalizeStatsBlock) so it is robust to markdown auto-formatters.
 * @param {string} markdown
 * @param {string} rendered freshly rendered block
 * @returns {{ ok: boolean, reason: string }}
 */
function checkStatsBlock(markdown, rendered) {
  const existing = extractStatsBlock(markdown);
  if (existing === null) {
    return {
      ok: false,
      reason: 'no PROJECT-STATS block found (add the markers, then run stats:write)',
    };
  }
  if (normalizeStatsBlock(existing) !== normalizeStatsBlock(rendered)) {
    return { ok: false, reason: 'PROJECT-STATS block is stale (run stats:write to refresh)' };
  }
  return { ok: true, reason: 'up to date' };
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

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify(collectStats(), null, 2) + '\n');
  } else if (argv.includes('--check') || argv.includes('--write')) {
    const mode = argv.includes('--write') ? 'write' : 'check';
    const file = argv.find(a => !a.startsWith('--'));
    if (!file) {
      console.error(`✖ stats:${mode} requires a target markdown file path`);
      process.exit(2);
    }
    const target = path.resolve(process.cwd(), file);
    const rendered = renderStatsBlock(collectStats());
    let markdown = '';
    try {
      markdown = fs.readFileSync(target, 'utf8');
    } catch {
      if (mode === 'check') {
        console.error(`✖ stats:check — cannot read ${file}`);
        process.exit(2);
      }
    }
    if (mode === 'write') {
      const next = applyStatsBlock(markdown, rendered);
      if (next !== markdown) {
        fs.writeFileSync(target, next);
        console.log(`✓ stats:write — refreshed PROJECT-STATS block in ${file}`);
      } else {
        console.log(`✓ stats:write — ${file} already up to date`);
      }
    } else {
      const result = checkStatsBlock(markdown, rendered);
      if (result.ok) {
        console.log(`✓ stats:check — ${file} is ${result.reason}`);
      } else {
        console.error(`✖ stats:check — ${file}: ${result.reason}`);
        process.exit(1);
      }
    }
  } else {
    main();
  }
}

module.exports = {
  collectStats,
  countFiles,
  countInDir,
  renderStatsBlock,
  extractStatsBlock,
  applyStatsBlock,
  checkStatsBlock,
  normalizeStatsBlock,
  STATS_MARKER_START,
  STATS_MARKER_END,
};
