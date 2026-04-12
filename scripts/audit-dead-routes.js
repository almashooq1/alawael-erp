#!/usr/bin/env node
/**
 * Dead Route Audit Script
 * ═══════════════════════════════════════════════════════════════════
 * Identifies unmounted/orphan route files in backend/routes/ by:
 *   1. Scanning all registry files (_registry.js + sub-registries) for require() paths
 *   2. Scanning ALL backend/ files for any require() that references a route file
 *   3. Comparing against actual files in backend/routes/
 *   4. Marking files not required anywhere as DEAD
 *
 * Usage:
 *   node scripts/audit-dead-routes.js                  # report only
 *   node scripts/audit-dead-routes.js --archive        # move dead files to _archived/
 *
 * Output: JSON report + console summary
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ARCHIVE = process.argv.includes('--archive');
const BACKEND = path.join(__dirname, '..', 'backend');
const ROUTES_DIR = path.join(BACKEND, 'routes');
const ARCHIVE_DIR = path.join(BACKEND, '_archived', 'dead-routes');

// ── Step 1: Collect all route files ──
function getAllRouteFiles(dir, base = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      // Skip archived/node_modules
      if (entry.name === '_archived' || entry.name === 'node_modules') continue;
      results.push(...getAllRouteFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.js')) {
      results.push(rel);
    }
  }
  return results;
}

// ── Step 2: Collect all requires from ALL backend files ──
function getAllBackendFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '_archived') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllBackendFiles(full));
    } else if (entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract all route file references from a source file.
 * Looks for require('./routes/xxx') or require('../routes/xxx') patterns.
 * Also looks for bare filenames in string literals.
 */
