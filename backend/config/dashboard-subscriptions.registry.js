/**
 * dashboard-subscriptions.registry.js — scheduled delivery
 * subscriptions for the dashboard platform.
 *
 * Phase 18 Commit 5.
 *
 * Each entry says:
 *   "Send a snapshot of dashboard `dashboardId` to the holders of
 *    `recipientRoles` on the given `cadence`, via `channels`."
 *
 * The delivery scheduler reads this at boot, walks each entry on
 * a periodic tick, resolves recipients + renders a snapshot +
 * dispatches via `unifiedNotifier`.
 *
 * Pure data. Invariants enforced in
 * `dashboard-subscriptions.test.js`.
 */

'use strict';

const CADENCES = Object.freeze(['hourly', 'daily', 'weekly', 'monthly']);

const SUBSCRIPTIONS = Object.freeze([
  {
    id: 'exec.daily.brief',
    dashboardId: 'executive',
    cadence: 'daily',
    // UTC hour of day (0-23) at which the subscription is eligible to fire.
    sendAtUtcHour: 5,
    recipientRoles: ['ceo', 'group_cfo', 'group_gm', 'head_office_admin'],
    channels: ['email'],
    format: 'html',
    locale: 'ar',
    subjectOverride: null,
    description: 'Daily executive brief at 08:00 KSA',
  },
  {
    id: 'branch-ops.shift.morning',
    dashboardId: 'branch-ops',
    cadence: 'daily',
    sendAtUtcHour: 4,
    recipientRoles: ['branch_manager', 'regional_director'],
    channels: ['email', 'whatsapp'],
    format: 'markdown',
    locale: 'ar',
    subjectOverride: null,
    description: 'Morning branch-ops brief at 07:00 KSA',
  },
  {
    id: 'quality.weekly',
    dashboardId: 'functional.quality',
    cadence: 'weekly',
    sendAtUtcHour: 6,
    // 0 = Sunday in UTC
    sendOnUtcDay: 0,
    recipientRoles: ['group_quality_officer', 'compliance_officer', 'regional_quality'],
    channels: ['email'],
    format: 'html',
    locale: 'ar',
    subjectOverride: 'Weekly Quality Review — القراءة الأسبوعية',
    description: 'Sunday 09:00 KSA weekly quality review',
  },
  {
    id: 'finance.weekly',
    dashboardId: 'functional.finance',
    cadence: 'weekly',
    sendAtUtcHour: 6,
    sendOnUtcDay: 0,
    recipientRoles: ['group_cfo', 'finance_supervisor'],
    channels: ['email'],
    format: 'html',
    locale: 'ar',
    subjectOverride: 'Weekly Finance Review',
    description: 'Sunday 09:00 KSA weekly finance review',
  },
  {
    id: 'clinical.weekly',
    dashboardId: 'clinical',
    cadence: 'weekly',
    sendAtUtcHour: 6,
    sendOnUtcDay: 0,
    recipientRoles: ['clinical_director', 'therapy_supervisor'],
    channels: ['email'],
    format: 'html',
    locale: 'ar',
    subjectOverride: 'Weekly Clinical Outcomes',
    description: 'Sunday 09:00 KSA clinical outcomes recap',
  },
]);

function byId(id) {
  return SUBSCRIPTIONS.find(s => s.id === id) || null;
}

function byDashboardId(dashboardId) {
  return SUBSCRIPTIONS.filter(s => s.dashboardId === dashboardId);
}

function byCadence(cadence) {
  return SUBSCRIPTIONS.filter(s => s.cadence === cadence);
}

module.exports = {
  SUBSCRIPTIONS,
  CADENCES,
  byId,
  byDashboardId,
  byCadence,
};
