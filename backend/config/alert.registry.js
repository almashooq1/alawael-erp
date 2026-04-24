/**
 * alert.registry.js — dashboard alert policy catalogue.
 *
 * Phase 18 Commit 8.
 *
 * Companion to `kpi.registry.js` and `dashboard.registry.js`. Where
 * the KPI registry owns *what* a threshold is, and the dashboard
 * registry owns *which* KPIs each dashboard shows, this registry
 * owns *how to react* when a KPI classification flips to amber or
 * red.
 *
 * Every policy declares:
 *
 *   - `id` — stable slug for logging + dedup + admin UI.
 *   - `kpiId` — the kpi.registry.id this policy watches. `*` matches
 *     all KPIs on a given dashboard (used for dashboard-wide red
 *     breach escalation).
 *   - `severity` — 'info' | 'warning' | 'critical' | 'emergency'.
 *     Maps 1-to-1 onto the 4-level escalation ladder below.
 *   - `trigger.on` — which classification makes this policy eligible
 *     to fire. Typically 'red' for critical, 'amber' for warning.
 *   - `trigger.minConsecutiveTicks` — flapping guard. The alert
 *     only fires when the eligible classification has held for at
 *     least this many evaluation ticks.
 *   - `dedupWindowMs` — the coordinator swallows re-fires for the
 *     same correlation key within this window.
 *   - `quietHours` — `null` to always fire; `{ start, end }` 24h
 *     UTC offsets to suppress outside that window. Critical +
 *     emergency policies intentionally ignore quiet hours.
 *   - `escalationLadderId` — key into `ESCALATION_LADDERS` below.
 *
 * Pure data. No I/O. Invariants enforced in
 * `alert-registry.test.js`.
 */

'use strict';

const SEVERITIES = Object.freeze(['info', 'warning', 'critical', 'emergency']);

const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Escalation ladders describe how an unacknowledged alert climbs
 * through roles over time. Step `afterMs: 0` is the initial page.
 *
 * The coordinator walks the ladder on each tick — if the previous
 * step has been unacked for ≥ `afterMs`, the next step fires.
 */
const ESCALATION_LADDERS = Object.freeze({
  'info.digest': [{ afterMs: 0, roles: ['branch_manager'], channels: ['in-app'] }],
  'warning.standard': [
    { afterMs: 0, roles: ['branch_manager', 'quality_coordinator'], channels: ['in-app', 'email'] },
    { afterMs: 4 * ONE_HOUR, roles: ['regional_director'], channels: ['email'] },
  ],
  'critical.oncall': [
    {
      afterMs: 0,
      roles: ['branch_manager', 'manager', 'quality_coordinator'],
      channels: ['in-app', 'email', 'sms'],
    },
    {
      afterMs: 30 * 60 * 1000,
      roles: ['regional_director', 'clinical_director'],
      channels: ['sms', 'email'],
    },
    { afterMs: SIX_HOURS, roles: ['ceo', 'group_cfo', 'group_chro'], channels: ['email'] },
  ],
  'emergency.life-safety': [
    { afterMs: 0, roles: ['branch_manager', 'clinical_director'], channels: ['sms', 'email'] },
    { afterMs: 10 * 60 * 1000, roles: ['ceo', 'group_quality_officer'], channels: ['sms'] },
  ],
});

