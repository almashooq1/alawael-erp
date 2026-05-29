'use strict';

/**
 * beneficiary-lifecycle-deceased-waitlist-wave581.test.js — W581.
 *
 * Drift guard for the lifecycle-completion wave: the beneficiary state
 * machine now models two previously-missing real-world states:
 *
 *   • waitlisted — admitted-to-queue, awaiting capacity (rehab centers
 *     routinely keep a waitlist between intake `draft` and `active`).
 *   • deceased   — a terminal clinical event that MUST NOT be conflated
 *     with `discharge` (goals-met) — recording a death down the discharge
 *     path corrupts outcome analytics + family-comms templates.
 *
 * Pure registry assertions — no DB, no I/O. Pairs the static-shape guard
 * with explicit graph-reachability checks so a future edit that drops a
 * transition or rewires `from`/`to` fails CI loudly.
 */

const reg = require('../intelligence/beneficiary-lifecycle.registry');

describe('W581 — lifecycle states: waitlisted + deceased', () => {
  test('both new states are registered in LIFECYCLE_STATES + STATES', () => {
    expect(reg.LIFECYCLE_STATES.WAITLISTED).toBe('waitlisted');
    expect(reg.LIFECYCLE_STATES.DECEASED).toBe('deceased');
    expect(reg.STATES).toContain('waitlisted');
    expect(reg.STATES).toContain('deceased');
  });

  test('state count is exactly 11', () => {
    expect(reg.STATES).toHaveLength(11);
  });
});

describe('W581 — waitlist transitions', () => {
  test('waitlist: draft → waitlisted', () => {
    const t = reg.findTransition('waitlist');
    expect(t).toBeTruthy();
    expect(t.from).toEqual(['draft']);
    expect(t.to).toBe('waitlisted');
    expect(t.requiresReason).toBe(false);
    expect(t.severity).toBe('low');
    expect(t.requiredApproverRoles).toContain('admissions_officer');
  });

  test('admit now accepts both draft AND waitlisted as source', () => {
    const t = reg.findTransition('admit');
    expect(t.from).toEqual(expect.arrayContaining(['draft', 'waitlisted']));
    expect(t.to).toBe('active');
  });

  test('cancel_waitlist: waitlisted → archived with reason allowlist', () => {
    const t = reg.findTransition('cancel_waitlist');
    expect(t).toBeTruthy();
    expect(t.from).toEqual(['waitlisted']);
    expect(t.to).toBe('archived');
    expect(t.requiresReason).toBe(true);
    expect(reg.isValidReasonCode('cancel_waitlist', 'no-capacity')).toBe(true);
    expect(reg.isValidReasonCode('cancel_waitlist', 'not-a-real-code')).toBe(false);
  });

  test('waitlisted only exits via admit or cancel_waitlist', () => {
    const ids = reg.getAllowedTransitionsFrom('waitlisted').map(t => t.id);
    expect(ids.sort()).toEqual(['admit', 'cancel_waitlist']);
  });
});

describe('W581 — deceased transitions', () => {
  test('record_deceased: active|suspended → deceased (high-sensitivity)', () => {
    const t = reg.findTransition('record_deceased');
    expect(t).toBeTruthy();
    expect(t.from).toEqual(expect.arrayContaining(['active', 'suspended']));
    expect(t.to).toBe('deceased');
    expect(t.severity).toBe('critical');
    expect(t.mfaTier).toBe(3);
    expect(t.requiresNafath).toBe(true);
    expect(t.requiresReason).toBe(true);
    expect(reg.isHighSensitivity('record_deceased')).toBe(true);
  });

  test('record_deceased reason codes are clinical, not discharge codes', () => {
    expect(reg.isValidReasonCode('record_deceased', 'natural')).toBe(true);
    expect(reg.isValidReasonCode('record_deceased', 'medical-complication')).toBe(true);
    // 'goals-met' is a discharge code — must NOT be valid for a death event.
    expect(reg.isValidReasonCode('record_deceased', 'goals-met')).toBe(false);
  });

  test('deceased is terminal: archive is the ONLY outgoing transition', () => {
    const ids = reg.getAllowedTransitionsFrom('deceased').map(t => t.id);
    expect(ids).toEqual(['archive']);
  });

  test('archive now accepts deceased as a source state', () => {
    const t = reg.findTransition('archive');
    expect(t.from).toEqual(expect.arrayContaining(['deceased', 'discharged']));
  });

  test('record_deceased dispatches death-specific side-effects', () => {
    const fx = reg.getSideEffects('record_deceased');
    expect(fx).toEqual(
      expect.arrayContaining([
        'end-active-schedules',
        'close-open-episodes',
        'release-care-team',
        'generate-closure-report',
        'notify-family-condolence',
      ])
    );
  });
});

describe('W581 — graph integrity', () => {
  test('no transition targets an unregistered state', () => {
    for (const t of reg.TRANSITIONS) {
      expect(reg.STATES).toContain(t.to);
      for (const f of t.from) expect(reg.STATES).toContain(f);
    }
  });

  test('deceased can NOT be reactivated (no path back to active)', () => {
    const ids = reg.getAllowedTransitionsFrom('deceased').map(t => t.id);
    expect(ids).not.toContain('reactivate');
    expect(ids).not.toContain('admit');
    expect(ids).not.toContain('restore');
  });
});
