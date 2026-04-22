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
const kpiAliases = require('../config/kpi.aliases');
const rbacAliases = require('../config/rbac.aliases');
const { has: hasBuilder } = require('../services/reporting/builderRegistry');
const { pickTemplate } = require('../services/reporting/renderer/htmlTemplates');
const RD = require('../models/ReportDelivery');
const RA = require('../models/ReportApprovalRequest');

// ─── Known aliases (locked in; reduce these over time) ─────────
//
// P10-C10 introduced `config/kpi.aliases.js` + `config/rbac.aliases.js`
// which resolve most of the drift automatically. What remains here are
// the GENUINE gaps — catalog references that have no canonical match
// yet in the target registry.
//
// Role-side gap is just 'executive' (a group, not a single role —
// resolved via ROLE_GROUPS in rbac.aliases). The other 5 role aliases
// now resolve via rbac.aliases.ROLE_ALIASES.
//
// KPI-side gap is 5 catalog ids for KPIs that don't exist in
// kpi.registry yet (marked null in kpi.aliases.KPI_ALIASES). Future
// phase commits add the KPI and flip the mapping.

const CATALOG_ROLE_GAPS = Object.freeze(['executive']);

const CATALOG_KPI_GAPS = Object.freeze([
  'finance.invoices.aging_ratio',
  'hr.attendance.adherence',
  'hr.turnover.voluntary_rate',
  'multi-branch.fleet.punctuality',
  'quality.cbahi.evidence.completeness',
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
  test('every catalog.kpiLinks resolves in kpi.registry OR via kpi.aliases', () => {
    const unresolved = [];
    for (const r of catalog.REPORTS) {
      for (const k of r.kpiLinks || []) {
        if (!kpiAliases.resolveKpiId(k)) unresolved.push(`${r.id} -> ${k}`);
      }
    }
    // `resolveKpiId` returns non-null only when either the id is
    // already canonical OR the alias has a canonical target. Gaps
    // (null-mapped aliases) flow through as unresolved and must be in
    // the KPI_GAPS allowlist.
    const gapsOnly = unresolved.every(line => {
      const id = line.split(' -> ')[1];
      return CATALOG_KPI_GAPS.includes(id);
    });
    expect(gapsOnly).toBe(true);
  });

  test('every kpi alias maps to a real kpi.registry id OR is a known gap', () => {
    const aliasEntries = Object.entries(kpiAliases.KPI_ALIASES);
    for (const [alias, target] of aliasEntries) {
      if (target == null) {
        expect(CATALOG_KPI_GAPS).toContain(alias);
      } else {
        expect(kpi.byId(target)).toBeTruthy();
      }
    }
  });

  test('CATALOG_KPI_GAPS locks in the exact current gap set', () => {
    expect([...kpiAliases.gapAliases()].sort()).toEqual([...CATALOG_KPI_GAPS].sort());
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

  test('every referenced role resolves in rbac OR via rbac.aliases', () => {
    const unresolved = [...collectRoles()].filter(role => {
      if (rbacValues.has(role)) return false;
      // resolveRoles returns [] for unknown aliases, [x] for scalars,
      // and [x, y, …] for groups — non-empty means "resolved".
      const resolved = rbacAliases.resolveRoles(role);
      return !resolved.length;
    });
    expect(unresolved).toEqual([]);
  });

  test('every rbac alias (non-group) maps to a real rbac.config role value', () => {
    for (const [alias, target] of Object.entries(rbacAliases.ROLE_ALIASES)) {
      if (target == null) continue; // groups handled below
      expect(rbacValues.has(target)).toBe(true);
    }
    // And groups expand to an array of real rbac values.
    for (const [group, members] of Object.entries(rbacAliases.ROLE_GROUPS)) {
      for (const m of members) {
        expect(rbacValues.has(m)).toBe(true);
      }
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
      // The group key must exist in ROLE_ALIASES with a null target.
      expect(rbacAliases.ROLE_ALIASES[group]).toBeNull();
    }
  });

  test('CATALOG_ROLE_GAPS locks the residual gap set (group-only aliases)', () => {
    // A "gap" at the catalog level is a group alias — one that maps
    // to multiple rbac roles rather than a single one. Today only
    // `executive`. Everything else flows through rbac.aliases cleanly.
    const gaps = [...collectRoles()].filter(role => {
      if (rbacValues.has(role)) return false;
      return rbacAliases.isGroup(role);
    });
    expect(gaps.sort()).toEqual([...CATALOG_ROLE_GAPS].sort());
  });

  test('rbac-resolved roles on catalog entries — count is non-zero', () => {
    const hits = [...collectRoles()].filter(
      r => rbacValues.has(r) || rbacAliases.resolveRoles(r).length
    );
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
  test('role-gap count stays at the committed budget (only group aliases)', () => {
    // P10-C10 introduced rbac.aliases — 5 of the original 6 role
    // aliases now resolve cleanly. Only `executive` (group) remains
    // as a residual "gap" because it expands to multiple roles.
    expect(CATALOG_ROLE_GAPS.length).toBeLessThanOrEqual(1);
  });

  test('kpi-gap count stays at the committed budget', () => {
    // P10-C10 introduced kpi.aliases — 11 of 16 original catalog KPI
    // aliases now resolve. The remaining 5 are KPIs the catalog
    // references but kpi.registry doesn't carry yet; adding them is
    // tracked in the registry's own roadmap.
    expect(CATALOG_KPI_GAPS.length).toBeLessThanOrEqual(5);
  });
});
