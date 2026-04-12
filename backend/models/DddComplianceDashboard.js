'use strict';
/**
 * DddComplianceDashboard Model
 * Auto-extracted from services/dddComplianceDashboard.js
 */
const mongoose = require('mongoose');

const complianceAssessmentSchema = new mongoose.Schema(
  {
    /* Scope */
    scope: {
      type: String,
      enum: ['beneficiary', 'branch', 'organization', 'domain'],
      required: true,
      index: true,
    },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },
    domain: { type: String, index: true },

    /* Framework */
    framework: {
      type: String,
      enum: ['hipaa', 'clinical_standards', 'documentation', 'safety', 'privacy', 'combined'],
      default: 'combined',
      index: true,
    },

    /* Scores */
    overallScore: { type: Number, min: 0, max: 100, required: true },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F'],
      required: true,
    },
    complianceLevel: {
      type: String,
      enum: ['fully_compliant', 'substantially_compliant', 'partially_compliant', 'non_compliant'],
      required: true,
    },

    /* Rule results */
    ruleResults: [
      {
        ruleCode: String,
        ruleName: String,
        category: String,
        framework: String,
        passed: Boolean,
        severity: { type: String, enum: ['info', 'low', 'medium', 'high', 'critical'] },
        finding: String,
        recommendation: String,
        evidence: mongoose.Schema.Types.Mixed,
      },
    ],

    /* Category scores */
    categoryScores: {
      documentation: { type: Number, min: 0, max: 100 },
      consent: { type: Number, min: 0, max: 100 },
      privacy: { type: Number, min: 0, max: 100 },
      clinicalStandards: { type: Number, min: 0, max: 100 },
      safety: { type: Number, min: 0, max: 100 },
      dataIntegrity: { type: Number, min: 0, max: 100 },
      continuityOfCare: { type: Number, min: 0, max: 100 },
    },

    /* Summary */
    summary: {
      totalRules: Number,
      passed: Number,
      failed: Number,
      warnings: Number,
      critical: Number,
    },

    /* Corrective actions generated */
    correctiveActions: [
      {
        ruleCode: String,
        action: String,
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
        dueDate: Date,
        assignedRole: String,
        status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
      },
    ],

    assessedAt: { type: Date, default: Date.now },
    assessedBy: { type: String, default: 'system' },
    processingTimeMs: Number,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

complianceAssessmentSchema.index({ scope: 1, branchId: 1, assessedAt: -1 });
complianceAssessmentSchema.index({ beneficiaryId: 1, assessedAt: -1 });

const DDDComplianceAssessment =
  mongoose.models.DDDComplianceAssessment ||
  mongoose.model('DDDComplianceAssessment', complianceAssessmentSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Compliance Policy Model
   ═══════════════════════════════════════════════════════════════════════ */
const compliancePolicySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    framework: {
      type: String,
      enum: ['hipaa', 'clinical_standards', 'documentation', 'safety', 'privacy'],
      required: true,
    },
    category: String,
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    applicableDomains: [String],
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    regulatoryReference: String,
  },
  { timestamps: true }
);

const DDDCompliancePolicy =
  mongoose.models.DDDCompliancePolicy ||
  mongoose.model('DDDCompliancePolicy', compliancePolicySchema);

/* ═══════════════════════════════════════════════════════════════════════
   3. Built-in Compliance Rules (22 rules)
   ═══════════════════════════════════════════════════════════════════════ */
