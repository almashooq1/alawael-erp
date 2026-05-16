/**
 * escalation-service.test.js — Wave 13.
 *
 * Verifies the EscalationCoordinator:
 *   1. Skip rules (resolved / muted / snoozed / acked / assigned /
 *      info-severity / unknown-rule) are honored.
 *   2. Tier 1 → 2 promotion fires only after `tier1AfterMin` elapsed.
 *   3. Tier 2 → 3 promotion fires only after `tier2AfterMin` elapsed.
 *   4. Tier 3 is terminal — no further promotion.
 *   5. `notifyTier` callback receives the correct tier + roles +
 *      channels (sms added for critical tier 3).
 *   6. Audit events fire on each promotion.
 *   7. Batch summary counts promotions + skip reasons accurately.
 *
 * Same fake-AlertModel pattern from workflow-service.test.js — no
 * Mongo needed.
 */

'use strict';

const { createEscalationCoordinator } = require('../alerts/escalation.service');

// ─── Fake Alert ─────────────────────────────────────────────────
class FakeAlert {
  constructor(initial = {}) {
    Object.assign(this, {
      _id: initial._id || 'a-1',
      ruleId: initial.ruleId || 'r-high',
      severity: initial.severity || 'high',
      category: initial.category || 'operational',
      message: 'msg',
      firstSeenAt: initial.firstSeenAt || new Date(Date.now() - 10 * 60 * 60 * 1000),
      ackedAt: null,
      mutedUntil: null,
      snoozeUntil: null,
      resolvedAt: null,
      ownership: { assignedTo: null },
      escalation: {
        currentTier: 1,
        tier1At: initial.firstSeenAt || new Date(Date.now() - 10 * 60 * 60 * 1000),
        tier2At: null,
        tier3At: null,
        tier2NotifiedRoles: [],
        tier3NotifiedRoles: [],
      },
      state: { current: 'OPEN', transitions: [] },
      ...initial,
    });
    this._saved = 0;
  }
  async save() {
    this._saved += 1;
    return this;
  }
}

function fakeModelOf(alerts) {
  return {
    model: {
      find: jest.fn(() => ({
        limit: () => ({
          lean: () => Promise.resolve(alerts),
        }),
      })),
    },
  };
}

function buildRule(overrides = {}) {
  return {
    id: 'r-high',
    severity: 'high',
    category: 'hr',
    description: 'high test rule',
    escalation: {
      tier1AfterMin: 240, // 4h
      tier2AfterMin: 480, // 8h
      chain: ['hr_supervisor', 'hr_manager', 'super_admin'],
    },
    ...overrides,
  };
}

// ─── skipReason ──────────────────────────────────────────────────
describe('EscalationCoordinator — skipReason', () => {
  const coord = createEscalationCoordinator({ rules: [] });
  const now = new Date('2026-05-16T12:00:00Z');

  test('null for an ordinary candidate', () => {
    const a = new FakeAlert();
    expect(coord.skipReason(a, now)).toBe(null);
  });

  test('RESOLVED when resolvedAt set', () => {
    expect(coord.skipReason(new FakeAlert({ resolvedAt: new Date() }), now)).toBe('RESOLVED');
  });

  test('MUTED when mutedUntil in future', () => {
    expect(
      coord.skipReason(new FakeAlert({ mutedUntil: new Date(now.getTime() + 60000) }), now)
    ).toBe('MUTED');
  });

  test('SNOOZED when snoozeUntil in future', () => {
    expect(
      coord.skipReason(new FakeAlert({ snoozeUntil: new Date(now.getTime() + 60000) }), now)
    ).toBe('SNOOZED');
  });

  test('ACKED when ackedAt set', () => {
    expect(coord.skipReason(new FakeAlert({ ackedAt: new Date() }), now)).toBe('ACKED');
  });

  test('ASSIGNED when ownership.assignedTo set', () => {
    expect(coord.skipReason(new FakeAlert({ ownership: { assignedTo: 'u-1' } }), now)).toBe(
      'ASSIGNED'
    );
  });

  test('INFO_NO_ESCALATION for severity=info', () => {
    expect(coord.skipReason(new FakeAlert({ severity: 'info' }), now)).toBe('INFO_NO_ESCALATION');
  });
});

// ─── channelsForTier ─────────────────────────────────────────────
describe('EscalationCoordinator — channelsForTier', () => {
  const coord = createEscalationCoordinator({ rules: [] });

  test('tier 1/2 default to in_app + email', () => {
    expect(coord.channelsForTier(1, 'critical')).toEqual(['in_app', 'email']);
    expect(coord.channelsForTier(2, 'high')).toEqual(['in_app', 'email']);
  });

  test('tier 3 + critical adds sms', () => {
    expect(coord.channelsForTier(3, 'critical')).toEqual(['in_app', 'email', 'sms']);
    expect(coord.channelsForTier(3, 'high')).toEqual(['in_app', 'email', 'sms']);
  });

  test('tier 3 + warning stays without sms', () => {
    expect(coord.channelsForTier(3, 'warning')).toEqual(['in_app', 'email']);
  });
});

