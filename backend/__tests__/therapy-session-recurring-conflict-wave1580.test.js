/**
 * W1580 — recurring therapy-session expansion: per-child conflict check +
 * strip recurrence rule from children.
 *
 * Bug (deferred in #825): POST / expanded a recurring series by creating each
 * child with `{ ...body, date }`. Two defects:
 *   1. Only the PARENT date was conflict-checked; every child occurrence was
 *      created with no room/therapist conflict check → silent double-booking.
 *   2. `...body` copied `recurrence` + `recurrenceEnd` onto each child → each
 *      child carried the recurrence rule and looked like a series root.
 *
 * Fix: strip recurrence/recurrenceEnd into a childBase; run a branch-scoped
 * findConflicts per child date (honouring the same `force` override) and skip
 * clashing dates instead of double-booking; report skipped dates.
 *
 * Static guard — asserts the fixed source shape.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'therapy-sessions-admin.routes.js'),
  'utf8'
);

// Narrow to the create handler (POST / … up to the PATCH /:id below it).
const START = SRC.indexOf("router.post('/', requireRole(WRITE_ROLES)");
const END = SRC.indexOf("router.patch('/:id'", START);
const CREATE = SRC.slice(START, END > -1 ? END : START + 4000);

describe('W1580 recurring session expansion — conflict check + rule stripping', () => {
  test('captures the force override before deleting it', () => {
    expect(CREATE).toMatch(/const wantConflictCheck = !body\.force/);
    // wantConflictCheck must be declared BEFORE `delete body.force`.
    expect(CREATE.indexOf('wantConflictCheck')).toBeLessThan(CREATE.indexOf('delete body.force'));
  });

  test('children strip the recurrence rule (childBase without recurrence/recurrenceEnd)', () => {
    expect(CREATE).toMatch(/const childBase = \{ \.\.\.body \}/);
    expect(CREATE).toMatch(/delete childBase\.recurrence\b/);
    expect(CREATE).toMatch(/delete childBase\.recurrenceEnd\b/);
    // The child is created from childBase, NOT the raw body.
    expect(CREATE).toMatch(/await TherapySession\.create\(\{\s*\.\.\.childBase/);
  });

  test('each child date is conflict-checked (branch-scoped) and clashes are skipped', () => {
    // A findConflicts call inside the recurrence loop, scoped by branchFilter.
    const loopIdx = CREATE.indexOf('while (cursor <= endDate');
    expect(loopIdx).toBeGreaterThan(-1);
    const loop = CREATE.slice(loopIdx, loopIdx + 1200);
    expect(loop).toMatch(/if \(wantConflictCheck\)/);
    expect(loop).toMatch(/findConflicts\(/);
    expect(loop).toMatch(/scope: branchFilter\(req\)/);
    expect(loop).toMatch(/skipped\.push/);
    expect(loop).toMatch(/continue;/);
  });

  test('response surfaces the skipped conflicting dates', () => {
    expect(CREATE).toMatch(/skippedConflicts: skipped/);
  });
});
