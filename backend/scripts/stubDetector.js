/**
 * stubDetector.js — Controller & Route Stub Detector
 * ════════════════════════════════════════════════════
 * Analyzes controller files to detect stubs (empty implementations
 * or functions that return dummy data).
 *
 * Usage: node scripts/stubDetector.js
 * Or: npm run audit:stubs
 */

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CONTROLLERS_DIR = path.join(__dirname, '..', 'controllers');

// Patterns that indicate a stub function
const STUB_PATTERNS = [
  // Empty function body — ONLY empty (no other statements)
  /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/,
  // Arrow function with empty body — ONLY empty
  /\(\s*\)\s*=>\s*\{\s*\}/,
  // Returns ONLY empty object (no other logic)
  /\{\s*return\s*\{\s*\}\s*\}/,
  // Returns ONLY empty array (no other logic)
  /\{\s*return\s*\[\s*\]\s*\}/,
  // Returns ONLY null (no other logic) — guard clause pattern excluded
  /\{\s*return\s*null\s*;?\s*\}/,
  // Returns ONLY undefined (no other logic)
  /\{\s*return\s*undefined\s*;?\s*\}/,
  // TODO/FIXME/STUB/HACK comments in function body (not header comments)
  /\{[\s\S]*\/\/\s*(TODO|FIXME|STUB|HACK)[\s\S]*\}/i,
  // res.json({}) — with no other data
  /res\.json\s*\(\s*\{\s*\}\s*\)/,
  // res.json([]) — with no other data
  /res\.json\s*\(\s*\[\s*\]\s*\)/,
  // res.send('OK') or res.send('Not implemented')
  /res\.send\s*\(\s*['"`]OK['"`]\s*\)/,
  /res\.send\s*\(\s*['"`]Not implemented['"`]\s*\)/i,
  // res.status(501) — explicit not-implemented
  /res\.status\s*\(\s*501\s*\)/,
  // throw new Error('Not implemented')
  /throw\s+new\s+Error\s*\(\s*['"`]Not implemented['"`]\s*\)/i,
];

/**
 * Check if a function body is a stub.
 * A stub is a function that has NO meaningful logic beyond trivial returns.
 * Guard clauses (return null/undefined after a condition check) are NOT stubs.
 */
function isStubFunction(funcBody) {
  // If the body contains conditional logic (if, switch, try/catch) with a guard
  // clause, it's likely not a stub.
  const hasConditionalLogic = /\b(if|switch|try|catch|while|for)\b/.test(funcBody);
  const hasDatabaseCalls = /\b(find|findOne|findById|create|update|delete|aggregate|query)\b/.test(funcBody);
  const hasServiceCalls = /\bService\.\w+/.test(funcBody);
  const hasExternalCalls = /\b(require|import|fetch|axios|http)\b/.test(funcBody);
  
  // If it has real logic, it's not a stub
  if (hasConditionalLogic && (hasDatabaseCalls || hasServiceCalls || hasExternalCalls)) {
    return false;
  }

  // Check stub patterns
  for (const pattern of STUB_PATTERNS) {
    if (pattern.test(funcBody)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract function bodies from a file
 */
function extractFunctions(content) {
  const functions = [];
  
  // Match function declarations
  const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    functions.push({ name: match[1], body: match[2] });
  }

  // Match arrow functions assigned to variables
  const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{([\s\S]*?)\}/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    functions.push({ name: match[1], body: match[2] });
  }

  // Match method definitions
  const methodRegex = /(\w+)\s*:\s*(?:async\s+)?function\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
  while ((match = methodRegex.exec(content)) !== null) {
    functions.push({ name: match[1], body: match[2] });
  }

  return functions;
}

/**
 * Analyze a controller file for stubs
 */
function analyzeController(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const functions = extractFunctions(content);
  const stubs = [];

  for (const func of functions) {
    if (isStubFunction(func.body)) {
      stubs.push(func.name);
    }
  }

  return { file: path.basename(filePath), totalFunctions: functions.length, stubs };
}

/**
 * Scan all controllers
 */
function scanControllers() {
  const files = fs.readdirSync(CONTROLLERS_DIR).filter(f => f.endsWith('.js'));
  const results = [];

  for (const file of files) {
    const filePath = path.join(CONTROLLERS_DIR, file);
    const result = analyzeController(filePath);
    if (result.stubs.length > 0) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Print report
 */
function printReport(results) {
  logger.info('═'.repeat(70));
  logger.info('  CONTROLLER STUB DETECTION REPORT');
  logger.info('═'.repeat(70));

  if (results.length === 0) {
    logger.info('  ✅ No stub controllers detected!');
    return;
  }

  let totalStubs = 0;
  for (const result of results) {
    logger.info(`\n  📄 ${result.file}`);
    logger.info(`     Total functions: ${result.totalFunctions}`);
    logger.info(`     Stub functions: ${result.stubs.length}`);
    for (const stub of result.stubs) {
      logger.info(`       ⚠️  ${stub}`);
      totalStubs++;
    }
  }

  logger.info('\n' + '═'.repeat(70));
  logger.info(`  SUMMARY: ${results.length} files with stubs, ${totalStubs} stub functions total`);
  logger.info('═'.repeat(70));
}

// ─── Main ──────────────────────────────────────────────────────────────────

if (require.main === module) {
  try {
    const results = scanControllers();
    printReport(results);

    // Exit with error code if stubs found (for CI/CD)
    if (results.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    logger.error('Stub detection failed:', err.message);
    process.exit(2);
  }
}

module.exports = { scanControllers, analyzeController, isStubFunction };
