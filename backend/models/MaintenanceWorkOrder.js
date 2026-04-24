/**
 * MaintenanceWorkOrder Model — أوامر عمل الصيانة الوقائية والتصحيحية
 * النظام 34: إدارة الأصول والموارد
 *
 * Phase 16 Commit 2 (4.0.67) — state enum extended to match the
 * canonical state machine in `config/workOrder.registry.js`. Legacy
 * values (`pending`) still accepted; the state-machine service
 * normalises them. Added `statusHistory` for transition audit and
 * `slaId` backlink so dashboards can join WO ↔ SLA without a scan.
 */
const mongoose = require('mongoose');
const { WO_STATES } = require('../config/workOrder.registry');

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    event: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const maintenanceWorkOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: { type: String, required: true, unique: true, uppercase: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    type: {
      type: String,
      enum: ['preventive', 'corrective', 'emergency', 'inspection', 'calibration'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },
    // Canonical WO_STATES + legacy 'pending' (kept for migration tolerance;
    // the state-machine service normalises it to 'submitted' on first touch).
    status: {
      type: String,
      enum: [...WO_STATES, 'pending'],
      default: 'draft',
      index: true,
    },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    startedDate: { type: Date },
    completedDate: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    estimatedCost: { type: Number, min: 0 },
    actualCost: { type: Number, min: 0 },
    partsUsed: [
      {
        partName: String,
        partNumber: String,
        quantity: Number,
        unitCost: Number,
      },
    ],
    findings: { type: String },
    resolution: { type: String },
    warrantyClaim: { type: String },
    isWarrantyCovered: { type: Boolean, default: false },
    attachments: [{ fileName: String, fileUrl: String, uploadedAt: Date }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Phase 16 C2: backlink to the SLA clock for this WO (if one was
    // activated). Populated by `workOrderStateMachine.service.js` on
    // the first transition that triggers activation.
    slaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null, index: true },
  },
  { timestamps: true, collection: 'maintenance_work_orders' }
);

maintenanceWorkOrderSchema.index({ workOrderNumber: 1 });
maintenanceWorkOrderSchema.index({ status: 1 });
maintenanceWorkOrderSchema.index({ type: 1 });
maintenanceWorkOrderSchema.index({ scheduledDate: 1 });
maintenanceWorkOrderSchema.index({ assetId: 1 });
maintenanceWorkOrderSchema.index({ branchId: 1 });

module.exports =
  mongoose.models.MaintenanceWorkOrder ||
  mongoose.model('MaintenanceWorkOrder', maintenanceWorkOrderSchema);
