'use strict';
/**
 * DddConsentManager Model
 * Auto-extracted from services/dddConsentManager.js
 */
const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema(
  {
    /* Subject */
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Consent purpose */
    purpose: {
      type: String,
      enum: [
        'treatment',
        'assessment',
        'care_planning',
        'data_sharing',
        'research',
        'marketing',
        'analytics',
        'tele_rehab',
        'family_engagement',
        'third_party_referral',
        'insurance_claims',
        'ministry_reporting',
        'ai_recommendations',
        'biometric_data',
        'photo_video',
        'emergency_contact',
        'cross_border_transfer',
      ],
      required: true,
      index: true,
    },

    /* Consent details */
    status: {
      type: String,
      enum: ['granted', 'denied', 'withdrawn', 'expired', 'pending'],
      required: true,
      default: 'pending',
      index: true,
    },
    lawfulBasis: {
      type: String,
      enum: [
        'consent',
        'contract',
        'legal_obligation',
        'vital_interest',
        'public_interest',
        'legitimate_interest',
      ],
      default: 'consent',
    },
    version: { type: Number, default: 1 },
    policyVersion: { type: String }, // e.g. "privacy-policy-v2.3"

    /* Scope */
    scope: {
      domains: [String], // which DDD domains this consent covers
      dataCategories: [
        {
          type: String,
          enum: [
            'personal',
            'clinical',
            'behavioral',
            'financial',
            'biometric',
            'genetic',
            'special_category',
          ],
        },
      ],
      retentionPeriodDays: Number,
      thirdParties: [String],
    },

    /* Lifecycle */
    grantedAt: Date,
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grantMethod: {
      type: String,
      enum: ['written', 'electronic', 'verbal', 'implied'],
      default: 'electronic',
    },
    deniedAt: Date,
    withdrawnAt: Date,
    withdrawnBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    withdrawalReason: String,
    expiresAt: Date,

    /* Evidence */
    documentRef: String, // reference to signed consent form
    ipAddress: String,
    userAgent: String,
    digitalSignature: String,

    /* History — stores previous consent states */
    history: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId },
        reason: String,
        version: Number,
      },
    ],

    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

consentSchema.index({ beneficiaryId: 1, purpose: 1, status: 1 });
consentSchema.index({ status: 1, expiresAt: 1 });

