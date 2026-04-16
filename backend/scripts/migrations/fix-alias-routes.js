#!/usr/bin/env node
/**
 * Fix files that use custom auth middleware aliases (authMiddleware, authGuard, etc.)
 * These were missed by the main secure-routes.js script
 */
'use strict';

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', 'routes');

const aliasFiles = {
  'knowledge.js': 'authMiddleware',
  'smart_attendance.routes.js': 'authMiddleware',
  'workflow.routes.js': 'authMiddleware',
  'workflowEnhanced.routes.js': 'authMiddleware',
  'zkteco.routes.js': 'authMiddleware',
  'successionPlanning.routes.js': 'authMiddleware',
  'rehabilitationPlan.routes.js': 'authGuard',
};

let fixed = 0;
for (const [file, authName] of Object.entries(aliasFiles)) {
  const fp = path.join(dir, file);
  if (!fs.existsSync(fp)) {
    console.log('[SKIP] ' + file + ' not found');
    continue;
  }
  let c = fs.readFileSync(fp, 'utf8');

  // Escape authName for regex
  const escaped = authName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let count = 0;

  // Pattern 1: per-route auth — router.get('/path', authMiddleware, ...)
  const routeRe = new RegExp(
    '(router\\.(get|post|put|patch|delete)\\s*\\([^,]+,\\s*)' + escaped + '(\\s*,)',
    'g'
  );
  c = c.replace(routeRe, (match, prefix, method, comma) => {
    if (match.includes('requireBranchAccess')) return match;
    count++;
    return prefix + authName + ', requireBranchAccess' + comma;
  });

  // Pattern 2: global auth — router.use(authMiddleware)
  const globalRe = new RegExp('router\\.use\\(' + escaped + '\\);?\\s*\\n', 'g');
  // Check if requireBranchAccess follows on next line
  const globalCheckRe = new RegExp(
    'router\\.use\\(' + escaped + '\\);?\\s*\\n\\s*router\\.use\\(requireBranchAccess\\)'
  );
  if (!globalCheckRe.test(c) && globalRe.test(c)) {
    // Reset lastIndex
    globalRe.lastIndex = 0;
    c = c.replace(globalRe, match => {
      count++;
      return match.trimEnd() + '\nrouter.use(requireBranchAccess);\n';
    });
  }

  if (count > 0) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log('[FIXED] ' + file + ' (' + count + ' routes)');
    fixed++;
  } else {
    console.log('[CHECK] ' + file + ' — may need manual review');
  }
}

console.log('\nFixed: ' + fixed + ' files');
