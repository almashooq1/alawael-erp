const mongoose = require('mongoose');

const safeModel = (name, schema) =>
  mongoose.models[name] ? mongoose.models[name] : mongoose.model(name, schema);

// ── حادثة السلامة — Safety Incident ─────────────────────────────────
const incidentSchema = new mongoose.Schema(
  {
    incidentNumber: { type: String, required: true, unique: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    titleEn: { type: String, default: '', trim: true },
    description: { type: String, required: true },
    incidentType: {
      type: String,
      required: true,
      enum: [
        'injury',
        'near_miss',
        'property_damage',
        'environmental',
        'fire',
        'chemical',
        'electrical',
        'fall',
        'vehicle',
        'other',
      ],
      default: 'other',
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'serious', 'critical', 'fatal'],
      default: 'minor',
    },
    status: {
      type: String,
      enum: ['reported', 'under_investigation', 'corrective_action', 'closed', 'reopened'],
      default: 'reported',
    },
    location: { type: String, required: true },
    department: { type: String, default: '' },
    incidentDate: { type: Date, required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedInvestigator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    injuredPersons: [
      {
        name: String,
        employeeId: String,
        injuryType: String,
        bodyPart: String,
        treatmentRequired: { type: Boolean, default: false },
      },
    ],
    rootCause: { type: String, default: '' },
    correctiveActions: [
      {
        action: String,
        responsible: String,
        dueDate: Date,
        completedDate: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
      },
    ],
    attachments: [
      { fileName: String, fileUrl: String, uploadedAt: { type: Date, default: Date.now } },
    ],
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

incidentSchema.pre('validate', async function (next) {
  if (!this.incidentNumber) {
    const count = await mongoose.model('SafetyIncident').countDocuments();
    this.incidentNumber = `INC-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── جولة تفتيش — Safety Inspection ──────────────────────────────────
const inspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: { type: String, required: true, unique: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    titleEn: { type: String, default: '', trim: true },
    area: { type: String, required: true },
    department: { type: String, default: '' },
    inspectionType: {
      type: String,
      enum: ['routine', 'unannounced', 'follow_up', 'special', 'regulatory'],
      default: 'routine',
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date },
    inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    findings: [
      {
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        status: { type: String, enum: ['open', 'corrective_action', 'closed'], default: 'open' },
        correctiveAction: String,
        dueDate: Date,
        photo: String,
      },
    ],
    overallScore: { type: Number, min: 0, max: 100 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

inspectionSchema.pre('validate', async function (next) {
  if (!this.inspectionNumber) {
    const count = await mongoose.model('SafetyInspection').countDocuments();
    this.inspectionNumber = `INSP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const SafetyIncident = safeModel('SafetyIncident', incidentSchema);
const SafetyInspection = safeModel('SafetyInspection', inspectionSchema);

module.exports = { SafetyIncident, SafetyInspection };
