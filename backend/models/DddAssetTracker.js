'use strict';
/**
 * DddAssetTracker Model
 * Auto-extracted from services/dddAssetTracker.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

const ASSET_CATEGORIES = [
  'therapy_equipment',
  'diagnostic_device',
  'mobility_aid',
  'sensory_tool',
  'communication_device',
  'exercise_equipment',
  'hydrotherapy_equipment',
  'ar_vr_device',
  'computer_tablet',
  'furniture',
  'vehicle',
  'other',
];

const ASSET_STATUSES = [
  'available',
  'in_use',
  'maintenance',
  'repair',
  'calibration',
  'retired',
  'lost',
  'reserved',
];

const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'calibration',
  'inspection',
  'cleaning',
  'software_update',
  'replacement',
];

const CONDITION_GRADES = ['excellent', 'good', 'fair', 'poor', 'non_functional'];

const BUILTIN_ASSET_TYPES = [
  {
    code: 'AST-TREADMILL',
    name: 'Rehabilitation Treadmill',
    nameAr: 'جهاز المشي التأهيلي',
    category: 'exercise_equipment',
    maintenanceIntervalDays: 90,
  },
  {
    code: 'AST-PARALLEL-BAR',
    name: 'Parallel Bars',
    nameAr: 'القضبان المتوازية',
    category: 'therapy_equipment',
    maintenanceIntervalDays: 180,
  },
  {
    code: 'AST-STANDING-FRAME',
    name: 'Standing Frame',
    nameAr: 'إطار الوقوف',
    category: 'mobility_aid',
    maintenanceIntervalDays: 120,
  },
  {
    code: 'AST-SENSORY-KIT',
    name: 'Sensory Integration Kit',
    nameAr: 'مجموعة التكامل الحسي',
    category: 'sensory_tool',
    maintenanceIntervalDays: 60,
  },
  {
    code: 'AST-AAC-DEVICE',
    name: 'AAC Communication Device',
    nameAr: 'جهاز التواصل البديل',
    category: 'communication_device',
    maintenanceIntervalDays: 90,
  },
  {
    code: 'AST-BALANCE-BOARD',
    name: 'Balance Training Board',
    nameAr: 'لوح تدريب التوازن',
    category: 'exercise_equipment',
    maintenanceIntervalDays: 120,
  },
  {
    code: 'AST-VR-HEADSET',
    name: 'VR Rehabilitation Headset',
    nameAr: 'نظارة الواقع الافتراضي',
    category: 'ar_vr_device',
    maintenanceIntervalDays: 30,
  },
  {
    code: 'AST-ULTRASOUND',
    name: 'Therapeutic Ultrasound',
    nameAr: 'جهاز الموجات فوق الصوتية',
    category: 'therapy_equipment',
    maintenanceIntervalDays: 90,
  },
  {
    code: 'AST-TENS',
    name: 'TENS Unit',
    nameAr: 'جهاز التحفيز الكهربائي',
    category: 'therapy_equipment',
    maintenanceIntervalDays: 60,
  },
  {
    code: 'AST-POOL-LIFT',
    name: 'Pool Hoist/Lift',
    nameAr: 'رافعة المسبح',
    category: 'hydrotherapy_equipment',
    maintenanceIntervalDays: 30,
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Asset Schema ── */

const assetSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    category: { type: String, enum: ASSET_CATEGORIES, required: true, index: true },
    status: { type: String, enum: ASSET_STATUSES, default: 'available', index: true },
    condition: { type: String, enum: CONDITION_GRADES, default: 'good' },

    /* Identification */
    serialNumber: { type: String, index: true },
    manufacturer: String,
    model: String,
    barcode: String,

    /* Location */
    location: {
      building: String,
      floor: String,
      room: String,
      assignedResourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDResource' },
    },

    /* Financial */
    purchaseDate: Date,
    purchasePrice: Number,
    currency: { type: String, default: 'SAR' },
    warrantyExpires: Date,
    depreciationRate: Number, // annual %
    currentValue: Number,

    /* Maintenance */
    maintenanceIntervalDays: { type: Number, default: 90 },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: { type: Date, index: true },
    totalMaintenanceCost: { type: Number, default: 0 },

    /* Usage */
    totalUsageHours: { type: Number, default: 0 },
    maxUsageHoursPerDay: { type: Number, default: 8 },
    currentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentBeneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },

    /* Specs */
    specifications: { type: Map, of: mongoose.Schema.Types.Mixed },
    safetyNotes: String,
    safetyNotesAr: String,
    manualUrl: String,
    images: [String],
    tags: [String],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDAsset = mongoose.models.DDDAsset || mongoose.model('DDDAsset', assetSchema);

/* ── Maintenance Record Schema ── */
const maintenanceRecordSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDAsset', required: true, index: true },
    type: { type: String, enum: MAINTENANCE_TYPES, required: true },
    scheduledDate: { type: Date, index: true },
    completedDate: Date,
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'],
      default: 'scheduled',
      index: true,
    },
    performedBy: String,
    vendor: String,
    cost: Number,
    currency: { type: String, default: 'SAR' },
    description: String,
    descriptionAr: String,
    findings: String,
    partsReplaced: [{ name: String, cost: Number }],
    conditionBefore: { type: String, enum: CONDITION_GRADES },
    conditionAfter: { type: String, enum: CONDITION_GRADES },
    nextScheduledDate: Date,
    attachments: [String],
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDAssetMaintenanceRecord =
  mongoose.models.DDDAssetMaintenanceRecord || mongoose.model('DDDAssetMaintenanceRecord', maintenanceRecordSchema);

/* ── Asset Usage Log Schema ── */
const assetUsageLogSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDAsset', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    sessionId: { type: mongoose.Schema.Types.ObjectId },
    checkedOutAt: { type: Date, required: true, index: true },
    checkedInAt: Date,
    durationMinutes: Number,
    condition: { type: String, enum: CONDITION_GRADES },
    notes: String,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDAssetUsageLog =
  mongoose.models.DDDAssetUsageLog || mongoose.model('DDDAssetUsageLog', assetUsageLogSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — AssetTracker
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  MAINTENANCE_TYPES,
  CONDITION_GRADES,
  BUILTIN_ASSET_TYPES,
};
