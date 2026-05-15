'use strict';

/**
 * SupplierScar.model.js — World-Class QMS Phase 29 Commit 8.
 *
 * Supplier Corrective Action Request — ISO 9001 §8.4 + AIAG SQC.
 *
 * Auto-numbered SCAR-YYYY-NNNN. Linked to the existing `Vendor` model.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { SCAR_STATUSES } = require('../../config/supplier-quality.registry');

const containmentSchema = new Schema(
  {
    action: { type: String, required: true },
    performedAt: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

const supplierResponseSchema = new Schema(
  {
    rootCause: { type: String, default: null },
    correctiveAction: { type: String, default: null },
    preventiveAction: { type: String, default: null },
    targetCompletionDate: { type: Date, default: null },
    submittedAt: { type: Date, default: Date.now },
    submittedBy: { type: String, default: null }, // supplier-side contact
    attachments: [{ type: Schema.Types.ObjectId, ref: 'EvidenceItem' }],
  },
  { _id: true }
);

const verificationSchema = new Schema(
  {
    method: { type: String, default: null }, // inspection, re-audit, lot sampling…
    verifiedAt: { type: Date, default: Date.now },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    outcome: { type: String, enum: ['effective', 'ineffective'], required: true },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const scarSchema = new Schema(
  {
    scarNumber: { type: String, unique: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['minor', 'major', 'critical'], required: true },
    raisedAt: { type: Date, default: Date.now },
    responseDueBy: { type: Date, required: true },

    // Defect details.
    defectCategory: { type: String, default: null }, // dimensional, contamination, late shipment, …
    affectedLotIds: { type: [String], default: [] },
    affectedQuantity: { type: Number, default: null },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
    relatedIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null },

    containmentActions: { type: [containmentSchema], default: [] },
    supplierResponse: { type: supplierResponseSchema, default: null },
    verification: { type: verificationSchema, default: null },

    status: { type: String, enum: SCAR_STATUSES, default: 'open', index: true },
    cancelledReason: { type: String, default: null },
    rejectedReason: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'supplier_scars' }
);

scarSchema.index({ vendorId: 1, status: 1 });
scarSchema.index({ severity: 1, status: 1 });

scarSchema.pre('validate', async function () {
  if (!this.scarNumber) {
    const year = (this.raisedAt || new Date()).getUTCFullYear();
    const Model = mongoose.model('SupplierScar');
    const count = await Model.countDocuments({ scarNumber: { $regex: `^SCAR-${year}-` } });
    this.scarNumber = `SCAR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

scarSchema.virtual('isOverdue').get(function () {
  if (!this.responseDueBy) return false;
  return (
    ['open', 'acknowledged', 'in_progress'].includes(this.status) && this.responseDueBy < new Date()
  );
});

module.exports = mongoose.models.SupplierScar || mongoose.model('SupplierScar', scarSchema);
