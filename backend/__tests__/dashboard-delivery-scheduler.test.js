/**
 * dashboard-delivery-scheduler.test.js — Phase 18 Commit 5.
 */

'use strict';

const {
  buildDeliveryScheduler,
  isDueNow,
  cadenceWindowKey,
} = require('../services/dashboardDeliveryScheduler.service');
const renderer = require('../services/dashboardSnapshotRenderer.service');
const { SUBSCRIPTIONS, byId } = require('../config/dashboard-subscriptions.registry');

function fakeBuildDashboard(payloadByDashboardId) {
  return jest.fn(async ({ dashboardId }) => payloadByDashboardId[dashboardId] || null);
}

function fakeNotifier({ throwOn = null } = {}) {
  const calls = [];
  return {
    calls,
    notify: jest.fn(async opts => {
      calls.push(opts);
      if (throwOn && opts.to.email === throwOn) throw new Error('provider error');
      return { ok: true };
    }),
  };
}

const SAMPLE_PAYLOAD = {
  dashboard: { id: 'executive', titleEn: 'Executive', titleAr: 'التنفيذية' },
  heroKpis: [
    {
      id: 'finance.ar.dso.days',
      nameEn: 'DSO',
      nameAr: 'أيام التحصيل',
      unit: 'days',
      value: 72,
      delta: 0.1,
      classification: 'amber',
    },
  ],
  narrative: {
    headlineEn: 'Amber watchlist',
    headlineAr: 'قائمة المراقبة',
    paragraphsEn: ['x'],
    paragraphsAr: ['ش'],
    confidence: 'medium',
    rulesFired: ['R-AMBER-DRIFT'],
    refs: ['finance.ar.dso.days'],
    dashboardId: 'executive',
    dashboardLevel: 'executive',
  },
  asOf: '2026-04-24T08:00:00.000Z',
};

// ─── Subscriptions registry ─────────────────────────────────

describe('dashboard-subscriptions registry', () => {
  it('is frozen + has required entries', () => {
    expect(Object.isFrozen(SUBSCRIPTIONS)).toBe(true);
    expect(SUBSCRIPTIONS.length).toBeGreaterThan(2);
    const ids = new Set(SUBSCRIPTIONS.map(s => s.id));
    expect(ids.size).toBe(SUBSCRIPTIONS.length);
  });

  it('byId lookup works', () => {
    expect(byId('exec.daily.brief')).toBeTruthy();
    expect(byId('nope')).toBeNull();
  });
});

// ─── Renderer ──────────────────────────────────────────────

describe('dashboardSnapshotRenderer', () => {
  it('renders HTML + text + markdown + subject', () => {
    const out = renderer.render(SAMPLE_PAYLOAD);
    expect(out.subject).toMatch(/Executive/);
    expect(out.html).toMatch(/<table/);
    expect(out.html).toMatch(/أيام التحصيل/);
    expect(out.text).toMatch(/أيام التحصيل/);
    expect(out.markdown).toMatch(/\|.*المؤشر/);
  });

  it('escapes HTML in dashboard + KPI names', () => {
    const payload = {
      ...SAMPLE_PAYLOAD,
      dashboard: { ...SAMPLE_PAYLOAD.dashboard, titleAr: '<script>alert(1)</script>' },
    };
    const out = renderer.render(payload);
    expect(out.html).not.toMatch(/<script>/);
    expect(out.html).toMatch(/&lt;script&gt;/);
  });

  it('renders with missing narrative', () => {
    const payload = { ...SAMPLE_PAYLOAD, narrative: null };
    const out = renderer.render(payload);
    expect(out.html).toMatch(/<table/);
    expect(out.text).not.toMatch(/undefined/);
  });
});

// ─── isDueNow logic ────────────────────────────────────────

describe('isDueNow', () => {
  const daily = { id: 'x', dashboardId: 'd', cadence: 'daily', sendAtUtcHour: 5 };
  const weekly = {
    id: 'y',
    dashboardId: 'd',
    cadence: 'weekly',
    sendAtUtcHour: 5,
    sendOnUtcDay: 0,
  };

  it('daily fires only after sendAtUtcHour', () => {
    expect(isDueNow(daily, Date.parse('2026-04-24T04:00:00Z'), null)).toBe(false);
    expect(isDueNow(daily, Date.parse('2026-04-24T06:00:00Z'), null)).toBe(true);
  });

  it('daily does not fire twice within the same UTC day', () => {
    const now = Date.parse('2026-04-24T10:00:00Z');
    const earlier = Date.parse('2026-04-24T06:00:00Z');
    expect(isDueNow(daily, now, earlier)).toBe(false);
  });

  it('daily fires again next UTC day', () => {
    const now = Date.parse('2026-04-25T06:00:00Z');
    const earlier = Date.parse('2026-04-24T06:00:00Z');
    expect(isDueNow(daily, now, earlier)).toBe(true);
  });

  it('weekly fires only on the configured UTC day', () => {
    // 2026-04-26 is a Sunday (UTC day 0)
    expect(isDueNow(weekly, Date.parse('2026-04-26T05:30:00Z'), null)).toBe(true);
    // 2026-04-27 is Monday
    expect(isDueNow(weekly, Date.parse('2026-04-27T05:30:00Z'), null)).toBe(false);
  });

  it('unknown cadence returns false', () => {
    expect(isDueNow({ cadence: 'nope' }, Date.now(), null)).toBe(false);
  });
});

