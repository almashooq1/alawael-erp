/**
 * W1149 — smart-alerts model-availability drift guard.
 *
 * The original Credential bug (fixed in W1147) died SILENTLY in production for a
 * long time because nothing asserted that the models the alert engine depends on
 * actually exist. The app.js loader does `require('./models/${name}')` inside a
 * try/catch that only logs a warning; a rule that self-loads via
 * `require('../../models/X')` swallows a bad path in its own try/catch. Neither
 * fails a test — so a model rename (Credential → EmployeeCredential) or a typo'd
 * self-load path leaves the rule a no-op with no CI signal.
 *
 * This is the alert-sink analog of W1148 (bridge phantom guard). Two prongs:
 *   1. Every modelName in the app.js smart-alerts loader array resolves to a real
 *      ./models/<name>(.js|/index.js) file — except a documented KNOWN_MISSING
 *      baseline.
 *   2. Every `require('../../models/...')` self-load inside an alert rule resolves
 *      to a real file on disk.
 *
 * Ratchet-down (W325c lineage): a KNOWN_MISSING entry that now resolves (or was
 * removed from the loader) fails, forcing baseline pruning in the same commit
 * that fixes it. Pure static — no mongoose, no DB.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

// Loader modelNames whose ./models/<name> file does NOT exist. Baseline:
//  - Credential: superseded — the credential-* rules now self-load
//    EmployeeCredential (W1147); the bare 'Credential' loader entry is a
//    harmless vestige (a future app.js cleanup may drop it).
//  - IRP: orphaned — the model was removed and SmartIRP is a different concept
//    (no pending_approval); irp-overdue-approval is a guarded no-op pending a
//    product decision. See project_alerts_bridge_flipped_prod_2026-06-10.
const KNOWN_MISSING_LOADER_MODELS = new Set(['Credential', 'IRP']);

function extractLoaderModelNames() {
  const src = fs.readFileSync(path.join(BACKEND, 'app.js'), 'utf8');
  const block = src.match(/const modelNames = \[([\s\S]*?)\];/);
  if (!block) return null;
  return [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
}

function fileResolves(absNoExt) {
  return ['.js', path.sep + 'index.js'].some(ext => fs.existsSync(absNoExt + ext));
}

function loaderModelFileExists(name) {
  // loader does require(`./models/${name}`) → ./models/<name>.js or /<name>/index.js
  return fileResolves(path.join(BACKEND, 'models', name));
}

describe('W1149 — smart-alerts loader + rule self-load model availability', () => {
  const loaderNames = extractLoaderModelNames();

  test('the app.js smart-alerts loader array is parseable', () => {
    expect(loaderNames).toBeTruthy();
    expect(loaderNames.length).toBeGreaterThan(5);
    // Anchors that must be present if the parse worked.
    expect(loaderNames).toEqual(expect.arrayContaining(['Invoice', 'CarePlan']));
  });

  test('every loader modelName resolves to a real ./models file (or known-missing)', () => {
    const missing = loaderNames.filter(
      n => !loaderModelFileExists(n) && !KNOWN_MISSING_LOADER_MODELS.has(n)
    );
    expect(missing).toEqual([]);
  });

  test('no STALE known-missing entry (ratchet-down once fixed/removed)', () => {
    const present = new Set(loaderNames);
    const stale = [...KNOWN_MISSING_LOADER_MODELS].filter(
      n => !present.has(n) || loaderModelFileExists(n)
    );
    expect(stale).toEqual([]);
  });

  test('every alert rule self-load require path resolves on disk', () => {
    const rulesDir = path.join(BACKEND, 'alerts', 'rules');
    const bad = [];
    for (const f of fs.readdirSync(rulesDir)) {
      if (!f.endsWith('.js') || f === 'index.js') continue;
      const src = fs.readFileSync(path.join(rulesDir, f), 'utf8');
      for (const m of src.matchAll(/require\(\s*['"](\.\.\/\.\.\/models\/[^'"]+)['"]\s*\)/g)) {
        if (!fileResolves(path.join(rulesDir, m[1]))) bad.push(`${f} -> ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
