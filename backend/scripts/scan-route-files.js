#!/usr/bin/env node
/**
 * scan-route-files.js — load every route file + report any that throw on
 * require. Catches TDZ-class bugs (use before const declaration) that
 * static-source drift guards miss.
 *
 * Discovered Cycle 11 (2026-05-26): parallel-agent W441 wave introduced
 * TDZ bug in 8 route files; broken admin-routes test caught it only
 * after CI ran. This script lets pre-push or CI catch it faster + more
 * specifically.
 *
 * Usage:
 *   node scripts/scan-route-files.js          # human-readable
 *   node scripts/scan-route-files.js --json   # machine-readable
 *
 * Exit: 0 = all load; 1 = at least one broken.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.resolve(__dirname, '..', 'routes');
const JSON_MODE = process.argv.includes('--json');

function listRouteFiles(dir) {
  const out = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'registries' || e.name === '_archived') continue;
        walk(full);
      } else if (e.isFile() && /\.routes(\.[a-z]+)?\.js$/.test(e.name)) {
        out.push(full);
      }
    }
  }
  walk(dir);
  return out;
}

// Errors we deliberately IGNORE — known false-positive classes for this
// scan. The TDZ bug we hunt is a JS load-time error; mongoose model
// compilation conflicts are tracked by the W340 baseline separately.
const IGNORED_ERROR_PATTERNS = [
  /Cannot overwrite `\w+` model once compiled/,
  /OverwriteModelError/,
  // Env-required at load time (not code bug — provisioned in real run)
  /JWT_SECRET must be configured/,
  /[A-Z_]+ environment variable/,
];

function shouldIgnore(errMsg) {
  return IGNORED_ERROR_PATTERNS.some(re => re.test(errMsg));
}

function main() {
  const files = listRouteFiles(ROUTES_DIR);
  const broken = [];
  for (const f of files) {
    try {
      require(f);
    } catch (err) {
      const msg = String(err.message || err).split('\n')[0];
      if (shouldIgnore(msg)) continue; // known class, baselined elsewhere
      broken.push({
        file: path.relative(path.resolve(__dirname, '..'), f),
        error: msg,
      });
    }
  }

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          scanned: files.length,
          ok: files.length - broken.length,
          broken,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    console.log(`Scanned ${files.length} route files.`);
    if (broken.length === 0) {
      console.log('✓ All load cleanly.');
    } else {
      console.log(`✗ ${broken.length} broken on require:`);
      for (const b of broken) console.log(`  - ${b.file}: ${b.error}`);
    }
  }

  process.exit(broken.length === 0 ? 0 : 1);
}

main();
