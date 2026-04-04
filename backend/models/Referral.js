/**
 * Referral Models — نماذج بوابة التحويلات الطبية
 * Covers: Referrals, ReferralDocuments, ReferringFacilities,
 *         ReferralCommunications, ReferralAssessments, FhirIntegrationLogs
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── ReferringFacility ────────────────────────────────────────────────────────

const referringFacilitySchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    type: {
      type: String,
      enum: ['hospital', 'clinic', 'government_agency', 'rehabilitation_center', 'school', 'other'],
      required: true,
    },
    licenseNumber: { type: String },
    mohCode: { type: String }, // كود وزارة الصحة
    city: { type: String },
    region: { type: String },
    address: { type: String },
    phone: { type: String },
    fax: { type: String },
    email: { type: String },
    contactPerson: { type: String },
    isActive: { type: Boolean, default: true },

    // FHIR Integration
    hasFhirEndpoint: { type: Boolean, default: false },
    fhirEndpointUrl: { type: String },
    fhirAuthType: { type: String, enum: ['none', 'basic', 'oauth2'] },
    fhirCredentials: { type: Schema.Types.Mixed }, // مشفرة في التطبيق

    // Statistics
    totalReferralsSent: { type: Number, default: 0 },
    totalReferralsAccepted: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },

    preferredSpecialties: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true, collection: 'referring_facilities' }
);

referringFacilitySchema.index({ type: 1, city: 1 });
referringFacilitySchema.index({ isActive: 1 });

// ─── Referral ─────────────────────────────────────────────────────────────────

const referralSchema = new Schema(
  {
    uuid: { type: String, unique: true, required: true },
    referralNumber: { type: String, unique: true }, // REF-2026-00001
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },

    status: {
      type: String,
      enum: [
        'received',
        'under_review',
        'accepted',
        'rejected',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'received',
    },
    priority: {
      type: String,
      enum: ['urgent', 'routine', 'elective'],
      default: 'routine',
    },
    priorityScore: { type: Number, default: 50, min: 0, max: 100 },

    // Patient Info
    patientName: { type: String, required: true, trim: true },
    patientNationalId: { type: String, trim: true },
    patientDob: { type: String },
    patientGender: { type: String, enum: ['male', 'female', 'other'] },
    patientPhone: { type: String },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', default: null },

    // Referring Facility
    referringFacility: {
      type: Schema.Types.ObjectId,
      ref: 'ReferringFacility',
      required: true,
    },
    referringPhysicianName: { type: String },
    referringPhysicianLicense: { type: String },
    referringPhysicianPhone: { type: String },
    referringPhysicianEmail: { type: String },

    // Clinical Info
    specialtyRequired: { type: String, required: true }, // التخصص المطلوب
    referralReason: { type: String, required: true },
    clinicalSummary: { type: String },
    diagnosisCodes: [{ type: String }], // ICD-10
    requestedServices: [{ type: String }],

    // Assignment
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    assignedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    rejectionReason: { type: String },

    // Scheduling
    requestedDate: { type: Date },
    scheduledDate: { type: Date },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },

    // Integrations
    mohReferralId: { type: String },
    mohReferralStatus: { type: String },
    fhirResourceId: { type: String },
    sourceSystem: {
      type: String,
      enum: ['manual', 'moh', 'fhir', 'email', 'api'],
      default: 'manual',
    },

    // Completion
    completedDate: { type: Date },
    completionNotes: { type: String },
    completedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  },
  { timestamps: true, collection: 'referrals' }
);

referralSchema.index({ branch: 1, status: 1, priority: 1 });
referralSchema.index({ branch: 1, specialtyRequired: 1 });
referralSchema.index({ patientNationalId: 1 });
referralSchema.index({ referralNumber: 1 });

// ─── ReferralDocument ────────────────────────────────────────────────────────

const referralDocumentSchema = new Schema(
  {
    referral: { type: Schema.Types.ObjectId, ref: 'Referral', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    documentType: {
      type: String,
      enum: ['referral_letter', 'medical_report', 'lab_results', 'imaging', 'consent', 'other'],
      required: true,
    },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String },
    fileSizeBytes: { type: Number },
    description: { type: String },
    documentDate: { type: Date },
    isFhirDocument: { type: Boolean, default: false },
    fhirDocumentId: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'referral_documents' }
);

referralDocumentSchema.index({ referral: 1 });

// ─── ReferralCommunication ────────────────────────────────────────────────────

const referralCommunicationSchema = new Schema(
  {
    referral: { type: Schema.Types.ObjectId, ref: 'Referral', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    channel: {
      type: String,
      enum: ['email', 'phone', 'fax', 'portal', 'sms'],
      required: true,
    },
    subject: { type: String },
    content: { type: String, required: true },
    senderName: { type: String },
    recipientName: { type: String },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    attachments: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true, collection: 'referral_communications' }
);

referralCommunicationSchema.index({ referral: 1, direction: 1 });

// ─── ReferralAssessment ───────────────────────────────────────────────────────

const referralAssessmentSchema = new Schema(
  {
    referral: { type: Schema.Types.ObjectId, ref: 'Referral', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    assessedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    assessmentDate: { type: Date, required: true },
    recommendation: {
      type: String,
      enum: ['accept', 'reject', 'defer', 'refer_elsewhere'],
      required: true,
    },
    clinicalOpinion: { type: String, required: true },
    servicesRecommended: [{ type: String }],
    priorityFactors: [{ type: String }],
    capacityImpact: { type: Number },
    requiresHomeVisit: { type: Boolean, default: false },
    requiresMultidisciplinary: { type: Boolean, default: false },
    teamMembersNeeded: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true, collection: 'referral_assessments' }
);

referralAssessmentSchema.index({ referral: 1 });

// ─── FhirIntegrationLog ───────────────────────────────────────────────────────

const fhirIntegrationLogSchema = new Schema(
  {
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    operation: {
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'search', 'transaction'],
      required: true,
    },
    resourceType: { type: String, required: true }, // ServiceRequest, Patient, Practitioner...
    resourceId: { type: String },
    referral: { type: Schema.Types.ObjectId, ref: 'Referral', default: null },
    facility: { type: Schema.Types.ObjectId, ref: 'ReferringFacility', default: null },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    status: { type: String, enum: ['success', 'failed', 'pending'], required: true },
    httpStatusCode: { type: Number },
    requestPayload: { type: Schema.Types.Mixed },
    responsePayload: { type: Schema.Types.Mixed },
    errorMessage: { type: String },
    durationMs: { type: Number },
    fhirVersion: { type: String, default: 'R4' },
  },
  { timestamps: true, collection: 'fhir_integration_logs' }
);

fhirIntegrationLogSchema.index({ branch: 1, resourceType: 1, status: 1 });
fhirIntegrationLogSchema.index({ referral: 1 });
fhirIntegrationLogSchema.index({ createdAt: -1 });

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  ReferringFacility: mongoose.model('ReferringFacility', referringFacilitySchema),
  Referral: mongoose.model('Referral', referralSchema),
  ReferralDocument: mongoose.model('ReferralDocument', referralDocumentSchema),
  ReferralCommunication: mongoose.model('ReferralCommunication', referralCommunicationSchema),
  ReferralAssessment: mongoose.model('ReferralAssessment', referralAssessmentSchema),
  FhirIntegrationLog: mongoose.model('FhirIntegrationLog', fhirIntegrationLogSchema),
};
