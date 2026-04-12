/**
 * Pharmacy & Medication Management Model — نموذج الصيدلية وإدارة الأدوية
 *
 * Schemas:
 *   Medication          — الأدوية والمستحضرات
 *   Prescription        — الوصفات الطبية
 *   Dispensing          — صرف الأدوية
 *   PharmacyInventory   — مخزون الصيدلية (دفعات وصلاحيات)
 *   DrugInteraction     — التفاعلات الدوائية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════
// Medication — الأدوية
// ═══════════════════════════════════════════════════════════════════════════

const medicationSchema = new Schema(
  {
    code: { type: String, unique: true, required: true },
    name: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    genericName: { type: String, required: true },
    brandName: String,
    manufacturer: String,
    category: {
      type: String,
      required: true,
      enum: [
        'analgesic',
        'antibiotic',
        'antidepressant',
        'antiepileptic',
        'antihypertensive',
        'antipsychotic',
        'muscle_relaxant',
        'anti_inflammatory',
        'anticoagulant',
        'antispasmodic',
        'vitamin',
        'supplement',
        'topical',
        'respiratory',
        'gastrointestinal',
        'hormonal',
        'immunosuppressant',
        'rehabilitation_specific',
        'other',
      ],
    },
    dosageForm: {
      type: String,
      enum: [
        'tablet',
        'capsule',
        'syrup',
        'injection',
        'cream',
        'ointment',
        'drops',
        'inhaler',
        'suppository',
        'patch',
        'powder',
        'solution',
        'suspension',
        'other',
      ],
    },
    strength: String,
    unit: { type: String, default: 'mg' },
    route: {
      type: String,
      enum: [
        'oral',
        'topical',
        'injection',
        'inhalation',
        'rectal',
        'sublingual',
        'transdermal',
        'other',
      ],
    },
    controlledSubstance: { type: Boolean, default: false },
    controlSchedule: { type: String, enum: ['I', 'II', 'III', 'IV', 'V', 'none'], default: 'none' },
    requiresRefrigeration: { type: Boolean, default: false },
    storageTemperature: { min: Number, max: Number },
    sideEffects: [String],
    contraindications: [String],
    warnings: [String],
    sfdaRegistrationNumber: String,
    barcode: String,
    reorderLevel: { type: Number, default: 10 },
    maxDailyDose: String,
    pregnancyCategory: { type: String, enum: ['A', 'B', 'C', 'D', 'X', 'N'] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

medicationSchema.index({ 'name.ar': 'text', 'name.en': 'text', genericName: 'text' });
medicationSchema.index({ category: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// Prescription — الوصفة الطبية
// ═══════════════════════════════════════════════════════════════════════════

const prescriptionItemSchema = new Schema({
  medication: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  medicationName: String,
  dosage: { type: String, required: true },
  frequency: {
    type: String,
    required: true,
    enum: [
      'once_daily',
      'twice_daily',
      'three_times',
      'four_times',
      'every_8h',
      'every_12h',
      'as_needed',
      'weekly',
      'other',
    ],
  },
  duration: {
    value: Number,
    unit: { type: String, enum: ['days', 'weeks', 'months'], default: 'days' },
  },
  quantity: { type: Number, required: true },
  instructions: String,
  route: String,
  refills: { type: Number, default: 0 },
  refillsUsed: { type: Number, default: 0 },
  substitutionAllowed: { type: Boolean, default: true },
});

const prescriptionSchema = new Schema(
  {
    prescriptionNumber: { type: String, unique: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    beneficiaryName: String,
    prescriber: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prescriberName: String,
    prescriberSpecialty: String,
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    diagnosis: String,
    icdCode: String,
    items: [prescriptionItemSchema],
    status: {
      type: String,
      enum: [
        'pending',
        'verified',
        'dispensed',
        'partially_dispensed',
        'cancelled',
        'expired',
        'on_hold',
      ],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine',
    },
    type: {
      type: String,
      enum: ['new', 'refill', 'renewal', 'modification'],
      default: 'new',
    },
    validUntil: Date,
    notes: String,
    pharmacistNotes: String,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dispensedAt: Date,
    linkedSession: { type: Schema.Types.ObjectId, ref: 'TherapySession' },
    linkedReferral: { type: Schema.Types.ObjectId, ref: 'MedicalReferral' },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

prescriptionSchema.index({ beneficiary: 1, status: 1 });
prescriptionSchema.index({ prescriber: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1, createdAt: -1 });

prescriptionSchema.pre('save', function (next) {
  if (!this.prescriptionNumber) {
    this.prescriptionNumber = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  if (!this.validUntil) {
    this.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// Dispensing — صرف الأدوية
// ═══════════════════════════════════════════════════════════════════════════

const dispensingItemSchema = new Schema({
  medication: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  batch: { type: Schema.Types.ObjectId, ref: 'PharmacyInventory' },
  batchNumber: String,
  quantityDispensed: { type: Number, required: true },
  expiryDate: Date,
  unitPrice: Number,
  totalPrice: Number,
  substituted: { type: Boolean, default: false },
  originalMedication: { type: Schema.Types.ObjectId, ref: 'Medication' },
  notes: String,
});

const dispensingSchema = new Schema(
  {
    dispensingNumber: { type: String, unique: true },
    prescription: { type: Schema.Types.ObjectId, ref: 'Prescription', required: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    items: [dispensingItemSchema],
    pharmacist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['prepared', 'checked', 'dispensed', 'returned', 'cancelled'],
      default: 'prepared',
    },
    counselingProvided: { type: Boolean, default: false },
    counselingNotes: String,
    patientSignature: String,
    collectedBy: {
      name: String,
      relation: String,
      idNumber: String,
    },
    totalAmount: { type: Number, default: 0 },
    insuranceCovered: { type: Number, default: 0 },
    patientPaid: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dispensingSchema.index({ prescription: 1 });
dispensingSchema.index({ beneficiary: 1, createdAt: -1 });
dispensingSchema.index({ pharmacist: 1, createdAt: -1 });

dispensingSchema.pre('save', function (next) {
  if (!this.dispensingNumber) {
    this.dispensingNumber = `DSP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// PharmacyInventory — مخزون الصيدلية
// ═══════════════════════════════════════════════════════════════════════════

const pharmacyInventorySchema = new Schema(
  {
    medication: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    initialQuantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    manufacturingDate: Date,
    supplier: String,
    purchaseOrderNumber: String,
    receivedDate: { type: Date, default: Date.now },
    location: { shelf: String, rack: String, bin: String },
    status: {
      type: String,
      enum: ['available', 'low_stock', 'expired', 'recalled', 'quarantine', 'depleted'],
      default: 'available',
    },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pharmacyInventorySchema.index({ medication: 1, expiryDate: 1 });
pharmacyInventorySchema.index({ batchNumber: 1 });
pharmacyInventorySchema.index({ expiryDate: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// DrugInteraction — التفاعلات الدوائية
// ═══════════════════════════════════════════════════════════════════════════

const drugInteractionSchema = new Schema(
  {
    drugA: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    drugB: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    severity: {
      type: String,
      required: true,
      enum: ['minor', 'moderate', 'major', 'contraindicated'],
    },
    description: {
      ar: String,
      en: String,
    },
    effect: String,
    mechanism: String,
    management: String,
    evidenceLevel: { type: String, enum: ['established', 'probable', 'suspected', 'possible'] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

drugInteractionSchema.index({ drugA: 1, drugB: 1 }, { unique: true });
drugInteractionSchema.index({ severity: 1 });

// ═══════════════════════════════════════════════════════════════════════════

const Medication = mongoose.models.Medication || mongoose.model('Medication', medicationSchema);
const Prescription =
  mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);
const Dispensing = mongoose.models.Dispensing || mongoose.model('Dispensing', dispensingSchema);
const PharmacyInventory =
  mongoose.models.PharmacyInventory || mongoose.model('PharmacyInventory', pharmacyInventorySchema);
const DrugInteraction =
  mongoose.models.DrugInteraction || mongoose.model('DrugInteraction', drugInteractionSchema);

module.exports = {
  Medication,
  Prescription,
  Dispensing,
  PharmacyInventory,
  DrugInteraction,
};
