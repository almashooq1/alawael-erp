/**
 * W1578 — therapy-sessions-admin status/check-in transition precondition.
 *
 * Bug: POST /:id/status and POST /:id/check-in had NO from-state check, so any
 * WRITE_ROLES user could move a finalized session (COMPLETED / CANCELLED_* /
 * NO_SHOW) back to SCHEDULED/IN_PROGRESS — silently desyncing attendance +
 * billing. Genuine corrections go through POST /:id/amend, not these endpoints.
 *
 * Fix: a TERMINAL_STATUSES guard returns 409 when the current status is
 * finalized (both handlers).
 *
 * Static guard: reads the route source and asserts the precondition is present.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'therapy-sessions-admin.routes.js'),
  'utf8'
);

describe('W1578 therapy-session status/check-in terminal precondition', () => {
  test('TERMINAL_STATUSES lists exactly the 4 finalized states', () => {
    const m = SRC.match(/const TERMINAL_STATUSES\s*=\s*\[([\s\S]*?)\]/);
    expect(m).toBeTruthy();
    const body = m[1];
    for (const s of ['COMPLETED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER', 'NO_SHOW']) {
      expect(body).toContain(`'${s}'`);
    }
    // Non-terminal states must NOT be in the set (they can still transition).
    for (const s of ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULED']) {
      expect(body).not.toContain(`'${s}'`);
    }
  });

  test('POST /:id/status blocks transitions out of a terminal state (409)', () => {
    const i = SRC.indexOf("router.post('/:id/status'");
    expect(i).toBeGreaterThan(-1);
    const j = SRC.indexOf("router.post('/:id/check-in'", i);
    const handler = SRC.slice(i, j > -1 ? j : i + 2000);
    expect(handler).toMatch(/TERMINAL_STATUSES\.includes\(\s*from\s*\)/);
    expect(handler).toMatch(/status\(409\)/);
  });

  test('POST /:id/check-in selects status and blocks a terminal session (409)', () => {
    const i = SRC.indexOf("router.post('/:id/check-in'");
    expect(i).toBeGreaterThan(-1);
    const handler = SRC.slice(i, i + 2000);
    // Must project status (was 'beneficiary' only) so the guard can read it.
    expect(handler).toMatch(/\.select\(\s*['"]beneficiary status['"]\s*\)/);
    expect(handler).toMatch(/TERMINAL_STATUSES\.includes\(\s*existing\.status\s*\)/);
    expect(handler).toMatch(/status\(409\)/);
  });
});