describe('cadenceWindowKey', () => {
  it('different days → different daily keys', () => {
    const a = cadenceWindowKey('daily', Date.parse('2026-04-24T00:00:00Z'));
    const b = cadenceWindowKey('daily', Date.parse('2026-04-25T00:00:00Z'));
    expect(a).not.toBe(b);
  });
  it('same weekly window across hours', () => {
    // Both within ISO week 17, 2026 (Mon 2026-04-20 .. Sun 2026-04-26)
    const a = cadenceWindowKey('weekly', Date.parse('2026-04-22T10:00:00Z'));
    const b = cadenceWindowKey('weekly', Date.parse('2026-04-24T20:00:00Z'));
    expect(a).toBe(b);
  });
});

// ─── Scheduler ────────────────────────────────────────────

describe('deliveryScheduler — factory validation', () => {
  it('throws when required deps are missing', () => {
    expect(() => buildDeliveryScheduler({})).toThrow(/buildDashboard is required/);
    expect(() => buildDeliveryScheduler({ buildDashboard: () => {} })).toThrow(
      /renderer\.render is required/
    );
    expect(() =>
      buildDeliveryScheduler({
        buildDashboard: () => {},
        renderer,
      })
    ).toThrow(/notifier\.notify is required/);
    expect(() =>
      buildDeliveryScheduler({
        buildDashboard: () => {},
        renderer,
        notifier: { notify: () => {} },
      })
    ).toThrow(/resolveRecipients is required/);
  });
});

describe('deliveryScheduler.runOnce — subset fire behaviour', () => {
  it('fires only the subscriptions whose cadence windows hit', async () => {
    const clock = { now: () => Date.parse('2026-04-26T06:00:00Z') }; // Sunday 09:00 KSA
    const notifier = fakeNotifier();
    const sched = buildDeliveryScheduler({
      subscriptions: SUBSCRIPTIONS,
      buildDashboard: fakeBuildDashboard({
        executive: SAMPLE_PAYLOAD,
        'branch-ops': {
          ...SAMPLE_PAYLOAD,
          dashboard: { ...SAMPLE_PAYLOAD.dashboard, id: 'branch-ops' },
        },
        'functional.quality': {
          ...SAMPLE_PAYLOAD,
          dashboard: { ...SAMPLE_PAYLOAD.dashboard, id: 'functional.quality' },
        },
        'functional.finance': {
          ...SAMPLE_PAYLOAD,
          dashboard: { ...SAMPLE_PAYLOAD.dashboard, id: 'functional.finance' },
        },
        clinical: { ...SAMPLE_PAYLOAD, dashboard: { ...SAMPLE_PAYLOAD.dashboard, id: 'clinical' } },
      }),
      renderer,
      notifier,
      resolveRecipients: async () => [{ userId: 'u1', email: 'a@example.com' }],
      clock,
    });
    const res = await sched.runOnce();
    expect(res.fired.length).toBeGreaterThanOrEqual(5);
  });

  it('skips when no recipients resolve', async () => {
    const clock = { now: () => Date.parse('2026-04-24T06:00:00Z') }; // daily hour
    const notifier = fakeNotifier();
    const sched = buildDeliveryScheduler({
      subscriptions: [byId('exec.daily.brief')],
      buildDashboard: fakeBuildDashboard({ executive: SAMPLE_PAYLOAD }),
      renderer,
      notifier,
      resolveRecipients: async () => [],
      clock,
    });
    const res = await sched.runOnce();
    expect(res.fired[0].skipped).toBe(true);
    expect(res.fired[0].reason).toBe('no-recipients');
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it('swallows notifier failures + keeps sending to the rest', async () => {
    const clock = { now: () => Date.parse('2026-04-24T06:00:00Z') };
    const notifier = fakeNotifier({ throwOn: 'bad@example.com' });
    const sched = buildDeliveryScheduler({
      subscriptions: [byId('exec.daily.brief')],
      buildDashboard: fakeBuildDashboard({ executive: SAMPLE_PAYLOAD }),
      renderer,
      notifier,
      resolveRecipients: async () => [
        { userId: 'a', email: 'bad@example.com' },
        { userId: 'b', email: 'ok@example.com' },
      ],
      clock,
      logger: { warn: () => {} },
    });
    const res = await sched.runOnce();
    expect(res.fired[0].sent).toBe(1);
    expect(res.fired[0].failed).toBe(1);
  });

  it('does not re-fire in the same cadence window', async () => {
    const clock = { now: () => Date.parse('2026-04-24T06:00:00Z') };
    const notifier = fakeNotifier();
    const sched = buildDeliveryScheduler({
      subscriptions: [byId('exec.daily.brief')],
      buildDashboard: fakeBuildDashboard({ executive: SAMPLE_PAYLOAD }),
      renderer,
      notifier,
      resolveRecipients: async () => [{ userId: 'a', email: 'a@example.com' }],
      clock,
    });
    await sched.runOnce();
    const firstCalls = notifier.notify.mock.calls.length;
    await sched.runOnce();
    // Same cadence window → no new notify calls.
    expect(notifier.notify.mock.calls.length).toBe(firstCalls);
  });

  it('status() exposes counters', async () => {
    const clock = { now: () => Date.parse('2026-04-24T06:00:00Z') };
    const notifier = fakeNotifier();
    const sched = buildDeliveryScheduler({
      subscriptions: [byId('exec.daily.brief')],
      buildDashboard: fakeBuildDashboard({ executive: SAMPLE_PAYLOAD }),
      renderer,
      notifier,
      resolveRecipients: async () => [{ userId: 'a', email: 'a@example.com' }],
      clock,
    });
    await sched.runOnce();
    const s = sched.status();
    expect(s.ticks).toBe(1);
    expect(s.totalFired).toBe(1);
    expect(s.totalSent).toBe(1);
    expect(s.subscriptionsWatched).toBe(1);
  });
});
