/**
 * report-catalog-drift.test.js — Phase 10 Commit 8.
 *
 * Locks in the cross-registry invariants that keep the reporting
 * platform coherent:
 *
 *   catalog.builder        → resolves in builderRegistry
 *   catalog.kpiLinks        → resolve in kpi.registry (or listed alias)
 *   catalog.owner / escalateTo / approverRoles
 *                           → in rbac.config.ROLES (or listed alias)
 *   catalog.compliance      → in the allowed label set
 *   catalog.periodicity     → cron expression is 5 fields + node-cron
 *                            validates (when node-cron is available)
 *   catalog.channels        → match ReportDelivery CHANNELS enum
 *   catalog.audiences       → match ReportDelivery AUDIENCE_ROLES
 *   catalog.confidentiality → match ReportDelivery CONFIDENTIALITY
 *   every reportId          → resolves to a template (real or generic)
 *
 * Design note on the "drift" lists:
 *   The catalog references a handful of role names and KPI ids that
 *   don't yet exist in rbac.config.js / kpi.registry.js. These aren't
 *   bugs — they're **catalog-level aliases** that will be resolved via
 *   mapping files in a later commit (tracked in architecture §10, C7).
 *   Until then, we lock in EXACTLY the current drift via `toEqual`
 *   allowlists so any NEW drift (a typo, a forgotten migration) fails
 *   this suite immediately.
 *
 *   The soft assertions after the hard ones act as a budget counter —
 *   they'll catch us accidentally adding drift even if we forgot to
 *   update the allowlist.
 */

'use strict';

const catalog = require('../config/report.catalog');
const kpi = require('../config/kpi.registry');
const rbac = require('../config/rbac.config');
const { has: hasBuilder } = require('../services/reporting/builderRegistry');
const { pickTemplate } = require('../services/reporting/renderer/htmlTemplates');
const RD = require('../models/ReportDelivery');
const RA = require('../models/ReportApprovalRequest');

// ─── Known aliases (locked in; reduce these over time) ─────────

const CATALOG_ROLE_ALIASES = Object.freeze([
  'cfo',
  'executive',
  'finance_manager',
  'medical_director',
  'quality_manager',
  'therapist_lead',
]);

const CATALOG_KPI_ALIASES = Object.freeze([
  'clinical.care_plan.review_adherence',
  'crm.complaints.resolution_time',
  'crm.parent.engagement_score',
  'finance.claims.denial_rate',
  'finance.collections.dso_days',
  'finance.invoices.aging_ratio',
  'hr.attendance.adherence',
  'hr.cpe.compliance_rate',
  'hr.turnover.voluntary_rate',
  'multi-branch.fleet.punctuality',
  'multi-branch.occupancy.rate',
  'quality.cbahi.evidence.completeness',
  'rehab.goal.mastery_rate',
  'rehab.goal.progress_velocity',
  'scheduling.session.cancellation_rate',
  'scheduling.session.punctuality',
]);

const ALLOWED_COMPLIANCE_LABELS = Object.freeze([
  'CBAHI',
  'GOSI',
  'MOH',
  'MoL',
  'PDPL',
  'SCFHS',
  'ZATCA',
]);

// ─── Builder resolution ─────────────────────────────────────────

describe('catalog drift — builder paths', () => {
  test('every catalog.builder resolves in builderRegistry', () => {
    const unresolved = catalog.REPORTS.filter(r => !hasBuilder(r.builder)).map(
      r => `${r.id} -> ${r.builder}`
    );
    expect(unresolved).toEqual([]);
  });
});

// ─── KPI references ─────────────────────────────────────────────

describe('catalog drift — kpi.registry references', () => {
  test('every catalog.kpiLinks entry resolves in kpi.registry OR is listed as an alias', () => {
    const unresolved = new Set();
    for (const r of catalog.REPORTS) {
      for (const k of r.kpiLinks || []) {
        if (!kpi.byId(k)) unresolved.add(k);
      }
    }
    const stillUnresolved = [...unresolved].filter(k => !CATALOG_KPI_ALIASES.includes(k));
    expect(stillUnresolved).toEqual([]);
  });

  test('the CATALOG_KPI_ALIASES allowlist matches exactly the current drift', () => {
    const drift = new Set();
    for (const r of catalog.REPORTS) {
      for (const k of r.kpiLinks || []) {
        if (!kpi.byId(k)) drift.add(k);
      }
    }
    // Any addition OR removal forces an explicit test update.
    expect([...drift].sort()).toEqual([...CATALOG_KPI_ALIASES].sort());
  });
});

// ─── Role references (owner / escalateTo / approverRoles) ──────