// ─── tier 1 → 2 promotion ───────────────────────────────────────
describe('EscalationCoordinator — tier 1 → 2 promotion', () => {
  test('promotes when tier1AfterMin elapsed + notifies tier-2 roles', async () => {
    const rule = buildRule(); // tier1AfterMin = 240
    const T0 = new Date('2026-05-16T08:00:00Z'); // 4h ago at T1
    const T1 = new Date('2026-05-16T12:00:01Z'); // 4h + 1s later
    const alert = new FakeAlert({
      ruleId: 'r-high',
      severity: 'high',
      firstSeenAt: T0,
      escalation: {
        currentTier: 1,
        tier1At: T0,
        tier2At: null,
        tier3At: null,
        tier2NotifiedRoles: [],
        tier3NotifiedRoles: [],
      },
    });

    const notify = jest.fn(async () => {});
    const audit = { log: jest.fn(async () => {}) };

    const coord = createEscalationCoordinator({
      rules: [rule],
      notifyTier: notify,
      auditLogger: audit,
      now: () => T1,
    });

    const outcome = await coord.evaluateOne(alert, T1);
    expect(outcome.promotedTo).toBe(2);
    expect(alert.escalation.currentTier).toBe(2);
    expect(alert.escalation.tier2At).toEqual(T1);
    expect(alert.escalation.tier2NotifiedRoles).toEqual(['hr_supervisor', 'hr_manager']);
    expect(alert._saved).toBe(1);
    expect(alert.state.transitions[0].reason).toBe('escalation:tier1→tier2');
    expect(notify).toHaveBeenCalledWith({
      alert,
      tier: 2,
      roles: ['hr_supervisor', 'hr_manager'],
      channels: ['in_app', 'email'],
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'alert.escalation.promote',
        metadata: expect.objectContaining({ from: 1, to: 2 }),
      })
    );
  });

  test('does NOT promote when within tier1AfterMin', async () => {
    const rule = buildRule(); // 240min
    const T0 = new Date('2026-05-16T08:00:00Z');
    const T1 = new Date('2026-05-16T11:00:00Z'); // 3h later — still under 4h
    const alert = new FakeAlert({ firstSeenAt: T0, escalation: { currentTier: 1, tier1At: T0 } });

    const coord = createEscalationCoordinator({ rules: [rule], now: () => T1 });
    const outcome = await coord.evaluateOne(alert, T1);
    expect(outcome.skipped).toBe(true);
    expect(outcome.reason).toBe('TIER1_NOT_DUE');
    expect(alert._saved).toBe(0);
    expect(alert.escalation.currentTier).toBe(1);
  });
});

// ─── tier 2 → 3 promotion ───────────────────────────────────────
describe('EscalationCoordinator — tier 2 → 3 promotion', () => {
  test('promotes critical with sms channel on tier 3', async () => {
    const rule = buildRule({
      id: 'r-crit',
      severity: 'critical',
      escalation: {
        tier1AfterMin: 15,
        tier2AfterMin: 60,
        chain: ['compliance_officer', 'dpo', 'super_admin'],
      },
    });
    const T1 = new Date('2026-05-16T10:00:00Z');
    const T2 = new Date('2026-05-16T11:00:01Z'); // 60min + 1s after tier2At
    const alert = new FakeAlert({
      ruleId: 'r-crit',
      severity: 'critical',
      firstSeenAt: new Date('2026-05-16T09:00:00Z'),
      escalation: {
        currentTier: 2,
        tier1At: new Date('2026-05-16T09:00:00Z'),
        tier2At: T1,
        tier3At: null,
        tier2NotifiedRoles: ['compliance_officer', 'dpo'],
        tier3NotifiedRoles: [],
      },
    });

    const notify = jest.fn(async () => {});
    const coord = createEscalationCoordinator({
      rules: [rule],
      notifyTier: notify,
      now: () => T2,
    });

    const outcome = await coord.evaluateOne(alert, T2);
    expect(outcome.promotedTo).toBe(3);
    expect(alert.escalation.currentTier).toBe(3);
    expect(alert.escalation.tier3At).toEqual(T2);
    expect(alert.escalation.tier3NotifiedRoles).toEqual([
      'compliance_officer',
      'dpo',
      'super_admin',
    ]);
    expect(notify).toHaveBeenCalledWith({
      alert,
      tier: 3,
      roles: ['compliance_officer', 'dpo', 'super_admin'],
      channels: ['in_app', 'email', 'sms'], // critical adds sms
    });
  });

  test('does NOT promote when within tier2AfterMin', async () => {
    const rule = buildRule(); // tier2AfterMin = 480
    const T1 = new Date('2026-05-16T10:00:00Z');
    const T2 = new Date('2026-05-16T13:00:00Z'); // 3h later — under 8h
    const alert = new FakeAlert({
      escalation: {
        currentTier: 2,
        tier1At: new Date('2026-05-16T06:00:00Z'),
        tier2At: T1,
      },
    });
    const coord = createEscalationCoordinator({ rules: [rule], now: () => T2 });
    const outcome = await coord.evaluateOne(alert, T2);
    expect(outcome.skipped).toBe(true);
    expect(outcome.reason).toBe('TIER2_NOT_DUE');
  });

  test('back-fills tier2At when missing on currentTier=2 docs', async () => {
    const rule = buildRule();
    const T = new Date('2026-05-16T12:00:00Z');
    const alert = new FakeAlert({
      escalation: {
        currentTier: 2,
        tier1At: new Date('2026-05-16T06:00:00Z'),
        tier2At: null, // missing — legacy doc
      },
    });
    const coord = createEscalationCoordinator({ rules: [rule], now: () => T });
    const outcome = await coord.evaluateOne(alert, T);
    expect(outcome.reason).toBe('BACKFILLED_TIER2_AT');
    expect(alert.escalation.tier2At).toEqual(T);
    expect(alert._saved).toBe(1);
  });
});

