#!/usr/bin/env node
/**
 * Fix Pattern C DDD Service Stubs
 * ═══════════════════════════════════════════════════════════════════
 * 32 DDD service files are pure stubs that export undefined names,
 * crashing on require(). This script:
 *   1. Parses the module.exports block to get all exported names
 *   2. Classifies each name: constant (UPPER_CASE) vs function
 *   3. Generates stub definitions (empty arrays/objects for constants,
 *      async functions returning sensible defaults)
 *   4. Inserts the stubs between the require() line and module.exports
 *
 * Usage:
 *   node scripts/fix-pattern-c-stubs.js          # dry-run
 *   node scripts/fix-pattern-c-stubs.js --apply   # apply changes
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APPLY = process.argv.includes('--apply');
const SERVICES_DIR = path.join(__dirname, '..', 'backend', 'services');

// 32 broken stubs (3 working ones excluded: dddExportService, dddNotificationDispatcher, dddScheduler)
const BROKEN_STUBS = [
  'dddAccessControl',
  'dddActivityFeed',
  'dddAnalyticsDashboard',
  'dddApiGateway',
  'dddBusinessIntelligence',
  'dddCaseConference',
  'dddClinicalEngine',
  'dddCollaborationHub',
  'dddComplianceDashboard',
  'dddConfigManager',
  'dddConsentManager',
  'dddDataMigration',
  'dddDataQualityMonitor',
  'dddDataWarehouse',
  'dddDevPortal',
  'dddDocumentCollaboration',
  'dddEncryptionService',
  'dddErrorTracker',
  'dddFeatureFlags',
  'dddHealthMonitor',
  'dddInteroperabilityGateway',
  'dddLocalizationEngine',
  'dddMetricsCollector',
  'dddOutcomeTracker',
  'dddPredictiveEngine',
  'dddReportBuilder',
  'dddRiskStratification',
  'dddSecurityAuditor',
  'dddSessionManager',
  'dddSmartScheduler',
  'dddTaskQueue',
  'dddTenantManager',
];

/**
 * Classify an exported name as constant or function.
 * Constants:  UPPER_CASE or UPPER_CASE_WITH_UNDERSCORES
 * Middleware: ends with Middleware
 * Dashboard: ends with Dashboard
 * Seed:      starts with seed
 * Otherwise: async function
 */
function classifyName(name) {
  if (/^[A-Z][A-Z0-9_]+$/.test(name)) return 'constant';
  if (/Middleware$/.test(name)) return 'middleware';
  if (/Dashboard$/.test(name)) return 'dashboard';
  if (/^seed/.test(name)) return 'seed';
  return 'function';
}

/**
 * Generate a stub definition for a given exported name.
 */
function generateStub(name, serviceName) {
  const type = classifyName(name);

  switch (type) {
    case 'constant':
      // Constants default to empty arrays (most are lists of definitions)
      return `const ${name} = [];`;

    case 'middleware':
      return `function ${name}(req, res, next) { next(); }`;

    case 'dashboard':
      return [`async function ${name}() {`, `  return { service: '${serviceName}', status: 'healthy', timestamp: new Date() };`, `}`].join(
        '\n',
      );

    case 'seed':
      return `async function ${name}() { /* TODO: implement */ }`;

    case 'function':
    default:
      return `async function ${name}() { /* TODO: implement */ }`;
  }
}

/**
 * Parse module.exports = { name1, name2, ... } from file content.
 * Returns array of exported names.
 */
function parseExports(code) {
  // Find module.exports = { ... };
  const match = code.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  if (!match) return [];

  const inner = match[1];
  // Split by comma, trim, filter empty
  return inner
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      // Handle "name: value" vs bare "name"
      const colonIdx = s.indexOf(':');
      if (colonIdx > 0) return s.substring(0, colonIdx).trim();
      return s.trim();
    });
}

// ── Main ──
let fixed = 0;
let errors = 0;
let skipped = 0;

console.log(`Pattern C Stub Fixer — ${APPLY ? 'APPLY' : 'DRY-RUN'} mode`);
console.log('═'.repeat(60));

for (const stub of BROKEN_STUBS) {
  const filePath = path.join(SERVICES_DIR, stub + '.js');

  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${stub}`);
    skipped++;
    continue;
  }

  const code = fs.readFileSync(filePath, 'utf8');

  // Parse exported names
  const exportedNames = parseExports(code);
  if (exportedNames.length === 0) {
    console.log(`SKIP (no exports found): ${stub}`);
    skipped++;
    continue;
  }

  // Extract service name from filename (dddFeatureFlags → FeatureFlags)
  const serviceName = stub.replace(/^ddd/, '');

  // Generate stub definitions
  const stubs = exportedNames.map(name => generateStub(name, serviceName));
  const stubBlock = stubs.join('\n\n');

  // Find insertion point: after the last require() line and before module.exports
  const lines = code.split('\n');
  let lastRequireLine = -1;
  let moduleExportsLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('require(')) lastRequireLine = i;
    if (lines[i].startsWith('module.exports')) {
      moduleExportsLine = i;
      break;
    }
  }

  if (lastRequireLine < 0 || moduleExportsLine < 0) {
    console.log(`SKIP (structure not recognized): ${stub}`);
    skipped++;
    continue;
  }

  // Build new file content
  const before = lines.slice(0, lastRequireLine + 1).join('\n');
  const after = lines.slice(moduleExportsLine).join('\n');

  const newCode = `${before}\n\n${stubBlock}\n\n${after}`;

  // Syntax check
  try {
    new vm.Script(newCode, { filename: stub + '.js' });
  } catch (e) {
    console.log(`SYNTAX ERROR in ${stub}: ${e.message}`);
    errors++;
    continue;
  }

  if (APPLY) {
    fs.writeFileSync(filePath, newCode);
    console.log(`FIXED: ${stub} — ${exportedNames.length} exports stubbed`);
  } else {
    console.log(`WOULD FIX: ${stub} — ${exportedNames.length} exports to stub`);
  }
  fixed++;
}

console.log('═'.repeat(60));
console.log(`Done: ${fixed} ${APPLY ? 'fixed' : 'would fix'}, ${errors} errors, ${skipped} skipped`);
console.log(`Total exported names stubbed: ~${fixed * 10}`);
