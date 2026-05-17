/**
 * role-profiles-wave23.test.js — Wave 23.
 *
 *   1. Registry shape: 9 groups + canonical-to-group mapping covers every
 *      canonical role we want to support.
 *   2. Service: resolveRoleGroup + getProfile + resolveDashboardForRole
 *      (KPI bundles decorated, defaultLanding substituted, quickActions
 *      substituted, restrictedData passed through)
 *   3. Service: maskForRole strips fields tagged with restricted kinds
 *      (clinical_phi, financial, hr_compensation, pii_identifiers)
 *   4. Drift guard: every KPI in any profile exists in drilldown.registry.js
 *   5. Drift guard: every alert surface in any profile is in the canonical
 *      8-surface set (+ reception)
 *   6. Routes: GET / | GET /me | GET /me/dashboard | GET /by-role/:role |
 *      GET /by-role/:role/dashboard | GET /:groupKey + 4xx contract
 */

'use strict';

const express = require('express');
const request = require('supertest');

const roleRegistry = require('../intelligence/role-profiles.registry');
const { createRoleProfilesService } = require('../intelligence/role-profiles.service');
const { createRoleProfilesRouter } = require('../routes/role-profiles.routes');
const drillRegistry = require('../intelligence/drilldown.registry');

// ─── 1. Registry shape ─────────────────────────────────────────

describe('role-profiles.registry — shape', () => {
  const allGroups = roleRegistry.listGroupKeys();

  test('exactly 9 role groups defined', () => {
    expect(allGroups).toHaveLength(9);
    expect(allGroups).toEqual(
      expect.arrayContaining([
        'executive_leadership',
        'head_office',
        'branch_manager',
        'clinical_supervisor',
        'therapist',
        'finance',
        'hr',
        'quality_compliance',
        'reception',
      ])
    );
  });

  test.each(allGroups)('%s — has all required fields', groupKey => {
    const p = roleRegistry.getProfile(groupKey);
    expect(p).toBeTruthy();
    expect(typeof p.titleAr).toBe('string');
    expect(typeof p.titleEn).toBe('string');
    expect(Array.isArray(p.primaryGoalsAr)).toBe(true);
    expect(p.primaryGoalsAr.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(p.primaryGoalsEn)).toBe(true);
    expect(p.primaryGoalsEn.length).toBe(p.primaryGoalsAr.length);
    expect(Array.isArray(p.decisionsSupportedAr)).toBe(true);
    expect(p.decisionsSupportedAr.length).toBeGreaterThanOrEqual(2);
    expect(typeof p.defaultLanding).toBe('string');
    expect(roleRegistry.DENSITIES).toContain(p.layoutDensity);
    expect(Array.isArray(p.kpiIds)).toBe(true);
    expect(Array.isArray(p.alertSurfaces)).toBe(true);
    expect(Array.isArray(p.quickActions)).toBe(true);
    expect(p.quickActions.length).toBeGreaterThan(0);
    expect(Array.isArray(p.restrictedData)).toBe(true);
    expect(roleRegistry.TERMINAL_LEVELS).toContain(p.terminalLevel);
  });

  test.each(allGroups)('%s — each quick action has id + titles + deepLink', groupKey => {
    for (const a of roleRegistry.getProfile(groupKey).quickActions) {
      expect(a.id).toBeTruthy();
      expect(a.titleAr).toBeTruthy();
      expect(a.titleEn).toBeTruthy();
      expect(typeof a.deepLink).toBe('string');
    }
  });

  test('every canonical role in CANONICAL_TO_GROUP maps to a real group', () => {
    for (const [canonicalRole, groupKey] of Object.entries(roleRegistry.CANONICAL_TO_GROUP)) {
      expect(roleRegistry.getProfile(groupKey)).toBeTruthy();
      // Sanity: canonical role name is snake_case (no uppercase)
      expect(canonicalRole).toBe(canonicalRole.toLowerCase());
    }
  });
});

// ─── 2. Service — resolve & dashboard ──────────────────────────

