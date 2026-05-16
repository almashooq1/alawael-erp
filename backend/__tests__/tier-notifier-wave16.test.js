/**
 * tier-notifier-wave16.test.js — Wave 16.
 *
 * Verifies `buildTierNotifier` correctly fans an escalation event
 * out across the unifiedNotifier:
 *
 *   1. Subject + body are Arabic-localized + carry severity/tier/roles
 *   2. Tier 3 + critical/high → SMS forced into channel list even
 *      when caller forgot it.
 *   3. Per-role resolution failure surfaces in `errors[]`, doesn't
 *      stop the rest.
 *   4. Users without phone/email get counted as `skipped`, not
 *      failed.
 *   5. Per-channel delivery counts are correct.
 *   6. severityToPriority maps the right values.
 *
 * The unifiedNotifier itself isn't loaded — we inject a `notify`
 * stub that records every call.
 */

'use strict';

const { buildTierNotifier, _internal } = require('../alerts/tier-notifier.service');

// ─── Helpers ─────────────────────────────────────────────────────
function sampleAlert(overrides = {}) {
  return {
    _id: 'a-1',
    ruleId: 'pdpl-dsar-sla-breach',
    severity: 'critical',
    category: 'compliance',
    message: 'تجاوز SLA لطلب PDPL — صاحب الطلب b-9',
    description: 'PDPL DSAR breach',
    ...overrides,
  };
}

function makeNotify() {
  const calls = [];
  return {
    fn: async opts => {
      calls.push(opts);
    },
    calls,
  };
}

function makeResolver(roleToUsers) {
  // Returns the canonical Wave-16 callback shape:
  // (role, alert) → Array<{userId, phone, email, ...}>
  return async role => roleToUsers[role] || [];
}

// ─── Defensive constructor ───────────────────────────────────────
describe('buildTierNotifier — constructor', () => {
  test('throws when notify is missing', () => {
    expect(() => buildTierNotifier({ resolveUsersForRole: () => [] })).toThrow();
  });

  test('throws when resolveUsersForRole is missing', () => {
    expect(() => buildTierNotifier({ notify: async () => {} })).toThrow();
  });

  test('builds when both are functions', () => {
    expect(() =>
      buildTierNotifier({ notify: async () => {}, resolveUsersForRole: async () => [] })
    ).not.toThrow();
  });
});

// ─── Happy path ──────────────────────────────────────────────────
describe('buildTierNotifier — happy path', () => {
  test('notifies each user in each role + counts delivered', async () => {
    const { fn: notify, calls } = makeNotify();
    const resolveUsersForRole = makeResolver({
      hr_supervisor: [
        { userId: 'u-1', phone: '+9665...', email: 'a@x.com' },
        { userId: 'u-2', phone: '+9665...', email: 'b@x.com' },
      ],
      hr_manager: [{ userId: 'u-3', phone: '+9665...', email: 'c@x.com' }],
    });
    const tierNotifier = buildTierNotifier({ notify, resolveUsersForRole });

    const summary = await tierNotifier({
      alert: sampleAlert({ severity: 'high' }),
      tier: 2,
      roles: ['hr_supervisor', 'hr_manager'],
      channels: ['in_app', 'email'],
    });

    expect(summary.delivered).toBe(3);
    expect(summary.failed).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(calls).toHaveLength(3);
    // Subject + body present
    expect(calls[0].subject).toContain('تصعيد');
    expect(calls[0].body).toContain('PDPL');
    expect(calls[0].metadata).toMatchObject({ tier: 2, ruleId: 'pdpl-dsar-sla-breach' });
    // perChannel counters
    expect(summary.perChannel.email).toBe(3);
  });
});

// ─── Tier 3 critical → SMS forced ────────────────────────────────
describe('buildTierNotifier — tier 3 + critical forces SMS', () => {
  test('adds sms even when caller forgot it', async () => {
    const { fn: notify, calls } = makeNotify();
    const resolveUsersForRole = makeResolver({
      super_admin: [{ userId: 'u-1', phone: '+9665...', email: 'a@x.com' }],
    });
    const tierNotifier = buildTierNotifier({ notify, resolveUsersForRole });

    await tierNotifier({
      alert: sampleAlert({ severity: 'critical' }),
      tier: 3,
      roles: ['super_admin'],
      channels: ['in_app', 'email'], // caller forgot sms
    });

    expect(calls[0].channels).toContain('sms');
    expect(calls[0].priority).toBe('urgent');
  });

  test('does not force SMS for tier 3 + warning', async () => {
    const { fn: notify, calls } = makeNotify();
    const resolveUsersForRole = makeResolver({
      manager: [{ userId: 'u-1', phone: '+9665...', email: 'a@x.com' }],
    });
    const tierNotifier = buildTierNotifier({ notify, resolveUsersForRole });

    await tierNotifier({
      alert: sampleAlert({ severity: 'warning' }),
      tier: 3,
      roles: ['manager'],
      channels: ['in_app', 'email'],
    });

    expect(calls[0].channels).not.toContain('sms');
  });
});

