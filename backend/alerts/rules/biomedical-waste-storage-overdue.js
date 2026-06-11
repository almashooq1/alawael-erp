/**
 * Rule: biomedical waste stored on-site past its safe time limit.
 *
 * An operational-category smart-alert (W1124) that links the new W1123 biomedical
 * waste system into the org `Alert` sink. WHO/CBAHI cap how long clinical waste —
 * especially infectious/pathological — may sit in on-site storage before
 * treatment (default 48h). A BiomedicalWasteRecord still in `stored` state past
 * `storedAt + maxStorageHours` is a compliance + infection-control breach.
 *
 * Hazardous categories (infectious/sharps/pathological/cytotoxic/radioactive)
 * escalate the default `high` to `critical`.
 *
 * Self-loading like the W1121 quality rules: prefers ctx.models.X, falls back to
 * a direct require so it fires in prod without an app.js model-loader edit.
 */

'use strict';

const HAZARDOUS = ['infectious', 'sharps', 'pathological', 'cytotoxic', 'radioactive'];

function loadModel(ctx) {
  if (ctx && ctx.models && ctx.models.BiomedicalWasteRecord)
    return ctx.models.BiomedicalWasteRecord;
  try {
    return require('../../models/BiomedicalWasteRecord');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'biomedical-waste-storage-overdue',
  severity: 'high',
  category: 'operational',
  description: 'Biomedical waste stored on-site past its safe time limit',

  async evaluate(ctx) {
    const Model = loadModel(ctx);
    if (!Model) return [];
    const now = ctx.now || new Date();
    const nowMs = now instanceof Date ? now.getTime() : Date.now();
    const rows = await Model.find({ status: 'stored', deletedAt: null });
    const findings = [];
    for (const r of rows) {
      if (!r.storedAt) continue;
      const deadline = new Date(r.storedAt).getTime() + (r.maxStorageHours || 48) * 3600 * 1000;
      if (nowMs <= deadline) continue;
      const finding = {
        key: `biomedical-waste-storage-overdue:${r._id}`,
        subject: { type: 'BiomedicalWasteRecord', id: r._id },
        branchId: r.branchId,
        message: `Biomedical waste ${r.recordNumber || r._id} (${r.wasteCategory}) stored past its ${r.maxStorageHours || 48}h on-site limit`,
      };
      if (HAZARDOUS.includes(r.wasteCategory)) finding.severity = 'critical';
      findings.push(finding);
    }
    return findings;
  },
};
