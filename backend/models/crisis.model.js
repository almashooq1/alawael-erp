/**
 * Crisis & Emergency Management Model — نماذج إدارة الأزمات والطوارئ
 *
 * Schemas:
 *   EmergencyPlan     — خطط الطوارئ
 *   CrisisIncident    — حوادث الأزمات
 *   EmergencyDrill    — تمارين الإخلاء والطوارئ
 *   EmergencyContact  — شجرة الاتصالات في الطوارئ
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════
// Emergency Plan — خطة طوارئ
// ═══════════════════════════════════════════════════════════════════════════

const emergencyPlanSchema = new Schema(
  {
    planNumber: { type: String, unique: true },
    title: {
      ar: { type: String, required: true },
      en: String,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'fire',
        'earthquake',
        'flood',
        'medical',
        'security',
        'power_outage',
        'pandemic',
        'evacuation',
        'chemical',
        'structural',
        'other',
      ],
    },
    description: String,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    status: {
      type: String,
      enum: ['draft', 'active', 'under_review', 'archived'],
      default: 'draft',
    },
    procedures: [
      {
        step: Number,
        action: { type: String, required: true },
        responsible: { type: Schema.Types.ObjectId, ref: 'User' },
        timeframe: String,
        notes: String,
      },
    ],
    evacuationRoutes: [
      {
        name: String,
        description: String,
        assemblyPoint: String,
        floor: String,
        capacity: Number,
      },
    ],
    requiredResources: [
      {
        resource: String,
        quantity: Number,
        location: String,
        available: { type: Boolean, default: true },
      },
    ],
    communicationTree: [
      {
        order: Number,
        role: String,
        person: { type: Schema.Types.ObjectId, ref: 'User' },
        phone: String,
        alternatePhone: String,
      },
    ],
    lastReviewDate: Date,
    nextReviewDate: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

emergencyPlanSchema.index({ type: 1, status: 1 });
emergencyPlanSchema.index({ center: 1 });

emergencyPlanSchema.pre('save', async function (next) {
  if (!this.planNumber) {
    const count = await mongoose.model('EmergencyPlan').countDocuments();
    this.planNumber = `EP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// Crisis Incident — حادثة أزمة
// ═══════════════════════════════════════════════════════════════════════════

const crisisIncidentSchema = new Schema(
  {
    incidentNumber: { type: String, unique: true },
    title: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'fire',
        'earthquake',
        'flood',
        'medical',
        'security',
        'power_outage',
        'pandemic',
        'evacuation',
        'chemical',
        'structural',
        'workplace_accident',
        'other',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['minor', 'moderate', 'major', 'critical'],
    },
    status: {
      type: String,
      enum: [
        'reported',
        'acknowledged',
        'in_progress',
        'contained',
        'resolved',
        'closed',
        'escalated',
      ],
      default: 'reported',
    },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    location: { building: String, floor: String, area: String },
    description: { type: String, required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedAt: { type: Date, default: Date.now },
    incidentCommander: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    relatedPlan: { type: Schema.Types.ObjectId, ref: 'EmergencyPlan' },
    casualties: {
      injuries: { type: Number, default: 0 },
      fatalities: { type: Number, default: 0 },
      evacuated: { type: Number, default: 0 },
    },
    propertyDamage: {
      estimated: { type: Number, default: 0 },
      description: String,
    },
    timeline: [
      {
        timestamp: { type: Date, default: Date.now },
        action: String,
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],
    rootCause: String,
    correctiveActions: [
      {
        action: String,
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        deadline: Date,
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed'],
          default: 'pending',
        },
        completedAt: Date,
      },
    ],
    lessonsLearned: String,
    attachments: [{ filename: String, url: String, uploadedAt: Date }],
    containedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

crisisIncidentSchema.index({ type: 1, severity: 1, status: 1 });
crisisIncidentSchema.index({ reportedAt: -1 });
crisisIncidentSchema.index({ center: 1, status: 1 });

crisisIncidentSchema.pre('save', async function (next) {
  if (!this.incidentNumber) {
    const count = await mongoose.model('CrisisIncident').countDocuments();
    this.incidentNumber = `INC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// Emergency Drill — تمرين طوارئ
// ═══════════════════════════════════════════════════════════════════════════

const emergencyDrillSchema = new Schema(
  {
    drillNumber: { type: String, unique: true },
    title: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'fire_evacuation',
        'earthquake',
        'lockdown',
        'medical',
        'chemical_spill',
        'full_scale',
        'tabletop',
        'other',
      ],
    },
    relatedPlan: { type: Schema.Types.ObjectId, ref: 'EmergencyPlan' },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    scheduledDate: { type: Date, required: true },
    actualDate: Date,
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },
    coordinator: { type: Schema.Types.ObjectId, ref: 'User' },
    participants: {
      expected: { type: Number, default: 0 },
      actual: { type: Number, default: 0 },
    },
    duration: {
      planned: Number, // minutes
      actual: Number,
    },
    evacuationTime: Number, // seconds
    objectives: [String],
    results: {
      score: { type: Number, min: 0, max: 100 },
      passed: { type: Boolean, default: false },
      findings: [String],
      improvements: [String],
    },
    notes: String,
    nextDrillDate: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

emergencyDrillSchema.index({ scheduledDate: 1, status: 1 });
emergencyDrillSchema.index({ center: 1, type: 1 });

emergencyDrillSchema.pre('save', async function (next) {
  if (!this.drillNumber) {
    const count = await mongoose.model('EmergencyDrill').countDocuments();
    this.drillNumber = `DRL-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// Emergency Contact Tree — شجرة اتصالات الطوارئ
// ═══════════════════════════════════════════════════════════════════════════

const emergencyContactSchema = new Schema(
  {
    person: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    role: { type: String, required: true },
    department: String,
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    phone: { type: String, required: true },
    alternatePhone: String,
    email: String,
    priority: { type: Number, default: 0 },
    category: {
      type: String,
      enum: [
        'incident_commander',
        'safety_officer',
        'first_responder',
        'medical',
        'management',
        'external_agency',
        'utility',
        'other',
      ],
      default: 'other',
    },
    externalAgency: { name: String, service: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

emergencyContactSchema.index({ category: 1, priority: 1 });
emergencyContactSchema.index({ center: 1, isActive: 1 });

const EmergencyPlan =
  mongoose.models.EmergencyPlan || mongoose.model('EmergencyPlan', emergencyPlanSchema);
const CrisisIncident =
  mongoose.models.CrisisIncident || mongoose.model('CrisisIncident', crisisIncidentSchema);
const EmergencyDrill =
  mongoose.models.EmergencyDrill || mongoose.model('EmergencyDrill', emergencyDrillSchema);
const EmergencyContact =
  mongoose.models.EmergencyContact || mongoose.model('EmergencyContact', emergencyContactSchema);

module.exports = { EmergencyPlan, CrisisIncident, EmergencyDrill, EmergencyContact };
