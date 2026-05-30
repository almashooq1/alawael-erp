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
    // W664 — branch tenancy denormalization (R4). An incident belongs to the
    // branch where it was filed; derived from the (required) reporter's
    // User.branchId in the pre-save hook below (the `location` field is free
    // text, not a Branch ref). Additive; backfill via npm run
    // backfill:safetyincident-branchid.
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
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

// W664 — was `async function (next){…next()}` (Mongoose-9 mixed async+callback:
// dispatched as a Promise → next undefined → "next is not a function" on save;
// surfaced by the W664 behavioral test). Converted to pure async (W483 form).
incidentSchema.pre('validate', async function () {
  if (!this.incidentNumber) {
    const count = await mongoose.model('SafetyIncident').countDocuments();
    this.incidentNumber = `INC-${String(count + 1).padStart(5, '0')}`;
  }
});

// W664 — branch-scoped incident stats (R4)
incidentSchema.index({ branchId: 1, status: 1 });
// W664 — denormalize branchId from the (required) reporter's User.branchId.
// async pre('save') — distinct event from the pre('validate') above.
incidentSchema.pre('save', async function deriveBranchFromReporter() {
  if (this.branchId || !this.reportedBy) return;
  try {
    const User = mongoose.model('User');
    const u = await User.findById(this.reportedBy).select('branchId').lean();
    if (u && u.branchId) this.branchId = u.branchId;
  } catch {
    /* model unavailable — leave unset (safe) */
  }
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

// W664 — same Mongoose-9 mixed async+callback fix as the incident hook above.
inspectionSchema.pre('validate', async function () {
  if (!this.inspectionNumber) {
    const count = await mongoose.model('SafetyInspection').countDocuments();
    this.inspectionNumber = `INSP-${String(count + 1).padStart(5, '0')}`;
  }
});

const SafetyIncident = safeModel('SafetyIncident', incidentSchema);
const SafetyInspection = safeModel('SafetyInspection', inspectionSchema);

module.exports = { SafetyIncident, SafetyInspection };
