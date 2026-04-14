'use strict';

const mongoose = require('mongoose');

const earlyReferralSchema = new mongoose.Schema(
  {
    referralNumber: { type: String, unique: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyInterventionChild' },

    // ── Direction ──
    referralDirection: {
      type: String,
      enum: ['INBOUND', 'OUTBOUND'],
      required: true,
    },

    // ── Source (who is sending) ──
    sourceType: {
      type: String,
      enum: [
        'MATERNITY_HOSPITAL',
        'PEDIATRIC_CLINIC',
        'NICU',
        'NATIONAL_SCREENING_PROGRAM',
        'PRIMARY_CARE',
        'SELF_REFERRAL',
        'COMMUNITY_HEALTH',
        'DAYCARE',
        'EARLY_INTERVENTION_CENTER',
        'SPECIALIST',
        'OTHER',
      ],
      required: true,
    },
    sourceFacility: { type: String },
    sourceFacilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    sourceContact: { type: String },
    sourcePhone: { type: String },
    sourceEmail: { type: String },
    referringPhysician: { type: String },
    referringPhysicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Destination (who is receiving) ──
    destinationType: {
      type: String,
      enum: [
        'EARLY_INTERVENTION_CENTER',
        'PEDIATRIC_SPECIALIST',
        'AUDIOLOGY',
        'OPHTHALMOLOGY',
        'NEUROLOGY',
        'GENETICS',
        'SPEECH_THERAPY',
        'OCCUPATIONAL_THERAPY',
        'PHYSICAL_THERAPY',
        'PSYCHOLOGY',
        'NATIONAL_SCREENING_PROGRAM',
        'SOCIAL_SERVICES',
        'OTHER',
      ],
    },
    destinationFacility: { type: String },
    destinationFacilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    destinationContact: { type: String },
    destinationPhone: { type: String },

    // ── Referral Details ──
    referralDate: { type: Date, required: true },
    urgency: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENT'],
      default: 'ROUTINE',
    },
    reason: { type: String, required: true },
    reasonAr: { type: String },
    concerns: { type: String },
    clinicalFindings: { type: String },

    // ── National Screening Program Integration ──
    nationalScreeningId: { type: String },
    screeningProgramName: { type: String },
    screeningResult: { type: String },
    screeningDate: { type: Date },

    // ── Status Tracking ──
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'RECEIVED',
        'ACCEPTED',
        'SCHEDULED',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'DRAFT',
    },
    acceptedDate: { type: Date },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    rejectionReason: { type: String },

    // ── Outcome ──
    outcome: { type: String },
    outcomeDate: { type: Date },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    followUpNotes: { type: String },

    // ── Consent ──
    parentConsent: { type: Boolean, default: false },
    parentConsentDate: { type: Date },
    consentDocumentUrl: { type: String },

    // ── Communication Log ──
    communications: [
      {
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['PHONE', 'EMAIL', 'FAX', 'IN_PERSON', 'SYSTEM'] },
        direction: { type: String, enum: ['INBOUND', 'OUTBOUND'] },
        contact: { type: String },
        summary: { type: String },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    attachments: [
      {
        name: String,
        fileUrl: String,
        fileType: String,
        uploadDate: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    notes: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

earlyReferralSchema.pre('save', async function (next) {
  if (!this.referralNumber) {
    const count = await mongoose.model('EarlyReferral').countDocuments();
    this.referralNumber = `REF-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

earlyReferralSchema.index({ child: 1 });
earlyReferralSchema.index({ status: 1 });
earlyReferralSchema.index({ referralDirection: 1 });
earlyReferralSchema.index({ sourceType: 1 });
earlyReferralSchema.index({ urgency: 1 });
earlyReferralSchema.index({ referralDate: -1 });
earlyReferralSchema.index({ organization: 1 });

const EarlyReferral =
  mongoose.models.EarlyReferral || mongoose.model('EarlyReferral', earlyReferralSchema);

module.exports = EarlyReferral;
