/**
 * Fleet Inspection Model - نموذج فحص المركبات
 * Pre-trip / post-trip inspection checklists with defect tracking
 */

const mongoose = require('mongoose');

const inspectionItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        'engine',
        'brakes',
        'tires',
        'lights',
        'mirrors',
        'windshield',
        'fluid_levels',
        'steering',
        'suspension',
        'exhaust',
        'body_exterior',
        'body_interior',
        'safety_equipment',
        'electrical',
        'hvac',
        'horn',
        'seatbelts',
        'doors_locks',
        'fuel_system',
        'transmission',
      ],
      required: true,
    },
    name: { type: String, required: true },
    nameAr: { type: String },
    status: {
      type: String,
      enum: ['pass', 'fail', 'needs_attention', 'not_applicable', 'not_inspected'],
      default: 'not_inspected',
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    notes: { type: String },
    photo: { type: String },
    defectReported: { type: Boolean, default: false },
  },
  { _id: true }
);

const fleetInspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    type: {
      type: String,
      enum: ['pre_trip', 'post_trip', 'periodic', 'random', 'incident_followup', 'regulatory'],
      required: true,
    },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetInspectionTemplate' },

    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'failed'],
      default: 'scheduled',
    },

    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    odometerReading: { type: Number },
    fuelLevel: { type: Number, min: 0, max: 100 },

    items: [inspectionItemSchema],

    overallResult: {
      type: String,
      enum: ['pass', 'conditional_pass', 'fail', 'pending'],
      default: 'pending',
    },
    totalItems: { type: Number, default: 0 },
    passedItems: { type: Number, default: 0 },
    failedItems: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },

    defects: [
      {
        item: { type: mongoose.Schema.Types.ObjectId },
        description: { type: String, required: true },
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        photo: { type: String },
        resolution: {
          type: String,
          enum: ['pending', 'repair_scheduled', 'repaired', 'deferred'],
          default: 'pending',
        },
        resolvedAt: { type: Date },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    driverSignature: { type: String },
    inspectorSignature: { type: String },
    notes: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fleetInspectionSchema.index({ vehicle: 1, type: 1, scheduledDate: -1 });
fleetInspectionSchema.index({ organization: 1, status: 1 });
fleetInspectionSchema.index({ driver: 1, completedAt: -1 });

fleetInspectionSchema.pre('save', async function (next) {
  if (!this.inspectionNumber) {
    const count = await mongoose.model('FleetInspection').countDocuments();
    this.inspectionNumber = `INS-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.items && this.items.length > 0) {
    this.totalItems = this.items.filter(i => i.status !== 'not_applicable').length;
    this.passedItems = this.items.filter(i => i.status === 'pass').length;
    this.failedItems = this.items.filter(i => i.status === 'fail').length;
    this.passRate =
      this.totalItems > 0 ? Math.round((this.passedItems / this.totalItems) * 100) : 0;
  }
  next();
});

// Inspection Template Schema
const inspectionTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicleTypes: [{ type: String }],
    inspectionType: {
      type: String,
      enum: ['pre_trip', 'post_trip', 'periodic', 'random', 'incident_followup', 'regulatory'],
    },
    items: [
      {
        category: { type: String, required: true },
        name: { type: String, required: true },
        nameAr: { type: String },
        required: { type: Boolean, default: true },
        instructions: { type: String },
      },
    ],
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const FleetInspection = mongoose.models.FleetInspection || mongoose.model('FleetInspection', fleetInspectionSchema);
const FleetInspectionTemplate = mongoose.models.FleetInspectionTemplate || mongoose.model('FleetInspectionTemplate', inspectionTemplateSchema);

module.exports = { FleetInspection, FleetInspectionTemplate };
