#!/usr/bin/env node
/**
 * fix-page-imports.js
 *
 * After pages were moved into sub-folders (src/pages/<module>/), many relative
 * imports that used to resolve correctly from src/pages/ are now one level too
 * shallow.  This script rewrites:
 *
 *   from '../contexts/'   → from '../../contexts/'
 *   from '../theme/'      → from '../../theme/'
 *   from '../components/' → from '../../components/'
 *   from '../services/'   → from '../../services/'
 *   from '../utils/'      → from '../../utils/'
 *
 * It also fixes case-sensitivity mismatches in route files:
 *   pages/admin/   → pages/Admin/
 *   pages/fleet/   → pages/Fleet/
 *   pages/operations/ → pages/Operations/
 */

const fs = require('fs');
const path = require('path');

const FRONTEND = path.resolve(__dirname, '..', 'frontend', 'src');
const PAGES = path.join(FRONTEND, 'pages');
const ROUTES = path.join(FRONTEND, 'routes');

const DRY_RUN = process.argv.includes('--dry-run');

// ---- helpers ----------------------------------------------------------------

function walk(dir, ext = ['.js', '.jsx', '.ts', '.tsx']) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

let totalFixes = 0;
let filesChanged = 0;

function fixFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  let fixes = 0;

  for (const [pattern, replacement] of replacements) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) {
      const count = (before.match(pattern) || []).length;
      fixes += count;
    }
  }

  if (content !== original) {
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    const rel = path.relative(path.resolve(__dirname, '..'), filePath);
    console.log(`  ${DRY_RUN ? '[DRY] ' : ''}${rel}  (${fixes} fix${fixes > 1 ? 'es' : ''})`);
    totalFixes += fixes;
    filesChanged++;
  }
}

// ---- 1. Fix shallow relative imports inside pages/*/ -----------------------

console.log('\n=== Fixing relative imports in src/pages/*/ ===\n');

// Gather all page files that live INSIDE a sub-directory of pages/
const pageDirs = fs
  .readdirSync(PAGES, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(PAGES, d.name));

const pageFiles = [];
for (const dir of pageDirs) {
  pageFiles.push(...walk(dir));
}

// These patterns only match imports that start with '../' followed by
// a top-level src folder — we DON'T touch '../SamePageModule/' imports.
const shallowImportFixes = [
  // from '../contexts/' → from '../../contexts/'
  [/from\s+(['"])\.\.\/contexts\//g, 'from $1../../contexts/'],
  // from '../theme/' → from '../../theme/'
  [/from\s+(['"])\.\.\/theme\//g, 'from $1../../theme/'],
  // from '../components/' → from '../../components/'
  [/from\s+(['"])\.\.\/components\//g, 'from $1../../components/'],
  // from '../services/' → from '../../services/'
  [/from\s+(['"])\.\.\/services\//g, 'from $1../../services/'],
  // from '../utils/' → from '../../utils/'
  [/from\s+(['"])\.\.\/utils\//g, 'from $1../../utils/'],
  // from '../hooks/' → from '../../hooks/'  (just in case)
  [/from\s+(['"])\.\.\/hooks\//g, 'from $1../../hooks/'],
  // from '../api/' → from '../../api/'
  [/from\s+(['"])\.\.\/api\//g, 'from $1../../api/'],
  // from '../config/' → from '../../config/'
  [/from\s+(['"])\.\.\/config\//g, 'from $1../../config/'],
  // from '../store/' → from '../../store/'
  [/from\s+(['"])\.\.\/store\//g, 'from $1../../store/'],
  // from '../layouts/' → from '../../layouts/'
  [/from\s+(['"])\.\.\/layouts\//g, 'from $1../../layouts/'],
];

for (const f of pageFiles) {
  fixFile(f, shallowImportFixes);
}

// ---- 2. Fix case-sensitivity in route files --------------------------------

console.log('\n=== Fixing casing in route imports ===\n');

const casingFixes = [
  // admin → Admin
  [/(['"])\.\.\/pages\/admin\//g, '$1../pages/Admin/'],
  // fleet → Fleet
  [/(['"])\.\.\/pages\/fleet\//g, '$1../pages/Fleet/'],
  // operations → Operations
  [/(['"])\.\.\/pages\/operations\//g, '$1../pages/Operations/'],
];

if (fs.existsSync(ROUTES)) {
  const routeFiles = walk(ROUTES);
  for (const f of routeFiles) {
    fixFile(f, casingFixes);
  }
}

// Also check App.js and any root-level routing
const appFiles = [
  path.join(FRONTEND, 'App.js'),
  path.join(FRONTEND, 'App.jsx'),
  path.join(FRONTEND, 'AppRoutes.js'),
  path.join(FRONTEND, 'AppRoutes.jsx'),
].filter(f => fs.existsSync(f));

for (const f of appFiles) {
  fixFile(f, casingFixes);
}

// ---- Summary ----------------------------------------------------------------

console.log(`\n${'='.repeat(50)}`);
console.log(`  Total fixes: ${totalFixes}`);
console.log(`  Files changed: ${filesChanged}`);
if (DRY_RUN) {
  console.log('  (DRY RUN — no files were modified)');
  console.log('  Run without --dry-run to apply changes.');
}
console.log('='.repeat(50) + '\n');
