/**
 * governance-wave26.test.js — Wave 26.
 *
 *   1. Registry shape (permissions + banners + sensitive kinds)
 *   2. Permission resolution (single + multiple + all + all-authenticated)
 *   3. Widget filtering by required permissions
 *   4. Masking: maskForCompliance (role-restricted) + redactForLLM (strict)
 *   5. Compliance banners + recordAccess emit
 *   6. Audit trail merge (AuditLog + entity transitions + comments + feedback)
 *      + permission gating (non-admin sees only own events)
 *   7. Routes contract + CSV export + 403 on missing export permission
 */

'use strict';

const express = require('express');
const request = require('supertest');

const govRegistry = require('../intelligence/governance.registry');
const { createGovernanceService } = require('../intelligence/governance.service');
const { createGovernanceRouter } = require('../routes/governance.routes');

// ─── 1. Registry shape ─────────────────────────────────────────

describe('governance.registry — shape', () => {
  test('lists ≥ 30 permission codes', () => {
    expect(govRegistry.listPermissionCodes().length).toBeGreaterThanOrEqual(30);
  });

  test('every permission code is dot-separated', () => {
    for (const c of govRegistry.listPermissionCodes()) {
      expect(c).toMatch(/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/);
    }
  });

  test('every permission has either an array of roles or "all"/"all-authenticated"', () => {
    for (const c of govRegistry.listPermissionCodes()) {
      const v = govRegistry.PERMISSIONS[c];
      expect(['all', 'all-authenticated'].includes(v) || Array.isArray(v)).toBe(true);
    }
  });

  test('every compliance banner has required fields', () => {
    for (const k of govRegistry.listBannerKinds()) {
      const b = govRegistry.getBannerFor(k);
      expect(typeof b.bannerAr).toBe('string');
      expect(typeof b.bannerEn).toBe('string');
      expect(['must-display', 'should-display']).toContain(b.severity);
      expect(typeof b.requiresAuditLog).toBe('boolean');
    }
  });

  test('SENSITIVE_FIELD_KINDS exposes the canonical vocabulary', () => {
    expect(govRegistry.SENSITIVE_FIELD_KINDS).toEqual(
      expect.arrayContaining([
        'clinical_phi',
        'financial',
        'hr_compensation',
        'pii_identifiers',
        'business_secret',
      ])
    );
  });
});

// ─── 2. Permission resolution ──────────────────────────────────

describe('governance.service — permission resolution', () => {
  const svc = createGovernanceService();

  test('finance role can approve invoices', () => {
    expect(svc.hasPermission('finance', 'finance.invoices.approve')).toBe(true);
  });

  test('therapist cannot approve invoices', () => {
    expect(svc.hasPermission('therapist', 'finance.invoices.approve')).toBe(false);
  });

  test('"all" permission is held by everyone (including unauth)', () => {
    expect(svc.hasPermission(null, 'ops.alerts.view')).toBe(true);
  });

  test('"all-authenticated" requires a role', () => {
    expect(svc.hasPermission(null, 'ops.alerts.acknowledge')).toBe(false);
    expect(svc.hasPermission('therapist', 'ops.alerts.acknowledge')).toBe(true);
  });

  test('clinical_supervisor can sign assessments; therapist cannot', () => {
    expect(svc.hasPermission('supervisor', 'clinical.assessments.sign')).toBe(true);
    expect(svc.hasPermission('therapist', 'clinical.assessments.sign')).toBe(false);
    expect(svc.hasPermission('therapist', 'clinical.assessments.create')).toBe(true);
  });

  test('dpo can read governance audit trail', () => {
    expect(svc.hasPermission('dpo', 'governance.audit-trail.read')).toBe(true);
  });

  test('hasPermissions requires ALL listed codes', () => {
    expect(
      svc.hasPermissions('finance', ['finance.invoices.view', 'finance.invoices.approve'])
    ).toBe(true);
    expect(
      svc.hasPermissions('finance', ['finance.invoices.view', 'clinical.assessments.sign'])
    ).toBe(false);
  });

  test('unknown role yields no permissions', () => {
    expect(svc.hasPermission('not_a_real_role', 'finance.invoices.view')).toBe(false);
  });

  test('getUserPermissions returns the full set for finance', () => {
    const perms = svc.getUserPermissions('finance');
    expect(perms).toContain('finance.invoices.approve');
    expect(perms).toContain('finance.zatca.submit');
    expect(perms).not.toContain('clinical.assessments.sign');
    // "all" + "all-authenticated" permissions are also included
    expect(perms).toContain('ops.alerts.view');
    expect(perms).toContain('ops.alerts.acknowledge');
  });

  test('getUserPermissions for null role only includes "all"', () => {
    const perms = svc.getUserPermissions(null);
    expect(perms).toContain('ops.alerts.view');
    expect(perms).not.toContain('ops.alerts.acknowledge'); // requires auth
    expect(perms).not.toContain('finance.invoices.approve');
  });
});

