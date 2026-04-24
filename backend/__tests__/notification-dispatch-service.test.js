'use strict';

/**
 * notification-dispatch-service.test.js — Phase 16 C8 (4.0.73).
 *
 * Behaviour tests for planDispatch / sendWithFallback / digest flow.
 * Uses in-memory fakes so the suite is hermetic.
 */

process.env.NODE_ENV = 'test';

const {
  createNotificationDispatchService,
} = require('../services/operations/notificationDispatch.service');

// ── fakes ─────────────────────────────────────────────────────────

function makePrefsModel() {
  const docs = [];
  let counter = 0;
  return {
    docs,
    findOne: async filter => {
      return (
        docs.find(d => {
          for (const [k, v] of Object.entries(filter || {})) {
            if (String(d[k]) !== String(v)) return false;
          }
          return true;
        }) || null
      );
    },
    create: async data => {
      const d = {
        _id: `prefs-${++counter}`,
        channelPreferences: {
          email: { enabled: true },
          sms: { enabled: true },
          push: { enabled: true },
          slack: { enabled: false },
          in_app: { enabled: true },
          whatsapp: { enabled: false },
        },
        quietHours: {
          enabled: true,
          startHour: 22,
          endHour: 6,
          timezone: 'Asia/Riyadh',
        },
        digest: { enabled: false, sendHour: 8, includePriorities: ['low', 'normal'] },
        dndUntil: null,
        inMeetingUntil: null,
        inSessionUntil: null,
        lastDigestSentAt: null,
        ...data,
        save: async function () {
          return this;
        },
      };
      docs.push(d);
      return d;
    },
  };
}

