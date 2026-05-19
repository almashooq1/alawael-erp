'use strict';

/**
 * AttendanceImportSource — Wave 126.
 *
 * A registered external system permitted to push attendance batches
 * via the api-import route. Each source has:
 *   - a slug (sourceId) the client sends in the Authorization header
 *   - secretHash for HMAC verification
 *   - branchScope: array of branchIds the source is allowed to write to
 *     (empty array = any branch)
 *   - allowedKinds: which event kinds this source can emit
 *   - employeeIdMode: 'objectId' | 'externalKey' — how this source
 *     identifies employees in the payload
 *   - employeeIdField: when employeeIdMode='externalKey', the name of
 *     the field on the Employee model to lookup against
 *     (e.g. 'externalEmployeeIds.legacy_hr')
 *
 * Wave-18 invariants:
 *   • sourceId required + unique
 *   • secretHash required
 *   • allowedKinds ⊆ {check-in, check-out}
 *   • employeeIdMode ∈ {objectId, externalKey}
 */

const mongoose = require('mongoose');

const EMPLOYEE_ID_MODES = ['objectId', 'externalKey'];
const ALLOWED_KINDS = ['check-in', 'check-out'];

const AttendanceImportSourceSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, maxlength: 100 },
    nameAr: { type: String, required: true, maxlength: 200 },

    secretHash: { type: String, required: true, maxlength: 128 },

    branchScope: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
      default: () => [],
    },

    allowedKinds: {
      type: [{ type: String, enum: ALLOWED_KINDS }],
      default: () => ['check-in', 'check-out'],
    },

    employeeIdMode: {
      type: String,
      enum: EMPLOYEE_ID_MODES,
      default: 'objectId',
    },
    employeeIdField: { type: String, default: null, maxlength: 120 },

    // Rate-limit knob — max rows per batch the gateway will accept.
    maxRowsPerBatch: { type: Number, default: 5000, min: 1, max: 50000 },

    active: { type: Boolean, default: true, index: true },

    // Operational tracking.
    lastImportAt: { type: Date, default: null },
    lastImportRows: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'attendance_import_sources' }
);

AttendanceImportSourceSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceImportSourceSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.sourceId) {
    this.invalidate('sourceId', 'required');
    ok = false;
  }
  if (!this.secretHash) {
    this.invalidate('secretHash', 'required');
    ok = false;
  }
  if (!EMPLOYEE_ID_MODES.includes(this.employeeIdMode)) {
    this.invalidate('employeeIdMode', `must be one of ${EMPLOYEE_ID_MODES.join(',')}`);
    ok = false;
  }
  if (this.employeeIdMode === 'externalKey' && !this.employeeIdField) {
    this.invalidate('employeeIdField', 'required when employeeIdMode=externalKey');
    ok = false;
  }
  const kinds = Array.isArray(this.allowedKinds) ? this.allowedKinds : [];
  for (const k of kinds) {
    if (!ALLOWED_KINDS.includes(k)) {
      this.invalidate('allowedKinds', `${k} not in ${ALLOWED_KINDS.join(',')}`);
      ok = false;
    }
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceImportSource ||
  mongoose.model('AttendanceImportSource', AttendanceImportSourceSchema);

module.exports.AttendanceImportSourceSchema = AttendanceImportSourceSchema;
module.exports.EMPLOYEE_ID_MODES = EMPLOYEE_ID_MODES;
module.exports.ALLOWED_KINDS = ALLOWED_KINDS;
