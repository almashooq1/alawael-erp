/**
 * Medical Equipment Model — نموذج المعدات الطبية
 *
 * Schemas:
 *   MedicalEquipment      — الأجهزة والمعدات الطبية
 *   CalibrationRecord     — سجلات المعايرة
 *   EquipmentMaintenance  — سجلات الصيانة
 *   SafetyCertificate     — شهادات السلامة
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ═══════════════════════════════════════════════════════════════════════════
// MEDICAL EQUIPMENT — المعدات الطبية
// ═══════════════════════════════════════════════════════════════════════════

const MedicalEquipmentSchema = new Schema(
  {
    assetTag: { type: String, required: true, unique: true },
    name: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    category: {
      type: String,
      enum: [
        'diagnostic', 'therapeutic', 'rehabilitation', 'monitoring',
        'surgical', 'laboratory', 'imaging', 'respiratory',
        'mobility_aid', 'orthotic', 'prosthetic', 'assistive_device',
        'speech_therapy', 'occupational_therapy', 'physical_therapy',
        'dental', 'optical', 'sterilization', 'general',
      ],
      required: true,
    },
    type: String,
    manufacturer: String,
    model: String,
    serialNumber: { type: String, unique: true, sparse: true },
    barcode: String,
    purchaseInfo: {
      supplier: String,
      purchaseDate: Date,
      purchasePrice: Number,
      purchaseOrderNumber: String,
      warrantyStart: Date,
      warrantyEnd: Date,
      warrantyProvider: String,
      invoiceNumber: String,
    },
    location: {
      building: String,
      floor: String,
      room: String,
      department: { type: Schema.Types.ObjectId, ref: 'Department' },
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: [
        'active', 'in_maintenance', 'out_of_service', 'retired',
        'pending_calibration', 'under_repair', 'loaned', 'in_storage',
        'condemned', 'disposed',
      ],
      default: 'active',
    },
    riskClass: {
      type: String,
      enum: ['class_I', 'class_IIa', 'class_IIb', 'class_III'],
      default: 'class_I',
    },
    sfdaRegistration: {
      registered: { type: Boolean, default: false },
      registrationNumber: String,
      registrationDate: Date,
      expiryDate: Date,
    },
    specifications: {
      weight: String,
      dimensions: String,
      powerRequirements: String,
      operatingConditions: String,
    },
    calibration: {
      requiresCalibration: { type: Boolean, default: false },
      calibrationFrequency: Number, // Days
      lastCalibrationDate: Date,
      nextCalibrationDate: Date,
      calibrationProvider: String,
    },
    maintenance: {
      preventiveFrequency: Number, // Days
      lastMaintenanceDate: Date,
      nextMaintenanceDate: Date,
      maintenanceContract: String,
      contractExpiry: Date,
    },
    usageTracking: {
      totalHours: { type: Number, default: 0 },
      totalCycles: { type: Number, default: 0 },
      maxLifeHours: Number,
      maxLifeCycles: Number,
    },
    depreciationInfo: {
      method: { type: String, enum: ['straight_line', 'declining_balance', 'none'], default: 'straight_line' },
      usefulLifeYears: Number,
      residualValue: Number,
      currentBookValue: Number,
    },
    documents: [
      {
        name: String,
        type: { type: String, enum: ['manual', 'datasheet', 'certificate', 'warranty', 'invoice', 'photo', 'other'] },
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MedicalEquipmentSchema.index({ assetTag: 1 });
MedicalEquipmentSchema.index({ category: 1, status: 1 });
MedicalEquipmentSchema.index({ 'location.department': 1 });
MedicalEquipmentSchema.index({ 'calibration.nextCalibrationDate': 1 });
MedicalEquipmentSchema.index({ 'maintenance.nextMaintenanceDate': 1 });

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATION RECORD — سجل المعايرة
// ═══════════════════════════════════════════════════════════════════════════

const CalibrationRecordSchema = new Schema(
  {
    equipment: { type: Schema.Types.ObjectId, ref: 'MedicalEquipment', required: true },
    calibrationNumber: {
      type: String,
      unique: true,
      default: function () {
        return 'CAL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      },
    },
    type: {
      type: String,
      enum: ['initial', 'periodic', 'post_repair', 'verification', 'special'],
      default: 'periodic',
    },
    calibrationDate: { type: Date, required: true },
    nextDueDate: Date,
    performedBy: {
      name: String,
      organization: String,
      certificateNumber: String,
    },
    standardsUsed: [String],
    measurements: [
      {
        parameter: String,
        referenceValue: String,
        measuredValue: String,
        tolerance: String,
        pass: Boolean,
      },
    ],
    result: {
      type: String,
      enum: ['pass', 'fail', 'pass_with_adjustment', 'inconclusive'],
      required: true,
    },
    adjustmentsMade: String,
    environmentConditions: {
      temperature: String,
      humidity: String,
    },
    certificatePath: String,
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CalibrationRecordSchema.index({ equipment: 1, calibrationDate: -1 });

// ═══════════════════════════════════════════════════════════════════════════
// EQUIPMENT MAINTENANCE — صيانة المعدات
// ═══════════════════════════════════════════════════════════════════════════

const EquipmentMaintenanceSchema = new Schema(
  {
    equipment: { type: Schema.Types.ObjectId, ref: 'MedicalEquipment', required: true },
    workOrderNumber: {
      type: String,
      unique: true,
      default: function () {
        return 'WO-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      },
    },
    type: {
      type: String,
      enum: ['preventive', 'corrective', 'emergency', 'inspection', 'upgrade'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['requested', 'scheduled', 'in_progress', 'parts_pending', 'completed', 'cancelled'],
      default: 'requested',
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedDate: { type: Date, default: Date.now },
    problemDescription: { ar: String, en: String },
    scheduledDate: Date,
    startedAt: Date,
    completedAt: Date,
    assignedTo: {
      name: String,
      organization: String,
      isExternal: { type: Boolean, default: false },
    },
    workPerformed: { ar: String, en: String },
    partsUsed: [
      {
        partName: String,
        partNumber: String,
        quantity: Number,
        cost: Number,
      },
    ],
    laborHours: Number,
    laborCost: Number,
    partsCost: Number,
    totalCost: Number,
    downtime: Number, // Hours
    rootCause: String,
    recommendations: String,
    equipmentConditionAfter: {
      type: String,
      enum: ['fully_operational', 'operational_with_limitations', 'requires_further_work', 'out_of_service'],
    },
    attachments: [
      {
        name: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EquipmentMaintenanceSchema.index({ equipment: 1, reportedDate: -1 });
EquipmentMaintenanceSchema.index({ status: 1, priority: -1 });

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY CERTIFICATE — شهادة السلامة
// ═══════════════════════════════════════════════════════════════════════════

const SafetyCertificateSchema = new Schema(
  {
    equipment: { type: Schema.Types.ObjectId, ref: 'MedicalEquipment', required: true },
    certificateNumber: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'electrical_safety', 'radiation_safety', 'fire_safety',
        'biocompatibility', 'electromagnetic_compatibility', 'performance_verification',
        'environmental_safety', 'infection_control', 'general_safety',
      ],
      required: true,
    },
    issuedBy: {
      organization: String,
      inspectorName: String,
      accreditationNumber: String,
    },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['valid', 'expiring_soon', 'expired', 'revoked', 'pending_renewal'],
      default: 'valid',
    },
    testResults: [
      {
        testName: String,
        result: { type: String, enum: ['pass', 'fail', 'not_applicable'] },
        value: String,
        standardReference: String,
      },
    ],
    overallResult: {
      type: String,
      enum: ['pass', 'fail', 'conditional'],
      required: true,
    },
    conditions: [String],
    certificatePath: String,
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SafetyCertificateSchema.index({ equipment: 1, expiryDate: 1 });
SafetyCertificateSchema.index({ status: 1, expiryDate: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  MedicalEquipment: mongoose.model('MedicalEquipment', MedicalEquipmentSchema),
  CalibrationRecord: mongoose.model('CalibrationRecord', CalibrationRecordSchema),
  EquipmentMaintenance: mongoose.model('EquipmentMaintenance', EquipmentMaintenanceSchema),
  SafetyCertificate: mongoose.model('SafetyCertificate', SafetyCertificateSchema),
};
