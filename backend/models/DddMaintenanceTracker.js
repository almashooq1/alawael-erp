'use strict';
/**
 * DddMaintenanceTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddMaintenanceTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const WORK_ORDER_TYPES = [
  'corrective',
  'preventive',
  'predictive',
  'emergency',
  'inspection',
  'calibration',
  'cleaning',
  'renovation',
  'installation',
  'decommissioning',
  'safety_check',
  'electrical',
  'plumbing',
  'hvac',
];

const WORK_ORDER_STATUSES = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'on_hold',
  'awaiting_parts',
  'completed',
  'verified',
  'closed',
  'cancelled',
  'reopened',
];

const WORK_ORDER_PRIORITIES = [
  'low',
  'normal',
  'medium',
  'high',
  'urgent',
  'critical',
  'emergency',
];

const PM_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semi_annual',
  'annual',
  'biennial',
  'custom',
];

const SERVICE_CATEGORIES = [
  'electrical',
  'plumbing',
  'hvac',
  'fire_safety',
  'structural',
  'elevator',
  'generator',
  'medical_gas',
  'it_network',
  'security_system',
  'landscaping',
  'pest_control',
  'waste_management',
  'signage',
];

const ASSET_CONDITIONS = [
  'excellent',
  'good',
  'fair',
  'poor',
  'critical',
  'non_functional',
  'under_repair',
  'decommissioned',
];

/* ── Built-in maintenance assets ────────────────────────────────────────── */
const BUILTIN_ASSETS = [
  { code: 'ASSET-HVAC-01', name: 'Central HVAC System', category: 'hvac', condition: 'good' },
  {
    code: 'ASSET-ELEV-01',
    name: 'Main Building Elevator',
    category: 'elevator',
    condition: 'good',
  },
  { code: 'ASSET-GEN-01', name: 'Backup Generator', category: 'generator', condition: 'excellent' },
  {
    code: 'ASSET-FIRE-01',
    name: 'Fire Alarm System',
    category: 'fire_safety',
    condition: 'excellent',
  },
  { code: 'ASSET-UPS-01', name: 'UPS Battery System', category: 'electrical', condition: 'good' },
  { code: 'ASSET-PUMP-01', name: 'Water Pump Station', category: 'plumbing', condition: 'fair' },
  { code: 'ASSET-NET-01', name: 'Network Core Switch', category: 'it_network', condition: 'good' },
  {
    code: 'ASSET-CCTV-01',
    name: 'CCTV Surveillance System',
    category: 'security_system',
    condition: 'good',
  },
  {
    code: 'ASSET-MGAS-01',
    name: 'Medical Gas Pipeline',
    category: 'medical_gas',
    condition: 'excellent',
  },
  {
    code: 'ASSET-TRANS-01',
    name: 'Electrical Transformer',
    category: 'electrical',
    condition: 'good',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Work Order ────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const workOrderSchema = new Schema(
  {
    workOrderCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: WORK_ORDER_TYPES, required: true },
    status: { type: String, enum: WORK_ORDER_STATUSES, default: 'submitted' },
    priority: { type: String, enum: WORK_ORDER_PRIORITIES, default: 'normal' },
    buildingId: { type: Schema.Types.ObjectId },
    roomId: { type: Schema.Types.ObjectId },
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDMaintenanceAsset' },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: { type: String },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    estimatedHours: { type: Number },
    actualHours: { type: Number },
    estimatedCost: { type: Number },
    actualCost: { type: Number },
    partsUsed: [{ name: String, quantity: Number, unitCost: Number }],
    attachments: [{ name: String, url: String, type: String }],
    comments: [
      { userId: Schema.Types.ObjectId, text: String, createdAt: { type: Date, default: Date.now } },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

workOrderSchema.index({ status: 1, priority: -1 });
workOrderSchema.index({ buildingId: 1, status: 1 });
workOrderSchema.index({ assignedTo: 1, status: 1 });

const DDDWorkOrder =
  mongoose.models.DDDWorkOrder || mongoose.model('DDDWorkOrder', workOrderSchema);

/* ── Preventive Schedule ───────────────────────────────────────────────── */
const preventiveScheduleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDMaintenanceAsset' },
    buildingId: { type: Schema.Types.ObjectId },
    category: { type: String, enum: SERVICE_CATEGORIES },
    frequency: { type: String, enum: PM_FREQUENCIES, required: true },
    nextDueDate: { type: Date },
    lastPerformed: { type: Date },
    checklist: [{ task: String, isMandatory: Boolean }],
    assignedTeam: { type: String },
    estimatedHours: { type: Number },
    estimatedCost: { type: Number },
    isActive: { type: Boolean, default: true },
    autoGenerate: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

preventiveScheduleSchema.index({ nextDueDate: 1, isActive: 1 });

const DDDPreventiveSchedule =
  mongoose.models.DDDPreventiveSchedule ||
  mongoose.model('DDDPreventiveSchedule', preventiveScheduleSchema);

/* ── Service Record ────────────────────────────────────────────────────── */
const serviceRecordSchema = new Schema(
  {
    recordCode: { type: String, required: true, unique: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'DDDWorkOrder' },
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDMaintenanceAsset' },
    category: { type: String, enum: SERVICE_CATEGORIES },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    vendorName: { type: String },
    datePerformed: { type: Date, required: true },
    hoursSpent: { type: Number },
    totalCost: { type: Number },
    partsReplaced: [{ name: String, partNumber: String, quantity: Number, cost: Number }],
    conditionBefore: { type: String, enum: ASSET_CONDITIONS },
    conditionAfter: { type: String, enum: ASSET_CONDITIONS },
    notes: { type: String },
    attachments: [{ name: String, url: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

serviceRecordSchema.index({ assetId: 1, datePerformed: -1 });
serviceRecordSchema.index({ workOrderId: 1 });

const DDDServiceRecord =
  mongoose.models.DDDServiceRecord || mongoose.model('DDDServiceRecord', serviceRecordSchema);

/* ── Maintenance Asset ─────────────────────────────────────────────────── */
const maintenanceAssetSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    condition: { type: String, enum: ASSET_CONDITIONS, default: 'good' },
    buildingId: { type: Schema.Types.ObjectId },
    roomId: { type: Schema.Types.ObjectId },
    manufacturer: { type: String },
    modelNumber: { type: String },
    serialNumber: { type: String },
    installDate: { type: Date },
    warrantyEnd: { type: Date },
    expectedLifeYears: { type: Number },
    replacementCost: { type: Number },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

maintenanceAssetSchema.index({ category: 1, condition: 1 });
maintenanceAssetSchema.index({ buildingId: 1 });

const DDDMaintenanceAsset =
  mongoose.models.DDDMaintenanceAsset ||
  mongoose.model('DDDMaintenanceAsset', maintenanceAssetSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  WORK_ORDER_TYPES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_PRIORITIES,
  PM_FREQUENCIES,
  SERVICE_CATEGORIES,
  ASSET_CONDITIONS,
  BUILTIN_ASSETS,
  DDDWorkOrder,
  DDDPreventiveSchedule,
  DDDServiceRecord,
  DDDMaintenanceAsset,
};