function makeDigestModel() {
  const docs = [];
  let counter = 0;
  return {
    docs,
    create: async data => {
      const d = {
        _id: `dig-${++counter}`,
        ...data,
        save: async function () {
          return this;
        },
      };
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        sort: () => api,
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    _docs: () => docs,
  };
}

function makeEmailAdapter({ alwaysFail = false } = {}) {
  const calls = [];
  return {
    calls,
    async send(message) {
      calls.push(message);
      if (alwaysFail) return { success: false, error: 'smtp-down' };
      return { success: true };
    },
  };
}

function makePushAdapter({ alwaysFail = false } = {}) {
  const calls = [];
  return {
    calls,
    async send(message) {
      calls.push(message);
      if (alwaysFail) throw new Error('device_offline');
      return { success: true };
    },
  };
}

function makeSmsAdapter() {
  const calls = [];
  return {
    calls,
    async send(message) {
      calls.push(message);
      return { success: true };
    },
  };
}

// ── planDispatch tests ────────────────────────────────────────────

describe('planDispatch — pure decision function', () => {
  function svc() {
    return createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
      digestModel: makeDigestModel(),
    });
  }

  it('critical always sends and ignores quiet hours / DND', () => {
    const s = svc();
    const midnight = new Date('2026-05-01T00:00:00+03:00'); // 00:00 Riyadh
    const prefs = {
      quietHours: { enabled: true, startHour: 22, endHour: 6, timezone: 'Asia/Riyadh' },
      dndUntil: new Date('2099-01-01'),
      channelPreferences: {
        email: { enabled: true },
        sms: { enabled: true },
        push: { enabled: true },
        slack: { enabled: false },
      },
    };
    const plan = s.planDispatch({ priority: 'critical', prefs, referenceTime: midnight });
    expect(plan.deferred).toBe(false);
    expect(plan.channels).toEqual(expect.arrayContaining(['sms']));
  });

  it('quiet hours defers non-critical', () => {
    const s = svc();
    const midnight = new Date('2026-05-01T00:00:00+03:00');
    const prefs = {
      quietHours: { enabled: true, startHour: 22, endHour: 6, timezone: 'Asia/Riyadh' },
      channelPreferences: { email: { enabled: true }, push: { enabled: true } },
    };
    const plan = s.planDispatch({ priority: 'normal', prefs, referenceTime: midnight });
    expect(plan.deferred).toBe(true);
    expect(plan.reason).toBe('quiet_hours');
    expect(plan.digestBucket).toBe(true);
  });

  it('DND defers non-critical', () => {
    const s = svc();
    const noon = new Date('2026-05-01T12:00:00+03:00');
    const prefs = {
      quietHours: { enabled: false, startHour: 22, endHour: 6 },
      dndUntil: new Date('2026-05-01T14:00:00+03:00'),
      channelPreferences: { email: { enabled: true } },
    };
    const plan = s.planDispatch({ priority: 'high', prefs, referenceTime: noon });
    expect(plan.deferred).toBe(true);
    expect(plan.reason).toBe('dnd_active');
  });

  it('in_meeting defers and flags digest bucket for eligible priorities', () => {
    const s = svc();
    const now = new Date('2026-05-01T10:00:00+03:00');
    const prefs = {
      quietHours: { enabled: false },
      inMeetingUntil: new Date('2026-05-01T11:00:00+03:00'),
      channelPreferences: { email: { enabled: true } },
    };
    const plan = s.planDispatch({ priority: 'normal', prefs, referenceTime: now });
    expect(plan.deferred).toBe(true);
    expect(plan.reason).toBe('in_meeting');
    expect(plan.digestBucket).toBe(true);
  });

  it('digest opt-in routes eligible priorities to digest queue', () => {
    const s = svc();
    const now = new Date('2026-05-01T10:00:00+03:00');
    const prefs = {
      quietHours: { enabled: false },
      digest: { enabled: true, sendHour: 8, includePriorities: ['low', 'normal'] },
      channelPreferences: { email: { enabled: true } },
    };
    const plan = s.planDispatch({ priority: 'low', prefs, referenceTime: now });
    expect(plan.deferred).toBe(true);
    expect(plan.reason).toBe('digest_queued');
    expect(plan.digestBucket).toBe(true);
  });

  it('digest opt-in does NOT defer high/critical', () => {
    const s = svc();
    const now = new Date('2026-05-01T10:00:00+03:00');
    const prefs = {
      quietHours: { enabled: false },
      digest: { enabled: true, sendHour: 8, includePriorities: ['low', 'normal'] },
      channelPreferences: { email: { enabled: true }, push: { enabled: true } },
    };
    const plan = s.planDispatch({ priority: 'high', prefs, referenceTime: now });
    expect(plan.deferred).toBe(false);
    expect(plan.channels.length).toBeGreaterThan(0);
  });

  it('filters disabled channels out of the plan', () => {
    const s = svc();
    const now = new Date('2026-05-01T10:00:00+03:00');
    const prefs = {
      quietHours: { enabled: false },
      channelPreferences: {
        email: { enabled: true },
        push: { enabled: false },
        sms: { enabled: false },
        slack: { enabled: false },
      },
    };
    const plan = s.planDispatch({ priority: 'high', prefs, referenceTime: now });
    expect(plan.channels).toEqual(['email']);
  });

  it('returns no_channel_available when every channel is disabled', () => {
    const s = svc();
    const now = new Date('2026-05-01T10:00:00+03:00');
    const prefs = {
      quietHours: { enabled: false },
      channelPreferences: {
        email: { enabled: false },
        push: { enabled: false },
        sms: { enabled: false },
        slack: { enabled: false },
      },
    };
    const plan = s.planDispatch({ priority: 'normal', prefs, referenceTime: now });
    expect(plan.deferred).toBe(true);
    expect(plan.reason).toBe('no_channel_available');
  });
});

// ── sendWithFallback tests ────────────────────────────────────────