// ─── tier 3 is terminal ──────────────────────────────────────────
describe('EscalationCoordinator — tier 3 terminal', () => {
  test('skips alerts already at tier 3', async () => {
    const alert = new FakeAlert({
      escalation: { currentTier: 3, tier1At: new Date(), tier2At: new Date(), tier3At: new Date() },
    });
    const coord = createEscalationCoordinator({ rules: [buildRule()] });
    const outcome = await coord.evaluateOne(alert, new Date());
    expect(outcome.reason).toBe('TIER3_TERMINAL');
  });
});

// ─── unknown rule ────────────────────────────────────────────────
describe('EscalationCoordinator — unknown rule', () => {
  test('skips with UNKNOWN_RULE when rule was removed', async () => {
    const alert = new FakeAlert({ ruleId: 'no-such-rule-anymore' });
    const coord = createEscalationCoordinator({ rules: [buildRule()] });
    const outcome = await coord.evaluateOne(alert, new Date());
    expect(outcome.reason).toBe('UNKNOWN_RULE');
  });
});

// ─── batch summary ──────────────────────────────────────────────
describe('EscalationCoordinator — processEscalations summary', () => {
  test('counts promotions + skip reasons accurately', async () => {
    const rule = buildRule();
    const T0 = new Date('2026-05-16T08:00:00Z');
    const T1 = new Date('2026-05-16T13:00:00Z'); // 5h later

    const alerts = [
      // promotes 1→2 (4h+ elapsed, default)
      new FakeAlert({
        _id: 'a-1',
        escalation: {
          currentTier: 1,
          tier1At: T0,
          tier2At: null,
          tier3At: null,
          tier2NotifiedRoles: [],
          tier3NotifiedRoles: [],
        },
      }),
      // skips (tier 1 not due — only 2h elapsed)
      new FakeAlert({
        _id: 'a-2',
        firstSeenAt: new Date('2026-05-16T11:00:00Z'),
        escalation: {
          currentTier: 1,
          tier1At: new Date('2026-05-16T11:00:00Z'),
          tier2At: null,
          tier3At: null,
          tier2NotifiedRoles: [],
          tier3NotifiedRoles: [],
        },
      }),
      // skips (unknown rule)
      new FakeAlert({
        _id: 'a-3',
        ruleId: 'gone',
        escalation: {
          currentTier: 1,
          tier1At: T0,
          tier2At: null,
          tier3At: null,
          tier2NotifiedRoles: [],
          tier3NotifiedRoles: [],
        },
      }),
    ];

    const coord = createEscalationCoordinator({
      alertModel: fakeModelOf(alerts),
      rules: [rule],
      now: () => T1,
    });

    const summary = await coord.processEscalations();
    expect(summary.checked).toBe(3);
    expect(summary.promotedTo2).toBe(1);
    expect(summary.promotedTo3).toBe(0);
    expect(summary.skippedByReason.TIER1_NOT_DUE).toBe(1);
    expect(summary.skippedByReason.UNKNOWN_RULE).toBe(1);
    expect(summary.errors).toEqual([]);
  });

  test('survives evaluateOne throwing for a single alert', async () => {
    const rule = buildRule();
    const T0 = new Date('2026-05-16T08:00:00Z');
    const T1 = new Date('2026-05-16T13:00:00Z');

    const goodAlert = new FakeAlert({
      _id: 'good',
      escalation: {
        currentTier: 1,
        tier1At: T0,
        tier2At: null,
        tier3At: null,
        tier2NotifiedRoles: [],
        tier3NotifiedRoles: [],
      },
    });
    const badAlert = new FakeAlert({
      _id: 'bad',
      escalation: {
        currentTier: 1,
        tier1At: T0,
        tier2At: null,
        tier3At: null,
        tier2NotifiedRoles: [],
        tier3NotifiedRoles: [],
      },
    });
    badAlert.save = async () => {
      throw new Error('mongo write failed');
    };

    const coord = createEscalationCoordinator({
      alertModel: fakeModelOf([goodAlert, badAlert]),
      rules: [rule],
      now: () => T1,
      logger: { warn() {} },
    });

    const summary = await coord.processEscalations();
    expect(summary.promotedTo2).toBe(1); // good one made it
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toMatchObject({ alertId: 'bad' });
  });
});
