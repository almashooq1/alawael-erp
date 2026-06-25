#!/usr/bin/env node
'use strict';

/**
 * check-core-linkage.js - meta-guard for beneficiary-keyed model coverage.
 *
 * Problem (from CORE_LINKAGE_LEDGER): coverage today is enforced only by
 * scattered `*-core-linkage-wave*.test.js` suites + a manual ledger. A new
 * beneficiary-keyed model can ship with no unified-core producer and nothing
 * fails at CI.
 *
 * What this v1 guard does:
 *   1. Index all Mongoose schema files under backend/models/ and
 *      backend/domains/<sub>/models/.
 *   2. Decide a model is "beneficiary-keyed" if its schema declares a field
 *      named beneficiaryId / beneficiary_id / beneficiary (ref:'Beneficiary').
 *   3. Decide a model is "linked" if ANY of:
 *        - it has a native hook/service call that emits/publishes a contract
 *          event (integrationBus.publish, bus.emit, this.emit with dotted name)
 *        - it appears in modelEventBridge.js MAPPINGS
 *        - a core-linkage test requires it
 *        - CORE_LINKAGE_LEDGER.md mentions it
 *   4. Compare against a ratchet baseline. New unlinked models fail the gate.
 *
 * Exit:
 *   0 = no new gaps (or --fix-baseline succeeded)
 *   1 = new beneficiary-keyed model(s) without core linkage
 *   2 = internal error
 *
 * Flags:
 *   --json          machine-readable output
 *   --fix-baseline  rewrite baseline to current findings (ratchet-up; review diff)
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_DIR, '..');
const BASELINE_FILE = path.join(__dirname, 'check-core-linkage.baseline.json');
const LEDGER_FILE = path.join(REPO_ROOT, 'docs', 'architecture', 'CORE_LINKAGE_LEDGER.md');

const JSON_MODE = process.argv.includes('--json');
const FIX_BASELINE = process.argv.includes('--fix-baseline');

const SCAN_DIRS = [path.join(BACKEND_DIR, 'models'), path.join(BACKEND_DIR, 'domains')];
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '_archived',
  '__tests__',
  'tests',
  'scripts',
  '__mocks__',
]);

// Beneficiary-key detection: field name containing beneficiaryId/beneficiary_id
// or a `beneficiary` field that refs the Beneficiary model.
const BENEFICIARY_FIELD_RE = new RegExp(
  '(?:^|[^a-zA-Z0-9_$])(beneficiaryId|beneficiary_id)\\s*:',
  'i'
);
const BENEFICIARY_REF_RE = new RegExp(
  '(?:^|[^a-zA-Z0-9_$])beneficiary\\s*:\\s*\\{[^}]*ref\\s*:\\s*[\'"]Beneficiary[\'"]',
  'is'
);

// Contract-event producer signals inside a model file.
const PRODUCER_RE = new RegExp(
  '(?:integrationBus|bus|this)\\s*\\.\\s*(?:publish|emit)\\s*\\(\\s*[\'"]([a-z][\\w.]*\\.\\w[\\w.]*)[\'"]',
  'g'
);

function log(msg) {
  if (!JSON_MODE) console.log(msg);
}

function walkJs(dir, out) {
  if (!out) out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function isSchemaFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  return new RegExp('new\\s+(?:mongoose\\.)?Schema\\s*\\(').test(src);
}

function isBeneficiaryKeyed(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  return BENEFICIARY_FIELD_RE.test(src) || BENEFICIARY_REF_RE.test(src);
}

function hasNativeProducer(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  return PRODUCER_RE.test(src);
}

function loadModelEventBridgeMappings() {
  const f = path.join(BACKEND_DIR, 'integration', 'modelEventBridge.js');
  const src = fs.readFileSync(f, 'utf8');
  const names = new Set();
  const re = new RegExp('modelName\\s*:\\s*[\'"]([^\'"]+)[\'"]', 'g');
  for (const m of src.matchAll(re)) names.add(m[1]);
  return names;
}

function loadLinkedModelsFromTests() {
  const dir = path.join(BACKEND_DIR, '__tests__');
  const names = new Set();
  const files = walkJs(dir).filter(function (f) {
    return path.basename(f).includes('core-linkage');
  });
  const re = new RegExp(
    'require\\s*\\(\\s*[\'"](?:\\.\\./)+(?:models|domains[^\'"]*models)/([^\'"]+)[\'"]\\s*\\)',
    'g'
  );
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      names.add(path.basename(m[1], '.js'));
    }
  }
  return names;
}

function loadLinkedModelsFromLedger() {
  if (!fs.existsSync(LEDGER_FILE)) return new Set();
  const src = fs.readFileSync(LEDGER_FILE, 'utf8');
  const names = new Set();
  // Match `models/X/Y.js` or inline `ModelName` in backticks in the tables.
  const re = new RegExp('`models/([^`]+)`|`(?:models/)?([A-Z][A-Za-z0-9]+)`', 'g');
  for (const m of src.matchAll(re)) {
    const raw = m[1] || m[2];
    if (!raw) continue;
    names.add(path.basename(raw.replace(/\.js$/, '')));
  }
  return names;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to parse baseline:', err.message);
    process.exit(2);
  }
}

function main() {
  const modelFiles = [];
  for (const d of SCAN_DIRS) walkJs(d, modelFiles);

  const schemaFiles = modelFiles.filter(function (f) {
    return (
      isSchemaFile(f) &&
      (f.includes(path.sep + 'models' + path.sep) || path.dirname(f).endsWith(path.sep + 'models'))
    );
  });
  const beneficiaryModels = schemaFiles.filter(isBeneficiaryKeyed).map(function (f) {
    return {
      name: path.basename(f, '.js'),
      file: path.relative(BACKEND_DIR, f).replace(/\\/g, '/'),
    };
  });

  const linkedByBridge = loadModelEventBridgeMappings();
  const linkedByTests = loadLinkedModelsFromTests();
  const linkedByLedger = loadLinkedModelsFromLedger();

  const unlinked = [];
  for (const m of beneficiaryModels) {
    if (linkedByBridge.has(m.name)) continue;
    if (linkedByTests.has(m.name)) continue;
    if (linkedByLedger.has(m.name)) continue;
    const full = path.join(BACKEND_DIR, m.file);
    if (hasNativeProducer(full)) continue;
    unlinked.push(m);
  }

  unlinked.sort(function (a, b) {
    return a.file.localeCompare(b.file);
  });

  if (FIX_BASELINE) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(unlinked, null, 2) + '\n');
    log('OK baseline updated (' + unlinked.length + ' unlinked beneficiary-keyed models)');
    process.exit(0);
  }

  const baseline = loadBaseline();
  const baselineSet = new Set(
    baseline.map(function (b) {
      return b.file;
    })
  );
  const newGaps = unlinked.filter(function (u) {
    return !baselineSet.has(u.file);
  });

  if (JSON_MODE) {
    console.log(
      JSON.stringify({ total: unlinked.length, new: newGaps.length, gaps: newGaps }, null, 2)
    );
  }

  if (newGaps.length === 0) {
    log(
      'OK no new beneficiary-keyed models lacking core linkage (' +
        unlinked.length +
        ' known gaps in baseline)'
    );
    process.exit(0);
  }

  log('FAIL ' + newGaps.length + ' new beneficiary-keyed model(s) lack core linkage:');
  for (const u of newGaps) log('  - ' + u.name + ' (' + u.file + ')');
  log(
    '\nFix: add a producer (native hook / modelEventBridge mapping), a core-linkage test, or a ledger entry.'
  );
  log('To acknowledge existing gaps: node scripts/check-core-linkage.js --fix-baseline');
  process.exit(1);
}

main();