// ─── Resolver failure ────────────────────────────────────────────
describe('buildTierNotifier — resolver failure', () => {
  test('catches resolver throw, continues to next role', async () => {
    const { fn: notify, calls } = makeNotify();
    const resolveUsersForRole = async role => {
      if (role === 'bad_role') throw new Error('mongo down');
      return [{ userId: 'u-1', phone: '+9665...', email: 'a@x.com' }];
    };
    const tierNotifier = buildTierNotifier({
      notify,
      resolveUsersForRole,
      logger: { warn() {} },
    });

    const summary = await tierNotifier({
      alert: sampleAlert(),
      tier: 2,
      roles: ['bad_role', 'good_role'],
      channels: ['email'],
    });

    expect(calls).toHaveLength(1); // good_role succeeded
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toMatchObject({ role: 'bad_role' });
  });
});

// ─── Users without contact info ──────────────────────────────────
describe('buildTierNotifier — recipient pick', () => {
  test('skips users with no phone+email for any usable channel', async () => {
    const { fn: notify, calls } = makeNotify();
    const resolveUsersForRole = makeResolver({
      mgr: [
        { userId: 'u-1' }, // no phone, no email — skipped
        { userId: 'u-2', email: 'b@x.com' }, // email only — counted
      ],
    });
    const tierNotifier = buildTierNotifier({ notify, resolveUsersForRole });

    const summary = await tierNotifier({
      alert: sampleAlert(),
      tier: 2,
      roles: ['mgr'],
      channels: ['email'],
    });

    expect(summary.delivered).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].to.email).toBe('b@x.com');
  });

  test('filters channels per user contact info — SMS-only user gets SMS only', async () => {
    const { fn: notify, calls } = makeNotify();
    const resolveUsersForRole = makeResolver({
      mgr: [{ userId: 'u-1', phone: '+9665...' }], // phone only
    });
    const tierNotifier = buildTierNotifier({ notify, resolveUsersForRole });

    await tierNotifier({
      alert: sampleAlert(),
      tier: 2,
      roles: ['mgr'],
      channels: ['in_app', 'email', 'sms'],
    });

    expect(calls[0].channels).toContain('sms');
    expect(calls[0].channels).toContain('in_app');
    expect(calls[0].channels).not.toContain('email');
  });
});

// ─── notify() error handling ────────────────────────────────────
describe('buildTierNotifier — notify error handling', () => {
  test('failing notify counts as failure, doesnt halt the loop', async () => {
    let count = 0;
    const notify = async () => {
      count += 1;
      if (count === 1) throw new Error('SMTP unavailable');
    };
    const resolveUsersForRole = makeResolver({
      mgr: [
        { userId: 'u-1', email: 'a@x.com' },
        { userId: 'u-2', email: 'b@x.com' },
      ],
    });
    const tierNotifier = buildTierNotifier({
      notify,
      resolveUsersForRole,
      logger: { warn() {} },
    });

    const summary = await tierNotifier({
      alert: sampleAlert(),
      tier: 2,
      roles: ['mgr'],
      channels: ['email'],
    });

    expect(summary.delivered).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].userId).toBe('u-1');
  });
});

// ─── Empty inputs ────────────────────────────────────────────────
describe('buildTierNotifier — empty / degenerate inputs', () => {
  test('returns zero-summary for empty roles[]', async () => {
    const { fn: notify } = makeNotify();
    const tierNotifier = buildTierNotifier({
      notify,
      resolveUsersForRole: async () => [],
    });
    const summary = await tierNotifier({ alert: sampleAlert(), tier: 2, roles: [] });
    expect(summary.delivered).toBe(0);
    expect(summary.skipped).toBe(0);
  });

  test('counts skipped when role returns empty users[]', async () => {
    const { fn: notify } = makeNotify();
    const resolveUsersForRole = makeResolver({ mgr: [] });
    const tierNotifier = buildTierNotifier({ notify, resolveUsersForRole });
    const summary = await tierNotifier({
      alert: sampleAlert(),
      tier: 2,
      roles: ['mgr'],
      channels: ['email'],
    });
    expect(summary.skipped).toBe(1);
    expect(summary.delivered).toBe(0);
  });
});

// ─── _internal helpers ───────────────────────────────────────────
describe('_internal helpers', () => {
  test('severityToPriority maps correctly', () => {
    expect(_internal.severityToPriority('critical')).toBe('urgent');
    expect(_internal.severityToPriority('high')).toBe('high');
    expect(_internal.severityToPriority('warning')).toBe('normal');
    expect(_internal.severityToPriority('info')).toBe('low');
    expect(_internal.severityToPriority('unknown')).toBe('low');
  });

  test('buildSubject includes Arabic severity label + tier', () => {
    expect(
      _internal.buildSubject({ alert: sampleAlert({ severity: 'critical' }), tier: 3 })
    ).toContain('حرج');
  });

  test('buildBody includes message + roles', () => {
    const body = _internal.buildBody({
      alert: sampleAlert(),
      tier: 2,
      roles: ['hr_manager', 'super_admin'],
    });
    expect(body).toContain('hr_manager');
    expect(body).toContain('super_admin');
    expect(body).toContain('PDPL');
  });

  test('pickRecipient returns null for empty user', () => {
    expect(_internal.pickRecipient(null, ['email'])).toBe(null);
    expect(_internal.pickRecipient({}, ['email', 'sms'])).toBe(null);
  });
});
