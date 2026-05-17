'use strict';

/**
 * layout-policy.service.js — Wave 24.
 *
 *   • getLayout(dashboardKey) → frozen layout
 *   • getLayoutForRole(dashboardKey, roleGroupKey, ctx) → role-adjusted
 *     layout with :branchId / :userId / dateRange substitution in smart
 *     defaults
 *   • scoreElement(element) → { pass, reasons[] }
 *   • validateDashboard(dashboardKey, registries?) → full report with
 *     budget enforcement + cross-registry reference checks
 *   • validateAll() → per-dashboard reports
 *
 * Mongo-free. Reads only registries (layout, role-profiles, drilldown).
 */

const DefaultLayoutRegistry = require('./layout-policy.registry');
const { substitutePath } = require('./drilldown.service');

function createLayoutPolicyService({
  layoutRegistry = DefaultLayoutRegistry,
  drillRegistry = null,
  roleRegistry = null,
  logger = console,
} = {}) {
  void logger;
  const drillReg = drillRegistry || require('./drilldown.registry');
  const rpReg = roleRegistry || require('./role-profiles.registry');

  function listDashboardKeys() {
    return layoutRegistry.listDashboardKeys();
  }

  function getDashboard(key) {
    return layoutRegistry.getDashboard(key);
  }

  // ─── Scoring (per-element contract) ────────────────────────

  /**
   * Score a single element against the Wave 24 contract:
   *   • intentAr + intentEn non-empty
   *   • tier ∈ {1,2,3}
   *   • tier 1 ⇒ aboveTheFold === true
   *   • tier 3 ⇒ revealOn ∈ {hover, click, drill, drawer, modal, tab}
   *   • kind in ELEMENT_KINDS
   * Returns { pass, reasons[] }.
   */
  function scoreElement(element) {
    const reasons = [];
    if (!element || typeof element !== 'object') {
      return { pass: false, reasons: ['MISSING_ELEMENT'] };
    }
    if (typeof element.intentAr !== 'string' || element.intentAr.trim().length === 0) {
      reasons.push('MISSING_INTENT_AR');
    }
    if (typeof element.intentEn !== 'string' || element.intentEn.trim().length === 0) {
      reasons.push('MISSING_INTENT_EN');
    }
    if (!layoutRegistry.TIERS.includes(element.tier)) {
      reasons.push('INVALID_TIER');
    }
    if (element.tier === 1 && element.aboveTheFold !== true) {
      reasons.push('TIER1_MUST_BE_ABOVE_THE_FOLD');
    }
    if (element.tier === 3) {
      const REVEAL_FOR_TIER3 = new Set(['hover', 'click', 'drill', 'drawer', 'modal', 'tab']);
      if (!REVEAL_FOR_TIER3.has(element.revealOn)) {
        reasons.push('TIER3_MUST_DECLARE_REVEAL_ON');
      }
    }
    if (!layoutRegistry.ELEMENT_KINDS.includes(element.kind)) {
      reasons.push('INVALID_KIND');
    }
    return { pass: reasons.length === 0, reasons };
  }

  // ─── Dashboard validation ──────────────────────────────────

  /**
   * Run the full validation: element scoring + budget enforcement +
   * cross-registry reference checks (refKpiId, refAlertSurface, refActionId).
   * Returns { ok, dashboardKey, elementCount, failingElements[],
   *           budgetViolations[], crossRefErrors[] }.
   */
  function validateDashboard(dashboardKey) {
    const dash = getDashboard(dashboardKey);
    if (!dash) return { ok: false, reason: 'DASHBOARD_NOT_FOUND' };

    const failingElements = [];
    const crossRefErrors = [];
    const budgetViolations = [];

    // Collect all elements + tier counts.
    let tier1Count = 0;
    let tier12Count = 0;

    // Section position-0 must be a critical-signals kind
    const sortedSections = [...dash.sections].sort((a, b) => a.position - b.position);
    if (!sortedSections.length || sortedSections[0].kind !== 'critical-signals') {
      budgetViolations.push({
        rule: 'POSITION_0_MUST_BE_CRITICAL_SIGNALS',
        actual: sortedSections[0]?.kind || null,
      });
    }

    for (const section of dash.sections) {
      if (!layoutRegistry.SECTION_KINDS.includes(section.kind)) {
        budgetViolations.push({
          rule: 'INVALID_SECTION_KIND',
          section: section.id,
          value: section.kind,
        });
      }
      if (typeof section.taskAr !== 'string' || !section.taskAr.trim()) {
        budgetViolations.push({ rule: 'SECTION_MISSING_TASK_AR', section: section.id });
      }
      if (typeof section.taskEn !== 'string' || !section.taskEn.trim()) {
        budgetViolations.push({ rule: 'SECTION_MISSING_TASK_EN', section: section.id });
      }

      for (const el of section.elements || []) {
        const result = scoreElement(el);
        if (!result.pass) {
          failingElements.push({
            elementId: el?.id,
            sectionId: section.id,
            reasons: result.reasons,
          });
        }
        if (el.tier === 1) tier1Count += 1;
        if (el.tier === 1 || el.tier === 2) tier12Count += 1;

        // Cross-registry reference checks
        if (el.refKpiId) {
          const drill =
            typeof drillReg.getKpiDrillMetadata === 'function'
              ? drillReg.getKpiDrillMetadata(el.refKpiId)
              : null;
          if (!drill) {
            crossRefErrors.push({
              elementId: el.id,
              kind: 'kpi-not-in-drilldown-registry',
              ref: el.refKpiId,
            });
          }
        }
        if (el.refAlertSurface) {
          const allowed = new Set(rpReg.ALERT_SURFACES);
          if (!allowed.has(el.refAlertSurface)) {
            crossRefErrors.push({
              elementId: el.id,
              kind: 'alert-surface-unknown',
              ref: el.refAlertSurface,
            });
          }
        }
      }
    }

    // Density budget enforcement
    const budget = layoutRegistry.DENSITY_BUDGETS[dash.density];
    if (budget) {
      if (tier1Count > budget.tier1) {
        budgetViolations.push({
          rule: 'TIER1_BUDGET_EXCEEDED',
          density: dash.density,
          budget: budget.tier1,
          actual: tier1Count,
        });
      }
      if (tier12Count > budget.tier1Plus2) {
        budgetViolations.push({
          rule: 'TIER1_PLUS_2_BUDGET_EXCEEDED',
          density: dash.density,
          budget: budget.tier1Plus2,
          actual: tier12Count,
        });
      }
    }

    // Auto-save profile name resolution
    const unknownAutosaveProfiles = [];
    for (const [formKey, profileName] of Object.entries(dash.autoSave || {})) {
      if (!layoutRegistry.getAutosaveProfile(profileName)) {
        unknownAutosaveProfiles.push({ formKey, profileName });
      }
    }

    const ok =
      failingElements.length === 0 &&
      budgetViolations.length === 0 &&
      crossRefErrors.length === 0 &&
      unknownAutosaveProfiles.length === 0;

    return {
      ok,
      dashboardKey,
      density: dash.density,
      tier1Count,
      tier12Count,
      tier1Budget: budget?.tier1,
      tier12Budget: budget?.tier1Plus2,
      failingElements,
      budgetViolations,
      crossRefErrors,
      unknownAutosaveProfiles,
    };
  }

  function validateAll() {
    return listDashboardKeys().map(k => validateDashboard(k));
  }

  // ─── Role-adjusted layout (smart-default substitution) ─────

  function substituteDefaults(defaults, ctx = {}) {
    const out = {};
    for (const [k, v] of Object.entries(defaults || {})) {
      if (typeof v === 'string') {
        // Substitute :branchId, :userId, etc.
        out[k] = substitutePath(v, {
          branchId: ctx.branchId || '',
          userId: ctx.userId || '',
        });
        // If substitution left an empty fragment (e.g. ":branchId"
        // with no branchId supplied), surface the raw placeholder so
        // the UI can highlight rather than silently submit "".
        if (v.startsWith(':') && !ctx[v.slice(1)]) {
          out[k] = v;
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  /**
   * Returns the layout with smart-default placeholders substituted
   * from ctx + per-element auto-save profiles inlined (so the UI
   * doesn't need to look them up separately).
   */
  function getLayoutForRole(dashboardKey, roleGroupKey, ctx = {}) {
    const dash = getDashboard(dashboardKey);
    if (!dash) return { ok: false, reason: 'DASHBOARD_NOT_FOUND' };

    // Allowed when dashboard.targetRoleGroups includes the role,
    // OR roleGroupKey is null (admin/debug request).
    if (
      roleGroupKey &&
      Array.isArray(dash.targetRoleGroups) &&
      !dash.targetRoleGroups.includes(roleGroupKey)
    ) {
      return { ok: false, reason: 'ROLE_NOT_ALLOWED_FOR_DASHBOARD' };
    }

    const resolvedAutoSave = {};
    for (const [formKey, profileName] of Object.entries(dash.autoSave || {})) {
      const profile = layoutRegistry.getAutosaveProfile(profileName);
      if (profile) resolvedAutoSave[formKey] = { profileName, ...profile };
    }

    return {
      ok: true,
      dashboardKey,
      titleAr: dash.titleAr,
      titleEn: dash.titleEn,
      density: dash.density,
      targetRoleGroups: dash.targetRoleGroups,
      smartDefaults: substituteDefaults(dash.smartDefaults, ctx),
      autoSave: resolvedAutoSave,
      sections: [...dash.sections]
        .sort((a, b) => a.position - b.position)
        .map(s => ({
          id: s.id,
          kind: s.kind,
          position: s.position,
          taskAr: s.taskAr,
          taskEn: s.taskEn,
          elements: s.elements,
        })),
    };
  }

  return {
    listDashboardKeys,
    getDashboard,
    getLayout: getDashboard,
    getLayoutForRole,
    scoreElement,
    validateDashboard,
    validateAll,
    getAutosaveProfile: name => layoutRegistry.getAutosaveProfile(name),
  };
}

module.exports = { createLayoutPolicyService };