// ─── 3. Widget filtering ───────────────────────────────────────

describe('governance.service — filterWidgetsByPermissions', () => {
  const svc = createGovernanceService();

  test('elements without requiredPermissions pass through', () => {
    const out = svc.filterWidgetsByPermissions(
      [{ id: 'a' }, { id: 'b', requiredPermissions: [] }],
      'therapist'
    );
    expect(out).toHaveLength(2);
  });

  test('strips elements whose required permissions are not held', () => {
    const out = svc.filterWidgetsByPermissions(
      [
        { id: 'open-view', requiredPermissions: ['ops.alerts.view'] },
        { id: 'finance-only', requiredPermissions: ['finance.invoices.approve'] },
        { id: 'clinical-only', requiredPermissions: ['clinical.assessments.sign'] },
      ],
      'therapist'
    );
    const ids = out.map(e => e.id);
    expect(ids).toContain('open-view');
    expect(ids).not.toContain('finance-only');
    expect(ids).not.toContain('clinical-only');
  });

  test('requires ALL listed permissions', () => {
    const out = svc.filterWidgetsByPermissions(
      [{ id: 'multi', requiredPermissions: ['finance.invoices.view', 'finance.zatca.submit'] }],
      'finance'
    );
    expect(out).toHaveLength(1);

    const out2 = svc.filterWidgetsByPermissions(
      [
        {
          id: 'multi',
          requiredPermissions: ['finance.invoices.view', 'clinical.assessments.sign'],
        },
      ],
      'finance'
    );
    expect(out2).toHaveLength(0);
  });

  test('non-array input returns []', () => {
    expect(svc.filterWidgetsByPermissions(null, 'finance')).toEqual([]);
  });
});

// ─── 4. Masking + LLM redaction ───────────────────────────────

describe('governance.service — masking', () => {
  const svc = createGovernanceService();

  const fieldKindMap = {
    diagnosis: 'clinical_phi',
    treatmentNotes: 'clinical_phi',
    invoiceTotal: 'financial',
    salaryBand: 'hr_compensation',
    nationalId: 'pii_identifiers',
  };

  const payload = {
    name: 'Ahmed',
    diagnosis: 'autism',
    treatmentNotes: 'progress',
    invoiceTotal: 5000,
    salaryBand: 'B3',
    nationalId: '1234567890',
  };

  test('maskForCompliance: finance strips clinical_phi', () => {
    const out = svc.maskForCompliance(payload, 'finance', fieldKindMap);
    expect(out.diagnosis).toBeUndefined();
    expect(out.treatmentNotes).toBeUndefined();
    expect(out.invoiceTotal).toBe(5000);
  });

  test('maskForCompliance: therapist strips financial + hr_compensation', () => {
    const out = svc.maskForCompliance(payload, 'therapist', fieldKindMap);
    expect(out.invoiceTotal).toBeUndefined();
    expect(out.salaryBand).toBeUndefined();
    expect(out.diagnosis).toBe('autism');
  });

  test('redactForLLM strips ALL sensitive kinds regardless of role', () => {
    const out = svc.redactForLLM(payload, fieldKindMap);
    expect(out.name).toBe('Ahmed');
    expect(out.diagnosis).toBeUndefined();
    expect(out.treatmentNotes).toBeUndefined();
    expect(out.invoiceTotal).toBeUndefined();
    expect(out.salaryBand).toBeUndefined();
    expect(out.nationalId).toBeUndefined();
  });

  test('redactForLLM handles arrays + nested', () => {
    const nested = {
      list: [
        { diagnosis: 'a', name: 'A' },
        { diagnosis: 'b', name: 'B' },
      ],
    };
    const out = svc.redactForLLM(nested, { diagnosis: 'clinical_phi' });
    expect(out.list[0].name).toBe('A');
    expect(out.list[0].diagnosis).toBeUndefined();
  });
});

