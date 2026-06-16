'use strict';

/**
 * alerts-email-notify-wave1244.test.js — severity-gated email channel for
 * the smart-alerts engine.
 *
 * The dispatcher's `_notify` plumbing existed since Wave 9 but app.js never
 * injected channels/recipients — the notification half was dormant. W1244
 * wires it. These tests lock:
 *   1. buildEmailNotify contract (null without inbox; severity gate; the
 *      EmailManager.sendAlert mapping incl. error paths);
 *   2. END-TO-END through the REAL dispatcher: a critical raise produces
 *      exactly one email send, a warning produces none, and a re-detected
 *      alert on the next tick does NOT re-email (the dedup that makes the
 *      channel inbox-safe);
 *   3. static guard: app.js injects the channel under ALERTS_EMAIL_ENABLED.
 */

const fs = require('fs');
const path = require('path');

const { buildEmailNotify, SEVERITY_RANK } = require('../alerts/email-notify');

// EmailManager is lazy-required inside the channel — mock the module.
jest.mock('../services/email', () => ({
  emailManager: { sendAlert: jest.fn(async () => ({ success: true })) },
}));
// eslint-disable-next-line node/no-missing-require
const { emailManager } = require('../services/email');

afterEach(() => jest.clearAllMocks());

describe('W1244 buildEmailNotify — contract', () => {
  test('returns null without a valid inbox', () => {
    expect(buildEmailNotify({})).toBeNull();
    expect(buildEmailNotify({ opsEmail: 'not-an-email' })).toBeNull();
  });

  test('severity gate: below minSeverity resolves to no recipients', async () => {
    const n = buildEmailNotify({ opsEmail: 'ops@x.test', minSeverity: 'high' });
    expect(await n.recipients.resolve({ severity: 'warning' })).toEqual([]);
    expect(await n.recipients.resolve({ severity: 'info' })).toEqual([]);
    expect(await n.recipients.resolve({ severity: 'high' })).toHaveLength(1);
    expect(await n.recipients.resolve({ severity: 'critical' })).toHaveLength(1);
  });

  test('rank table covers the Alert model severity enum', () => {
    expect(Object.keys(SEVERITY_RANK).sort()).toEqual(['critical', 'high', 'info', 'warning']);
  });

  test('send maps alert → EmailManager.sendAlert and reports success', async () => {
    const n = buildEmailNotify({ opsEmail: 'ops@x.test' });
    const alert = {
      severity: 'critical',
      message: 'فاتورة متأخرة 90 يوماً',
      description: 'تفاصيل…',
      ruleId: 'invoice-overdue',
      category: 'finance',
    };
    const res = await n.channels.email.send(alert, [{ id: 'ops-inbox', email: 'ops@x.test' }]);
    expect(res.success).toBe(true);
    expect(emailManager.sendAlert).toHaveBeenCalledTimes(1);
    const [payload, to] = emailManager.sendAlert.mock.calls[0];
    expect(to).toBe('ops@x.test');
    expect(payload.title).toBe('فاتورة متأخرة 90 يوماً');
    expect(payload.source).toBe('invoice-overdue');
    expect(payload.severity).toBe('critical');
  });

  test('send failure is reported, never thrown', async () => {
    emailManager.sendAlert.mockResolvedValueOnce({ success: false, error: 'SMTP down' });
    const n = buildEmailNotify({ opsEmail: 'ops@x.test' });
    const res = await n.channels.email.send({ severity: 'high', message: 'x' }, [
      { email: 'ops@x.test' },
    ]);
    expect(res.success).toBe(false);
    expect(res.error).toBe('SMTP down');
  });
});

describe('W1244 end-to-end through the real dispatcher', () => {
  const { AlertDispatcher } = require('../alerts/dispatcher');
  const { AlertsEngine } = require('../alerts/engine');

  function makeDispatcher(findingsByTick) {
    let tickNo = -1;
    const engine = new AlertsEngine({ logger: { info() {}, warn() {}, error() {} } });
    engine.register({
      id: 'test-rule',
      severity: 'critical',
      evaluate: async () => {
        tickNo += 1;
        return findingsByTick[Math.min(tickNo, findingsByTick.length - 1)];
      },
    });
    const notify = buildEmailNotify({ opsEmail: 'ops@x.test' });
    const fakeModel = {
      model: {
        updateOne: jest.fn(async () => ({ acknowledged: true })),
      },
    };
    return new AlertDispatcher({
      engine,
      AlertModel: fakeModel,
      channels: notify.channels,
      recipients: notify.recipients,
      logger: { info() {}, warn() {}, error() {} },
    });
  }

  test('critical raise emails ONCE; re-detection on next tick does NOT re-email', async () => {
    const finding = {
      key: 'inv-1',
      severity: 'critical',
      category: 'finance',
      description: 'd',
      message: 'm',
    };
    const d = makeDispatcher([[finding], [finding]]);

    const t1 = await d.tick({});
    expect(t1.raised).toBe(1);
    expect(t1.notified).toBe(1);
    expect(emailManager.sendAlert).toHaveBeenCalledTimes(1);

    const t2 = await d.tick({});
    expect(t2.raised).toBe(0); // dedup: still-firing bumps lastSeenAt only
    expect(emailManager.sendAlert).toHaveBeenCalledTimes(1); // no second email
  });

  test('warning-severity raise persists but does not email', async () => {
    const d = makeDispatcher([
      [{ key: 'w-1', severity: 'warning', category: 'ops', description: 'd', message: 'm' }],
    ]);
    const t1 = await d.tick({});
    expect(t1.raised).toBe(1);
    expect(t1.notified).toBe(0);
    expect(emailManager.sendAlert).not.toHaveBeenCalled();
  });
});

describe('W1244 static guard — app.js wiring', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  test('engine block injects the email channel under ALERTS_EMAIL_ENABLED', () => {
    expect(appSrc).toMatch(/ALERTS_EMAIL_ENABLED/);
    expect(appSrc).toMatch(/require\('\.\/alerts\/email-notify'\)/);
    expect(appSrc).toMatch(
      /channels: emailNotify\.channels, recipients: emailNotify\.recipients/
    );
  });

  test('boot log reports the email channel state', () => {
    expect(appSrc).toMatch(/email=\$\{emailNotify \? /);
  });
});
