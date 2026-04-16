/**
 * End-to-end smoke tests for AlertDispatcher + Scheduler.
 * No real DB — we stub the Alert model and channels.
 */

const {
  AlertsEngine,
  AlertDispatcher,
  AlertsScheduler,
  buildDefaultRecipientResolver,
} = require('../alerts');

function makeAlertModelStub() {
  const store = new Map();
  const model = {
    updateOne: jest.fn(async (filter, update) => {
      const key = `${filter.ruleId}::${filter.key}`;
      const existing = store.get(key);
      if (!existing) {
        const doc = {
          ruleId: filter.ruleId,
          key: filter.key,
          ...update.$set,
          ...update.$setOnInsert,
        };
        store.set(key, doc);
        return { upsertedCount: 1, matchedCount: 0 };
      }
      Object.assign(existing, update.$set || {});
      if (update.$push && update.$push.notificationsSent) {
        existing.notificationsSent = existing.notificationsSent || [];
        const push = update.$push.notificationsSent;
        const items = push.$each ? push.$each : [push];
        existing.notificationsSent.push(...items);
      }
      return { upsertedCount: 0, matchedCount: 1 };
    }),
    find: jest.fn(async () => Array.from(store.values())),
  };
  return { model: { model }, store };
}

function makeChannel(name, impl = () => ({ success: true })) {
  return {
    name,
    send: jest.fn(async (alert, recipients) => impl(alert, recipients)),
  };
}

describe('AlertDispatcher — basic tick', () => {
  test('persists raised alerts via upsert', async () => {
    const { model: AlertModel, store } = makeAlertModelStub();
    const engine = new AlertsEngine();
    engine.register({
      id: 'r1',
      severity: 'warning',
      category: 'hr',
      description: 'd',
      evaluate: async () => [
        { key: 'k1', message: 'm1', branchId: 'br-1', subject: { type: 'X', id: 'x1' } },
      ],
    });

    const disp = new AlertDispatcher({ engine, AlertModel });
    const out = await disp.tick({});
    expect(out.raised).toBe(1);
    expect(store.size).toBe(1);
    const entry = Array.from(store.values())[0];
    expect(entry.message).toBe('m1');
    expect(entry.severity).toBe('warning');
  });

  test('marks alerts resolved when condition clears', async () => {
    const { model: AlertModel, store } = makeAlertModelStub();
    const engine = new AlertsEngine();
    let findings = [{ key: 'k1', message: 'm1' }];
    engine.register({
      id: 'r1',
      severity: 'high',
      category: 'financial',
      description: 'd',
      evaluate: async () => findings,
    });
    const disp = new AlertDispatcher({ engine, AlertModel });

    await disp.tick({});
    findings = [];
    const out = await disp.tick({});
    expect(out.resolved).toBe(1);
    const entry = Array.from(store.values())[0];
    expect(entry.resolvedAt).toBeInstanceOf(Date);
  });
});

