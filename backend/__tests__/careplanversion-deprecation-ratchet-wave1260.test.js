'use strict';

/**
 * W1260 — CarePlanVersion deprecation ratchet (ADR-041).
 *
 * The owner approved UnifiedCarePlan as the canonical care plan (ADR-040
 * option (b), 2026-06-12) and every consumer was re-pointed/dual-read in
 * W1252-W1259. This guard makes the direction PERMANENT via the proven
 * W325c/W340 ratchet pattern:
 *
 *   1. Any NEW functional consumer of CarePlanVersion (require of the model
 *      file / mongoose model lookup) fails CI — new care-plan work must
 *      target UnifiedCarePlan.
 *   2. Any STALE baseline entry (consumer removed) fails CI — forcing the
 *      baseline to ratchet DOWN in the same commit, until only the model
 *      file remains and retirement (ADR-041 phase 3) can execute.
 *
 * Scope: FUNCTIONAL consumption only. `ref: 'CarePlanVersion'` cross-links
 * (e.g. TransitionPlan's deliberate dual-link) and comments are NOT counted —
 * they don't read/write the collection.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

const SCAN_ROOTS = [
  'models',
  'services',
  'intelligence',
  'routes',
  'domains',
  'startup',
  'scheduler',
  'controllers',
  'middleware',
  'workflow',
  'events',
  'integration',
];

const CONSUMER_RE =
  /(require\(['"][^'"]*CarePlanVersion['"]\)|mongoose\.models?\.CarePlanVersion|model\(\s*['"]CarePlanVersion['"]\s*\))/;

// ── Baseline (2026-06-12, W1260) — ratchet DOWN only ─────────────────
// • models/CarePlanVersion.js        — the model itself (last to go)
// • intelligence/care-plan-bootstrap.js — legacy W41-51 engine factory
// • startup/carePlanningBootstrap.js — wires the engine (passes the model)
// • startup/parentChatbotBootstrap.js — chatbot reads legacy plans
const KNOWN_CONSUMERS_BASELINE = new Set([
  'models/CarePlanVersion.js',
  'intelligence/care-plan-bootstrap.js',
  'startup/carePlanningBootstrap.js',
  'startup/parentChatbotBootstrap.js',
]);

function scanConsumers() {
  const hits = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_e) {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (/node_modules|__tests__|archived|\.git/.test(e.name)) continue;
        walk(p);
      } else if (e.name.endsWith('.js')) {
        const src = fs.readFileSync(p, 'utf8');
        if (CONSUMER_RE.test(src)) {
          hits.push(path.relative(BACKEND, p).split(path.sep).join('/'));
        }
      }
    }
  }
  for (const r of SCAN_ROOTS) walk(path.join(BACKEND, r));
  return hits;
}

describe('W1260 CarePlanVersion deprecation ratchet (ADR-041)', () => {
  const found = scanConsumers();

  test('no NEW functional consumers of the deprecated CarePlanVersion', () => {
    const newcomers = found.filter(f => !KNOWN_CONSUMERS_BASELINE.has(f));
    expect({
      hint: 'CarePlanVersion is deprecated (ADR-041). New care-plan work targets UnifiedCarePlan. If this consumer is part of an approved retirement step, update the baseline in the SAME commit.',
      newcomers,
    }).toEqual({ hint: expect.any(String), newcomers: [] });
  });

  test('stale baseline entries must be pruned (ratchet DOWN)', () => {
    const foundSet = new Set(found);
    const stale = [...KNOWN_CONSUMERS_BASELINE].filter(f => !foundSet.has(f));
    expect({
      hint: 'A baseline consumer no longer references CarePlanVersion — remove it from KNOWN_CONSUMERS_BASELINE in this same commit (the whole point of the ratchet).',
      stale,
    }).toEqual({ hint: expect.any(String), stale: [] });
  });

  test('sanity — the scan sees the model file itself', () => {
    expect(found).toContain('models/CarePlanVersion.js');
  });

  test('ADR-041 exists and records the deprecation', () => {
    const adr = fs.readFileSync(
      path.join(
        BACKEND,
        '..',
        'docs',
        'architecture',
        'decisions',
        '041-careplanversion-deprecation.md'
      ),
      'utf8'
    );
    expect(adr).toContain('UnifiedCarePlan');
    expect(adr).toContain('W1260');
  });
});
