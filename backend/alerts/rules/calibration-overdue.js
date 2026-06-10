/**
 * Rule: measuring / clinical equipment calibration overdue or failed.
 *
 * An operational-category smart-alert (W1121). Calibrated equipment (scales,
 * thermometers, BP cuffs, audiometers, lab instruments, …) must be recalibrated
 * before its `nextDueDate`. A CalibrationAsset that is in service
 * (`active` / `awaiting_calibration`) past its due date is a CBAHI / patient-
 * safety breach. Separately, a `failed` calibration means the instrument is
 * known-inaccurate and must not be used until recalibrated — that escalates to
 * `critical` regardless of date.
 *
 * In-calibration / out-of-service / retired assets are excluded (the first is
 * being serviced now; the latter two aren't in clinical use). The status filter
 * runs in the DB (indexed); the date comparison is in JS so the `failed`-state
 * branch can be flagged in the same pass.
 *
 * Self-loading like capa-overdue: prefers `ctx.models.CalibrationAsset`, falls
 * back to a direct require so it fires in prod without an app.js loader edit.
 */

'use strict';

const NEEDS_CALIBRATION = ['active', 'awaiting_calibration'];
const EXCLUDED = ['out_of_service', 'retired', 'in_calibration'];

function loadModel(ctx) {
  if (ctx && ctx.models && ctx.models.CalibrationAsset) return ctx.models.CalibrationAsset;
  try {
    return require('../../models/quality/CalibrationAsset.model');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'calibration-overdue',
  severity: 'high',
  category: 'operational',
  description: 'Measuring/clinical equipment calibration overdue or failed',

  async evaluate(ctx) {
    const Model = loadModel(ctx);
    if (!Model) return [];
    const now = ctx.now || new Date();
    const rows = await Model.find({ status: { $nin: EXCLUDED } });
    const findings = [];
    for (const a of rows) {
      const overdue =
        NEEDS_CALIBRATION.includes(a.status) && a.nextDueDate && new Date(a.nextDueDate) < now;
      const failed = a.status === 'failed';
      if (!overdue && !failed) continue;
      const due = a.nextDueDate ? new Date(a.nextDueDate).toISOString().slice(0, 10) : '';
      const finding = {
        key: `calibration-overdue:${a._id}`,
        subject: { type: 'CalibrationAsset', id: a._id },
        branchId: a.branchId,
        message: failed
          ? `Calibration FAILED: ${a.name || a.assetCode || a._id} — equipment must not be used until recalibrated`
          : `Calibration overdue: ${a.name || a.assetCode || a._id}${due ? ` (due ${due})` : ''}`,
      };
      // A failed calibration = known-inaccurate instrument → critical.
      if (failed) finding.severity = 'critical';
      findings.push(finding);
    }
    return findings;
  },
};