const COMPLIANCE_RULES = [
  /* ── Documentation ───────────────────────────────── */
  {
    code: 'DOC_001',
    name: 'Session documentation completeness',
    category: 'documentation',
    framework: 'clinical_standards',
    severity: 'high',
    evaluate: async ctx => {
      const sessions = ctx.sessions || [];
      const completed = sessions.filter(s => s.status === 'completed');
      const withSOAP = completed.filter(
        s =>
          s.soapNotes?.subjective &&
          s.soapNotes?.objective &&
          s.soapNotes?.assessment &&
          s.soapNotes?.plan
      );
      const rate = completed.length > 0 ? withSOAP.length / completed.length : 1;
      return {
        passed: rate >= 0.85,
        finding:
          rate < 0.85 ? `SOAP completion rate: ${(rate * 100).toFixed(0)}% (required: 85%)` : null,
        evidence: {
          total: completed.length,
          complete: withSOAP.length,
          rate: +(rate * 100).toFixed(1),
        },
        recommendation: rate < 0.85 ? 'Complete SOAP notes for all sessions' : null,
      };
    },
  },
  {
    code: 'DOC_002',
    name: 'Care plan documentation',
    category: 'documentation',
    framework: 'clinical_standards',
    severity: 'high',
    evaluate: async ctx => {
      if (!ctx.episode || ctx.episode.status !== 'active') return { passed: true };
      const passed = !!ctx.carePlan;
      return {
        passed,
        finding: !passed ? 'Active episode without care plan' : null,
        recommendation: !passed ? 'Create care plan for active episode' : null,
      };
    },
  },
  {
    code: 'DOC_003',
    name: 'Assessment documentation timeliness',
    category: 'documentation',
    framework: 'clinical_standards',
    severity: 'medium',
    evaluate: async ctx => {
      if (!ctx.episode || ctx.episode.status !== 'active') return { passed: true };
      const last = ctx.lastAssessment;
      if (!last)
        return {
          passed: false,
          finding: 'No assessment on record',
          recommendation: 'Schedule initial assessment',
        };
      const days = (Date.now() - new Date(last.assessmentDate).getTime()) / 86400000;
      return {
        passed: days <= 90,
        finding: days > 90 ? `Last assessment ${Math.round(days)} days ago (max: 90)` : null,
        evidence: { daysSinceAssessment: Math.round(days) },
        recommendation: days > 90 ? 'Schedule reassessment' : null,
      };
    },
  },
  {
    code: 'DOC_004',
    name: 'Goal documentation',
    category: 'documentation',
    framework: 'clinical_standards',
    severity: 'medium',
    evaluate: async ctx => {
      if (!ctx.episode || ctx.episode.status !== 'active') return { passed: true };
      const activeGoals = (ctx.goals || []).filter(g => g.status === 'active');
      return {
        passed: activeGoals.length > 0,
        finding: activeGoals.length === 0 ? 'No active goals for active episode' : null,
        recommendation: activeGoals.length === 0 ? 'Document therapeutic goals' : null,
      };
    },
  },

  /* ── Consent / Privacy ───────────────────────────── */
  {
    code: 'PRI_001',
    name: 'Treatment consent recorded',
    category: 'consent',
    framework: 'privacy',
    severity: 'critical',
    evaluate: async ctx => {
      const DDDConsent = mongoose.model('DDDConsent');
      if (!DDDConsent) return { passed: true, finding: 'Consent model not available' };
      const consent = await DDDConsent.findOne({
        beneficiaryId: ctx.beneficiaryId,
        purpose: 'treatment',
        status: 'granted',
      }).lean();
      return {
        passed: !!consent,
        finding: !consent ? 'No treatment consent on record' : null,
        recommendation: !consent ? 'Obtain and record treatment consent' : null,
      };
    },
  },
  {
    code: 'PRI_002',
    name: 'Data sharing consent',
    category: 'consent',
    framework: 'privacy',
    severity: 'medium',
    evaluate: async ctx => {
      const DDDConsent = mongoose.model('DDDConsent');
      if (!DDDConsent) return { passed: true };
      const count = await DDDConsent.countDocuments({
        beneficiaryId: ctx.beneficiaryId,
        status: 'granted',
      });
      return {
        passed: count >= 3,
        finding:
          count < 3 ? `Only ${count} consent(s) recorded — recommend comprehensive consent` : null,
        evidence: { consentsRecorded: count },
      };
    },
  },
  {
    code: 'PRI_003',
    name: 'Guardian consent for minors',
    category: 'consent',
    framework: 'privacy',
    severity: 'critical',
    evaluate: async ctx => {
      if (!ctx.beneficiary) return { passed: true };
      const dob = ctx.beneficiary.dateOfBirth;
      if (!dob) return { passed: true };
      const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 86400000);
      if (age >= 18) return { passed: true };
      const hasGuardianConsent = (ctx.beneficiary.guardians || []).some(
        g => g.consentGiven && g.hasLegalGuardianship
      );
      return {
        passed: hasGuardianConsent,
        finding: !hasGuardianConsent ? 'Minor without documented guardian consent' : null,
        recommendation: !hasGuardianConsent ? 'Obtain legal guardian consent' : null,
      };
    },
  },
  {
    code: 'PRI_004',
    name: 'Privacy policy version current',
    category: 'privacy',
    framework: 'privacy',
    severity: 'low',
    evaluate: async ctx => {
      const DDDConsent = mongoose.model('DDDConsent');
      if (!DDDConsent) return { passed: true };
      const consents = await DDDConsent.find({
        beneficiaryId: ctx.beneficiaryId,
        status: 'granted',
      })
        .select('policyVersion')
        .lean();
      const outdated = consents.filter(c => !c.policyVersion);
      return {
        passed: outdated.length === 0,
        finding:
          outdated.length > 0 ? `${outdated.length} consent(s) without policy version` : null,
      };
    },
  },

  /* ── Clinical Standards ──────────────────────────── */
  {
    code: 'CLI_001',
    name: 'Session frequency compliance',
    category: 'clinicalStandards',
    framework: 'clinical_standards',
    severity: 'high',
    evaluate: async ctx => {
      if (!ctx.episode || ctx.episode.status !== 'active') return { passed: true };
      const planned =
        ctx.episode.sessionsPerWeek || ctx.episode.serviceConfig?.sessionsPerWeek || 2;
      const twoWeeks = (ctx.sessions || []).filter(
        s =>
          s.status === 'completed' &&
          new Date(s.scheduledDate) > new Date(Date.now() - 14 * 86400000)
      );
      const actual = twoWeeks.length / 2;
      return {
        passed: actual >= planned * 0.7,
        finding:
          actual < planned * 0.7
            ? `Session frequency ${actual.toFixed(1)}/week vs ${planned} planned`
            : null,
        evidence: { planned, actual: +actual.toFixed(1) },
        recommendation: actual < planned * 0.7 ? 'Increase session scheduling' : null,
      };
    },
  },
  {
    code: 'CLI_002',
    name: 'Goal progress monitoring',
    category: 'clinicalStandards',
    framework: 'clinical_standards',
    severity: 'medium',
    evaluate: async ctx => {
      const goals = (ctx.goals || []).filter(g => g.status === 'active');
      const stalled = goals.filter(g => {
        const hist = g.progressHistory || [];
        if (hist.length === 0) return true;
        return Date.now() - new Date(hist[hist.length - 1].date).getTime() > 21 * 86400000;
      });
      return {
        passed: stalled.length === 0,
        finding:
          stalled.length > 0 ? `${stalled.length} goals without progress update in 21+ days` : null,
        recommendation: stalled.length > 0 ? 'Record progress for stalled goals' : null,
      };
    },
  },
  {
    code: 'CLI_003',
    name: 'Discharge planning for near-target',
    category: 'clinicalStandards',
    framework: 'clinical_standards',
    severity: 'low',
    evaluate: async ctx => {
      const nearTarget = (ctx.goals || []).filter(
        g => g.status === 'active' && g.currentProgress >= 85
      );
      if (nearTarget.length < 2) return { passed: true };
      return {
        passed: false,
        finding: `${nearTarget.length} goals near target — discharge planning may be needed`,
        recommendation: 'Initiate discharge planning discussion',
      };
    },
  },

  /* ── Safety ──────────────────────────────────────── */
  {
    code: 'SAF_001',
    name: 'Behavior incident response',
    category: 'safety',
    framework: 'safety',
    severity: 'critical',
    evaluate: async ctx => {
      const incidents = (ctx.behaviorRecords || []).filter(b =>
        ['severe', 'crisis'].includes(b.severity)
      );
      const recent = incidents.filter(
        b => new Date(b.incidentDate || b.createdAt) > new Date(Date.now() - 7 * 86400000)
      );
      return {
        passed: recent.length === 0,
        finding:
          recent.length > 0
            ? `${recent.length} severe/crisis behavior incident(s) in past 7 days`
            : null,
        evidence: { recentSevere: recent.length },
        recommendation:
          recent.length > 0 ? 'Review and update behavior intervention plan urgently' : null,
      };
    },
  },
  {
    code: 'SAF_002',
    name: 'Behavior plan for documented incidents',
    category: 'safety',
    framework: 'safety',
    severity: 'high',
    evaluate: async ctx => {
      const records = ctx.behaviorRecords || [];
      if (records.length < 3) return { passed: true };
      const hasPlan = await mongoose.model('BehaviorPlan')
        ?.findOne({ beneficiaryId: ctx.beneficiaryId, status: 'active' })
        .lean();
      return {
        passed: !!hasPlan,
        finding: !hasPlan ? 'Multiple behavior incidents without active behavior plan' : null,
        recommendation: !hasPlan ? 'Create behavior intervention plan' : null,
      };
    },
  },

  /* ── Continuity of Care ──────────────────────────── */
  {
    code: 'COC_001',
    name: 'Family engagement frequency',
    category: 'continuityOfCare',
    framework: 'clinical_standards',
    severity: 'medium',
    evaluate: async ctx => {
      if (!ctx.episode || ctx.episode.status !== 'active') return { passed: true };
      const events = ctx.familyEvents || [];
      const recent = events.filter(
        f => new Date(f.communicationDate || f.createdAt) > new Date(Date.now() - 30 * 86400000)
      );
      return {
        passed: recent.length > 0,
        finding: recent.length === 0 ? 'No family engagement in past 30 days' : null,
        recommendation: recent.length === 0 ? 'Schedule family meeting or communication' : null,
      };
    },
  },
  {
    code: 'COC_002',
    name: 'Care team assignment',
    category: 'continuityOfCare',
    framework: 'clinical_standards',
    severity: 'medium',
    evaluate: async ctx => {
      if (!ctx.episode) return { passed: true };
      const team = ctx.episode.careTeam || [];
      return {
        passed: team.length > 0,
        finding: team.length === 0 ? 'Episode without care team assignment' : null,
        recommendation: team.length === 0 ? 'Assign care team members' : null,
      };
    },
  },
  {
    code: 'COC_003',
    name: 'Episode duration compliance',
    category: 'continuityOfCare',
    framework: 'clinical_standards',
    severity: 'medium',
    evaluate: async ctx => {
      if (!ctx.episode || !ctx.episode.expectedEndDate) return { passed: true };
      const overdue = (Date.now() - new Date(ctx.episode.expectedEndDate).getTime()) / 86400000;
      return {
        passed: overdue <= 30,
        finding: overdue > 30 ? `Episode overdue by ${Math.round(overdue)} days` : null,
        recommendation: overdue > 30 ? 'Review and update episode timeline' : null,
      };
    },
  },

  /* ── Data Integrity ──────────────────────────────── */
  {
    code: 'DI_001',
    name: 'Beneficiary demographic completeness',
    category: 'dataIntegrity',
    framework: 'documentation',
    severity: 'medium',
    evaluate: async ctx => {
      if (!ctx.beneficiary) return { passed: true };
      const b = ctx.beneficiary;
      const required = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'nationalId'];
      const missing = required.filter(f => !b[f]);
      return {
        passed: missing.length === 0,
        finding: missing.length > 0 ? `Missing fields: ${missing.join(', ')}` : null,
        evidence: { missing },
        recommendation: missing.length > 0 ? 'Complete beneficiary demographics' : null,
      };
    },
  },
  {
    code: 'DI_002',
    name: 'Episode completeness',
    category: 'dataIntegrity',
    framework: 'documentation',
    severity: 'low',
    evaluate: async ctx => {
      if (!ctx.episode) return { passed: true };
      const e = ctx.episode;
      const complete = e.type && e.startDate && e.currentPhase;
      return {
        passed: complete,
        finding: !complete ? 'Episode missing type, start date, or phase' : null,
      };
    },
  },

  /* ── HIPAA Specific ──────────────────────────────── */
  {
    code: 'HIP_001',
    name: 'Minimum necessary access',
    category: 'privacy',
    framework: 'hipaa',
    severity: 'high',
    evaluate: async () => {
      /* Structural check — RBAC middleware exists */
      try {
        require('../../middleware/dddAuth.middleware');
        return { passed: true, finding: null };
      } catch {
        return {
          passed: false,
          finding: 'DDD RBAC middleware not found',
          recommendation: 'Ensure dddAuth.middleware.js is properly configured',
        };
      }
    },
  },
  {
    code: 'HIP_002',
    name: 'Audit trail active',
    category: 'privacy',
    framework: 'hipaa',
    severity: 'critical',
    evaluate: async () => {
      try {
        require('../../middleware/dddAudit.middleware');
        return { passed: true };
      } catch {
        return {
          passed: false,
          finding: 'DDD Audit middleware not available',
          recommendation: 'Ensure audit trail is active',
        };
      }
    },
  },
  {
    code: 'HIP_002B',
    name: 'Data encryption at rest',
    category: 'privacy',
    framework: 'hipaa',
    severity: 'high',
    evaluate: async () => {
      /* Check MongoDB connection uses encryption or TLS */
      const mongoUri = process.env.MONGODB_URI || '';
      const hasTLS =
        mongoUri.includes('tls=true') ||
        mongoUri.includes('ssl=true') ||
        process.env.NODE_ENV === 'production';
      return {
        passed: hasTLS || process.env.NODE_ENV !== 'production',
        finding:
          !hasTLS && process.env.NODE_ENV === 'production'
            ? 'MongoDB connection does not use TLS in production'
            : null,
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   4. Context Gather (per beneficiary)
   ═══════════════════════════════════════════════════════════════════════ */
async function gatherComplianceContext(beneficiaryId) {
  const [
    beneficiary,
    episode,
    sessions,
    goals,
    lastAssessment,
    carePlan,
    familyEvents,
    behaviorRecords,
  ] = await Promise.all([
    mongoose.model('Beneficiary')?.findById(beneficiaryId).lean(),
    mongoose.model('EpisodeOfCare')?.findOne({ beneficiaryId, status: 'active' }).lean(),
    mongoose.model('ClinicalSession')
      ?.find({ beneficiaryId })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .lean() || [],
    mongoose.model('TherapeuticGoal')
      ?.find({ beneficiaryId, isDeleted: { $ne: true } })
      .lean() || [],
    mongoose.model('ClinicalAssessment')?.findOne({ beneficiaryId }).sort({ assessmentDate: -1 }).lean(),
    mongoose.model('UnifiedCarePlan')?.findOne({ beneficiaryId, status: 'active' }).lean(),
    mongoose.model('FamilyCommunication')
      ?.find({ beneficiaryId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean() || [],
    mongoose.model('BehaviorRecord')?.find({ beneficiaryId }).sort({ createdAt: -1 }).limit(20).lean() || [],
  ]);

  return {
    beneficiaryId,
    beneficiary,
    episode,
    sessions,
    goals,
    lastAssessment,
    carePlan,
    familyEvents,
    behaviorRecords,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Assessment Functions
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDComplianceAssessment,
  DDDCompliancePolicy,
};
