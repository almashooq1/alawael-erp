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

incidentReportSchema.pre('save', async function (next) {
  if (!this.incident_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('IncidentReport').countDocuments();
    this.incident_number = `INC-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

incidentReportSchema.index({ incident_type: 1, severity: 1, incident_date: -1 });
incidentReportSchema.index({ status: 1, incident_date: -1 });
incidentReportSchema.index({ branch_id: 1, incident_date: -1 });
incidentReportSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.IncidentReport || mongoose.model('IncidentReport', incidentReportSchema);
