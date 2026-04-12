#!/usr/bin/env node
'use strict';
/**
 * wire-validation-into-routes.js
 * ═══════════════════════════════
 * Auto-wires validation middleware into DDD route files.
 *
 * For each route file that has a matching validation file:
 * 1. Adds `const { validate } = require('../middleware/validate')`
 * 2. Adds `const v = require('../validations/xxx.validation')`
 * 3. Inserts `validate(v.xxx)` between `authenticate` and `async (req, res) =>`
 *    for POST/PUT endpoints where a matching validator exists.
 *
 * Usage:
 *   node scripts/wire-validation-into-routes.js --dry-run
 *   node scripts/wire-validation-into-routes.js
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');

const routesDir = path.join(__dirname, '..', 'backend', 'routes');
const validationsDir = path.join(__dirname, '..', 'backend', 'validations');

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Helpers                                                    */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function getValidationExports(validationFile) {
  const src = fs.readFileSync(validationFile, 'utf8');
  const exports = [];
  // Match: createXxx, or updateXxx, in module.exports
  const expBlock = src.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  if (!expBlock) return exports;
  const names = expBlock[1].match(/\b(create|update)\w+/g);
  if (names) exports.push(...names);
  return exports;
}

/**
 * Given a route line like:
 *   router.post('/reviews', authenticate, async (req, res) => {
 * Determine what validation chain name to insert.
 *
 * Strategy:
 * - POST '/resource' → createResource  (primary create)
 * - PUT  '/resource/:id' → updateResource  (primary update)
 * - POST '/resource/:id/action' → skip (action endpoint)
 *
 * We match the LAST segment of the path (excluding :id params) to
 * find a validator whose suffix matches (case-insensitive).
 */
function matchValidator(method, routePath, availableExports) {
  // Extract path segments, ignoring :params
  const segments = routePath.split('/').filter(s => s && !s.startsWith(':'));

  if (segments.length === 0) return null;

  // Get the resource name from the last non-param segment
  const lastName = segments[segments.length - 1];
  // Normalize: kebab → camel, singular/plural
  const camel = lastName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const singular = camel.endsWith('s') ? camel.slice(0, -1) : camel;
  const cap = singular.charAt(0).toUpperCase() + singular.slice(1);
  const capPlural = camel.charAt(0).toUpperCase() + camel.slice(1);

  // Determine if this is a create or update pattern
  // POST /resource(s) → create
  // PUT /resource(s)/:id → update
  // POST /resource(s)/:id/{action} → skip (action endpoints rarely need deep validation)
  const pathEndsWithParam = routePath.match(/:[\w]+\/?$/);
  const isActionOnResource = method === 'post' && pathEndsWithParam;

  // Count :param segments
  const paramSegments = routePath.split('/').filter(s => s.startsWith(':'));

  let prefix;
  if (method === 'post' && paramSegments.length === 0) {
    prefix = 'create';
  } else if (method === 'put') {
    prefix = 'update';
  } else if (method === 'post' && paramSegments.length >= 1) {
    // Could be action endpoint (POST /x/:id/action) or nested create
    // Check: if the last segment is NOT a param, it might be a sub-resource create
    const lastSeg = routePath.split('/').filter(Boolean).pop();
    if (!lastSeg.startsWith(':')) {
      prefix = 'create';
    } else {
      return null; // POST /x/:id — likely an action
    }
  } else {
    return null;
  }

  // Try to find a matching export
  const candidates = [`${prefix}${cap}`, `${prefix}${capPlural}`, `${prefix}${cap}s`];

  for (const c of candidates) {
    if (availableExports.includes(c)) return c;
  }

  // Fuzzy: try matching any export that ends with a similar suffix
  for (const exp of availableExports) {
    if (!exp.startsWith(prefix)) continue;
    const expSuffix = exp.replace(/^(create|update)/, '').toLowerCase();
    if (expSuffix === singular.toLowerCase() || expSuffix === camel.toLowerCase()) {
      return exp;
    }
  }

  return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Main                                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const validationFiles = fs
  .readdirSync(validationsDir)
  .filter(f => f.endsWith('.validation.js'))
  .map(f => ({ name: f, kebab: f.replace('.validation.js', '') }));

let totalWired = 0,
  totalSkipped = 0,
  totalFiles = 0;

for (const vf of validationFiles) {
  const routeFile = path.join(routesDir, `ddd-${vf.kebab}.routes.js`);
  if (!fs.existsSync(routeFile)) continue;

  let src = fs.readFileSync(routeFile, 'utf8');

  // Skip if already wired
  if (src.includes("require('../validations/")) {
    continue;
  }

  const exports = getValidationExports(path.join(validationsDir, vf.name));
  if (exports.length === 0) continue;

  // Find all router.post / router.put lines
  const postPutRegex = /router\.(post|put)\(\s*['"]([^'"]+)['"]\s*,\s*authenticate\s*,\s*async/g;
  let match;
  const insertions = [];

  while ((match = postPutRegex.exec(src)) !== null) {
    const method = match[1];
    const routePath = match[2];
    const validatorName = matchValidator(method, routePath, exports);

    if (validatorName) {
      // We need to insert `validate(v.xxx), ` after "authenticate, "
      const insertPos = match.index + match[0].indexOf('authenticate,') + 'authenticate,'.length;
      insertions.push({ pos: insertPos, validatorName, routePath, method });
    }
  }

  if (insertions.length === 0) continue;

  // Apply insertions in reverse order to preserve positions
  insertions.sort((a, b) => b.pos - a.pos);

  let modified = src;
  for (const ins of insertions) {
    modified = modified.substring(0, ins.pos) + ` validate(v.${ins.validatorName}),` + modified.substring(ins.pos);
  }

  // Add imports after the last require() line
  const requireImports = `const { validate } = require('../middleware/validate');\nconst v = require('../validations/${vf.kebab}.validation');\n`;

  // Find the position to add imports — after the last existing require
  const lastRequireIdx = modified.lastIndexOf("require('");
  const endOfLine = modified.indexOf('\n', lastRequireIdx);
  if (lastRequireIdx > 0 && endOfLine > 0) {
    modified = modified.substring(0, endOfLine + 1) + requireImports + modified.substring(endOfLine + 1);
  }

  totalFiles++;
  const wiredCount = insertions.length;
  totalWired += wiredCount;

  if (DRY) {
    console.log(`  WOULD wire ddd-${vf.kebab}.routes.js — ${wiredCount} endpoints:`);
    for (const ins of insertions.reverse()) {
      console.log(`    ${ins.method.toUpperCase()} ${ins.routePath} → v.${ins.validatorName}`);
    }
  } else {
    // Syntax-check before writing
    try {
      new (require('vm').Script)(modified, { filename: routeFile });
    } catch (err) {
      console.log(`  FAIL ddd-${vf.kebab}.routes.js — syntax error: ${err.message}`);
      totalSkipped++;
      totalWired -= wiredCount;
      continue;
    }
    fs.writeFileSync(routeFile, modified, 'utf8');
    console.log(`  WIRED ddd-${vf.kebab}.routes.js — ${wiredCount} endpoints`);
  }
}

console.log('');
console.log(`=== SUMMARY: ${totalFiles} files, ${totalWired} endpoints wired, ${totalSkipped} failed ===`);
