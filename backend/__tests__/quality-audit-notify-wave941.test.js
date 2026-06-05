'use strict';

/**
 * W941 — quality.audit.* notification delivery.
 *
 * Closes a two-bus disconnect in the quality subsystem: the auditScheduler emits
 * quality.audit.scheduled/nc_recorded/closed on `qualityEventBus.getDefault()`
 * (the SINGLETON), but the email notification router subscribes to the FRESH bus
 * created inside qualityComplianceBootstrap. So those audit events never reached
 * the router → no policy-based email, no matter the policies (the W349/W387
 * silent-no-op class). The bootstrap now installs a one-way `quality.audit.*`
 * bridge (singleton → router bus); this wave adds the 3 policies + templates.
 *
 * Coverage:
 *   1. static — bootstrap installs the narrow, audit-only, one-way bridge.
 *   2. policy — resolvePolicies() returns a dedicated policy for each audit event.
 *   3. template — render() produces a real subject/body for each (not generic).
 *   4. INTEGRATION (the W387 lesson) — emit quality.audit.closed on bus A, prove
 *      it reaches a router on bus B THROUGH the bridge and gets dispatched.
 *
 * Pure JS — real event bus + real router with fake logModel/channel; no DB.
 */

const fs = require('fs');
const path = require('path');

const { resolvePolicies } = require('../config/notification-policies.registry');
const { render } = require('../services/quality/notifications/templates');
const { createQualityEventBus } = require('../services/quality/qualityEventBus.service');
const {
  createNotificationRouter,
} = require('../services/quality/notifications/notificationRouter.service');

const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'qualityComplianceBootstrap.js'),
  'utf8'
);

describe('W941 audit-event bridge — bootstrap source', () => {
  it('imports getDefault as the singleton handle', () => {
    expect(BOOT_SRC).toMatch(/getDefault:\s*getQualityBusDefault/);
  });
  it('forwards ONLY quality.audit.* (narrow, not a wildcard re-broadcast)', () => {
    expect(BOOT_SRC).toMatch(/\.on\(\s*'quality\.audit\.\*'/);
    expect(BOOT_SRC).not.toMatch(/getQualityBusDefault\(\)[\s\S]{0,200}\.on\(\s*'\*'/);
  });
  it('guards against a self-emit loop (singleton !== bus)', () => {
    expect(BOOT_SRC).toMatch(/singleton\s*!==\s*bus/);
  });
  it('detaches the bridge on shutdown', () => {
    expect(BOOT_SRC).toMatch(/_auditBridgeUnsub\?\.\(\)/);
  });
});

describe('W941 audit notification policies', () => {
  it.each([
    ['quality.audit.scheduled', 'audit.scheduled'],
    ['quality.audit.nc_recorded', 'audit.nc_recorded'],
    ['quality.audit.closed', 'audit.closed'],
  ])('resolves a dedicated policy for %s', (eventName, policyId) => {
    const ids = resolvePolicies(eventName).map(p => p.id);
    expect(ids).toContain(policyId);
  });

  it('routes audit NCs to quality_manager + compliance_officer over email', () => {
    const p = resolvePolicies('quality.audit.nc_recorded').find(x => x.id === 'audit.nc_recorded');
    expect(p.recipients.roles).toEqual(
      expect.arrayContaining(['quality_manager', 'compliance_officer'])
    );
    expect(p.channels).toContain('email');
  });
});

describe('W941 audit templates render real content', () => {
  it('audit.closed surfaces the audit number + outcome', () => {
    const r = render('audit.closed', {
      auditNumber: 'IA-2026-014',
      occurrenceId: 'occ1',
      outcome: 'major_nc',
      findingsCount: 3,
    });
    expect(r.subject).toContain('IA-2026-014');
    expect(r.body).toMatch(/عدم مطابقة كبرى/);
    expect(r.body).toContain('3');
  });
  it('audit.nc_recorded distinguishes major vs minor', () => {
    expect(render('audit.nc_recorded', { type: 'major_nc' }).subject).toMatch(/كبرى/);
    expect(render('audit.nc_recorded', { type: 'minor_nc' }).subject).toMatch(/صغرى/);
  });
  it('audit.scheduled is NOT the generic fallback', () => {
    const r = render('audit.scheduled', { occurrenceId: 'o', riskLevel: 'high' });
    expect(r.subject).not.toMatch(/^🔔 quality\.audit\.scheduled/);
    expect(r.subject).toMatch(/تدقيق داخلي مجدول/);
  });
});

describe('W941 INTEGRATION — audit event crosses the bridge and is dispatched', () => {
  it('quality.audit.closed on the singleton bus reaches a router on a different bus', async () => {
    const singletonBus = createQualityEventBus(); // stands in for getDefault()
    const routerBus = createQualityEventBus(); // stands in for the bootstrap bus

    const created = [];
    const logModel = {
      findOne: () => ({ lean: async () => null }), // never dedup
      create: async doc => {
        created.push(doc);
        return doc;
      },
    };

    const router = createNotificationRouter({
      bus: routerBus,
      logModel,
      channels: { email: { send: async () => ({ success: true }) } },
      resolveRoleRecipients: async () => [
        { userId: 'u1', email: 'qm@example.com', label: 'QM' },
      ],
    });
    router.start();

    // The exact bridge the bootstrap installs.
    const unsub = singletonBus.on('quality.audit.*', (payload, name) =>
      routerBus.emit(name, payload)
    );

    await singletonBus.emit('quality.audit.closed', {
      occurrenceId: 'occ-1',
      auditNumber: 'IA-2026-099',
      outcome: 'minor_nc',
      findingsCount: 2,
    });
    await singletonBus.flush();
    await routerBus.flush();

    const emailRow = created.find(c => c.policyId === 'audit.closed' && c.channel === 'email');
    expect(emailRow).toBeTruthy();
    expect(emailRow.status).toBe('sent');
    expect(emailRow.recipient.email).toBe('qm@example.com');
    expect(emailRow.subject).toContain('IA-2026-099');

    unsub();
    router.stop();
  });

  it('without the bridge the same event is NOT delivered (proves the bridge is load-bearing)', async () => {
    const singletonBus = createQualityEventBus();
    const routerBus = createQualityEventBus();
    const created = [];
    const router = createNotificationRouter({
      bus: routerBus,
      logModel: { findOne: () => ({ lean: async () => null }), create: async d => created.push(d) },
      channels: { email: { send: async () => ({ success: true }) } },
      resolveRoleRecipients: async () => [{ userId: 'u1', email: 'qm@example.com' }],
    });
    router.start();
    // NO bridge installed.
    await singletonBus.emit('quality.audit.closed', { auditNumber: 'X' });
    await singletonBus.flush();
    await routerBus.flush();
    expect(created.find(c => c.policyId === 'audit.closed')).toBeFalsy();
    router.stop();
  });
});
