#!/usr/bin/env node
/**
 * dedup-base-domain-module.js
 * ═══════════════════════════════════════════════════════════════
 * Replaces the copy-pasted BaseDomainModule class definition in
 * 44 DDD service files with a shared require() import.
 *
 * Also standardizes healthCheck status to 'healthy' (some use 'ok').
 *
 * Changes per file:
 *   BEFORE:
 *     class BaseDomainModule {
 *       constructor(name, opts = {}) { ... }
 *       log(msg) { ... }
 *     }
 *
 *   AFTER:
 *     const BaseDomainModule = require('./base/BaseDomainModule');
 *
 * Run: node scripts/dedup-base-domain-module.js
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.resolve(__dirname, '..', 'backend', 'services');

let totalFiles = 0;
let baseDomainDeduped = 0;
let healthStatusFixed = 0;
let linesRemoved = 0;

// ────────────────────────────────────────────────────────────────
// Phase 1: Replace copy-pasted BaseDomainModule with shared import
// ────────────────────────────────────────────────────────────────
console.log('\n═══ Phase 1: Dedup BaseDomainModule ═══\n');

const files = fs
  .readdirSync(SERVICES_DIR)
  .filter(f => f.startsWith('ddd') && f.endsWith('.js'))
  .map(f => path.join(SERVICES_DIR, f));

for (const filePath of files) {
  totalFiles++;
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;
  const fname = path.basename(filePath);

  // Pattern: The copy-pasted BaseDomainModule class block
  // It comes in a few variants — match them all:
  //   class BaseDomainModule { constructor(name, opts = {}) { this.name = name; ... } log(msg) { ... } }
  const baseDomainRegex = /\nclass BaseDomainModule\s*\{[\s\S]*?^\}/m;
  const match = content.match(baseDomainRegex);

  if (match) {
    const removedLines = match[0].split('\n').length;
    // Replace the class definition with a require statement
    content = content.replace(baseDomainRegex, "\nconst BaseDomainModule = require('./base/BaseDomainModule');");
    linesRemoved += removedLines - 1; // -1 for the replacement line
    baseDomainDeduped++;
    console.log(`  ✔  ${fname} — removed ${removedLines} lines of copy-pasted BaseDomainModule`);
  }

  // Phase 2: Standardize healthCheck status to 'healthy'
  const healthBefore = content;
  content = content.replace(/status:\s*['"]ok['"]/g, "status: 'healthy'");
  if (content !== healthBefore) {
    healthStatusFixed++;
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

// ────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log(`  DDD service files scanned: ${totalFiles}`);
console.log(`  BaseDomainModule deduped:  ${baseDomainDeduped} files`);
console.log(`  Lines removed:             ~${linesRemoved}`);
console.log(`  healthCheck status fixed:  ${healthStatusFixed} files`);
console.log('═══════════════════════════════════════════\n');
