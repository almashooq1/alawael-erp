/**
 * alert-notification-dispatcher.test.js — Phase 18 Commit 8.1.
 *
 * Unit tests for the bridge between the alert coordinator and
 * `unifiedNotifier`. Everything is mockable.
 */

'use strict';

const {
  buildAlertNotificationDispatcher,
} = require('../services/alertNotificationDispatcher.service');

const basePolicy = {
  id: 'exec.dso.breach',
  kpiId: 'finance.ar.dso.days',
  severity: 'critical',
  trigger: { on: 'red', minConsecutiveTicks: 2 },
  dedupWindowMs: 60_000,
  escalationLadderId: 'critical.oncall',
  headlineAr: 'خرق DSO',
  headlineEn: 'DSO breach',
};

const baseSnapshot = {
  id: 'finance.ar.dso.days',
  classification: 'red',
  value: 95,
  delta: 0.25,
};

const baseDecision = {
  action: 'fire',
  correlationKey: 'exec.dso.breach|finance.ar.dso.days|',
  escalationStep: 0,
  severity: 'critical',
  headlineAr: 'خرق DSO',
  headlineEn: 'DSO breach',
};

describe('alertNotificationDispatcher — factory validation', () => {
  it('throws when notifier.notify is missing', () => {
    expect(() =>
      buildAlertNotificationDispatcher({
        resolveRecipients: async () => [],
      })
    ).toThrow(/notifier\.notify is required/);
  });

  it('throws when resolveRecipients is missing', () => {
    expect(() =>
      buildAlertNotificationDispatcher({
        notifier: { notify: async () => ({}) },
      })
    ).toThrow(/resolveRecipients is required/);
  });
});

describe('alertNotificationDispatcher.dispatch — happy path', () => {
  it('resolves recipients + fans out notify calls per ladder step', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const resolveRecipients = jest.fn(async () => [
      { userId: 'u1', email: 'a@example.com' },
      { userId: 'u2', email: 'b@example.com' },
    ]);
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients,
    });
    const res = await dispatch({
      decision: baseDecision,
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    expect(res).toEqual(
      expect.objectContaining({ sent: 2, failed: 0, skipped: false, recipients: 2 })
    );
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('uses critical priority + the step channels', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const resolveRecipients = async () => [{ userId: 'u1', email: 'a@example.com' }];
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients,
    });
    await dispatch({
      decision: baseDecision,
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    const args = notify.mock.calls[0][0];
    expect(args.priority).toBe('high');
    expect(args.channels).toEqual(['in-app', 'email', 'sms']);
    expect(args.templateKey).toBe('alert.critical.exec.dso.breach');
  });

  it('maps severity → priority correctly', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const resolveRecipients = async () => [{ userId: 'u1', email: 'a@example.com' }];
    const build = severity =>
      buildAlertNotificationDispatcher({ notifier: { notify }, resolveRecipients });

    const cases = [
      ['emergency', 'urgent'],
      ['critical', 'high'],
      ['warning', 'normal'],
      ['info', 'low'],
    ];
    for (const [sev, expected] of cases) {
      notify.mockClear();
      const { dispatch } = build(sev);
      await dispatch({
        decision: baseDecision,
        policy: { ...basePolicy, severity: sev },
        snapshot: baseSnapshot,
      });
      expect(notify.mock.calls[0][0].priority).toBe(expected);
    }
  });

  it('attaches correlation metadata to every send', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const resolveRecipients = async () => [{ userId: 'u1', email: 'a@example.com' }];
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients,
    });
    await dispatch({
      decision: { ...baseDecision, action: 'escalate', escalationStep: 1 },
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    const meta = notify.mock.calls[0][0].metadata;
    expect(meta).toEqual(
      expect.objectContaining({
        correlationKey: baseDecision.correlationKey,
        policyId: 'exec.dso.breach',
        kpiId: 'finance.ar.dso.days',
        action: 'escalate',
        escalationStep: 1,
      })
    );
  });

  it('renders a bilingual body with value + delta + escalation marker', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const resolveRecipients = async () => [{ userId: 'u1', email: 'a@example.com' }];
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients,
    });
    await dispatch({
      decision: { ...baseDecision, action: 'escalate', escalationStep: 1 },
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    const body = notify.mock.calls[0][0].body;
    expect(body).toMatch(/خرق DSO/);
    expect(body).toMatch(/DSO breach/);
    expect(body).toMatch(/95/);
    expect(body).toMatch(/\+25\.0%/);
    expect(body).toMatch(/تصعيد/);
  });
});

describe('alertNotificationDispatcher.dispatch — skip paths', () => {
  it('skips when resolver returns no recipients', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients: async () => [],
    });
    const res = await dispatch({
      decision: baseDecision,
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('no-recipients');
    expect(notify).not.toHaveBeenCalled();
  });

  it('skips when escalationStep is beyond the ladder', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients: async () => [{ userId: 'u1', email: 'a@example.com' }],
    });
    const res = await dispatch({
      decision: { ...baseDecision, escalationStep: 99 },
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('no-ladder-step');
  });

  it('swallows resolver errors', async () => {
    const notify = jest.fn();
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients: async () => {
        throw new Error('db down');
      },
      logger: { warn: () => {} },
    });
    const res = await dispatch({
      decision: baseDecision,
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('resolver-error');
  });

  it('keeps going when a single notify call fails', async () => {
    let i = 0;
    const notify = jest.fn(async () => {
      i += 1;
      if (i === 1) throw new Error('sms provider outage');
      return { ok: true };
    });
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients: async () => [
        { userId: 'u1', email: 'a@example.com' },
        { userId: 'u2', email: 'b@example.com' },
      ],
      logger: { warn: () => {} },
    });
    const res = await dispatch({
      decision: baseDecision,
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    expect(res.sent).toBe(1);
    expect(res.failed).toBe(1);
  });

  it('skips recipients with neither email nor phone', async () => {
    const notify = jest.fn();
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients: async () => [{ userId: 'u1' }], // no email/phone
    });
    const res = await dispatch({
      decision: baseDecision,
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    expect(res.sent).toBe(0);
    expect(res.failed).toBe(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('returns skipped when decision or policy are missing', async () => {
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify: async () => ({}) },
      resolveRecipients: async () => [],
    });
    expect((await dispatch({})).skipped).toBe(true);
    expect((await dispatch({ decision: baseDecision })).skipped).toBe(true);
  });
});

describe('alertNotificationDispatcher — custom renderer', () => {
  it('honours an injected renderMessage override', async () => {
    const notify = jest.fn(async () => ({ ok: true }));
    const renderMessage = jest.fn(() => ({ subject: 'custom', body: 'custom body' }));
    const { dispatch } = buildAlertNotificationDispatcher({
      notifier: { notify },
      resolveRecipients: async () => [{ userId: 'u1', email: 'a@example.com' }],
      renderMessage,
    });
    await dispatch({
      decision: baseDecision,
      policy: basePolicy,
      snapshot: baseSnapshot,
    });
    expect(renderMessage).toHaveBeenCalled();
    expect(notify.mock.calls[0][0].subject).toBe('custom');
  });
});