describe('role-profiles.service — resolveDashboardForRole', () => {
  const svc = createRoleProfilesService();

  test('resolves super_admin → executive_leadership', () => {
    const r = svc.resolveDashboardForRole('super_admin', {});
    expect(r.ok).toBe(true);
    expect(r.groupKey).toBe('executive_leadership');
    expect(r.layoutDensity).toBe('low');
    expect(r.terminalLevel).toBe('branch');
  });

  test('substitutes :branchId in defaultLanding and quickActions', () => {
    const r = svc.resolveDashboardForRole('manager', { branchId: 'B-99' });
    expect(r.ok).toBe(true);
    expect(r.defaultLanding).toBe('/dashboards/branch/B-99');
    const todaysWorklist = r.quickActions.find(a => a.id === 'todays-worklist');
    expect(todaysWorklist.deepLink).toBe('/me?branch=B-99');
  });

  test('leaves :branchId placeholder when not supplied', () => {
    const r = svc.resolveDashboardForRole('manager', {});
    expect(r.defaultLanding).toBe('/dashboards/branch/:branchId');
  });

  test('decorates KPI bundles with drill + DQ metadata', () => {
    const r = svc.resolveDashboardForRole('manager', { branchId: 'B-1' });
    expect(r.kpiBundles.length).toBeGreaterThan(0);
    const stalledGoals = r.kpiBundles.find(b => b.kpiId === 'kpi.goals.stalled_count');
    expect(stalledGoals).toBeTruthy();
    expect(stalledGoals.titleAr).toBeTruthy();
    expect(stalledGoals.hasDrillMetadata).toBe(true);
    expect(stalledGoals.hasDataQualityContract).toBe(true);
  });

  test('returns ROLE_NOT_MAPPED for unknown canonical role', () => {
    const r = svc.resolveDashboardForRole('not_a_real_role');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ROLE_NOT_MAPPED');
  });

  test('therapist maps to me alert surface (not branch)', () => {
    const r = svc.resolveDashboardForRole('therapist');
    expect(r.alertSurfaces).toEqual(['me']);
  });

  test('reception maps to reception + me alert surfaces', () => {
    const r = svc.resolveDashboardForRole('receptionist');
    expect(r.alertSurfaces).toEqual(expect.arrayContaining(['reception', 'me']));
  });

  test('quality_compliance has both quality and dpo surfaces', () => {
    const r = svc.resolveDashboardForRole('dpo');
    expect(r.alertSurfaces).toEqual(expect.arrayContaining(['quality', 'dpo']));
  });
});

// ─── 3. Service — masking ──────────────────────────────────────

describe('role-profiles.service — maskForRole', () => {
  const svc = createRoleProfilesService();

  const fullPayload = {
    beneficiaryId: 'b1',
    name: 'Ahmed',
    nationalId: '1234567890',
    phone: '+966500000000',
    diagnosis: 'autism spectrum',
    treatmentNotes: 'progress on social skills',
    invoiceTotal: 5000,
    payerName: 'CCHI',
    salaryBand: 'B3',
  };

  const fieldKindMap = {
    nationalId: 'pii_identifiers',
    phone: 'pii_identifiers',
    diagnosis: 'clinical_phi',
    treatmentNotes: 'clinical_phi',
    invoiceTotal: 'financial',
    payerName: 'financial',
    salaryBand: 'hr_compensation',
  };

  test('finance role: clinical_phi stripped; financial visible', () => {
    const out = svc.maskForRole(fullPayload, 'finance', fieldKindMap);
    expect(out.diagnosis).toBeUndefined();
    expect(out.treatmentNotes).toBeUndefined();
    expect(out.invoiceTotal).toBe(5000); // finance keeps this
    expect(out.payerName).toBe('CCHI');
    expect(out.salaryBand).toBe('B3'); // finance doesn't restrict hr_compensation
  });

  test('reception role: strips clinical_phi + financial + hr_compensation', () => {
    const out = svc.maskForRole(fullPayload, 'receptionist', fieldKindMap);
    expect(out.diagnosis).toBeUndefined();
    expect(out.treatmentNotes).toBeUndefined();
    expect(out.invoiceTotal).toBeUndefined();
    expect(out.salaryBand).toBeUndefined();
    expect(out.name).toBe('Ahmed'); // name isn't tagged as restricted
  });

  test('executive_leadership strips PII + individual_records', () => {
    const out = svc.maskForRole(fullPayload, 'super_admin', fieldKindMap);
    expect(out.nationalId).toBeUndefined();
    expect(out.phone).toBeUndefined();
  });

  test('therapist strips financial + hr_compensation', () => {
    const out = svc.maskForRole(fullPayload, 'therapist', fieldKindMap);
    expect(out.invoiceTotal).toBeUndefined();
    expect(out.salaryBand).toBeUndefined();
    expect(out.diagnosis).toBe('autism spectrum'); // therapist sees PHI
  });

  test('quality_compliance has no default restrictions (empty)', () => {
    const out = svc.maskForRole(fullPayload, 'dpo', fieldKindMap);
    expect(out).toEqual(fullPayload);
  });

  test('array payload is mapped element-by-element', () => {
    const arr = [fullPayload, { ...fullPayload, beneficiaryId: 'b2' }];
    const out = svc.maskForRole(arr, 'therapist', fieldKindMap);
    expect(out).toHaveLength(2);
    expect(out[0].invoiceTotal).toBeUndefined();
    expect(out[1].invoiceTotal).toBeUndefined();
  });

  test('returns input unchanged for unknown role', () => {
    expect(svc.maskForRole(fullPayload, 'not_a_role', fieldKindMap)).toEqual(fullPayload);
  });
});

// ─── 4. Drift guards ──────────────────────────────────────────

