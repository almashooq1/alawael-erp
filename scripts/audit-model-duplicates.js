#!/usr/bin/env node
'use strict';
/**
 * audit-model-duplicates.js
 * Scans all model files for duplicate mongoose.model() name registrations.
 * Reports: which model names are registered in multiple files,
 *          which files are "proxy" (just re-export from DDD) vs "source" (define schema).
 */
const fs = require('fs'),
  p = require('path');
const dir = p.join(__dirname, '..', 'backend', 'models');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const modelMap = {};

for (const f of files) {
  const src = fs.readFileSync(p.join(dir, f), 'utf8');
  const re = /mongoose\.model\s*\(\s*['"](\w+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    if (!modelMap[name]) modelMap[name] = [];
    const hasSchema = /new\s+(mongoose\.)?Schema\s*\(/.test(src);
    const isDdd = f.startsWith('Ddd');
    const lineCount = src.split('\n').length;
    modelMap[name].push({ file: f, hasSchema, isDdd, lineCount });
  }
}

const dups = Object.entries(modelMap).filter(([, entries]) => entries.length > 1);
const unique = Object.entries(modelMap).filter(([, entries]) => entries.length === 1);

console.log('=== MODEL AUDIT ===');
console.log('Total model names:', Object.keys(modelMap).length);
console.log('Unique (1 file):', unique.length);
console.log('Duplicate (2+ files):', dups.length);
console.log('');

// Classify duplicates
let safeProxy = 0,
  trueConflict = 0;
const conflicts = [];

for (const [name, entries] of dups) {
  // If one is a DDD file with schema and others are non-DDD proxies -> safe
  const dddSources = entries.filter(e => e.isDdd && e.hasSchema);
  const proxies = entries.filter(e => !e.isDdd || !e.hasSchema);

  if (dddSources.length === 1 && proxies.length >= 1) {
    safeProxy++;
  } else {
    trueConflict++;
    conflicts.push({ name, entries });
  }
}

console.log('Safe proxy duplicates (DDD source + legacy proxy):', safeProxy);
console.log('True conflicts (needs attention):', trueConflict);

if (conflicts.length > 0) {
  console.log('\n=== TRUE CONFLICTS ===');
  for (const { name, entries } of conflicts) {
    console.log('\n' + name + ':');
    for (const e of entries) {
      console.log(
        '  ' + e.file + (e.hasSchema ? ' [HAS SCHEMA]' : ' [proxy]') + (e.isDdd ? ' [DDD]' : ' [legacy]') + ' (' + e.lineCount + ' lines)',
      );
    }
  }
}

// Write results to JSON for easy consumption
const resultFile = p.join(__dirname, '_audit_results.json');
fs.writeFileSync(
  resultFile,
  JSON.stringify(
    {
      totalModelNames: Object.keys(modelMap).length,
      uniqueCount: unique.length,
      duplicateCount: dups.length,
      safeProxy,
      trueConflict,
      conflicts: conflicts.map(c => ({
        name: c.name,
        files: c.entries.map(e => ({
          file: e.file,
          hasSchema: e.hasSchema,
          isDdd: e.isDdd,
          lineCount: e.lineCount,
        })),
      })),
      allDups: dups.map(([name, entries]) => ({
        name,
        files: entries.map(e => e.file),
      })),
    },
    null,
    2,
  ),
);
console.log('\nResults written to:', resultFile);
console.log('\n=== DONE ===');