const DDDConsent = mongoose.models.DDDConsent || mongoose.model('DDDConsent', consentSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Data Subject Request (DSAR) Model
   ═══════════════════════════════════════════════════════════════════════ */
const dsarSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Request type (GDPR Articles 15-22) */
    requestType: {
      type: String,
      enum: ['access', 'erasure', 'rectification', 'portability', 'restriction', 'objection'],
      required: true,
      index: true,
    },

    /* Status */
    status: {
      type: String,
      enum: [
        'submitted',
        'verified',
        'in_progress',
        'completed',
        'rejected',
        'partially_completed',
      ],
      default: 'submitted',
      index: true,
    },

    /* Details */
    description: String,
    specificData: [String], // which data categories the request covers
    domains: [String], // which DDD domains are affected

    /* Processing */
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    identityVerificationMethod: {
      type: String,
      enum: ['document', 'two_factor', 'in_person', 'email_verification'],
    },

    /* Completion */
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    outcome: String,
    dataExportUrl: String, // for portability
    dataExportFormat: { type: String, enum: ['json', 'csv', 'fhir_bundle'] },

    /* Rejection */
    rejectedAt: Date,
    rejectionReason: String,

    /* Compliance tracking */
    deadlineAt: Date, // GDPR: 30 days
    extensionGranted: Boolean,
    extensionReason: String,

    /* Affected records log */
    affectedRecords: [
      {
        model: String,
        recordId: { type: mongoose.Schema.Types.ObjectId },
        action: {
          type: String,
          enum: ['exported', 'anonymized', 'deleted', 'rectified', 'restricted'],
        },
        processedAt: Date,
      },
    ],

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dsarSchema.index({ status: 1, deadlineAt: 1 });

const DDDDataSubjectRequest =
  mongoose.models.DDDDataSubjectRequest || mongoose.model('DDDDataSubjectRequest', dsarSchema);

/* ═══════════════════════════════════════════════════════════════════════
   3. Data Retention Policy Model
   ═══════════════════════════════════════════════════════════════════════ */
const retentionPolicySchema = new mongoose.Schema(
  {
    domain: { type: String, required: true, unique: true },
    modelName: { type: String, required: true },
    retentionPeriodDays: { type: Number, required: true },
    archiveBeforeDelete: { type: Boolean, default: true },
    lawfulBasis: String,
    regulatoryReference: String,
    description: String,
    isActive: { type: Boolean, default: true },
    lastEnforcedAt: Date,
    recordsAffected: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const DDDDataRetentionPolicy =
  mongoose.models.DDDDataRetentionPolicy || mongoose.model('DDDDataRetentionPolicy', retentionPolicySchema);

/* ═══════════════════════════════════════════════════════════════════════
   4. Default Retention Policies
   ═══════════════════════════════════════════════════════════════════════ */
const DEFAULT_RETENTION_POLICIES = [
  {
    domain: 'core',
    modelName: 'Beneficiary',
    retentionPeriodDays: 3650,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Medical records law — 10 years post-discharge',
  },
  {
    domain: 'episodes',
    modelName: 'EpisodeOfCare',
    retentionPeriodDays: 3650,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Clinical records retention',
  },
  {
    domain: 'assessments',
    modelName: 'ClinicalAssessment',
    retentionPeriodDays: 3650,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Clinical records retention',
  },
  {
    domain: 'sessions',
    modelName: 'ClinicalSession',
    retentionPeriodDays: 2555,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: '7-year session records',
  },
  {
    domain: 'care-plans',
    modelName: 'UnifiedCarePlan',
    retentionPeriodDays: 3650,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Treatment plan retention',
  },
  {
    domain: 'goals',
    modelName: 'TherapeuticGoal',
    retentionPeriodDays: 2555,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Goal records retention',
  },
  {
    domain: 'behavior',
    modelName: 'BehaviorRecord',
    retentionPeriodDays: 2555,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Behavior incident records',
  },
  {
    domain: 'family',
    modelName: 'FamilyCommunication',
    retentionPeriodDays: 1825,
    lawfulBasis: 'legitimate_interest',
    regulatoryReference: '5-year communication records',
  },
  {
    domain: 'research',
    modelName: 'ResearchStudy',
    retentionPeriodDays: 5475,
    lawfulBasis: 'public_interest',
    regulatoryReference: 'Research data — 15 years',
  },
  {
    domain: 'tele-rehab',
    modelName: 'TeleSession',
    retentionPeriodDays: 2555,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Telehealth records',
  },
  {
    domain: 'quality',
    modelName: 'QualityAudit',
    retentionPeriodDays: 2555,
    lawfulBasis: 'legal_obligation',
    regulatoryReference: 'Audit records retention',
  },
  {
    domain: 'reports',
    modelName: 'GeneratedReport',
    retentionPeriodDays: 1825,
    lawfulBasis: 'legitimate_interest',
    regulatoryReference: 'Generated report archive',
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   5. Consent Purpose Definitions
   ═══════════════════════════════════════════════════════════════════════ */
const CONSENT_PURPOSES = [
  {
    purpose: 'treatment',
    label: 'Treatment & Rehabilitation',
    description: 'Consent for clinical treatment and rehabilitation services',
    required: true,
    lawfulBasis: 'contract',
    domains: ['core', 'episodes', 'sessions', 'care-plans', 'goals'],
  },
  {
    purpose: 'assessment',
    label: 'Clinical Assessment',
    description: 'Consent for clinical assessments and evaluations',
    required: true,
    lawfulBasis: 'contract',
    domains: ['assessments', 'goals'],
  },
  {
    purpose: 'care_planning',
    label: 'Care Planning',
    description: 'Consent for creating and managing care plans',
    required: true,
    lawfulBasis: 'contract',
    domains: ['care-plans', 'goals', 'episodes'],
  },
  {
    purpose: 'data_sharing',
    label: 'Data Sharing',
    description: 'Consent to share data with authorized third parties',
    required: false,
    lawfulBasis: 'consent',
    domains: ['core', 'episodes', 'assessments'],
  },
  {
    purpose: 'research',
    label: 'Research Participation',
    description: 'Consent for use in research studies',
    required: false,
    lawfulBasis: 'consent',
    domains: ['research'],
  },
  {
    purpose: 'marketing',
    label: 'Marketing Communications',
    description: 'Consent for marketing and promotional content',
    required: false,
    lawfulBasis: 'consent',
    domains: [],
  },
  {
    purpose: 'analytics',
    label: 'Analytics & Quality',
    description: 'Consent for data analytics and quality improvement',
    required: false,
    lawfulBasis: 'legitimate_interest',
    domains: ['quality', 'dashboards'],
  },
  {
    purpose: 'tele_rehab',
    label: 'Tele-Rehabilitation',
    description: 'Consent for remote rehabilitation sessions',
    required: false,
    lawfulBasis: 'consent',
    domains: ['tele-rehab'],
  },
  {
    purpose: 'family_engagement',
    label: 'Family Engagement',
    description: 'Consent for family communication and involvement',
    required: false,
    lawfulBasis: 'consent',
    domains: ['family'],
  },
  {
    purpose: 'third_party_referral',
    label: 'Third Party Referral',
    description: 'Consent for referral to external providers',
    required: false,
    lawfulBasis: 'consent',
    domains: ['core'],
  },
  {
    purpose: 'insurance_claims',
    label: 'Insurance Claims',
    description: 'Consent for insurance claim submissions',
    required: false,
    lawfulBasis: 'contract',
    domains: ['core', 'episodes', 'sessions'],
  },
  {
    purpose: 'ministry_reporting',
    label: 'Ministry Reporting',
    description: 'Consent for statutory reporting to Ministry of Health',
    required: true,
    lawfulBasis: 'legal_obligation',
    domains: ['core', 'episodes'],
  },
  {
    purpose: 'ai_recommendations',
    label: 'AI Recommendations',
    description: 'Consent for AI-powered clinical recommendations',
    required: false,
    lawfulBasis: 'consent',
    domains: ['ai-recommendations'],
  },
  {
    purpose: 'biometric_data',
    label: 'Biometric Data',
    description: 'Consent for collection of biometric data',
    required: false,
    lawfulBasis: 'consent',
    domains: ['ar-vr', 'tele-rehab'],
  },
  {
    purpose: 'photo_video',
    label: 'Photo & Video',
    description: 'Consent for photo/video documentation',
    required: false,
    lawfulBasis: 'consent',
    domains: ['sessions'],
  },
  {
    purpose: 'emergency_contact',
    label: 'Emergency Contact',
    description: 'Consent for emergency contact sharing',
    required: true,
    lawfulBasis: 'vital_interest',
    domains: ['core', 'family'],
  },
  {
    purpose: 'cross_border_transfer',
    label: 'Cross-Border Transfer',
    description: 'Consent for international data transfer',
    required: false,
    lawfulBasis: 'consent',
    domains: ['core'],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   6. Consent Management Functions
   ═══════════════════════════════════════════════════════════════════════ */
async function grantConsent(beneficiaryId, data) {
  const existing = await DDDConsent.findOne({
    beneficiaryId,
    purpose: data.purpose,
    status: { $in: ['granted', 'pending'] },
    isDeleted: { $ne: true },
  });

  if (existing) {
    existing.history.push({
      status: existing.status,
      changedAt: new Date(),
      changedBy: data.grantedBy,
      reason: 'Updated consent',
      version: existing.version,
    });
    existing.status = 'granted';
    existing.version += 1;
    existing.grantedAt = new Date();
    existing.grantedBy = data.grantedBy;
    existing.guardianId = data.guardianId || existing.guardianId;
    existing.grantMethod = data.grantMethod || existing.grantMethod;
    existing.policyVersion = data.policyVersion || existing.policyVersion;
    existing.scope = data.scope || existing.scope;
    existing.expiresAt = data.expiresAt || existing.expiresAt;
    existing.ipAddress = data.ipAddress;
    existing.userAgent = data.userAgent;
    existing.documentRef = data.documentRef || existing.documentRef;
    await existing.save();
    return existing.toObject();
  }

  const purposeDef = CONSENT_PURPOSES.find(p => p.purpose === data.purpose);
  const consent = await DDDConsent.create({
    beneficiaryId,
    guardianId: data.guardianId,
    branchId: data.branchId,
    organizationId: data.organizationId,
    purpose: data.purpose,
    status: 'granted',
    lawfulBasis: data.lawfulBasis || purposeDef?.lawfulBasis || 'consent',
    version: 1,
    policyVersion: data.policyVersion,
    scope: data.scope || {
      domains: purposeDef?.domains || [],
      dataCategories: ['personal', 'clinical'],
    },
    grantedAt: new Date(),
    grantedBy: data.grantedBy,
    grantMethod: data.grantMethod || 'electronic',
    expiresAt: data.expiresAt,
    documentRef: data.documentRef,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  return consent.toObject();
}

async function withdrawConsent(beneficiaryId, purpose, data = {}) {
  const consent = await DDDConsent.findOne({
    beneficiaryId,
    purpose,
    status: 'granted',
    isDeleted: { $ne: true },
  });

  if (!consent) throw new Error(`No active consent found for purpose: ${purpose}`);

  consent.history.push({
    status: consent.status,
    changedAt: new Date(),
    changedBy: data.withdrawnBy,
    reason: data.reason || 'Consent withdrawn',
    version: consent.version,
  });

  consent.status = 'withdrawn';
  consent.withdrawnAt = new Date();
  consent.withdrawnBy = data.withdrawnBy;
  consent.withdrawalReason = data.reason;
  await consent.save();

  return consent.toObject();
}

async function getConsentStatus(beneficiaryId) {
  const consents = await DDDConsent.find({
    beneficiaryId,
    isDeleted: { $ne: true },
  })
    .sort({ purpose: 1, updatedAt: -1 })
    .lean();

  /* Deduplicate — latest per purpose */
  const byPurpose = {};
  for (const c of consents) {
    if (!byPurpose[c.purpose]) byPurpose[c.purpose] = c;
  }

  return CONSENT_PURPOSES.map(p => ({
    purpose: p.purpose,
    label: p.label,
    description: p.description,
    required: p.required,
    lawfulBasis: p.lawfulBasis,
    consent: byPurpose[p.purpose] || null,
    status: byPurpose[p.purpose]?.status || 'not_recorded',
  }));
}

async function checkConsent(beneficiaryId, purpose) {
  const consent = await DDDConsent.findOne({
    beneficiaryId,
    purpose,
    status: 'granted',
    isDeleted: { $ne: true },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();
  return { hasConsent: !!consent, consent };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Data Subject Request Functions
   ═══════════════════════════════════════════════════════════════════════ */

/* Domain → Mongoose model map for DSAR processing */
const DOMAIN_MODELS = {
  core: ['Beneficiary'],
  episodes: ['EpisodeOfCare'],
  assessments: ['ClinicalAssessment'],
  sessions: ['ClinicalSession'],
  'care-plans': ['UnifiedCarePlan'],
  goals: ['TherapeuticGoal', 'Measure', 'MeasureApplication'],
  behavior: ['BehaviorRecord', 'BehaviorPlan'],
  family: ['FamilyMember', 'FamilyCommunication'],
  quality: ['QualityAudit', 'CorrectiveAction'],
  reports: ['ReportTemplate', 'GeneratedReport'],
  'group-therapy': ['TherapyGroup', 'GroupSession'],
  'tele-rehab': ['TeleSession'],
  'ar-vr': ['ARVRSession'],
  research: ['ResearchStudy'],
  'field-training': ['TrainingProgram', 'TraineeRecord'],
  programs: ['Program', 'ProgramEnrollment'],
  workflow: ['WorkflowTask', 'WorkflowTransitionLog'],
  'ai-recommendations': ['ClinicalRiskScore', 'Recommendation'],
  dashboards: ['DashboardConfig', 'KPIDefinition', 'KPISnapshot', 'DecisionAlert'],
  timeline: ['CareTimeline'],
};

async function createDSAR(beneficiaryId, data) {
  const dsar = await DDDDataSubjectRequest.create({
    beneficiaryId,
    requestedBy: data.requestedBy,
    branchId: data.branchId,
    requestType: data.requestType,
    description: data.description,
    specificData: data.specificData || [],
    domains: data.domains || Object.keys(DOMAIN_MODELS),
    deadlineAt: new Date(Date.now() + 30 * 86400000), // GDPR: 30 days
    identityVerificationMethod: data.verificationMethod,
  });
  return dsar.toObject();
}

async function processDSARAccess(dsarId) {
  const dsar = await DDDDataSubjectRequest.findById(dsarId);
  if (!dsar) throw new Error('DSAR not found');
  if (dsar.status === 'completed') throw new Error('DSAR already completed');

  dsar.status = 'in_progress';
  await dsar.save();

  const beneficiaryId = dsar.beneficiaryId;
  const exportData = {};

  for (const domain of dsar.domains) {
    const models = DOMAIN_MODELS[domain] || [];
    for (const modelName of models) {
      const Model = mongoose.model(modelName);
      if (!Model) continue;

      try {
        let records;
        if (modelName === 'Beneficiary') {
          records = await Model.findById(beneficiaryId).lean();
          records = records ? [records] : [];
        } else {
          records = await Model.find({ beneficiaryId }).lean();
        }
        if (records.length > 0) {
          exportData[modelName] = records;
          dsar.affectedRecords.push(
            ...records.map(r => ({
              model: modelName,
              recordId: r._id,
              action: 'exported',
              processedAt: new Date(),
            }))
          );
        }
      } catch {
        /* model may not have beneficiaryId field */
      }
    }
  }

  dsar.status = 'completed';
  dsar.completedAt = new Date();
  dsar.outcome = `Exported ${Object.keys(exportData).length} data categories, ${dsar.affectedRecords.length} records`;
  dsar.dataExportFormat = 'json';
  await dsar.save();

  return { dsar: dsar.toObject(), data: exportData };
}

async function processDSARErasure(dsarId) {
  const dsar = await DDDDataSubjectRequest.findById(dsarId);
  if (!dsar) throw new Error('DSAR not found');

  dsar.status = 'in_progress';
  await dsar.save();

  const beneficiaryId = dsar.beneficiaryId;
  let totalAnonymized = 0;

  for (const domain of dsar.domains) {
    if (domain === 'core') continue; // Beneficiary record anonymized, not deleted
    const models = DOMAIN_MODELS[domain] || [];
    for (const modelName of models) {
      const Model = mongoose.model(modelName);
      if (!Model) continue;
      try {
        const result = await Model.updateMany(
          { beneficiaryId },
          {
            $set: {
              isDeleted: true,
              deletedAt: new Date(),
              deletedReason: `DSAR erasure request ${dsarId}`,
            },
          }
        );
        if (result.modifiedCount > 0) {
          totalAnonymized += result.modifiedCount;
          dsar.affectedRecords.push({
            model: modelName,
            recordId: null,
            action: 'anonymized',
            processedAt: new Date(),
          });
        }
      } catch {
        /* skip models without these fields */
      }
    }
  }

  /* Anonymize beneficiary core record */
  const Beneficiary = mongoose.model('Beneficiary');
  if (Beneficiary) {
    await Beneficiary.findByIdAndUpdate(beneficiaryId, {
      $set: {
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED',
        'contactInfo.phone': 'ANONYMIZED',
        'contactInfo.email': 'ANONYMIZED',
        'contactInfo.address': 'ANONYMIZED',
        nationalId: `ANON-${crypto.randomBytes(8).toString('hex')}`,
        isArchived: true,
        archivedAt: new Date(),
        archivedReason: `DSAR erasure request ${dsarId}`,
      },
    });
    dsar.affectedRecords.push({
      model: 'Beneficiary',
      recordId: beneficiaryId,
      action: 'anonymized',
      processedAt: new Date(),
    });
    totalAnonymized++;
  }

  dsar.status = 'completed';
  dsar.completedAt = new Date();
  dsar.outcome = `Anonymized/soft-deleted ${totalAnonymized} records across ${dsar.domains.length} domains`;
  await dsar.save();

  return dsar.toObject();
}

async function getDSARList(filter = {}) {
  const query = { isDeleted: { $ne: true } };
  if (filter.status) query.status = filter.status;
  if (filter.requestType) query.requestType = filter.requestType;
  if (filter.branchId) query.branchId = filter.branchId;

  return DDDDataSubjectRequest.find(query)
    .sort({ createdAt: -1 })
    .populate('beneficiaryId', 'firstName lastName mrn')
    .limit(filter.limit || 50)
    .lean();
}

async function getDSARDashboard(branchId) {
  const match = { isDeleted: { $ne: true } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const [byStatus, byType, overdue] = await Promise.all([
    DDDDataSubjectRequest.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    DDDDataSubjectRequest.aggregate([
      { $match: match },
      { $group: { _id: '$requestType', count: { $sum: 1 } } },
    ]),
    DDDDataSubjectRequest.countDocuments({
      ...match,
      status: { $in: ['submitted', 'verified', 'in_progress'] },
      deadlineAt: { $lt: new Date() },
    }),
  ]);

  return {
    byStatus: byStatus.reduce((o, s) => {
      o[s._id] = s.count;
      return o;
    }, {}),
    byType: byType.reduce((o, t) => {
      o[t._id] = t.count;
      return o;
    }, {}),
    overdueRequests: overdue,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Anonymization Utilities
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDConsent,
  DDDDataSubjectRequest,
  DDDDataRetentionPolicy,
};