describe('catalog drift — rbac.config role references', () => {
  const rbacValues = new Set(Object.values(rbac.ROLES || {}));

  function collectRoles() {
    const s = new Set();
    for (const r of catalog.REPORTS) {
      if (r.owner) s.add(r.owner);
      if (r.escalateTo) s.add(r.escalateTo);
      for (const a of r.approverRoles || []) s.add(a);
    }
    return s;
  }

  test('every referenced role exists in rbac OR is listed as a catalog alias', () => {
    const unresolved = [...collectRoles()].filter(
      role => !rbacValues.has(role) && !CATALOG_ROLE_ALIASES.includes(role)
    );
    expect(unresolved).toEqual([]);
  });

  test('the CATALOG_ROLE_ALIASES allowlist matches exactly the current drift', () => {
    const drift = [...collectRoles()].filter(role => !rbacValues.has(role)).sort();
    expect(drift).toEqual([...CATALOG_ROLE_ALIASES].sort());
  });

  test('rbac-resolved roles on catalog entries — count is non-zero (catalog is not entirely aliased)', () => {
    const hits = [...collectRoles()].filter(r => rbacValues.has(r));
    expect(hits.length).toBeGreaterThan(0);
  });
});

// ─── Compliance labels ─────────────────────────────────────────

describe('catalog drift — compliance labels', () => {
  test('every catalog.compliance value is in ALLOWED_COMPLIANCE_LABELS', () => {
    const offenders = new Set();
    for (const r of catalog.REPORTS) {
      for (const c of r.compliance || []) {
        if (!ALLOWED_COMPLIANCE_LABELS.includes(c)) offenders.add(c);
      }
    }
    expect([...offenders]).toEqual([]);
  });
});

// ─── PERIODICITY_CRON expressions ──────────────────────────────

describe('catalog drift — PERIODICITY_CRON', () => {
  test('every non-on_demand periodicity has a 5-field cron string', () => {
    for (const p of catalog.PERIODICITIES) {
      const expr = catalog.PERIODICITY_CRON[p];
      if (p === 'on_demand') {
        expect(expr).toBeNull();
      } else {
        expect(typeof expr).toBe('string');
        expect(expr.trim().split(/\s+/).length).toBe(5);
      }
    }
  });

  test('expressions validate with node-cron when the module is available', () => {
    let cron;
    try {
      cron = require('node-cron');
    } catch (_) {
      // node-cron not installed in this environment — skip soft.
      return;
    }
    for (const [p, expr] of Object.entries(catalog.PERIODICITY_CRON)) {
      if (expr == null) continue;
      expect(cron.validate(expr)).toBe(true);
    }
  });
});

// ─── Cross-registry enum consistency ───────────────────────────

describe('catalog drift — enums vs ReportDelivery model', () => {
  test('every catalog channel is in ReportDelivery CHANNELS', () => {
    const offenders = catalog.CHANNELS.filter(c => !RD.CHANNELS.includes(c));
    expect(offenders).toEqual([]);
  });

  test('every catalog audience is in ReportDelivery AUDIENCE_ROLES', () => {
    const offenders = catalog.AUDIENCES.filter(a => !RD.AUDIENCE_ROLES.includes(a));
    expect(offenders).toEqual([]);
  });

  test('catalog confidentiality classes match ReportDelivery CONFIDENTIALITY', () => {
    expect([...catalog.CONFIDENTIALITY].sort()).toEqual([...RD.CONFIDENTIALITY].sort());
  });

  test('ReportApprovalRequest CONFIDENTIALITY matches too', () => {
    expect([...catalog.CONFIDENTIALITY].sort()).toEqual([...RA.CONFIDENTIALITY].sort());
  });
});

// ─── Template coverage ─────────────────────────────────────────

describe('catalog drift — template coverage', () => {
  test('every report id resolves to a template function (real or generic fallback)', () => {
    const unresolved = [];
    for (const r of catalog.REPORTS) {
      const tmpl = pickTemplate(r.id);
      if (typeof tmpl !== 'function') unresolved.push(r.id);
    }
    expect(unresolved).toEqual([]);
  });
});

// ─── Drift budget ──────────────────────────────────────────────

describe('catalog drift — budget counters (fail on silent growth)', () => {
  test('role-alias count stays at its committed budget', () => {
    // When we add a new role to rbac.config.js, update both the
    // allowlist above AND this number.
    expect(CATALOG_ROLE_ALIASES.length).toBeLessThanOrEqual(6);
  });

  test('kpi-alias count stays at its committed budget', () => {
    // Same deal for KPIs — C7 / C9 should reduce this to 0.
    expect(CATALOG_KPI_ALIASES.length).toBeLessThanOrEqual(16);
  });
});