// ─── 5. Banners + recordAccess ────────────────────────────────

describe('governance.service — banners + recordAccess', () => {
  const svc = createGovernanceService();

  test('getBannersForDataKinds returns config for declared kinds', () => {
    const banners = svc.getBannersForDataKinds(['clinical_phi', 'financial']);
    expect(banners).toHaveLength(2);
    expect(banners[0].bannerAr).toMatch(/PDPL/);
  });

  test('getBannersForDataKinds ignores unknown kinds', () => {
    const banners = svc.getBannersForDataKinds(['clinical_phi', 'not_a_real_kind']);
    expect(banners).toHaveLength(1);
  });

  test('shouldRecordAccess returns the audit-action codes', () => {
    const actions = svc.shouldRecordAccess({
      dataKinds: ['clinical_phi', 'financial', 'pii_identifiers'],
    });
    // pii_identifiers has requiresAuditLog=false, so should NOT be included
    expect(actions).toContain('pii.access');
    expect(actions).toContain('finance.access');
    expect(actions).not.toContain(null);
  });

  test('recordAccess emits one audit entry per kind that requires log', async () => {
    const logs = [];
    const r = await svc.recordAccess({
      dataKinds: ['clinical_phi', 'financial'],
      viewer: { userId: 'u-1', role: 'finance' },
      entityType: 'Beneficiary',
      entityId: 'b-1',
      auditLogger: { log: async e => logs.push(e) },
    });
    expect(r.logged).toBe(2);
    expect(logs.map(l => l.action)).toEqual(
      expect.arrayContaining(['pii.access', 'finance.access'])
    );
  });

  test('recordAccess no-op when no auditLogger provided', async () => {
    const r = await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer: { userId: 'u' },
    });
    expect(r.logged).toBe(0);
  });
});

// ─── 6. Audit trail merge + scope ─────────────────────────────

describe('governance.service — getAuditTrail', () => {
  const svc = createGovernanceService();

  function fakeAuditModel(rows) {
    // mongoose-like chain stub: find().sort().limit().lean()
    return {
      find: () => ({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve(rows),
          }),
        }),
      }),
    };
  }

  test('returns ENTITY_REQUIRED when entityType missing', async () => {
    const r = await svc.getAuditTrail({});
    expect(r.ok).toBe(false);
  });

  test('merges AuditLog + entity state.transitions + comments + feedback', async () => {
    const auditRows = [
      {
        timestamp: new Date('2026-05-17T12:00:00Z'),
        userId: 'u-1',
        action: 'alert.acknowledge',
        ipAddress: '10.0.0.5',
      },
    ];
    const entityDoc = {
      state: {
        transitions: [
          {
            at: new Date('2026-05-17T11:00:00Z'),
            byUserId: 'u-2',
            byRole: 'branch_manager',
            from: 'OPEN',
            to: 'ACKNOWLEDGED',
            reason: 'investigating',
          },
        ],
      },
      comments: [
        { at: new Date('2026-05-17T13:00:00Z'), byUserId: 'u-1', text: 'follow-up tomorrow' },
      ],
      feedback: {
        dismissReasons: [
          { at: new Date('2026-05-17T14:00:00Z'), userId: 'u-3', reasonCode: 'noise' },
        ],
      },
    };
    const r = await svc.getAuditTrail({
      entityType: 'Alert',
      entityId: 'a-1',
      viewer: { userId: 'u-99', role: 'dpo' },
      auditModel: fakeAuditModel(auditRows),
      entityDoc,
    });
    expect(r.ok).toBe(true);
    expect(r.events.length).toBe(4);
    expect(r.events[0].at >= r.events[1].at).toBe(true); // DESC
    expect(r.scoped).toBe(false); // dpo has audit-trail.read
  });

  test('non-admin viewer sees only their own events', async () => {
    const auditRows = [
      { timestamp: new Date('2026-05-17T12:00:00Z'), userId: 'u-1', action: 'mine' },
    ];
    const entityDoc = {
      comments: [
        { at: new Date('2026-05-17T13:00:00Z'), byUserId: 'u-1', text: 'mine' },
        { at: new Date('2026-05-17T14:00:00Z'), byUserId: 'someone-else', text: 'theirs' },
      ],
    };
    const r = await svc.getAuditTrail({
      entityType: 'Alert',
      entityId: 'a-1',
      viewer: { userId: 'u-1', role: 'therapist' }, // no audit-trail.read
      auditModel: fakeAuditModel(auditRows),
      entityDoc,
    });
    expect(r.scoped).toBe(true);
    expect(r.events.every(e => String(e.actorUserId) === 'u-1')).toBe(true);
  });
});

