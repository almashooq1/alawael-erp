'use strict';
/**
 * ops-schedulers-registry-coverage.test.js — Wave 318
 *
 * Drift guard for the W315/W316 scheduler-registry rollout. Asserts that every
 * scheduler key advertised by `GET /api/ops/schedulers` either:
 *   (a) opts in to the central registry via `schedulerRegistry.register('<key>')`
 *       inside `backend/startup/*.js` or `backend/server.js`, OR
 *   (b) is on the explicit `NOT_YET_INSTRUMENTED_ALLOWLIST` below — a short
 *       list of schedulers that still need to be migrated to the bootstrap +
 *       registry pattern.
 *
 * The point: adding a new entry to `ops-schedulers.routes.js` without wiring
 * the registry is a CI failure. Likewise, instrumenting a scheduler that the
 * ops endpoint doesn't advertise is a CI failure (orphan telemetry).
 *
 * To unblock CI: either add the register() call, or extend the allow-list
 * with a comment explaining why (and a follow-up wave number).
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');

// Schedulers that legitimately do NOT yet call schedulerRegistry.register().
// Each entry must be paired with a follow-up wave commitment.
const NOT_YET_INSTRUMENTED_ALLOWLIST = new Set([
  // W317 (planned) — hr-anomaly scheduler lives in server.js with opt-out
  // HR_ANOMALY_SCHEDULER_ENABLED semantics; needs refactor to a bootstrap
  // before it can register cleanly. Tracked in CLAUDE.md "Open known issues".
  'hr-anomaly-scheduler',
]);

function readSource(relative) {
  return fs.readFileSync(path.join(BACKEND_ROOT, relative), 'utf8');
}

function listJsFiles(relativeDir) {
  const dir = path.join(BACKEND_ROOT, relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(relativeDir, f));
}

describe('ops-schedulers ↔ scheduler-registry coverage (W318)', () => {
  // Parse the static items array out of ops-schedulers.routes.js to get the
  // canonical key list. We use a regex on `key: '...'` because the file is
  // a self-contained declarative array — no dynamic keys.
  const opsSource = readSource('routes/ops-schedulers.routes.js');
  const opsKeys = [...opsSource.matchAll(/key:\s*'([a-z0-9-]+)'/g)].map(m => m[1]);

  it('endpoint declares at least the 6 known scheduler keys (sanity)', () => {
    expect(opsKeys.length).toBeGreaterThanOrEqual(6);
    expect(new Set(opsKeys).size).toBe(opsKeys.length); // no dupes
  });

  // Scan startup/*.js + server.js for schedulerRegistry.register('<key>') calls.
  const sources = [
    ...listJsFiles('startup'),
    'server.js',
    'app.js',
  ].filter(rel => fs.existsSync(path.join(BACKEND_ROOT, rel)));

  const registeredKeys = new Set();
  sources.forEach(rel => {
    const src = readSource(rel);
    const matches = src.matchAll(/schedulerRegistry\.register\(\s*'([a-z0-9-]+)'/g);
    for (const m of matches) registeredKeys.add(m[1]);
  });

  it('every advertised key is either registered or explicitly allow-listed', () => {
    const missing = opsKeys.filter(
      k => !registeredKeys.has(k) && !NOT_YET_INSTRUMENTED_ALLOWLIST.has(k)
    );
    expect(missing).toEqual([]);
  });

  it('no orphan register() calls (every registered key is advertised)', () => {
    const orphans = [...registeredKeys].filter(k => !opsKeys.includes(k));
    expect(orphans).toEqual([]);
  });

  it('allow-list does not include keys that are now instrumented', () => {
    const stale = [...NOT_YET_INSTRUMENTED_ALLOWLIST].filter(k => registeredKeys.has(k));
    expect(stale).toEqual([]);
  });

  it('allow-list does not include keys that are no longer advertised', () => {
    const stale = [...NOT_YET_INSTRUMENTED_ALLOWLIST].filter(k => !opsKeys.includes(k));
    expect(stale).toEqual([]);
  });
});
