'use strict';
/**
 * Phase 37 — Advanced Platform Enhancement
 * نظام التطوير المتقدم للمنصة — المرحلة 37
 *
 * 8 أنظمة جديدة:
 *  1. Accreditation Management       — إدارة الاعتماد (CARF / CBAHI / JCI)
 *  2. Family Training & Education    — تدريب وتثقيف الأسرة
 *  3. Smart Clinical Decision Support — دعم القرار السريري الذكي
 *  4. Staff Competency & CPD         — كفاءة الموظفين والتطوير المهني المستمر
 *  5. Community Outreach Programs    — برامج التواصل المجتمعي
 *  6. Digital Therapeutics           — العلاجات الرقمية
 *  7. Outcome-Based Contracting      — التعاقد القائم على النتائج
 *  8. Multi-Language Content Mgmt    — إدارة المحتوى متعدد اللغات
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ════════════════════════════════════════════════════════════════════════════
// 1. ACCREDITATION MANAGEMENT — إدارة الاعتماد
// ════════════════════════════════════════════════════════════════════════════

const accreditationStandardSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    body: {
      type: String,
      enum: ['CARF', 'CBAHI', 'JCI', 'ISO_9001', 'ISO_45001', 'JACIE', 'other'],
      required: true,
    },
    body_ar: { type: String }, // الهيئة بالعربية
    programType: {
      type: String,
      enum: [
        'medical_rehabilitation',
        'behavioral_health',
        'child_youth',
        'employment_community_services',
        'opioid_treatment',
        'durable_medical',
        'other',
      ],
      default: 'medical_rehabilitation',
    },
    standardCode: { type: String, required: true }, // e.g. "2.A.1"
    standardTitle: { type: String, required: true },
    standardTitle_ar: { type: String },
    domain: {
      type: String,
      enum: [
        'leadership',
        'human_resources',
        'clinical_services',
        'environment_safety',
        'quality_improvement',
        'rights_ethics',
        'financial',
        'information_management',
      ],
    },
    complianceStatus: {
      type: String,
      enum: ['compliant', 'partial', 'non_compliant', 'not_applicable', 'in_progress'],
      default: 'in_progress',
    },
    complianceScore: { type: Number, min: 0, max: 100, default: 0 },
    evidenceItems: [
      {
        title: String,
        description: String,
        documentRef: { type: Schema.Types.ObjectId, ref: 'Document' },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    gapAnalysis: { type: String },
    actionPlan: [
      {
        action: String,
        responsible: { type: Schema.Types.ObjectId, ref: 'User' },
        targetDate: Date,
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'overdue'],
          default: 'pending',
        },
      },
    ],
    lastReviewDate: { type: Date },
    nextReviewDate: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'accreditation_standards' }
);

const accreditationSurveySchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    body: { type: String, enum: ['CARF', 'CBAHI', 'JCI', 'ISO_9001', 'ISO_45001', 'other'] },
    surveyType: {
      type: String,
      enum: ['initial', 'renewal', 'follow_up', 'unannounced'],
      required: true,
    },
    surveyDate: { type: Date, required: true },
    surveyors: [{ name: String, title: String, organization: String }],
    overallScore: { type: Number, min: 0, max: 100 },
    outcome: {
      type: String,
      enum: ['accredited', 'accredited_with_conditions', 'deferred', 'not_accredited', 'pending'],
      default: 'pending',
    },
    accreditationPeriod: {
      startDate: Date,
      endDate: Date,
    },
    findings: [
      {
        standardCode: String,
        type: { type: String, enum: ['strength', 'quality_improvement', 'standard'] },
        description: String,
        correctionRequired: { type: Boolean, default: false },
        correctionDeadline: Date,
      },
    ],
    certificateNumber: { type: String },
    reportUrl: { type: String },
    preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  { timestamps: true, collection: 'accreditation_surveys' }
);

accreditationStandardSchema.index({ branchId: 1, body: 1, complianceStatus: 1 });
accreditationStandardSchema.index({ domain: 1, complianceScore: -1 });
accreditationSurveySchema.index({ branchId: 1, surveyDate: -1 });

// ════════════════════════════════════════════════════════════════════════════
// 2. FAMILY TRAINING & EDUCATION — تدريب وتثقيف الأسرة
// ════════════════════════════════════════════════════════════════════════════

const familyTrainingProgramSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    title: { type: String, required: true },
    title_ar: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'autism_support',
        'cerebral_palsy',
        'down_syndrome',
        'behavioral_management',
        'communication_strategies',
        'sensory_integration',
        'daily_living_skills',
        'feeding_swallowing',
        'mobility_positioning',
        'assistive_tech',
        'emotional_wellbeing',
        'legal_rights',
        'government_services',
        'general',
      ],
      required: true,
    },
    format: {
      type: String,
      enum: ['in_person', 'online', 'hybrid', 'self_paced'],
      default: 'in_person',
    },
    durationHours: { type: Number, required: true },
    maxParticipants: { type: Number, default: 20 },
    targetAudience: {
      type: [String],
      enum: ['parent', 'guardian', 'sibling', 'extended_family', 'caregiver', 'all'],
    },
    curriculum: [
      {
        sessionNumber: Number,
        title: String,
        title_ar: String,
        objectives: [String],
        materials: [String],
        duration: Number, // minutes
      },
    ],
    facilitators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    prerequisites: [String],
    learningOutcomes: [String],
    learningOutcomes_ar: [String],
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
    language: { type: String, enum: ['ar', 'en', 'both'], default: 'ar' },
    certificationOffered: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'family_training_programs' }
);

const familyTrainingEnrollmentSchema = new Schema(
  {
    programId: { type: Schema.Types.ObjectId, ref: 'FamilyTrainingProgram', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    participantName: { type: String, required: true },
    participantRelationship: {
      type: String,
      enum: ['mother', 'father', 'guardian', 'sibling', 'grandparent', 'caregiver', 'other'],
    },
    participantPhone: String,
    participantEmail: String,
    enrollmentDate: { type: Date, default: Date.now },
    scheduledDate: { type: Date },
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'completed', 'withdrawn', 'no_show'],
      default: 'enrolled',
    },
    sessionAttendance: [
      {
        sessionNumber: Number,
        attended: Boolean,
        date: Date,
        notes: String,
      },
    ],
    preAssessmentScore: { type: Number, min: 0, max: 100 },
    postAssessmentScore: { type: Number, min: 0, max: 100 },
    improvementPercentage: { type: Number },
    satisfactionRating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    certificationIssued: { type: Boolean, default: false },
    certificationDate: { type: Date },
    completedAt: { type: Date },
    facilitator: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'family_training_enrollments' }
);

familyTrainingProgramSchema.index({ branchId: 1, category: 1, status: 1 });
familyTrainingEnrollmentSchema.index({ programId: 1, beneficiaryId: 1 });
familyTrainingEnrollmentSchema.index({ branchId: 1, status: 1 });

// ════════════════════════════════════════════════════════════════════════════
// 3. SMART CLINICAL DECISION SUPPORT — دعم القرار السريري الذكي
// ════════════════════════════════════════════════════════════════════════════

const clinicalRuleEngineSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' }, // null = global rule
    ruleCode: { type: String, unique: true, required: true },
    ruleName: { type: String, required: true },
    ruleName_ar: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'medication_safety',
        'contraindication',
        'goal_milestone',
        'session_frequency',
        'discharge_readiness',
        'escalation_trigger',
        'screening_due',
        'reassessment_due',
        'risk_stratification',
        'care_gap',
      ],
      required: true,
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    triggerConditions: { type: Schema.Types.Mixed, required: true }, // JSON logic
    actions: [
      {
        type: { type: String, enum: ['alert', 'task', 'notification', 'order', 'recommendation'] },
        message: String,
        message_ar: String,
        assignTo: {
          type: String,
          enum: ['therapist', 'supervisor', 'physician', 'coordinator', 'family'],
        },
        urgency: { type: String, enum: ['immediate', '24h', '48h', '1_week'] },
      },
    ],
    isActive: { type: Boolean, default: true },
    appliesTo: {
      disabilityTypes: [String],
      ageGroups: [String],
      programs: [{ type: Schema.Types.ObjectId, ref: 'Program' }],
    },
    suppressionPeriodHours: { type: Number, default: 24 }, // avoid alert fatigue
    evidenceBase: { type: String }, // clinical guideline reference
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true, collection: 'clinical_rule_engine' }
);

const clinicalAlertSchema = new Schema(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'ClinicalRuleEngine', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    triggerContext: { type: Schema.Types.Mixed }, // snapshot of data that triggered
    alertMessage: { type: String, required: true },
    alertMessage_ar: { type: String },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'suppressed', 'escalated'],
      default: 'active',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolutionAction: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: { type: Date },
    suppressedUntil: { type: Date },
  },
  { timestamps: true, collection: 'clinical_alerts' }
);

clinicalRuleEngineSchema.index({ category: 1, isActive: 1, priority: 1 });
clinicalAlertSchema.index({ beneficiaryId: 1, status: 1 });
clinicalAlertSchema.index({ branchId: 1, priority: 1, createdAt: -1 });

// ════════════════════════════════════════════════════════════════════════════
// 4. STAFF COMPETENCY & CPD — كفاءة الموظفين والتطوير المهني المستمر
// ════════════════════════════════════════════════════════════════════════════

const competencyFrameworkSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    jobRole: { type: String, required: true }, // e.g. 'Occupational Therapist'
    jobRole_ar: { type: String },
    level: {
      type: String,
      enum: ['entry', 'intermediate', 'senior', 'specialist', 'lead'],
      required: true,
    },
    competencies: [
      {
        domain: {
          type: String,
          enum: [
            'clinical',
            'professional',
            'communication',
            'leadership',
            'technical',
            'compliance',
          ],
        },
        name: String,
        name_ar: String,
        description: String,
        indicators: [String], // behavioral indicators
        weight: { type: Number, default: 1 },
        requiredScore: { type: Number, min: 0, max: 100, default: 70 },
      },
    ],
    cpdRequirementHoursPerYear: { type: Number, default: 30 },
    mandatoryTrainings: [String],
    licenseRequirements: [{ body: String, hoursRequired: Number }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'competency_frameworks' }
);

const staffCompetencyAssessmentSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'CompetencyFramework', required: true },
    assessmentDate: { type: Date, default: Date.now },
    assessmentType: {
      type: String,
      enum: ['self', 'supervisor', '360', 'annual', 'probation'],
      default: 'annual',
    },
    assessorId: { type: Schema.Types.ObjectId, ref: 'User' },
    competencyScores: [
      {
        competencyName: String,
        domain: String,
        selfScore: { type: Number, min: 0, max: 100 },
        supervisorScore: { type: Number, min: 0, max: 100 },
        finalScore: { type: Number, min: 0, max: 100 },
        evidence: String,
        developmentGoal: String,
      },
    ],
    overallScore: { type: Number, min: 0, max: 100 },
    overallRating: { type: String, enum: ['exceeds', 'meets', 'partially_meets', 'does_not_meet'] },
    strengths: [String],
    developmentAreas: [String],
    developmentPlan: [
      {
        area: String,
        action: String,
        resourcesNeeded: String,
        targetDate: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'self_assessment', 'supervisor_review', 'completed', 'disputed'],
      default: 'draft',
    },
    employeeSignedAt: { type: Date },
    supervisorSignedAt: { type: Date },
    nextAssessmentDate: { type: Date },
  },
  { timestamps: true, collection: 'staff_competency_assessments' }
);

const cpdRecordAdvancedSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    year: { type: Number, required: true },
    activities: [
      {
        type: {
          type: String,
          enum: [
            'conference',
            'workshop',
            'online_course',
            'journal_article',
            'case_study',
            'mentoring',
            'clinical_audit',
            'supervision',
            'other',
          ],
        },
        title: String,
        provider: String,
        date: Date,
        hoursEarned: Number,
        ceuCredits: Number, // Continuing Education Units
        verificationDocument: String,
        isVerified: { type: Boolean, default: false },
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        licenseCategory: { type: String, enum: ['mandatory', 'elective'] },
        notes: String,
      },
    ],
    totalHoursEarned: { type: Number, default: 0 },
    totalCEUEarned: { type: Number, default: 0 },
    targetHours: { type: Number, default: 30 },
    complianceStatus: {
      type: String,
      enum: ['on_track', 'at_risk', 'non_compliant', 'completed'],
      default: 'on_track',
    },
    portfolioUrl: { type: String },
    submittedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true, collection: 'cpd_records_advanced' }
);

competencyFrameworkSchema.index({ jobRole: 1, level: 1 });
staffCompetencyAssessmentSchema.index({ employeeId: 1, assessmentDate: -1 });
cpdRecordAdvancedSchema.index({ employeeId: 1, year: -1 });
cpdRecordAdvancedSchema.index({ branchId: 1, complianceStatus: 1 });

// ════════════════════════════════════════════════════════════════════════════
// 5. COMMUNITY OUTREACH PROGRAMS — برامج التواصل المجتمعي
// ════════════════════════════════════════════════════════════════════════════

const outreachProgramSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    title: { type: String, required: true },
    title_ar: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'awareness_campaign',
        'free_screening',
        'school_visit',
        'community_lecture',
        'media_engagement',
        'parent_support_group',
        'disability_sports',
        'art_therapy_event',
        'employment_fair',
        'government_partnership',
        'ngo_collaboration',
        'ramadan_initiative',
        'national_day_event',
      ],
      required: true,
    },
    targetAudience: [String],
    targetRegion: { type: String },
    targetSchools: [{ name: String, contactPerson: String, phone: String }],
    scheduledDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String },
    coordinators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    volunteers: [{ type: Schema.Types.ObjectId, ref: 'Volunteer' }],
    budget: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    expectedAttendees: { type: Number },
    actualAttendees: { type: Number },
    referralsGenerated: { type: Number, default: 0 },
    screeningResults: [
      {
        category: String,
        count: Number,
        referredForFullAssessment: Number,
      },
    ],
    mediaContent: [{ type: String, url: String, platform: String }],
    outcomes: { type: String },
    outcomes_ar: { type: String },
    satisfactionScore: { type: Number, min: 0, max: 5 },
    status: {
      type: String,
      enum: ['planning', 'approved', 'in_progress', 'completed', 'cancelled'],
      default: 'planning',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    partnerOrganizations: [{ name: String, type: String, contactPerson: String }],
    sdgAlignment: [{ goal: String, indicator: String }], // UN SDGs / Vision 2030
  },
  { timestamps: true, collection: 'outreach_programs' }
);

outreachProgramSchema.index({ branchId: 1, scheduledDate: -1 });
outreachProgramSchema.index({ type: 1, status: 1 });

// ════════════════════════════════════════════════════════════════════════════
// 6. DIGITAL THERAPEUTICS — العلاجات الرقمية
// ════════════════════════════════════════════════════════════════════════════

const digitalTherapeuticSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    prescribedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    programType: {
      type: String,
      enum: [
        'cognitive_training',
        'speech_language',
        'motor_rehabilitation',
        'behavioral_support',
        'social_skills',
        'attention_memory',
        'emotional_regulation',
        'sensory_processing',
        'aac_practice', // Augmentative & Alternative Communication
        'daily_living_skills',
      ],
      required: true,
    },
    platform: {
      type: String,
      enum: ['mobile_app', 'web_app', 'vr_headset', 'tablet_game', 'wearable', 'robot_assisted'],
    },
    appName: { type: String },
    prescriptionDetails: {
      sessionsPerWeek: { type: Number, default: 3 },
      minutesPerSession: { type: Number, default: 20 },
      totalWeeks: { type: Number, default: 8 },
      difficultyLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'adaptive'] },
      goals: [String],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    adherenceData: [
      {
        date: Date,
        sessionCompleted: Boolean,
        durationMinutes: Number,
        exercisesCompleted: Number,
        performanceScore: Number,
        engagementScore: Number,
        deviceUsed: String,
      },
    ],
    progressMetrics: [
      {
        date: Date,
        metricName: String,
        value: Number,
        unit: String,
        benchmark: Number,
      },
    ],
    adherenceRate: { type: Number, min: 0, max: 100 },
    overallProgress: { type: Number, min: 0, max: 100 },
    clinicalOutcomes: { type: String },
    sideEffects: { type: String },
    status: {
      type: String,
      enum: ['prescribed', 'active', 'paused', 'completed', 'discontinued'],
      default: 'prescribed',
    },
    discontinuationReason: { type: String },
    linkedTherapySession: [{ type: Schema.Types.ObjectId, ref: 'Session' }],
  },
  { timestamps: true, collection: 'digital_therapeutics' }
);

digitalTherapeuticSchema.index({ beneficiaryId: 1, status: 1 });
digitalTherapeuticSchema.index({ branchId: 1, programType: 1 });

// ════════════════════════════════════════════════════════════════════════════
// 7. OUTCOME-BASED CONTRACTING — التعاقد القائم على النتائج
// ════════════════════════════════════════════════════════════════════════════

const outcomeContractSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    contractNumber: { type: String, required: true },
    contractingParty: {
      type: {
        type: String,
        enum: ['insurance', 'government', 'employer', 'ngo', 'municipality', 'private'],
      },
      name: String,
      name_ar: String,
      contactPerson: String,
      email: String,
      phone: String,
    },
    beneficiaryScope: {
      type: { type: String, enum: ['individual', 'population', 'diagnosis_group', 'program'] },
      beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      populationDescription: String,
      estimatedCount: Number,
    },
    contractPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    financialTerms: {
      baseFee: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
      paymentModel: {
        type: String,
        enum: [
          'pay_for_performance',
          'shared_savings',
          'bundled_payment',
          'capitation',
          'milestone',
        ],
      },
      maxOutcomeBonus: { type: Number, default: 0 },
      penaltyClause: { type: Number, default: 0 },
    },
    outcomeMetrics: [
      {
        metricName: String,
        metricName_ar: String,
        measurementTool: String,
        baselineValue: Number,
        targetValue: Number,
        weight: { type: Number, default: 1 },
        measurementFrequency: {
          type: String,
          enum: ['monthly', 'quarterly', 'biannual', 'annual'],
        },
        currentValue: Number,
        achievementPercentage: { type: Number, default: 0 },
      },
    ],
    milestones: [
      {
        title: String,
        dueDate: Date,
        paymentAmount: Number,
        isAchieved: { type: Boolean, default: false },
        achievedDate: Date,
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    performanceReports: [
      {
        reportingPeriod: String,
        submittedDate: Date,
        overallScore: Number,
        paymentEarned: Number,
        submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
      },
    ],
    totalPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'negotiation', 'active', 'suspended', 'completed', 'terminated'],
      default: 'draft',
    },
    signedDate: { type: Date },
    signedBy: [{ party: String, userId: { type: Schema.Types.ObjectId, ref: 'User' }, date: Date }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'outcome_contracts' }
);

outcomeContractSchema.index({ branchId: 1, status: 1 });
outcomeContractSchema.index({ 'contractingParty.type': 1, status: 1 });
outcomeContractSchema.index({ contractNumber: 1 }, { unique: true });

// ════════════════════════════════════════════════════════════════════════════
// 8. MULTI-LANGUAGE CONTENT MANAGEMENT — إدارة المحتوى متعدد اللغات
// ════════════════════════════════════════════════════════════════════════════

const contentLibrarySchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' }, // null = shared library
    contentKey: { type: String, required: true }, // unique slug
    contentType: {
      type: String,
      enum: [
        'patient_education',
        'home_program_instruction',
        'policy_document',
        'consent_form',
        'assessment_guide',
        'therapy_protocol',
        'caregiver_tip',
        'faq',
        'newsletter',
        'social_post',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'autism',
        'cerebral_palsy',
        'down_syndrome',
        'adhd',
        'speech_language',
        'physical',
        'sensory',
        'general',
      ],
    },
    versions: [
      {
        language: { type: String, enum: ['ar', 'en', 'ur', 'tl', 'hi'], required: true },
        title: { type: String, required: true },
        body: { type: String },
        summary: String,
        readingLevel: { type: String, enum: ['basic', 'intermediate', 'advanced'] },
        format: { type: String, enum: ['text', 'video', 'infographic', 'audio', 'pdf'] },
        fileUrl: String,
        thumbnailUrl: String,
        isActive: { type: Boolean, default: true },
        translatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date,
        publishedAt: Date,
      },
    ],
    tags: [String],
    targetAudience: [
      { type: String, enum: ['beneficiary', 'family', 'staff', 'public', 'referrer'] },
    ],
    isPublic: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    status: { type: String, enum: ['draft', 'review', 'published', 'archived'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'content_library' }
);

contentLibrarySchema.index({ contentKey: 1 }, { unique: true });
contentLibrarySchema.index({ contentType: 1, status: 1 });
contentLibrarySchema.index({ tags: 1 });

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

const AccreditationStandard =
  mongoose.models.AccreditationStandard ||
  mongoose.model('AccreditationStandard', accreditationStandardSchema);
const AccreditationSurvey =
  mongoose.models.AccreditationSurvey ||
  mongoose.model('AccreditationSurvey', accreditationSurveySchema);
const FamilyTrainingProgram =
  mongoose.models.FamilyTrainingProgram ||
  mongoose.model('FamilyTrainingProgram', familyTrainingProgramSchema);
const FamilyTrainingEnrollment =
  mongoose.models.FamilyTrainingEnrollment ||
  mongoose.model('FamilyTrainingEnrollment', familyTrainingEnrollmentSchema);
const ClinicalRuleEngine =
  mongoose.models.ClinicalRuleEngine ||
  mongoose.model('ClinicalRuleEngine', clinicalRuleEngineSchema);
const ClinicalAlert =
  mongoose.models.ClinicalAlert || mongoose.model('ClinicalAlert', clinicalAlertSchema);
const CompetencyFramework =
  mongoose.models.CompetencyFramework ||
  mongoose.model('CompetencyFramework', competencyFrameworkSchema);
const StaffCompetencyAssessment =
  mongoose.models.StaffCompetencyAssessment ||
  mongoose.model('StaffCompetencyAssessment', staffCompetencyAssessmentSchema);
const CpdRecordAdvanced =
  mongoose.models.CpdRecordAdvanced || mongoose.model('CpdRecordAdvanced', cpdRecordAdvancedSchema);
const OutreachProgram =
  mongoose.models.OutreachProgram || mongoose.model('OutreachProgram', outreachProgramSchema);
const DigitalTherapeutic =
  mongoose.models.DigitalTherapeutic ||
  mongoose.model('DigitalTherapeutic', digitalTherapeuticSchema);
const OutcomeContract =
  mongoose.models.OutcomeContract || mongoose.model('OutcomeContract', outcomeContractSchema);
const ContentLibrary =
  mongoose.models.ContentLibrary || mongoose.model('ContentLibrary', contentLibrarySchema);

module.exports = {
  AccreditationStandard,
  AccreditationSurvey,
  FamilyTrainingProgram,
  FamilyTrainingEnrollment,
  ClinicalRuleEngine,
  ClinicalAlert,
  CompetencyFramework,
  StaffCompetencyAssessment,
  CpdRecordAdvanced,
  OutreachProgram,
  DigitalTherapeutic,
  OutcomeContract,
  ContentLibrary,
};