describe('sendWithFallback', () => {
  it('tries channels in order and returns on first success', async () => {
    const s = createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
    });
    const email = makeEmailAdapter();
    const push = makePushAdapter();
    const plan = {
      channels: ['push', 'email'],
      deferred: false,
    };
    const result = await s.sendWithFallback({
      plan,
      content: { subject: 'x', body: 'y' },
      channelAdapters: { push, email },
      recipient: { userId: 'u', email: 'a@b' },
    });
    expect(result.success).toBe(true);
    expect(result.chosenChannel).toBe('push');
    expect(push.calls.length).toBe(1);
    expect(email.calls.length).toBe(0); // fallback not needed
  });

  it('falls back to next channel when primary throws', async () => {
    const s = createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
    });
    const push = makePushAdapter({ alwaysFail: true });
    const email = makeEmailAdapter();
    const plan = { channels: ['push', 'email'], deferred: false };
    const result = await s.sendWithFallback({
      plan,
      content: { subject: 'x', body: 'y' },
      channelAdapters: { push, email },
    });
    expect(result.success).toBe(true);
    expect(result.chosenChannel).toBe('email');
    expect(push.calls.length).toBe(1);
    expect(email.calls.length).toBe(1);
  });

  it('returns failure when every channel fails', async () => {
    const s = createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
    });
    const push = makePushAdapter({ alwaysFail: true });
    const email = makeEmailAdapter({ alwaysFail: true });
    const plan = { channels: ['push', 'email'], deferred: false };
    const result = await s.sendWithFallback({
      plan,
      content: { subject: 'x', body: 'y' },
      channelAdapters: { push, email },
    });
    expect(result.success).toBe(false);
    expect(result.chosenChannel).toBeNull();
    expect(result.attempts.length).toBe(2);
  });

  it('records no_adapter error for missing channel', async () => {
    const s = createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
    });
    const email = makeEmailAdapter();
    const plan = { channels: ['sms', 'email'], deferred: false };
    const result = await s.sendWithFallback({
      plan,
      content: { subject: 'x', body: 'y' },
      channelAdapters: { email },
    });
    expect(result.success).toBe(true);
    expect(result.chosenChannel).toBe('email');
    expect(result.attempts.find(a => a.channel === 'sms').error).toBe('no_adapter');
  });

  it('returns success=false for deferred plans', async () => {
    const s = createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
    });
    const email = makeEmailAdapter();
    const plan = { channels: [], deferred: true, reason: 'quiet_hours' };
    const result = await s.sendWithFallback({
      plan,
      content: { subject: 'x' },
      channelAdapters: { email },
    });
    expect(result.success).toBe(false);
    expect(email.calls.length).toBe(0);
  });
});

// ── preferences tests ─────────────────────────────────────────────

describe('preferences', () => {
  it('getOrDefaultPrefs upserts a default doc', async () => {
    const prefsModel = makePrefsModel();
    const s = createNotificationDispatchService({
      preferencesModel: prefsModel,
    });
    const doc = await s.getOrDefaultPrefs('user-1');
    expect(doc.channelPreferences.email.enabled).toBe(true);
    expect(prefsModel.docs.length).toBe(1);
    // calling twice returns same doc (no duplicate)
    await s.getOrDefaultPrefs('user-1');
    expect(prefsModel.docs.length).toBe(1);
  });

  it('updatePrefs shallow-merges nested objects', async () => {
    const prefsModel = makePrefsModel();
    const s = createNotificationDispatchService({
      preferencesModel: prefsModel,
    });
    await s.getOrDefaultPrefs('user-1');
    const doc = await s.updatePrefs('user-1', {
      quietHours: { startHour: 21 }, // partial
      channelPreferences: { sms: { enabled: false } },
    });
    expect(doc.quietHours.startHour).toBe(21);
    expect(doc.quietHours.endHour).toBe(6); // preserved
    expect(doc.channelPreferences.sms.enabled).toBe(false);
    expect(doc.channelPreferences.email.enabled).toBe(true); // preserved
  });
});

// ── digest tests ──────────────────────────────────────────────────