function extractRouteReferences(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const refs = new Set();

  // Match require() paths that reference routes/
  const requireRegex = /require\(['"](\.\.?\/[^'"]*routes\/[^'"]+)['"]\)/g;
  let m;
  while ((m = requireRegex.exec(code)) !== null) {
    // Resolve relative to the file's directory
    let refPath = m[1];
    // Normalize: remove .js extension for comparison
    if (!refPath.endsWith('.js')) refPath += '.js';
    // Resolve from the file's location
    const resolved = path.resolve(path.dirname(filePath), refPath);
    // Convert to relative from routes dir
    if (resolved.startsWith(ROUTES_DIR)) {
      const rel = path.relative(ROUTES_DIR, resolved).replace(/\\/g, '/');
      refs.add(rel);
    }
  }

  // Also look for string references to route filenames (for dynamic requires)
  const routeFileRegex = /['"]\.?\/?routes\/([^'"]+)['"]/g;
  while ((m = routeFileRegex.exec(code)) !== null) {
    let ref = m[1];
    if (!ref.endsWith('.js')) ref += '.js';
    refs.add(ref.replace(/\\/g, '/'));
  }

  return refs;
}

// ── Main ──
console.log('Dead Route Audit');
console.log('═'.repeat(60));

// Step 1: Get all route files
const allRouteFiles = getAllRouteFiles(ROUTES_DIR);
console.log(`Total route files: ${allRouteFiles.length}`);

// Step 2: Get all backend files
const allBackendFiles = getAllBackendFiles(BACKEND);
console.log(`Total backend files to scan: ${allBackendFiles.length}`);

// Step 3: Extract all route references from all backend files
const referencedRoutes = new Set();
const referenceMap = new Map(); // routeFile → [sourceFile, ...]

for (const srcFile of allBackendFiles) {
  // Skip route files themselves (self-references don't count)
  const refs = extractRouteReferences(srcFile);
  for (const ref of refs) {
    referencedRoutes.add(ref);
    if (!referenceMap.has(ref)) referenceMap.set(ref, []);
    referenceMap.get(ref).push(path.relative(BACKEND, srcFile));
  }
}

console.log(`Unique route files referenced: ${referencedRoutes.size}`);

// Step 4: Find dead routes
// Instead of reading all files for each candidate, build a global reference index
const allFilenamesReferenced = new Set();

// Read all backend files once and extract all filenames mentioned
console.log('Building global reference index...');
for (const srcFile of allBackendFiles) {
  try {
    const code = fs.readFileSync(srcFile, 'utf8');
    // Extract all route-like filenames from the code
    // Match patterns like: require('./something'), 'filename.routes', etc.
    const words = code.match(/[\w\-\.]+\.(?:routes|route|js)/g) || [];
    for (const w of words) {
      allFilenamesReferenced.add(w.replace(/\.js$/, ''));
      allFilenamesReferenced.add(w);
    }
    // Also extract require paths
    const requires = code.match(/require\(['"][^'"]+['"]\)/g) || [];
    for (const r of requires) {
      const match = r.match(/['"]([^'"]+)['"]/);
      if (match) {
        const p = match[1];
        const bn = path.basename(p);
        allFilenamesReferenced.add(bn);
        allFilenamesReferenced.add(bn.replace(/\.js$/, ''));
        allFilenamesReferenced.add(p);
      }
    }
  } catch (e) {
    // skip unreadable files
  }
}

console.log(`Global reference index: ${allFilenamesReferenced.size} unique tokens`);

const deadRoutes = [];
const liveRoutes = [];

for (const routeFile of allRouteFiles) {
  const normalized = routeFile.replace(/\\/g, '/');
  const basename = path.basename(normalized);
  const basenameNoExt = basename.replace('.js', '');

  // Check if referenced in registry require() paths
  if (referencedRoutes.has(normalized)) {
    liveRoutes.push({ file: normalized, matchType: 'require-path' });
    continue;
  }

  // Check if basename matches any reference
  let found = false;
  for (const ref of referencedRoutes) {
    if (ref.endsWith(basename) || ref.endsWith(normalized)) {
      found = true;
      liveRoutes.push({ file: normalized, matchType: 'basename-match' });
      break;
    }
  }
  if (found) continue;

  // Check global reference index
  if (allFilenamesReferenced.has(basename) || allFilenamesReferenced.has(basenameNoExt)) {
    liveRoutes.push({ file: normalized, matchType: 'filename-token' });
    continue;
  }

  // Truly dead
  const fullPath = path.join(ROUTES_DIR, routeFile);
  const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
  deadRoutes.push({ file: normalized, lines: lineCount });
}

// Sort dead routes by line count descending
deadRoutes.sort((a, b) => b.lines - a.lines);

console.log('');
console.log(`LIVE routes: ${liveRoutes.length}`);
console.log(`DEAD routes: ${deadRoutes.length}`);
console.log(`Total dead lines: ${deadRoutes.reduce((sum, r) => sum + r.lines, 0)}`);

// Print dead routes
console.log('\n─── DEAD ROUTES (unreferenced anywhere) ───');
for (const r of deadRoutes) {
  console.log(`  ${r.file} (${r.lines} lines)`);
}

// DDD route files in routes/ddd/ should be excluded from dead list
// (they're loaded dynamically by ddd-loader.js)
const deadDDD = deadRoutes.filter(r => r.file.startsWith('ddd/'));
const deadNonDDD = deadRoutes.filter(r => !r.file.startsWith('ddd/'));

console.log(`\n─── BREAKDOWN ───`);
console.log(`Dead DDD routes: ${deadDDD.length} (loaded dynamically by ddd-loader — FALSE POSITIVES)`);
console.log(`Dead non-DDD routes: ${deadNonDDD.length} (truly dead)`);
console.log(`True dead lines: ${deadNonDDD.reduce((sum, r) => sum + r.lines, 0)}`);

// Write report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalRouteFiles: allRouteFiles.length,
    liveRoutes: liveRoutes.length,
    deadRoutes: deadRoutes.length,
    deadDDD: deadDDD.length,
    deadNonDDD: deadNonDDD.length,
    totalDeadLines: deadRoutes.reduce((sum, r) => sum + r.lines, 0),
    trulyDeadLines: deadNonDDD.reduce((sum, r) => sum + r.lines, 0),
  },
  deadNonDDD: deadNonDDD,
  deadDDD: deadDDD,
  liveRoutes: liveRoutes.map(r => r.file),
};

const reportPath = path.join(__dirname, '..', 'docs', 'dead-route-audit.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nReport saved: docs/dead-route-audit.json`);

// Archive if requested
if (ARCHIVE && deadNonDDD.length > 0) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  let archived = 0;

  for (const r of deadNonDDD) {
    const src = path.join(ROUTES_DIR, r.file);
    const dest = path.join(ARCHIVE_DIR, r.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    archived++;
  }

  console.log(`\nArchived ${archived} dead non-DDD routes to backend/_archived/dead-routes/`);
}