const POLICIES = Object.freeze([
  // ─── Executive — network-wide critical breaches ──────────────────
  {
    id: 'exec.dso.breach',
    kpiId: 'finance.ar.dso.days',
    severity: 'critical',
    trigger: { on: 'red', minConsecutiveTicks: 2 },
    dedupWindowMs: ONE_HOUR,
    quietHours: null,
    escalationLadderId: 'critical.oncall',
    headlineAr: 'خرق DSO — ذمم مدينة تتأخر',
    headlineEn: 'DSO breach — collections lagging',
  },
  {
    id: 'exec.nps.drift',
    kpiId: 'crm.nps.score',
    severity: 'warning',
    trigger: { on: 'amber', minConsecutiveTicks: 2 },
    dedupWindowMs: SIX_HOURS,
    quietHours: { start: 22, end: 6 },
    escalationLadderId: 'warning.standard',
    headlineAr: 'مؤشر NPS في مسار تدهور',
    headlineEn: 'NPS drifting toward breach',
  },

  // ─── Clinical — red-flags + goal attainment ──────────────────────
  {
    id: 'clinical.red_flags.surge',
    kpiId: 'clinical.red_flags.active.count',
    severity: 'critical',
    trigger: { on: 'red', minConsecutiveTicks: 1 },
    dedupWindowMs: FIVE_MIN,
    quietHours: null,
    escalationLadderId: 'critical.oncall',
    headlineAr: 'عنقود أعلام حمراء — راجع بانوراما 360',
    headlineEn: 'Red-flag cluster — review Beneficiary-360',
  },
  {
    id: 'clinical.goal.slip',
    kpiId: 'rehab.goals.achievement_rate.pct',
    severity: 'warning',
    trigger: { on: 'amber', minConsecutiveTicks: 3 },
    dedupWindowMs: SIX_HOURS,
    quietHours: { start: 22, end: 6 },
    escalationLadderId: 'warning.standard',
    headlineAr: 'تراجع في تحقيق الأهداف السريرية',
    headlineEn: 'Clinical goal attainment slipping',
  },

  // ─── Quality — incidents + CAPA ──────────────────────────────────
  {
    id: 'quality.incidents.critical.open',
    kpiId: 'quality.incidents.open_critical.count',
    severity: 'critical',
    trigger: { on: 'red', minConsecutiveTicks: 1 },
    dedupWindowMs: FIVE_MIN,
    quietHours: null,
    escalationLadderId: 'critical.oncall',
    headlineAr: 'حوادث حرجة مفتوحة',
    headlineEn: 'Open critical incidents',
  },
  {
    id: 'quality.capa.ontime.drop',
    kpiId: 'quality.capa.ontime_closure.pct',
    severity: 'warning',
    trigger: { on: 'amber', minConsecutiveTicks: 2 },
    dedupWindowMs: ONE_DAY,
    quietHours: { start: 22, end: 6 },
    escalationLadderId: 'warning.standard',
    headlineAr: 'انخفاض نسبة إغلاق CAPA في الموعد',
    headlineEn: 'CAPA on-time closure rate dropped',
  },

  // ─── Branch-ops — fleet + no-show ────────────────────────────────
  {
    id: 'ops.fleet.otp.drop',
    kpiId: 'multi-branch.fleet.completion.pct',
    severity: 'warning',
    trigger: { on: 'amber', minConsecutiveTicks: 2 },
    dedupWindowMs: ONE_HOUR,
    quietHours: { start: 22, end: 6 },
    escalationLadderId: 'warning.standard',
    headlineAr: 'انخفاض انضباط النقل — راجع المسارات',
    headlineEn: 'Fleet punctuality slipping — review routes',
  },
  {
    id: 'ops.noshow.spike',
    kpiId: 'scheduling.noshow.rate.pct',
    severity: 'warning',
    trigger: { on: 'red', minConsecutiveTicks: 1 },
    dedupWindowMs: ONE_HOUR,
    quietHours: { start: 22, end: 6 },
    escalationLadderId: 'warning.standard',
    headlineAr: 'ارتفاع في معدل الغياب عن الجلسات',
    headlineEn: 'Session no-show rate spike',
  },

  // ─── Integration health (emergency for life-safety systems) ──────
  {
    id: 'platform.integration.critical',
    kpiId: 'gov-integrations.integration_health.index',
    severity: 'critical',
    trigger: { on: 'red', minConsecutiveTicks: 2 },
    dedupWindowMs: FIVE_MIN,
    quietHours: null,
    escalationLadderId: 'critical.oncall',
    headlineAr: 'تدهور في صحة التكاملات الحكومية',
    headlineEn: 'Integration health critical — check DLQ + webhooks',
  },

  // ─── HR — license expiry ─────────────────────────────────────────
  {
    id: 'hr.license.expiring',
    kpiId: 'documents.expiring_30d.count',
    severity: 'warning',
    trigger: { on: 'amber', minConsecutiveTicks: 1 },
    dedupWindowMs: ONE_DAY,
    quietHours: { start: 22, end: 6 },
    escalationLadderId: 'warning.standard',
    headlineAr: 'وثائق / تراخيص ستنتهي خلال 30 يوم',
    headlineEn: 'Documents / licenses expiring within 30 days',
  },
]);

// ─── Lookups ─────────────────────────────────────────────────────

function byId(id) {
  return POLICIES.find(p => p.id === id) || null;
}

function forKpi(kpiId) {
  return POLICIES.filter(p => p.kpiId === kpiId || p.kpiId === '*');
}

function ladderFor(policy) {
  if (!policy || !policy.escalationLadderId) return null;
  return ESCALATION_LADDERS[policy.escalationLadderId] || null;
}

module.exports = {
  POLICIES,
  ESCALATION_LADDERS,
  SEVERITIES,
  byId,
  forKpi,
  ladderFor,
};
