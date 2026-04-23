'use strict';

/**
 * compliance-calendar.registry.js — Phase 13 Commit 3 (4.0.57).
 *
 * Canonical taxonomy for the unified Compliance Calendar — the one
 * place operators look to see every regulatory + quality deadline
 * for a branch: license renewals, credential expiries, audit
 * cycles, management reviews, evidence validity, contract renewals,
 * policy reviews, training certifications.
 *
 * Pure data + pure helpers. No I/O. Safe to require from any layer.
 *
 * The calendar aggregates from two kinds of source:
 *
 *   1. **Stored events** — a `ComplianceCalendarEvent` document
 *      with an explicit due date. Used for one-off regulatory
 *      deadlines, manual reminders, and anything that needs to
 *      survive edits of its upstream record.
 *
 *   2. **Computed events** — derived on the fly from other
 *      modules via registered `source adapters` (EvidenceItem
 *      validUntil, ManagementReview scheduledFor, Document
 *      expiry, HR credential expiry, etc.). Computed events are
 *      read-only in the calendar view and their lifecycle follows
 *      the source.
 */

// ── Event types ────────────────────────────────────────────────────

const CALENDAR_EVENT_TYPES = Object.freeze([
  'license_renewal', // MOH license, municipal permit, civil-defense
  'credential_expiry', // staff license, CPE, certification
  'document_expiry', // signed contract / policy / attestation
  'evidence_expiry', // EvidenceItem.validUntil approaching
  'audit_scheduled', // internal audit / external surveillance
  'management_review', // ISO §9.3 cycle
  'policy_review', // periodic policy re-approval
  'training_due', // mandatory course renewal
  'contract_renewal', // supplier or tenant contract
  'inspection_window', // regulator inspection announced
  'regulatory_submission', // report to MOH / SFDA / HRSD / ZATCA
  'capa_deadline', // CAPA action item due
  'risk_reassessment', // scheduled risk re-evaluation
  'drill', // fire / evacuation / disaster drill
  'maintenance_pm', // preventive maintenance due
  'other',
]);

// ── Statuses ───────────────────────────────────────────────────────

const CALENDAR_EVENT_STATUSES = Object.freeze([
  'upcoming', // more than the urgent-window days from due date
  'due_soon', // within the "soon" band (default 30d)
  'urgent', // within the urgent band (default 7d)
  'overdue', // past due date, not resolved
  'resolved', // completed / attested / closed
  'cancelled', // skipped with reason
  'snoozed', // intentionally pushed out with a new due date
]);

const TERMINAL_STATUSES = Object.freeze(['resolved', 'cancelled']);

// ── Severity ───────────────────────────────────────────────────────

const CALENDAR_SEVERITIES = Object.freeze(['info', 'warning', 'critical']);

// ── Urgency bands (days from "now" to due date) ────────────────────
// Used by statusFor() to compute the effective bucket. Overridable
// on a per-event basis via `thresholds`.

const DEFAULT_URGENCY_BANDS = Object.freeze({
  urgent: 7, // ≤ 7 days → `urgent`
  dueSoon: 30, // ≤ 30 days → `due_soon`
});

// ── Alert escalation windows ───────────────────────────────────────
// A sweeper (Phase 13 C11) will fire a notification each time the
// event crosses one of these windows. Events carry an `alertsFired`
// array so we never double-fire.

const DEFAULT_ALERT_WINDOWS = Object.freeze([90, 60, 30, 14, 7, 3, 1, 0]);

// ── Type → severity defaults ───────────────────────────────────────

const TYPE_DEFAULT_SEVERITY = Object.freeze({
  license_renewal: 'critical',
  credential_expiry: 'critical',
  inspection_window: 'critical',
  regulatory_submission: 'critical',
  capa_deadline: 'critical',
  document_expiry: 'warning',
  evidence_expiry: 'warning',
  audit_scheduled: 'warning',
  management_review: 'warning',
  contract_renewal: 'warning',
  risk_reassessment: 'warning',
  drill: 'info',
  maintenance_pm: 'info',
  training_due: 'warning',
  policy_review: 'info',
  other: 'info',
});

// ── Source adapter ids (who feeds computed events) ─────────────────
// The service registers an adapter per id; the UI can filter by
// source without knowing the module internals.

const SOURCE_ADAPTERS = Object.freeze([
  'evidence_vault', // EvidenceItem.findExpiring
  'management_review', // ManagementReview scheduled/nextReview
  'documents_expiry', // existing document-expiry module
  'hr_credentials', // employee credential expiry
  'internal_audit', // AnnualAuditPlan / SurpriseAudit
  'capa', // open CAPA deadlines
  'risk_register', // quarterly risk re-assessment
  'maintenance_pm', // preventive maintenance schedules
  'contracts', // contract/employment renewals
  'manual', // stored explicit events
]);

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Compute effective status from a due date and optional thresholds.
 * Returns one of: upcoming | due_soon | urgent | overdue.
 *
 * Thresholds fall back to DEFAULT_URGENCY_BANDS. If the event is
 * already in a terminal or manual state (resolved/cancelled/snoozed),
 * caller should bypass this function and use `event.status` directly.
 */
function statusFor(dueDate, now = new Date(), thresholds = DEFAULT_URGENCY_BANDS) {
  if (!dueDate) return 'upcoming';
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const diffDays = (due.getTime() - now.getTime()) / 86400000;
  if (diffDays < 0) return 'overdue';
  if (diffDays <= (thresholds.urgent ?? 7)) return 'urgent';
  if (diffDays <= (thresholds.dueSoon ?? 30)) return 'due_soon';
  return 'upcoming';
}

/**
 * Which default alert windows have already been "passed" given
 * `daysUntilDue`. Used by the sweeper to decide which escalations
 * still need to fire, cross-referenced with `event.alertsFired`.
 */
function windowsCrossed(daysUntilDue, windows = DEFAULT_ALERT_WINDOWS) {
  return windows.filter(w => daysUntilDue <= w);
}

function defaultSeverityFor(type) {
  return TYPE_DEFAULT_SEVERITY[type] || 'info';
}

module.exports = {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_STATUSES,
  TERMINAL_STATUSES,
  CALENDAR_SEVERITIES,
  DEFAULT_URGENCY_BANDS,
  DEFAULT_ALERT_WINDOWS,
  TYPE_DEFAULT_SEVERITY,
  SOURCE_ADAPTERS,
  statusFor,
  windowsCrossed,
  defaultSeverityFor,
};
