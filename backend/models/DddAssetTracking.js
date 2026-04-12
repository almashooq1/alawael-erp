'use strict';
/**
 * DddAssetTracking — Mongoose Models & Constants
 * Auto-extracted from services/dddAssetTracking.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const ASSET_CATEGORIES = [
  'medical_device',
  'rehabilitation_equipment',
  'furniture',
  'it_hardware',
  'communication_device',
  'mobility_aid',
  'sensory_equipment',
  'hydrotherapy_device',
  'diagnostic_tool',
  'safety_equipment',
  'office_supply',
  'vehicle',
];

const ASSET_CONDITIONS = [
  'new',
  'excellent',
  'good',
  'fair',
  'worn',
  'needs_repair',
  'damaged',
  'non_functional',
  'decommissioned',
  'disposed',
];

const TRACKING_METHODS = [
  'rfid',
  'barcode',
  'qr_code',
  'nfc',
  'gps',
  'bluetooth_beacon',
  'manual',
  'biometric',
  'camera_vision',
  'ultrasound',
];

const CHECKOUT_STATUSES = [
  'checked_out',
  'returned',
  'overdue',
  'lost',
  'damaged_on_return',
  'reserved',
  'in_transit',
  'maintenance_hold',
  'quarantine',
  'available',
];

const DEPRECIATION_METHODS = [
  'straight_line',
  'declining_balance',
  'double_declining',
  'sum_of_years',
  'units_of_production',
  'no_depreciation',
  'custom',
  'accelerated',
  'group',
  'composite',
];

const AUDIT_TYPES = [
  'full_inventory',
  'spot_check',
  'cycle_count',
  'department_audit',
  'compliance_audit',
  'insurance_audit',
  'year_end',
  'transfer_verification',
  'loss_investigation',
  'warranty_review',
];

const BUILTIN_ASSET_TAGS = [
  { code: 'TAG_RFID', label: 'RFID Tag', method: 'rfid', reusable: true },
  { code: 'TAG_BARCODE', label: 'Barcode Label', method: 'barcode', reusable: false },
  { code: 'TAG_QR', label: 'QR Code Sticker', method: 'qr_code', reusable: false },
  { code: 'TAG_NFC', label: 'NFC Chip', method: 'nfc', reusable: true },
  { code: 'TAG_GPS', label: 'GPS Tracker', method: 'gps', reusable: true },
  { code: 'TAG_BLE', label: 'BLE Beacon', method: 'bluetooth_beacon', reusable: true },
  { code: 'TAG_MAN', label: 'Manual Log', method: 'manual', reusable: true },
  { code: 'TAG_CAM', label: 'Camera Vision', method: 'camera_vision', reusable: true },
  { code: 'TAG_BIO', label: 'Biometric Bind', method: 'biometric', reusable: true },
  { code: 'TAG_US', label: 'Ultrasound Ping', method: 'ultrasound', reusable: true },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const trackedAssetSchema = new Schema(
  {
    name: { type: String, required: true },
    assetTag: { type: String, unique: true, required: true },
    category: { type: String, enum: ASSET_CATEGORIES, required: true },
    condition: { type: String, enum: ASSET_CONDITIONS, default: 'new' },
    trackingMethod: { type: String, enum: TRACKING_METHODS, default: 'barcode' },
    serialNumber: { type: String },
    purchaseDate: { type: Date },
    purchaseCost: { type: Number },
    currentValue: { type: Number },
    depreciationMethod: { type: String, enum: DEPRECIATION_METHODS, default: 'straight_line' },
    usefulLifeMonths: { type: Number },
    locationId: { type: Schema.Types.ObjectId },
    departmentId: { type: Schema.Types.ObjectId },
    warrantyExpiry: { type: Date },
    vendor: { type: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
trackedAssetSchema.index({ category: 1, condition: 1 });
trackedAssetSchema.index({ assetTag: 1 }, { unique: true });

const assetCheckoutSchema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDTrackedAsset', required: true },
    status: { type: String, enum: CHECKOUT_STATUSES, default: 'checked_out' },
    checkedOutBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checkedOutAt: { type: Date, default: Date.now },
    expectedReturn: { type: Date },
    returnedAt: { type: Date },
    returnCondition: { type: String, enum: ASSET_CONDITIONS },
    purpose: { type: String },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
assetCheckoutSchema.index({ assetId: 1, status: 1 });
assetCheckoutSchema.index({ checkedOutBy: 1, checkedOutAt: -1 });

const inventoryAuditSchema = new Schema(
  {
    auditType: { type: String, enum: AUDIT_TYPES, required: true },
    conductedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    totalAssets: { type: Number },
    assetsFound: { type: Number },
    discrepancies: { type: Number },
    findings: [{ assetId: Schema.Types.ObjectId, issue: String, severity: String }],
    departmentId: { type: Schema.Types.ObjectId },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
inventoryAuditSchema.index({ auditType: 1, status: 1 });
inventoryAuditSchema.index({ startDate: -1 });

const depreciationLogSchema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDTrackedAsset', required: true },
    period: { type: Date, required: true },
    method: { type: String, enum: DEPRECIATION_METHODS },
    openingValue: { type: Number },
    depreciationAmt: { type: Number },
    closingValue: { type: Number },
    accumulatedDepr: { type: Number },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
depreciationLogSchema.index({ assetId: 1, period: -1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDTrackedAsset =
  mongoose.models.DDDTrackedAsset || mongoose.model('DDDTrackedAsset', trackedAssetSchema);
const DDDAssetCheckout =
  mongoose.models.DDDAssetCheckout || mongoose.model('DDDAssetCheckout', assetCheckoutSchema);
const DDDInventoryAudit =
  mongoose.models.DDDInventoryAudit || mongoose.model('DDDInventoryAudit', inventoryAuditSchema);
const DDDDepreciationLog =
  mongoose.models.DDDDepreciationLog || mongoose.model('DDDDepreciationLog', depreciationLogSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  TRACKING_METHODS,
  CHECKOUT_STATUSES,
  DEPRECIATION_METHODS,
  AUDIT_TYPES,
  BUILTIN_ASSET_TAGS,
  DDDTrackedAsset,
  DDDAssetCheckout,
  DDDInventoryAudit,
  DDDDepreciationLog,
};
