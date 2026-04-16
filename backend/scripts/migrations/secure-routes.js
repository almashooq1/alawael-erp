#!/usr/bin/env node
/**
 * سكريبت تأمين ملفات المسارات — إضافة branchScope middleware
 *
 * يقوم بـ:
 * 1. إضافة import الـ branchScope middleware
 * 2. إضافة requireBranchAccess بعد الـ auth middleware
 *    - للملفات التي تستخدم router.use(auth) → يضيف router.use(requireBranchAccess)
 *    - للملفات التي تستخدم per-route auth → يضيف requireBranchAccess بعد كل auth middleware
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', '..', 'routes');

// الملفات التي يجب تخطيها (ليست ملفات مسارات حقيقية أو مؤمّنة بالفعل)
const SKIP_FILES = new Set(['_registry.js']);

// Auth middleware names used across the codebase
const AUTH_NAMES = ['authenticateToken', 'authenticate', 'requireAuth', 'auth'];

// Stats
const stats = {
  total: 0,
  skipped: 0,
  alreadySecured: 0,
  noAuth: 0,
  globalAuth: 0,
  perRouteAuth: 0,
  errors: [],
};

function processFile(filePath) {
  const fileName = path.basename(filePath);
  stats.total++;

  if (SKIP_FILES.has(fileName)) {
    stats.skipped++;
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has branchScope
  if (content.includes('branchScope.middleware') || content.includes('requireBranchAccess')) {
    stats.alreadySecured++;
    return;
  }

  // Check if this file has any auth middleware
  const hasAuth = AUTH_NAMES.some(name => content.includes(name));
  if (!hasAuth) {
    // Check for optionalAuth — different handling
    if (content.includes('optionalAuth')) {
      stats.noAuth++;
      console.log(`  [SKIP-OPTIONAL] ${fileName} — uses optionalAuth only`);
      return;
    }
    stats.noAuth++;
    console.log(`  [NO-AUTH] ${fileName} — no auth middleware found`);
    return;
  }

  // Check if file has router defined
  if (!content.includes('express.Router()') && !content.includes('Router()')) {
    stats.skipped++;
    console.log(`  [SKIP-NO-ROUTER] ${fileName}`);
    return;
  }

  try {
    content = addBranchScopeImport(content, fileName);

    // Detect pattern: global auth (router.use) vs per-route
    const globalAuthPattern =
      /router\.use\(\s*(authenticateToken|authenticate|requireAuth|auth)\s*\)/;
    const globalMatch = content.match(globalAuthPattern);

    if (globalMatch) {
      content = addGlobalBranchScope(content, globalMatch, fileName);
      stats.globalAuth++;
    } else {
      content = addPerRouteBranchScope(content, fileName);
      stats.perRouteAuth++;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [SECURED] ${fileName}`);
  } catch (err) {
    stats.errors.push({ file: fileName, error: err.message });
    console.error(`  [ERROR] ${fileName}: ${err.message}`);
  }
}

function addBranchScopeImport(content, fileName) {
  // Find the auth require line and add branchScope import after it
  const authRequirePattern =
    /^(const\s+\{[^}]*\}\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\);?\s*\n)/m;
  const match = content.match(authRequirePattern);

  if (match) {
    const branchImport = `const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');\n`;
    content = content.replace(match[0], match[0] + branchImport);
    return content;
  }

  // Alternative: might use a different require pattern
  const altAuthPattern = /^(const\s+\w+\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\);?\s*\n)/m;
  const altMatch = content.match(altAuthPattern);

  if (altMatch) {
    const branchImport = `const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');\n`;
    content = content.replace(altMatch[0], altMatch[0] + branchImport);
    return content;
  }

  // If no auth require found, add after the last require statement
  const lastRequirePattern =
    /^((?:const|let|var)\s+.*require\(.+\);?\s*\n)(?!(?:const|let|var)\s+.*require\()/m;
  const lrMatch = content.match(lastRequirePattern);

  if (lrMatch) {
    const branchImport = `const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');\n`;
    content = content.replace(lrMatch[0], lrMatch[0] + branchImport);
    return content;
  }

  // Fallback: add after 'use strict' or at top
  if (content.includes("'use strict'")) {
    content = content.replace(
      /('use strict';?\s*\n)/,
      `$1\nconst { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');\n`
    );
  } else {
    content =
      `const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');\n` +
      content;
  }

  return content;
}

function addGlobalBranchScope(content, globalMatch, _fileName) {
  // Add router.use(requireBranchAccess) right after router.use(authenticate/authenticateToken)
  const fullMatchStr = globalMatch[0];

  // Check if requireBranchAccess is already added after
  const afterGlobal = content.indexOf(fullMatchStr) + fullMatchStr.length;
  const nextLines = content.substring(afterGlobal, afterGlobal + 200);

  if (nextLines.includes('requireBranchAccess')) {
    return content;
  }

  content = content.replace(fullMatchStr, fullMatchStr + '\nrouter.use(requireBranchAccess);');

  return content;
}

function addPerRouteBranchScope(content, _fileName) {
  // For per-route auth patterns, add requireBranchAccess after each auth middleware
  // Patterns: router.get('/path', authenticate, ...)
  //           router.post('/path', authenticateToken, ...)
  //           router.put('/path', requireAuth, ...)

  const routePattern =
    /(router\.(get|post|put|patch|delete)\s*\(\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,\s*)(authenticateToken|authenticate|requireAuth|auth)(\s*,)/g;

  content = content.replace(routePattern, (match, prefix, _method, authName, comma) => {
    return `${prefix}${authName}, requireBranchAccess${comma}`;
  });

  // Also handle patterns with authorize/authorizeRole after auth:
  // router.get('/path', authenticate, authorize('admin'), ...)
  const routeWithRolePattern =
    /(router\.(get|post|put|patch|delete)\s*\(\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,\s*)(authenticateToken|authenticate|requireAuth|auth)(\s*,\s*(?:authorize|authorizeRole|requireRole|_requireRole)\s*\([^)]*\)\s*,)/g;

  content = content.replace(routeWithRolePattern, (match, prefix, _method, authName, rolePart) => {
    // Check if requireBranchAccess is already there
    if (match.includes('requireBranchAccess')) return match;
    return `${prefix}${authName}, requireBranchAccess${rolePart}`;
  });

  // Handle multiline route patterns (common in formatted code):
  // router.get(
  //   '/path',
  //   authenticate,
  //   ...
  const multilineRoutePattern =
    /(router\.(get|post|put|patch|delete)\s*\(\s*\n\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,\s*\n\s*)(authenticateToken|authenticate|requireAuth|auth)(\s*,)/g;

  content = content.replace(multilineRoutePattern, (match, prefix, _method, authName, comma) => {
    if (match.includes('requireBranchAccess')) return match;
    return `${prefix}${authName}, requireBranchAccess${comma}`;
  });

  return content;
}

// ── Main ──
console.log('=== Branch Scope Security Script ===\n');

const files = fs
  .readdirSync(ROUTES_DIR)
  .filter(f => f.endsWith('.js'))
  .sort();

console.log(`Found ${files.length} route files\n`);

for (const file of files) {
  processFile(path.join(ROUTES_DIR, file));
}

console.log('\n=== Summary ===');
console.log(`Total files:        ${stats.total}`);
console.log(`Already secured:    ${stats.alreadySecured}`);
console.log(`Skipped:            ${stats.skipped}`);
console.log(`No auth found:      ${stats.noAuth}`);
console.log(`Global auth added:  ${stats.globalAuth}`);
console.log(`Per-route added:    ${stats.perRouteAuth}`);
console.log(`Errors:             ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\nErrors:');
  stats.errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
}

if (stats.noAuth > 0) {
  console.log('\n[WARNING] Files with no auth middleware need manual review.');
}

console.log('\nDone!');
