'use strict';

/**
 * W974 — quality event-bus unification.
 *
 * Root-cause fix for the two-bus disconnect (W941 was a quality.audit.*-only
 * stopgap bridge): qualityComplianceBootstrap now uses the SINGLETON bus
 * (qualityEventBus.getDefault()) instead of a fresh createQualityEventBus(),
 * so the lazy quality services (auditScheduler/fmea/coq/calibration/...) and
 * phase29-subscribers (server.js) — which all use getDefault() — share ONE bus
 * with the notification router + ncrPipeline. Order-independent (no re-seat).
 *
 * Coverage:
 *   1. static — bootstrap binds `bus` to getDefault(), no longer createQualityEventBus.
 *   2. INTEGRATION — a producer emitting on getDefault() reaches a router
 *      subscribed via getDefault() (audit policy fires WITHOUT any bridge);
 *      a previously-orphaned lazy event (fmea.*) now reaches the router (console
 *      catch-all only — no surprise email); a coexisting phase29-style subscriber
 *      still receives its event (auto-CAPA path intact); no double-dispatch.
 *
 * Uses _replaceDefault to install an isolated singleton for the test, restored after.
 */

const fs = require('fs');
const path = require('path');

const busMod = require('../services/quality/qualityEventBus.service');
const {
  createNotificationRouter,
} = require('../services/quality/notifications/notificationRouter.service');

const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'qualityComplianceBootstrap.js'),
  'utf8'
);

describe('W974 unification — bootstrap source', () => {
  it('binds the bus to the singleton getDefault()', () => {
    expect(BOOT_SRC).toMatch(/const bus = getQualityBusDefault\(\)/);
  });
  it('no longer creates a fresh bus via createQualityEventBus', () => {
    expect(BOOT_SRC).not.toMatch(/createQualityEventBus/);
  });
});

describe('W974 unification — integration on the singleton bus', () => {
  let original;
  let isolated;

  beforeEach(() => {
    original = busMod.getDefault();
    isolated = busMod.createQualityEventBus();
    busMod._replaceDefault(isolated); // getDefault() now returns `isolated`
  });
  afterEach(() => {
    busMod._replaceDefault(original);
  });

  function buildRouterOnDefault(created) {
    const logModel = {
      findOne: () => ({ lean: async () => null }),
      create: async doc => {
        created.push(doc);
        return doc;
      },
    };
    const router = createNotificationRouter({
      bus: busMod.getDefault(), // the bootstrap now does exactly this
      logModel,
      channels: { email: { send: async () => ({ success: true }) } },
      resolveRoleRecipients: async () => [{ userId: 'u1', email: 'qm@example.com' }],
    });
    router.start();
    return router;
  }

  it('audit.closed emitted on getDefault() reaches the router — no bridge needed', async () => {
    const created = [];
    const router = buildRouterOnDefault(created);

    // A producer (auditScheduler-style) emits on the SAME getDefault() singleton.
    await busMod.getDefault().emit('quality.audit.closed', {
      occurrenceId: 'o1',
      auditNumber: 'IA-974',
      outcome: 'minor_nc',
      findingsCount: 1,
    });
    await busMod.getDefault().flush();

    const emailRow = created.find(c => c.policyId === 'audit.closed' && c.channel === 'email');
    expect(emailRow).toBeTruthy();
    expect(emailRow.subject).toContain('IA-974');
    // exactly one email row for this policy → no double-dispatch
    expect(created.filter(c => c.policyId === 'audit.closed' && c.channel === 'email').length).toBe(1);
    router.stop();
  });

  it('a previously-orphaned lazy event (fmea.*) now reaches the router — console only, no email', async () => {
    const created = [];
    const router = buildRouterOnDefault(created);

    await busMod.getDefault().emit('quality.fmea.high_priority_detected', { fmeaId: 'f1' });
    await busMod.getDefault().flush();

    // reaches the router via the '*' catch-all (console), NOT any email policy
    expect(created.some(c => c.policyId === 'audit.all' && c.channel === 'console')).toBe(true);
    expect(created.some(c => c.channel === 'email')).toBe(false); // no surprise email
    router.stop();
  });

  it('a coexisting phase29-style subscriber on getDefault() still receives its event', async () => {
    const created = [];
    const router = buildRouterOnDefault(created);
    const phase29 = [];
    const unsub = busMod.getDefault().on('quality.audit.nc_recorded', payload => {
      phase29.push(payload); // stands in for the auto-CAPA subscriber
    });

    await busMod.getDefault().emit('quality.audit.nc_recorded', { occurrenceId: 'o2', type: 'major_nc' });
    await busMod.getDefault().flush();

    // both the router (email policy) AND the phase29 subscriber fired
    expect(phase29).toHaveLength(1);
    expect(phase29[0].type).toBe('major_nc');
    expect(created.some(c => c.policyId === 'audit.nc_recorded')).toBe(true);

    unsub();
    router.stop();
  });
});