describe('role-profiles.registry — drift guards', () => {
  test('every kpiId in any profile exists in drilldown.registry', () => {
    const drillKpis = new Set(drillRegistry.listRegisteredKpis());
    const missing = [];
    for (const key of roleRegistry.listGroupKeys()) {
      const p = roleRegistry.getProfile(key);
      for (const kpiId of p.kpiIds || []) {
        if (!drillKpis.has(kpiId)) missing.push({ groupKey: key, kpiId });
      }
    }
    expect(missing).toEqual([]);
  });

  test('every alertSurface in any profile is in the allowed set', () => {
    const allowed = new Set(roleRegistry.ALERT_SURFACES);
    const violations = [];
    for (const key of roleRegistry.listGroupKeys()) {
      const p = roleRegistry.getProfile(key);
      for (const surface of p.alertSurfaces || []) {
        if (!allowed.has(surface)) violations.push({ groupKey: key, surface });
      }
    }
    expect(violations).toEqual([]);
  });

  test('every restrictedData entry is in RESTRICTED_DATA_KINDS', () => {
    const allowed = new Set(roleRegistry.RESTRICTED_DATA_KINDS);
    const violations = [];
    for (const key of roleRegistry.listGroupKeys()) {
      const p = roleRegistry.getProfile(key);
      for (const kind of p.restrictedData || []) {
        if (!allowed.has(kind)) violations.push({ groupKey: key, kind });
      }
    }
    expect(violations).toEqual([]);
  });

  test('every canonical role from roles.constants.js that is in CANONICAL_TO_GROUP resolves to a real group', () => {
    const rolesConstants = require('../config/constants/roles.constants');
    const all = rolesConstants.ALL_ROLES || Object.values(rolesConstants.ROLES || {});
    // We don't expect EVERY canonical role to be mapped (some are
    // system roles like 'student' / 'parent' / 'viewer' that don't
    // own a dashboard yet). Just check that whatever IS mapped
    // resolves cleanly.
    const mapped = Object.keys(roleRegistry.CANONICAL_TO_GROUP);
    for (const r of mapped) {
      expect(all).toContain(r);
    }
  });
});

// ─── 5. Routes ─────────────────────────────────────────────────

function buildApp({ user = { id: 'u1', role: 'manager', branchId: 'B-1' } } = {}) {
  const svc = createRoleProfilesService();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/v1/role-profiles', createRoleProfilesRouter({ roleProfiles: svc }));
  return app;
}

describe('role-profiles.routes', () => {
  test('GET / lists role groups', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/role-profiles');
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(9);
  });

  test('GET /me returns current user role profile', async () => {
    const app = buildApp({ user: { role: 'manager' } });
    const res = await request(app).get('/api/v1/role-profiles/me');
    expect(res.status).toBe(200);
    expect(res.body.data.groupKey).toBe('branch_manager');
  });

  test('GET /me 401-ish when no role on user (returns 400 with CANONICAL_ROLE_REQUIRED)', async () => {
    const app = buildApp({ user: { id: 'u1' } });
    const res = await request(app).get('/api/v1/role-profiles/me');
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('CANONICAL_ROLE_REQUIRED');
  });

  test('GET /me/dashboard returns resolved bundle with branch substituted', async () => {
    const app = buildApp({ user: { role: 'manager', branchId: 'B-99' } });
    const res = await request(app).get('/api/v1/role-profiles/me/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.defaultLanding).toBe('/dashboards/branch/B-99');
    expect(res.body.data.kpiBundles.length).toBeGreaterThan(0);
  });

  test('GET /me/dashboard?branchId= overrides user.branchId', async () => {
    const app = buildApp({ user: { role: 'manager', branchId: 'B-1' } });
    const res = await request(app).get('/api/v1/role-profiles/me/dashboard?branchId=B-OVERRIDE');
    expect(res.body.data.defaultLanding).toBe('/dashboards/branch/B-OVERRIDE');
  });

  test('GET /by-role/:canonicalRole returns group + profile', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/role-profiles/by-role/therapist');
    expect(res.status).toBe(200);
    expect(res.body.data.groupKey).toBe('therapist');
  });

  test('GET /by-role/:canonicalRole 404 on unknown role', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/role-profiles/by-role/not_a_role');
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('ROLE_NOT_MAPPED');
  });

  test('GET /by-role/:canonicalRole/dashboard returns the resolved bundle', async () => {
    const app = buildApp();
    const res = await request(app).get(
      '/api/v1/role-profiles/by-role/finance/dashboard?branchId=B-7'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.groupKey).toBe('finance');
    expect(res.body.data.layoutDensity).toBe('high');
  });

  test('GET /:groupKey returns the profile', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/role-profiles/quality_compliance');
    expect(res.status).toBe(200);
    expect(res.body.data.profile.alertSurfaces).toEqual(expect.arrayContaining(['quality', 'dpo']));
  });

  test('GET /:groupKey 404 on unknown group', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/role-profiles/not_a_group');
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('GROUP_NOT_FOUND');
  });

  test('factory throws when service missing', () => {
    expect(() => createRoleProfilesRouter({})).toThrow(/roleProfiles service is required/);
  });
});
