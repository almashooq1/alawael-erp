/**
 * IncidentReport Model — نموذج تقارير الحوادث وبلاغات السلامة
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const incidentReportSchema = new mongoose.Schema(
  {
    incident_number: { type: String, unique: true }, // INC-YYYY-XXXXX
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    incident_type: {
      type: String,
      enum: [
        'fall', // سقوط
        'medication_error', // خطأ دوائي
        'equipment_failure', // عطل معدات
        'infection_control', // مكافحة عدوى
        'behavioral', // سلوكي
        'injury', // إصابة
        'near_miss', // حادثة وشيكة
        'complaint', // شكوى
        'security', // أمني
        'fire_safety', // سلامة الحريق
        'other',
      ],
      required: true,
    },

    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'critical', 'sentinel'],
      required: true,
    },

    incident_date: { type: Date, required: true },
    incident_time: { type: String },
    location: { type: String },

    // المعني بالحادثة
    involved_person_type: { type: String, enum: ['beneficiary', 'employee', 'visitor', 'other'] },
    involved_beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    involved_employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    involved_person_name: { type: String },

    // الشاهد والمُبلِّغ
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    witness_names: [{ type: String }],

    // الإجراءات الفورية
    immediate_action_taken: { type: String },
    medical_attention_required: { type: Boolean, default: false },
    medical_attention_details: { type: String },

    // التحقيق
    status: {
      type: String,
      enum: ['reported', 'under_investigation', 'action_taken', 'closed', 'escalated'],
      default: 'reported',
    },
    root_cause: { type: String },
    contributing_factors: [{ type: String }],
    corrective_actions: [
      {
        action: String,
        responsible_person_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        due_date: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
        completed_at: Date,
      },
    ],

    // الإغلاق
    closed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closed_at: { type: Date },
    closure_notes: { type: String },

    is_reported_to_authority: { type: Boolean, default: false },
    authority_report_date: { type: Date },
    attachments: [{ type: String }],

    // W277h — branch_id required for cross-branch isolation (W269 policy).
    // Adverse-event records MUST be attributable to a specific branch so
    // queries naturally scope by req.branchScope.branchId. Was optional
    // pre-W277h; making it required is forward-only — any legacy row
    // missing branch_id needs a one-time backfill before deploy. Mirrors
    // the Phase 29 `Incident.model.js` (quality/) which already requires
    // branchId since Wave 96.
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// W976 — async-no-next form. Mongoose 9 does NOT pass `next` to an async hook, so
// the prior `async function (next) { … next(); }` threw "next is not a function" on
// EVERY save (the documented Mongoose-9 hazard; see feedback_mongoose_9_pre_save_callback_silent_break).
// Completing via promise resolution is the canonical Mongoose-9 form.
incidentReportSchema.pre('save', async function () {
  this.$locals.wasNew = this.isNew; // capture for the post-save NCR producer
  if (!this.incident_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('IncidentReport').countDocuments();
    this.incident_number = `INC-${year}-${String(count + 1).padStart(5, '0')}`;
  }
});

// W976 — producer for the NCR auto-link pipeline (services/quality/ncrAutoLinkPipeline).
// On a NEW incident, emit `quality.incident.reported` on the unified quality bus
// (the singleton, W974) so the pipeline can auto-create an NCR + CAPA. The pipeline
// SELF-FILTERS by severity (major/critical/sentinel) and dedups by incidentId, so the
// "which incidents qualify" decision lives there, not here, and emitting is idempotent.
// ENV-GATED, default OFF (ENABLE_INCIDENT_NCR_AUTOLINK=true) — ships inert; auto-creating
// corrective-action records is a behaviour an operator opts into. Fully guarded: a bus
// or emit error must NEVER break the incident save.
incidentReportSchema.post('save', async function (doc) {
  if (process.env.ENABLE_INCIDENT_NCR_AUTOLINK !== 'true') return;
  if (!doc || !doc.$locals || !doc.$locals.wasNew) return; // creation only
  try {
    const { getDefault } = require('../../services/quality/qualityEventBus.service');
    const bus = getDefault();
    if (bus && typeof bus.emit === 'function') {
      await bus.emit('quality.incident.reported', {
        incidentId: String(doc._id),
        severity: doc.severity ? String(doc.severity).toLowerCase() : null,
        title: doc.title || null,
        branchId: doc.branch_id ? String(doc.branch_id) : null,
        reportedBy: doc.reported_by ? String(doc.reported_by) : null,
      });
    }
  } catch (_) {
    /* best-effort producer — never break the incident save */
  }
});

incidentReportSchema.index({ incident_type: 1, severity: 1, incident_date: -1 });
incidentReportSchema.index({ status: 1, incident_date: -1 });
incidentReportSchema.index({ branch_id: 1, incident_date: -1 });
incidentReportSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.IncidentReport || mongoose.model('IncidentReport', incidentReportSchema);
