'use strict';
/**
 * scheduler-snapshots-bootstrap-order.test.js — Wave 323
 *
 * Drift guard for the W322 hydration ordering invariant.
 *
 * Why this matters: `intelligence/scheduler-registry.recordRun()` only
 * persists snapshots AFTER `hydrateFromSnapshots()` has flipped the internal
 * `_persistEnabled` flag. If a future refactor moves any cron `register()` /
 * `start*Scheduler()` call ABOVE the hydration block in `server.js`, every
 * tick fired before hydration runs will silently skip persistence — and on
 * restart those keys appear as `never-run` again. This is the same regression
 * W322 was built to eliminate.
 *
 * The guard scans `backend/server.js` once, finds the FIRST byte offset where
 * `wireSchedulerSnapshots(` appears, and asserts that every known cron
 * bootstrap call site sits at a LATER offset.
 */

const fs = require('fs');
const path = require('path');

const SERVER_JS = path.resolve(__dirname, '..', 'server.js');

// Patterns that mean "a scheduler is being registered / started". Add new
// entries here whenever a new cron bootstrap is wired in server.js.
const CRON_BOOTSTRAP_MARKERS = [
  'startKpiAttendanceScheduler(',
  'registerPaymentScheduler(',
  'registerWalletScheduler(',
  'registerInsuranceScheduler(',
  'initVolunteerScheduler(',
  'initCommunityServiceScheduler(',
  'initRecruitmentScheduler(',
];

describe('scheduler snapshots bootstrap ordering (W323)', () => {
  const src = fs.readFileSync(SERVER_JS, 'utf8');

  it('server.js calls wireSchedulerSnapshots(', () => {
    expect(src).toMatch(/wireSchedulerSnapshots\(/);
  });

  it('hydration runs BEFORE every cron bootstrap registration', () => {
    const hydrationOffset = src.indexOf('wireSchedulerSnapshots(');
    expect(hydrationOffset).toBeGreaterThan(-1);

    const violators = [];
    for (const marker of CRON_BOOTSTRAP_MARKERS) {
      const at = src.indexOf(marker);
      if (at === -1) continue; // marker not present is fine — coverage handled elsewhere
      if (at < hydrationOffset) {
        violators.push({ marker, offset: at });
      }
    }
    if (violators.length > 0) {
      const detail = violators
        .map(v => `  - ${v.marker} at offset ${v.offset} (hydration at ${hydrationOffset})`)
        .join('\n');
      throw new Error(
        `[W323] cron bootstrap fires BEFORE wireSchedulerSnapshots — snapshots will be lost on restart:\n${detail}`
      );
    }
    expect(violators).toEqual([]);
  });

  it('hydration is awaited (sync side-effect would race the next bootstrap)', () => {
    // Must appear as `await wireSchedulerSnapshots(` — not bare call
    expect(src).toMatch(/await\s+wireSchedulerSnapshots\(/);
  });
});
