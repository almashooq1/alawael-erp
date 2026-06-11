/**
 * Rule: a Supplier Corrective Action Request (SCAR) is past its response due date
 * with the supplier still owing a response.
 *
 * `category: 'quality'` smart-alert rule (W1138). Under ISO 9001 §8.4 a SCAR that
 * sits `open`/`acknowledged`/`in_progress`/`rejected` past its `responseDueBy`
 * means the supplier has not returned a root-cause + countermeasure on time — a
 * supplier-quality risk. Once `response_received`/`verifying`/`verified`/`closed`
 * the supplier has responded; `cancelled` is dropped. Critical-severity SCARs
 * escalate the default `high` to `critical`.
 *
 * Self-loading (no app.js model-loader edit): prefers `ctx.models`, falls back to
 * a direct `require`. Model: `SupplierScar` at `models/quality/SupplierScar.model.js`.
 */

'use strict';

// states where the supplier still owes a response (excludes response_received /
// verifying / verified / closed / cancelled)
const AWAITING_RESPONSE = ['open', 'acknowledged', 'in_progress', 'rejected'];

function resolveModel(ctx) {
  const m = ctx.models && ctx.models.SupplierScar;
  if (m && typeof m.find === 'function') return m;
  try {
    return require('../../models/quality/SupplierScar.model');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'supplier-scar-response-overdue',
  severity: 'high',
  category: 'quality',
  description: 'Supplier corrective action (SCAR) response overdue',

  async evaluate(ctx = {}) {
    const Scar = resolveModel(ctx);
    if (!Scar) return [];
    const now = ctx.now || new Date();
    const rows = await Scar.find({ status: { $in: AWAITING_RESPONSE } });
    const findings = [];
    for (const s of rows) {
      if (!s.responseDueBy || new Date(s.responseDueBy) >= now) continue;
      const due = new Date(s.responseDueBy).toISOString().slice(0, 10);
      const finding = {
        key: `supplier-scar-response-overdue:${s._id}`,
        subject: { type: 'SupplierScar', id: s._id },
        branchId: s.branchId,
        message: `Supplier SCAR ${s.scarNumber || s._id} response overdue since ${due} (status: ${s.status})`,
      };
      if (s.severity === 'critical') finding.severity = 'critical';
      findings.push(finding);
    }
    return findings;
  },
};