describe('AlertDispatcher — notifications', () => {
  test('invokes channels for each recipient and records receipts', async () => {
    const { model: AlertModel, store } = makeAlertModelStub();
    const engine = new AlertsEngine();
    engine.register({
      id: 'r1',
      severity: 'critical',
      category: 'quality',
      description: 'd',
      evaluate: async () => [{ key: 'k1', message: 'emergency', branchId: 'br-1' }],
    });

    const email = makeChannel('email');
    const inApp = makeChannel('in_app');
    const recipients = {
      resolve: async () => [
        { id: 'u-1', channels: ['email', 'in_app'] },
        { id: 'u-2', channels: ['email'] },
      ],
    };

    const disp = new AlertDispatcher({
      engine,
      AlertModel,
      channels: { email, in_app: inApp },
      recipients,
    });
    const out = await disp.tick({});

    expect(email.send).toHaveBeenCalledTimes(2);
    expect(inApp.send).toHaveBeenCalledTimes(1);
    expect(out.notified).toBe(3);

    const entry = Array.from(store.values())[0];
    expect(entry.notificationsSent.length).toBe(3);
    expect(entry.notificationsSent.every(r => r.success)).toBe(true);
  });

  test('swallows channel errors and records failure', async () => {
    const { model: AlertModel, store } = makeAlertModelStub();
    const engine = new AlertsEngine();
    engine.register({
      id: 'r1',
      severity: 'warning',
      category: 'hr',
      description: 'd',
      evaluate: async () => [{ key: 'k1', message: 'm' }],
    });
    const bad = makeChannel('email', () => {
      throw new Error('smtp down');
    });
    const recipients = { resolve: async () => [{ id: 'u-1', channels: ['email'] }] };

    const disp = new AlertDispatcher({ engine, AlertModel, channels: { email: bad }, recipients });
    const out = await disp.tick({});
    expect(out.notified).toBe(0);
    const entry = Array.from(store.values())[0];
    expect(entry.notificationsSent[0].success).toBe(false);
    expect(entry.notificationsSent[0].error).toContain('smtp');
  });

  test('skips notifications gracefully when no resolver configured', async () => {
    const { model: AlertModel } = makeAlertModelStub();
    const engine = new AlertsEngine();
    engine.register({
      id: 'r1',
      severity: 'info',
      category: 'operational',
      description: 'd',
      evaluate: async () => [{ key: 'k', message: 'm' }],
    });
    const disp = new AlertDispatcher({ engine, AlertModel });
    const out = await disp.tick({});
    expect(out.notified).toBe(0);
    expect(out.raised).toBe(1);
  });
});

describe('buildDefaultRecipientResolver', () => {
  test('routes critical clinical alerts up to head office', async () => {
    const users = [
      { _id: 'u-1', roles: ['supervisor'], status: 'active', defaultBranchId: 'br-1' },
      { _id: 'u-2', roles: ['head_office_admin'], status: 'active', accessibleBranches: ['br-1'] },
      { _id: 'u-3', roles: ['therapist'], status: 'active', defaultBranchId: 'br-1' }, // not in list
    ];
    const UserModel = {
      find: jest.fn(async q => {
        return users.filter(u => {
          const rolesMatch = q.roles.$in.some(r => u.roles.includes(r));
          if (!rolesMatch) return false;
          if (q.status && u.status !== q.status) return false;
          if (q.$or) {
            return q.$or.some(clause => {
              if (clause.defaultBranchId) return u.defaultBranchId === clause.defaultBranchId;
              if (clause.accessibleBranches)
                return (u.accessibleBranches || []).includes(clause.accessibleBranches);
              return false;
            });
          }
          return true;
        });
      }),
    };
    const resolver = buildDefaultRecipientResolver({ UserModel });
    const alert = { category: 'clinical', severity: 'critical', branchId: 'br-1' };
    const recips = await resolver.resolve(alert);
    const ids = recips.map(r => r.id);
    expect(ids).toContain('u-1'); // supervisor
    expect(ids).toContain('u-2'); // head_office_admin
    expect(ids).not.toContain('u-3');
    expect(recips[0].channels).toContain('in_app');
  });
});

describe('AlertsScheduler', () => {
  test('start sets running flag and stop clears it', async () => {
    const { model: AlertModel } = makeAlertModelStub();
    const engine = new AlertsEngine();
    engine.register({ id: 'r', evaluate: async () => [] });
    const disp = new AlertDispatcher({ engine, AlertModel });
    const sched = new AlertsScheduler({ dispatcher: disp, intervalMs: 60_000 });
    sched.start();
    expect(sched.isRunning()).toBe(true);
    sched.stop();
    expect(sched.isRunning()).toBe(false);
  });

  test('uses cron when provided', () => {
    const { model: AlertModel } = makeAlertModelStub();
    const engine = new AlertsEngine();
    engine.register({ id: 'r', evaluate: async () => [] });
    const disp = new AlertDispatcher({ engine, AlertModel });
    const stop = jest.fn();
    const cron = { schedule: jest.fn(() => ({ stop })) };
    const sched = new AlertsScheduler({ dispatcher: disp, cronExpression: '*/5 * * * *', cron });
    sched.start();
    expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    sched.stop();
    expect(stop).toHaveBeenCalled();
  });
});