// ─── 7. Routes ────────────────────────────────────────────────

function buildApp({ user = { id: 'u1', role: 'manager' }, auditRows = [] } = {}) {
  const svc = createGovernanceService();
  const fakeAudit = {
    find: () => ({
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve(auditRows),
        }),
      }),
    }),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/v1/governance', createGovernanceRouter({ governance: svc, auditModel: fakeAudit }));
  return app;
}

describe('governance.routes', () => {
  test('GET /permissions/me returns codes for current role', async () => {
    const app = buildApp({ user: { id: 'u1', role: 'finance' } });
    const res = await request(app).get('/api/v1/governance/permissions/me');
    expect(res.status).toBe(200);
    expect(res.body.data.permissions).toContain('finance.invoices.approve');
  });

  test('GET /permissions/check returns pass/fail per code', async () => {
    const app = buildApp({ user: { id: 'u1', role: 'finance' } });
    const res = await request(app)
      .get('/api/v1/governance/permissions/check')
      .query({ codes: 'finance.invoices.approve,clinical.assessments.sign' });
    expect(res.status).toBe(200);
    expect(res.body.data.results['finance.invoices.approve']).toBe(true);
    expect(res.body.data.results['clinical.assessments.sign']).toBe(false);
    expect(res.body.data.allHeld).toBe(false);
  });

  test('GET /permissions/check 400 on empty codes', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/governance/permissions/check');
    expect(res.status).toBe(400);
  });

  test('GET /permissions/holders/:code returns holder list', async () => {
    const app = buildApp();
    const res = await request(app).get(
      '/api/v1/governance/permissions/holders/finance.invoices.approve'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.holders).toContain('finance');
  });

  test('GET /permissions/holders/:code 404 on unknown', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/governance/permissions/holders/not.a.code');
    expect(res.status).toBe(404);
  });

  test('GET /banners returns banner configs', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/v1/governance/banners')
      .query({ dataKinds: 'clinical_phi,financial' });
    expect(res.status).toBe(200);
    expect(res.body.data.banners.length).toBe(2);
  });

  test('GET /audit-trail merges events; non-admin scoped', async () => {
    const auditRows = [
      { timestamp: new Date('2026-05-17T12:00:00Z'), userId: 'u1', action: 'something' },
    ];
    const app = buildApp({ user: { id: 'u1', role: 'therapist' }, auditRows });
    const res = await request(app).get('/api/v1/governance/audit-trail/Alert/a-1');
    expect(res.status).toBe(200);
    expect(res.body.data.scoped).toBe(true);
  });

  test('GET /audit-trail/.../export 403 without export permission', async () => {
    const app = buildApp({ user: { id: 'u1', role: 'therapist' } });
    const res = await request(app).get('/api/v1/governance/audit-trail/Alert/a-1/export');
    expect(res.status).toBe(403);
  });

  test('GET /audit-trail/.../export?format=csv returns CSV for dpo', async () => {
    const auditRows = [
      {
        timestamp: new Date('2026-05-17T12:00:00Z'),
        userId: 'u1',
        action: 'alert.acknowledge',
      },
    ];
    const app = buildApp({ user: { id: 'u1', role: 'dpo' }, auditRows });
    const res = await request(app)
      .get('/api/v1/governance/audit-trail/Alert/a-1/export')
      .query({ format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
    expect(res.text).toContain('at,kind');
    expect(res.text).toContain('alert.acknowledge');
  });

  test('GET /audit-trail/.../export 400 on bad format', async () => {
    const app = buildApp({ user: { id: 'u1', role: 'dpo' } });
    const res = await request(app)
      .get('/api/v1/governance/audit-trail/Alert/a-1/export')
      .query({ format: 'pdf' });
    expect(res.status).toBe(400);
  });

  test('factory throws without service', () => {
    expect(() => createGovernanceRouter({})).toThrow(/governance service is required/);
  });
});
