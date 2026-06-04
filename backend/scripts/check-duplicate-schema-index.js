#!/usr/bin/env node
'use strict';

/**
 * check-duplicate-schema-index.js — W884.
 *
 * Detects Mongoose unnamed duplicate schema.index() definitions (gh-15056).
 * Exit 0 when clean; exit 1 when duplicates found.
 *
 * Usage:
 *   node scripts/check-duplicate-schema-index.js
 *   node scripts/check-duplicate-schema-index.js --json
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKEND_DIR = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  path.join(BACKEND_DIR, 'models'),
  path.join(BACKEND_DIR, 'services', 'documents'),
];

function walkJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function specKey(fields) {
  return JSON.stringify(Object.keys(fields).map(k => [k, fields[k]]));
}

function collectDuplicates() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  const files = [];
  for (const dir of SCAN_DIRS) files.push(...walkJs(dir));
  for (const file of files) {
    try {
      require(file);
    } catch (_e) {}
  }
  const dupes = [];
  for (const name of Object.keys(mongoose.models)) {
    let indexes;
    try {
      indexes = mongoose.models[name].schema.indexes();
    } catch (_e) {
      continue;
    }
    const seen = new Map();
    for (const idx of indexes) {
      const fields = idx[0];
      const opts = idx[1] || {};
      if (opts.name != null) continue;
      const key = specKey(fields);
      if (seen.has(key)) dupes.push({ model: name, index: key });
      else seen.set(key, true);
    }
  }
  return dupes;
}

function main() {
  const json = process.argv.includes('--json');
  const dupes = collectDuplicates();
  if (json) {
    console.log(JSON.stringify({ duplicates: dupes, count: dupes.length }, null, 2));
  } else if (dupes.length) {
    console.error(`Duplicate schema index definitions: ${dupes.length}`);
    for (const d of dupes) console.error(`  ${d.model}  ${d.index}`);
    console.error(
      'Fix: remove redundant schema.index(); keep unique:true on the field definition.'
    );
  } else {
    console.log('✓ No duplicate unnamed schema indexes detected.');
  }
  process.exit(dupes.length ? 1 : 0);
}

main();
