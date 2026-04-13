#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — API Route Inspector
 * نظام الأوائل — فاحص المسارات
 * ════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/inspect-routes.js                    # List all routes
 *   node scripts/inspect-routes.js --filter=auth      # Filter by keyword
 *   node scripts/inspect-routes.js --method=POST      # Filter by method
 *   node scripts/inspect-routes.js --json             # Output as JSON
 *   node scripts/inspect-routes.js --stats            # Route statistics
 */

const path = require('path');

// Suppress server startup
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
process.env.DISABLE_REDIS = 'true';
process.env.PORT = '0';

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

const args = process.argv.slice(2);
const filterKeyword = (() => {
  const arg = args.find(a => a.startsWith('--filter='));
  return arg ? arg.split('=')[1] : null;
})();
const filterMethod = (() => {
  const arg = args.find(a => a.startsWith('--method='));
  return arg ? arg.split('=')[1].toUpperCase() : null;
})();
const jsonOutput = args.includes('--json');
const showStats = args.includes('--stats');

// ─── Method Colors ──────────────────────────────────────────────────────────
const methodColors = {
  GET: C.green,
  POST: C.yellow,
  PUT: C.blue,
  PATCH: C.magenta,
  DELETE: C.red,
};

function colorMethod(method) {
  const color = methodColors[method] || C.dim;
  return `${color}${method.padEnd(7)}${C.reset}`;
}

// ─── Extract Routes ─────────────────────────────────────────────────────────
function extractRoutes(app) {
  const routes = [];

  function walk(stack, prefix = '') {
    if (!stack) return;

    for (const layer of stack) {
      if (layer.route) {
        // Direct route
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        for (const method of methods) {
          routes.push({
            method,
            path: prefix + layer.route.path,
            middleware: layer.route.stack
              ? layer.route.stack.filter(s => s.name && s.name !== '<anonymous>').map(s => s.name)
              : [],
          });
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        // Sub-router
        let routerPrefix = prefix;
        if (layer.regexp) {
          const match = layer.regexp
            .toString()
            .replace('/^', '')
            .replace('\\/?(?=\\/|$)/i', '')
            .replace(/\\\//g, '/');
          if (match && match !== '/') {
            routerPrefix = prefix + match;
          }
        }
        // Also try keys approach
        if (layer.keys && layer.keys.length > 0) {
          // parameterized route
        }
        walk(layer.handle.stack, routerPrefix);
      }
    }
  }

  if (app._router) {
    walk(app._router.stack);
  }

  return routes;
}

// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  if (!jsonOutput) {
    console.log(`\n${C.bold}${C.cyan}🔍 Al-Awael ERP — API Route Inspector${C.reset}\n`);
  }

  let app;
  try {
    app = require(path.join(__dirname, '..', 'app'));
  } catch (err) {
    console.error(`${C.red}❌ Could not load app.js: ${err.message}${C.reset}`);
    process.exit(1);
  }

  const routes = extractRoutes(app);

  // Apply filters
  let filtered = routes;
  if (filterKeyword) {
    filtered = filtered.filter(r => r.path.toLowerCase().includes(filterKeyword.toLowerCase()));
  }
  if (filterMethod) {
    filtered = filtered.filter(r => r.method === filterMethod);
  }

  // Sort by path
  filtered.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  // JSON output
  if (jsonOutput) {
    console.log(JSON.stringify(filtered, null, 2));
    process.exit(0);
  }

  // Stats mode
  if (showStats) {
    const stats = {};
    const prefixes = {};

    for (const r of routes) {
      stats[r.method] = (stats[r.method] || 0) + 1;
      const prefix = r.path.split('/').slice(0, 3).join('/');
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    }

    console.log(`${C.bold}📊 Route Statistics${C.reset}\n`);
    console.log(`  Total Routes: ${C.bold}${routes.length}${C.reset}\n`);

    console.log(`  ${C.bold}By Method:${C.reset}`);
    for (const [method, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
      const bar = '█'.repeat(Math.ceil((count / routes.length) * 40));
      console.log(
        `    ${colorMethod(method)} ${String(count).padStart(4)} ${C.dim}${bar}${C.reset}`
      );
    }

    console.log(`\n  ${C.bold}By Prefix (top 15):${C.reset}`);
    const topPrefixes = Object.entries(prefixes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    for (const [prefix, count] of topPrefixes) {
      console.log(`    ${C.cyan}${prefix.padEnd(35)}${C.reset} ${count} routes`);
    }

    console.log('');
    process.exit(0);
  }

  // Normal display
  if (filtered.length === 0) {
    console.log(
      `  ${C.yellow}No routes found${filterKeyword ? ` matching "${filterKeyword}"` : ''}.${C.reset}\n`
    );
    process.exit(0);
  }

  console.log(
    `  ${C.dim}Found ${filtered.length} routes${filterKeyword ? ` matching "${filterKeyword}"` : ''}${C.reset}\n`
  );

  let currentPrefix = '';
  for (const r of filtered) {
    const prefix = r.path.split('/').slice(0, 3).join('/');
    if (prefix !== currentPrefix) {
      currentPrefix = prefix;
      console.log(`\n  ${C.bold}${prefix}${C.reset}`);
    }

    const mw = r.middleware.length > 0 ? ` ${C.dim}[${r.middleware.join(', ')}]${C.reset}` : '';
    console.log(`    ${colorMethod(r.method)} ${r.path}${mw}`);
  }

  console.log('');
  process.exit(0);
}

main().catch(err => {
  console.error(`${C.red}Fatal: ${err.message}${C.reset}`);
  process.exit(1);
});