describe('digest flow', () => {
  it('queueForDigest writes pending item', async () => {
    const prefsModel = makePrefsModel();
    const digestModel = makeDigestModel();
    const s = createNotificationDispatchService({
      preferencesModel: prefsModel,
      digestModel,
    });
    const item = await s.queueForDigest({
      recipient: { userId: 'u1' },
      policyId: 'p1',
      eventName: 'evt',
      priority: 'low',
      subject: 'hello',
      body: 'world',
    });
    expect(item.status).toBe('pending');
    expect(digestModel.docs.length).toBe(1);
  });

  it('flushDigests bundles pending items into one email when sendHour matches', async () => {
    const prefsModel = makePrefsModel();
    const digestModel = makeDigestModel();
    const email = makeEmailAdapter();

    // Fake current time: 08:00 Riyadh
    const fakeNow = new Date('2026-05-01T05:00:00Z'); // 08:00 Riyadh (UTC+3)
    const s = createNotificationDispatchService({
      preferencesModel: prefsModel,
      digestModel,
      now: () => fakeNow,
    });

    // user with digest enabled, sendHour=8
    await prefsModel.create({
      userId: 'u1',
      digest: { enabled: true, sendHour: 8, includePriorities: ['low', 'normal'] },
      channelPreferences: { email: { enabled: true, address: 'u1@x.com' } },
    });
    await digestModel.create({
      userId: 'u1',
      policyId: 'p',
      eventName: 'e',
      priority: 'low',
      subject: 'one',
      status: 'pending',
      queuedAt: new Date(fakeNow.getTime() - 3600000),
    });
    await digestModel.create({
      userId: 'u1',
      policyId: 'p',
      eventName: 'e',
      priority: 'normal',
      subject: 'two',
      status: 'pending',
      queuedAt: new Date(fakeNow.getTime() - 1800000),
    });

    const report = await s.flushDigests({ channelAdapters: { email } });
    expect(report.sent).toBe(2);
    expect(email.calls.length).toBe(1);
    expect(email.calls[0].subject).toContain('2 notifications');
    // items now marked sent
    const sent = digestModel.docs.filter(d => d.status === 'sent');
    expect(sent.length).toBe(2);
  });

  it('flushDigests skips users whose sendHour does not match current hour', async () => {
    const prefsModel = makePrefsModel();
    const digestModel = makeDigestModel();
    const email = makeEmailAdapter();
    const fakeNow = new Date('2026-05-01T05:00:00Z'); // 08:00 Riyadh
    const s = createNotificationDispatchService({
      preferencesModel: prefsModel,
      digestModel,
      now: () => fakeNow,
    });

    await prefsModel.create({
      userId: 'u1',
      digest: { enabled: true, sendHour: 18, includePriorities: ['low'] }, // evening
      channelPreferences: { email: { enabled: true } },
    });
    await digestModel.create({
      userId: 'u1',
      priority: 'low',
      subject: 's',
      status: 'pending',
      policyId: 'p',
      eventName: 'e',
      queuedAt: fakeNow,
    });

    const report = await s.flushDigests({ channelAdapters: { email } });
    expect(report.sent).toBe(0);
    expect(email.calls.length).toBe(0);
  });

  it('flushDigests is idempotent — second call within same hour no-ops', async () => {
    const prefsModel = makePrefsModel();
    const digestModel = makeDigestModel();
    const email = makeEmailAdapter();
    const fakeNow = new Date('2026-05-01T05:00:00Z');
    const s = createNotificationDispatchService({
      preferencesModel: prefsModel,
      digestModel,
      now: () => fakeNow,
    });
    await prefsModel.create({
      userId: 'u1',
      digest: { enabled: true, sendHour: 8 },
      channelPreferences: { email: { enabled: true } },
    });
    await digestModel.create({
      userId: 'u1',
      priority: 'low',
      subject: 'x',
      status: 'pending',
      policyId: 'p',
      eventName: 'e',
      queuedAt: fakeNow,
    });

    const r1 = await s.flushDigests({ channelAdapters: { email } });
    expect(r1.sent).toBe(1);
    // second call should find lastDigestSentAt matches this hour and skip
    await digestModel.create({
      userId: 'u1',
      priority: 'low',
      subject: 'y',
      status: 'pending',
      policyId: 'p',
      eventName: 'e',
      queuedAt: fakeNow,
    });
    const r2 = await s.flushDigests({ channelAdapters: { email } });
    expect(r2.sent).toBe(0);
    expect(email.calls.length).toBe(1);
  });
});
