/**
 * Rule: employee professional credential past its expiry date.
 *
 * Companion to `credential-expiry-30d` (30-day heads-up); this one
 * fires the moment a credential lapses. Severity is per-kind
 * (SCFHS license + Iqama = critical — practice/residency blocked;
 * BLS/ACLS/PALS = high; the rest = medium) so the dispatcher routes
 * the serious ones to HR_MANAGER + the branch admin, not the holder
 * alone.
 *
 * Self-loading: the smart-alerts model loader does NOT inject this
 * model (the old `Credential` model it tried to load was removed and
 * renamed to `EmployeeCredential`). So we resolve the model from
 * ctx.models when a test injects it, else lazy-require the real model
 * (prod has a live DB connection). Tests MUST inject the model — a
 * bare require() with no DB would buffer the find() forever.
 */

'use strict';

// Per-kind severity — mirrors EmployeeCredential.SEVERITY_BY_KIND.
// Inlined (not required) so loading this rule never registers the
// Mongoose model as a side effect in the engine/unit tests.
// Allowed alert severities are info|warning|high|critical (no 'medium').
const SEVERITY_BY_KIND = Object.freeze({
  'scfhs-license': 'critical', // cannot practice without
  iqama: 'critical', // cannot reside legally
  bls: 'high',
  acls: 'high',
  pals: 'high',
  cpr: 'warning',
  'driver-license': 'warning',
  'medical-fitness': 'high',
  'background-check': 'high',
  'pdpl-training': 'warning',
  'specialty-board': 'high',
  'continuing-education': 'warning',
  'professional-malpractice-insurance': 'high',
  other: 'warning',
});

function resolveModel(ctx) {
  const injected = ctx.models && (ctx.models.EmployeeCredential || ctx.models.Credential);
  if (injected) return injected;
  try {
    return require('../../models/EmployeeCredential');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'credential-expired',
  severity: 'critical',
  category: 'hr',
  description: 'Employee professional credential has expired',

  async evaluate(ctx) {
    const Cred = resolveModel(ctx);
    if (!Cred || typeof Cred.find !== 'function') return [];
    const now = ctx.now || new Date();
    // status excludes already-handled states: suspended (deactivated)
    // and pending-renewal (renewal already in flight).
    const rows = await Cred.find({
      expiresAt: { $lt: now },
      status: { $nin: ['suspended', 'pending-renewal'] },
    });
    return rows
      .filter(c => c.expiresAt) // type-bracket guard (fake finders match null on $lt)
      .map(c => ({
        key: `credential-expired:${c._id}`,
        subject: { type: 'EmployeeCredential', id: c._id, employeeId: c.employeeId, kind: c.kind },
        branchId: c.branchId, // model is employee-keyed (no own branchId) → org-wide HR alert
        severity: SEVERITY_BY_KIND[c.kind] || 'high',
        message: `${c.labelAr || c.kind} (${c.issueNumber || c._id}) EXPIRED on ${new Date(c.expiresAt).toISOString().slice(0, 10)}`,
      }));
  },
};
