/**
 * Enterprise Ultra Models — نماذج المؤسسة الفائقة
 *
 * Session 5: 6 advanced enterprise modules, 30 schemas
 *   1. Legal & Contract Lifecycle Management (الشؤون القانونية)
 *   2. Corporate Governance & Board Management (الحوكمة المؤسسية)
 *   3. Business Continuity & Crisis Management (استمرارية الأعمال)
 *   4. Customer Experience & Satisfaction (تجربة العملاء)
 *   5. Energy & Sustainability / ESG (الطاقة والاستدامة)
 *   6. Digital Transformation & Innovation Hub (التحول الرقمي)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════════════════════════════════════════════════════════════
   1. LEGAL & CONTRACT LIFECYCLE MANAGEMENT — الشؤون القانونية
   ═══════════════════════════════════════════════════════════════════════════ */

const LegalCaseSchema = new Schema(
  {
    caseNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    caseType: {
      type: String,
      enum: ['litigation', 'arbitration', 'labor_dispute', 'commercial', 'regulatory', 'ip', 'criminal', 'administrative'],
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'hearing_scheduled', 'awaiting_judgment', 'won', 'lost', 'settled', 'dismissed', 'appealed', 'closed'],
      default: 'open',
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    description: { type: String },
    court: { name: String, city: String, branch: String },
    judge: { name: String },
    plaintiff: { name: String, type: { type: String, enum: ['internal', 'external'] } },
    defendant: { name: String, type: { type: String, enum: ['internal', 'external'] } },
    assignedLawyer: { type: Schema.Types.ObjectId, ref: 'User' },
    externalCounsel: { firmName: String, lawyerName: String, contact: String },
    filingDate: { type: Date },
    nextHearingDate: { type: Date },
    claimAmount: { type: Number, default: 0 },
    settlementAmount: { type: Number },
    closedDate: { type: Date },
    outcome: { type: String },
    documents: [{ name: String, fileUrl: String, uploadedAt: Date }],
    timeline: [{ date: Date, event: String, description: String, addedBy: { type: Schema.Types.ObjectId, ref: 'User' } }],
    tags: [String],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const CourtHearingSchema = new Schema(
  {
    case: { type: Schema.Types.ObjectId, ref: 'LegalCase', required: true },
    hearingDate: { type: Date, required: true },
    hearingType: { type: String, enum: ['initial', 'discovery', 'trial', 'appeal', 'mediation', 'settlement', 'procedural'], required: true },
    location: { court: String, room: String, virtual: Boolean, link: String },
    status: { type: String, enum: ['scheduled', 'completed', 'postponed', 'cancelled'], default: 'scheduled' },
    attendees: [{ name: String, role: String, present: Boolean }],
    outcome: { type: String },
    nextSteps: { type: String },
    notes: { type: String },
    documents: [{ name: String, fileUrl: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const PowerOfAttorneySchema = new Schema(
  {
    poaNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    poaType: { type: String, enum: ['general', 'special', 'limited', 'durable', 'financial', 'healthcare', 'litigation'], required: true },
    grantor: { name: String, idNumber: String, position: String },
    grantee: { name: String, idNumber: String, position: String },
    scope: { type: String, required: true },
    status: { type: String, enum: ['active', 'expired', 'revoked', 'pending_notarization', 'draft'], default: 'draft' },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    notarizedBy: { type: String },
    notarizationDate: { type: Date },
    delegationChain: [{ from: String, to: String, date: Date, scope: String }],
    restrictions: [String],
    documents: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const LegalOpinionSchema = new Schema(
  {
    opinionNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    category: { type: String, enum: ['contract_review', 'compliance', 'risk_assessment', 'policy_interpretation', 'litigation_strategy', 'regulatory', 'employment_law', 'ip_protection'] },
    status: { type: String, enum: ['requested', 'in_review', 'draft_ready', 'approved', 'delivered', 'archived'], default: 'requested' },
    priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'], default: 'normal' },
    question: { type: String, required: true },
    opinion: { type: String },
    recommendation: { type: String },
    references: [{ title: String, citation: String }],
    deliveryDate: { type: Date },
    tags: [String],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const RegulatoryFilingSchema = new Schema(
  {
    filingNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    regulatoryBody: { type: String, required: true },
    filingType: { type: String, enum: ['annual_report', 'license_renewal', 'tax_filing', 'compliance_report', 'permit', 'registration', 'disclosure', 'audit_response'] },
    status: { type: String, enum: ['upcoming', 'in_preparation', 'submitted', 'under_review', 'approved', 'rejected', 'overdue'], default: 'upcoming' },
    dueDate: { type: Date, required: true },
    submissionDate: { type: Date },
    approvalDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    notes: { type: String },
    penalty: { amount: Number, description: String },
    reminderDays: [Number],
    documents: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════════════════
   2. CORPORATE GOVERNANCE & BOARD MANAGEMENT — الحوكمة المؤسسية
   ═══════════════════════════════════════════════════════════════════════════ */

const BoardMeetingSchema = new Schema(
  {
    meetingNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    meetingType: { type: String, enum: ['regular', 'extraordinary', 'annual_general', 'special', 'committee'], required: true },
    status: { type: String, enum: ['draft', 'scheduled', 'in_session', 'adjourned', 'completed', 'cancelled'], default: 'draft' },
    date: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    location: { type: String },
    virtual: { enabled: Boolean, link: String, platform: String },
    chairman: { type: Schema.Types.ObjectId, ref: 'User' },
    secretary: { type: Schema.Types.ObjectId, ref: 'User' },
    quorumRequired: { type: Number, default: 50 },
    quorumAchieved: { type: Boolean, default: false },
    agenda: [{ order: Number, title: String, presenter: String, duration: Number, status: { type: String, enum: ['pending', 'discussed', 'deferred', 'approved', 'rejected'] } }],
    attendees: [{ member: { type: Schema.Types.ObjectId, ref: 'User' }, name: String, role: String, present: Boolean, proxy: String }],
    minutes: { type: String },
    decisions: [{ title: String, description: String, votesFor: Number, votesAgainst: Number, abstentions: Number, result: { type: String, enum: ['approved', 'rejected', 'deferred'] } }],
    actionItems: [{ title: String, assignee: String, dueDate: Date, status: String }],
    attachments: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const BoardCommitteeSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    committeeType: { type: String, enum: ['audit', 'risk', 'nomination', 'remuneration', 'governance', 'executive', 'compliance', 'strategy', 'ad_hoc'], required: true },
    status: { type: String, enum: ['active', 'dissolved', 'suspended'], default: 'active' },
    mandate: { type: String },
    chairman: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, name: String, role: { type: String, enum: ['chairman', 'member', 'secretary', 'advisor'] }, joinDate: Date, termEnd: Date, status: { type: String, enum: ['active', 'rotated', 'resigned'] } }],
    meetingFrequency: { type: String, enum: ['weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'as_needed'] },
    minMembers: { type: Number, default: 3 },
    maxMembers: { type: Number, default: 7 },
    charter: { type: String },
    kpis: [{ metric: String, target: String, actual: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const BoardResolutionSchema = new Schema(
  {
    resolutionNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    meeting: { type: Schema.Types.ObjectId, ref: 'BoardMeeting' },
    committee: { type: Schema.Types.ObjectId, ref: 'BoardCommittee' },
    resolutionType: { type: String, enum: ['ordinary', 'special', 'circular', 'unanimous', 'emergency'], required: true },
    category: { type: String, enum: ['financial', 'strategic', 'operational', 'governance', 'hr', 'legal', 'compliance'] },
    status: { type: String, enum: ['draft', 'proposed', 'voting', 'approved', 'rejected', 'implemented', 'superseded', 'withdrawn'], default: 'draft' },
    description: { type: String, required: true },
    proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    votingDeadline: { type: Date },
    votes: { for: { type: Number, default: 0 }, against: { type: Number, default: 0 }, abstain: { type: Number, default: 0 } },
    result: { type: String, enum: ['passed', 'failed', 'pending'] },
    implementationPlan: { description: String, responsiblePerson: { type: Schema.Types.ObjectId, ref: 'User' }, deadline: Date, milestones: [{ title: String, dueDate: Date, completed: Boolean }] },
    implementationStatus: { type: String, enum: ['not_started', 'in_progress', 'completed', 'overdue'], default: 'not_started' },
    documents: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const GovernancePolicySchema = new Schema(
  {
    policyNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    category: { type: String, enum: ['board_charter', 'code_of_conduct', 'conflict_of_interest', 'disclosure', 'risk_management', 'audit', 'whistleblower', 'anti_corruption', 'data_privacy', 'compliance', 'sustainability'], required: true },
    status: { type: String, enum: ['draft', 'under_review', 'approved', 'active', 'archived', 'superseded'], default: 'draft' },
    version: { type: String, default: '1.0' },
    effectiveDate: { type: Date },
    reviewDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String },
    summary: { type: String },
    complianceMapping: [{ regulation: String, section: String, status: String }],
    acknowledgments: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, date: Date, acknowledged: Boolean }],
    revisionHistory: [{ version: String, date: Date, changes: String, author: { type: Schema.Types.ObjectId, ref: 'User' } }],
    documents: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const GovernanceReportSchema = new Schema(
  {
    reportNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    reportType: { type: String, enum: ['annual_governance', 'board_evaluation', 'compliance_status', 'committee_performance', 'risk_assessment', 'cma_disclosure', 'esg_governance'], required: true },
    period: { from: Date, to: Date },
    status: { type: String, enum: ['draft', 'in_progress', 'review', 'approved', 'published'], default: 'draft' },
    preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    scores: { overall: Number, board: Number, committees: Number, transparency: Number, compliance: Number },
    findings: [{ area: String, finding: String, severity: { type: String, enum: ['critical', 'major', 'minor', 'observation'] }, recommendation: String }],
    content: { type: String },
    publishedDate: { type: Date },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════════════════
   3. BUSINESS CONTINUITY & CRISIS MANAGEMENT — استمرارية الأعمال
   ═══════════════════════════════════════════════════════════════════════════ */

const BCPPlanSchema = new Schema(
  {
    planNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    planType: { type: String, enum: ['enterprise_bcp', 'department_bcp', 'it_drp', 'pandemic', 'natural_disaster', 'cyber_incident', 'supply_chain'], required: true },
    status: { type: String, enum: ['draft', 'under_review', 'approved', 'active', 'outdated', 'archived'], default: 'draft' },
    version: { type: String, default: '1.0' },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    scope: { type: String },
    objectives: [String],
    criticalProcesses: [{ name: String, rto: Number, rpo: Number, priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] }, dependencies: [String] }],
    recoveryStrategies: [{ process: String, strategy: String, resources: [String], estimatedTime: Number }],
    contactList: [{ name: String, role: String, phone: String, email: String, alternatePhone: String }],
    activationCriteria: [{ scenario: String, threshold: String, activatedBy: String }],
    lastTestedDate: { type: Date },
    nextReviewDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedDate: { type: Date },
    documents: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const BusinessImpactAnalysisSchema = new Schema(
  {
    biaNumber: { type: String, required: true, unique: true },
    processName: { type: String, required: true },
    department: { type: String, required: true },
    processOwner: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['draft', 'in_assessment', 'reviewed', 'approved'], default: 'draft' },
    criticality: { type: String, enum: ['mission_critical', 'essential', 'important', 'non_critical'], required: true },
    rto: { hours: Number, justification: String },
    rpo: { hours: Number, justification: String },
    mtpd: { hours: Number },
    financialImpact: { hourly: Number, daily: Number, weekly: Number, monthly: Number },
    operationalImpact: { description: String, severity: { type: String, enum: ['catastrophic', 'major', 'moderate', 'minor', 'negligible'] } },
    reputationalImpact: { description: String, severity: String },
    regulatoryImpact: { description: String, severity: String },
    dependencies: { internal: [{ process: String, criticality: String }], external: [{ vendor: String, service: String, criticality: String }], technology: [{ system: String, criticality: String }] },
    minimumResources: { staff: Number, workstations: Number, specialEquipment: [String] },
    peakPeriods: [{ period: String, reason: String }],
    assessedDate: { type: Date },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const CrisisIncidentSchema = new Schema(
  {
    incidentNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    crisisType: { type: String, enum: ['natural_disaster', 'cyber_attack', 'pandemic', 'infrastructure_failure', 'supply_chain', 'financial', 'reputational', 'regulatory', 'security_breach', 'industrial_accident'], required: true },
    severity: { type: String, enum: ['level_1_critical', 'level_2_major', 'level_3_moderate', 'level_4_minor'], required: true },
    status: { type: String, enum: ['detected', 'assessed', 'activated', 'responding', 'recovering', 'resolved', 'post_mortem'], default: 'detected' },
    detectedAt: { type: Date, default: Date.now },
    activatedAt: { type: Date },
    resolvedAt: { type: Date },
    commanderInCharge: { type: Schema.Types.ObjectId, ref: 'User' },
    crisisTeam: [{ member: { type: Schema.Types.ObjectId, ref: 'User' }, role: String, contactMethod: String }],
    affectedAreas: [{ area: String, impact: String }],
    escalationPath: [{ level: Number, notifiedAt: Date, notifiedPerson: String, response: String }],
    communications: [{ timestamp: Date, channel: String, message: String, audience: String, sentBy: { type: Schema.Types.ObjectId, ref: 'User' } }],
    actionLog: [{ timestamp: Date, action: String, performedBy: String, result: String }],
    lessonsLearned: [{ lesson: String, recommendation: String, priority: String }],
    estimatedLoss: { type: Number, default: 0 },
    bcpActivated: { type: Schema.Types.ObjectId, ref: 'BCPPlan' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const BCDrillSchema = new Schema(
  {
    drillNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    drillType: { type: String, enum: ['tabletop', 'functional', 'full_scale', 'walkthrough', 'simulation', 'notification', 'it_recovery'], required: true },
    scenario: { type: String, required: true },
    bcpPlan: { type: Schema.Types.ObjectId, ref: 'BCPPlan' },
    status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled', 'postponed'], default: 'planned' },
    scheduledDate: { type: Date, required: true },
    duration: { planned: Number, actual: Number },
    facilitator: { type: Schema.Types.ObjectId, ref: 'User' },
    participants: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, name: String, role: String, attended: Boolean, performance: { type: String, enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'] } }],
    objectives: [{ objective: String, achieved: Boolean, notes: String }],
    overallScore: { type: Number, min: 0, max: 100 },
    rtoAchieved: { target: Number, actual: Number, met: Boolean },
    findings: [{ finding: String, severity: String, corrective: String, dueDate: Date, assignee: String }],
    lessonsLearned: [String],
    afterActionReport: { type: String },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const DisasterRecoveryPlanSchema = new Schema(
  {
    drpNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    systemName: { type: String, required: true },
    tier: { type: String, enum: ['tier_1_critical', 'tier_2_essential', 'tier_3_important', 'tier_4_non_critical'], required: true },
    status: { type: String, enum: ['draft', 'approved', 'active', 'testing', 'outdated'], default: 'draft' },
    rto: { type: Number },
    rpo: { type: Number },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    infrastructure: { servers: [{ name: String, type: String, location: String }], databases: [{ name: String, size: String, backupFrequency: String }], networks: [{ name: String, type: String }] },
    backupStrategy: { method: { type: String, enum: ['full', 'incremental', 'differential', 'continuous'] }, frequency: String, location: String, retentionDays: Number, lastVerified: Date },
    recoveryProcedures: [{ step: Number, description: String, responsible: String, estimatedTime: Number, prerequisites: [String] }],
    failoverConfig: { type: { type: String, enum: ['hot', 'warm', 'cold', 'cloud'] }, target: String, switchoverTime: Number },
    testResults: [{ testDate: Date, testType: String, result: { type: String, enum: ['pass', 'partial', 'fail'] }, rtoActual: Number, notes: String }],
    lastTestedDate: { type: Date },
    nextTestDate: { type: Date },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════════════════
   4. CUSTOMER EXPERIENCE & SATISFACTION — تجربة العملاء والرضا
   ═══════════════════════════════════════════════════════════════════════════ */

const CXSurveySchema = new Schema(
  {
    surveyNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    surveyType: { type: String, enum: ['nps', 'csat', 'ces', 'custom', 'post_interaction', 'periodic', 'event_based'], required: true },
    status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'archived'], default: 'draft' },
    channel: { type: String, enum: ['email', 'sms', 'web', 'app', 'whatsapp', 'kiosk', 'qr_code'], default: 'web' },
    questions: [{ order: Number, text: String, textAr: String, type: { type: String, enum: ['nps_scale', 'rating_5', 'rating_10', 'yes_no', 'multiple_choice', 'open_text', 'emoji'] }, options: [String], required: Boolean }],
    targetAudience: { segment: String, criteria: {} },
    schedule: { startDate: Date, endDate: Date, frequency: { type: String, enum: ['one_time', 'daily', 'weekly', 'monthly', 'quarterly'] } },
    responseCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    npsScore: { type: Number },
    completionRate: { type: Number, default: 0 },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const CXFeedbackSchema = new Schema(
  {
    feedbackNumber: { type: String, required: true, unique: true },
    survey: { type: Schema.Types.ObjectId, ref: 'CXSurvey' },
    source: { type: String, enum: ['survey', 'social_media', 'email', 'phone', 'walk_in', 'app', 'website', 'whatsapp'], required: true },
    customerName: { type: String },
    customerContact: { type: String },
    sentiment: { type: String, enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'] },
    score: { type: Number, min: 0, max: 10 },
    category: { type: String, enum: ['service_quality', 'product', 'pricing', 'staff', 'facility', 'wait_time', 'communication', 'general'] },
    department: { type: String },
    feedbackText: { type: String },
    responses: [{ questionId: String, answer: Schema.Types.Mixed }],
    status: { type: String, enum: ['new', 'reviewed', 'action_required', 'resolved', 'archived'], default: 'new' },
    actionTaken: { type: String },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const CXComplaintSchema = new Schema(
  {
    complaintNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    customerName: { type: String, required: true },
    customerContact: { phone: String, email: String },
    channel: { type: String, enum: ['phone', 'email', 'web', 'app', 'walk_in', 'social_media', 'whatsapp'], required: true },
    category: { type: String, enum: ['service_failure', 'product_defect', 'billing', 'staff_behavior', 'wait_time', 'policy', 'accessibility', 'safety', 'general'] },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    status: { type: String, enum: ['open', 'acknowledged', 'investigating', 'escalated', 'resolved', 'closed', 'reopened'], default: 'open' },
    description: { type: String, required: true },
    department: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalationLevel: { type: Number, default: 0 },
    escalationHistory: [{ level: Number, escalatedTo: String, date: Date, reason: String }],
    sla: { responseDeadline: Date, resolutionDeadline: Date, respondedAt: Date, resolvedAt: Date, breached: Boolean },
    resolution: { type: String },
    rootCause: { type: String },
    compensationOffered: { type: String },
    customerSatisfied: { type: Boolean },
    preventiveActions: [String],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const CustomerJourneySchema = new Schema(
  {
    journeyName: { type: String, required: true },
    journeyType: { type: String, enum: ['onboarding', 'service_delivery', 'support', 'renewal', 'feedback', 'complaint_resolution', 'custom'], required: true },
    status: { type: String, enum: ['draft', 'active', 'optimizing', 'archived'], default: 'draft' },
    personas: [{ name: String, description: String, demographics: {} }],
    touchpoints: [{ order: Number, name: String, channel: String, description: String, emotion: { type: String, enum: ['delighted', 'satisfied', 'neutral', 'frustrated', 'angry'] }, painPoints: [String], opportunities: [String], metrics: { satisfaction: Number, dropOffRate: Number, avgDuration: Number } }],
    overallSatisfaction: { type: Number },
    completionRate: { type: Number },
    averageDuration: { type: Number },
    improvementActions: [{ action: String, touchpoint: String, priority: String, status: String, owner: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const ServiceBenchmarkSchema = new Schema(
  {
    benchmarkName: { type: String, required: true },
    department: { type: String, required: true },
    period: { from: Date, to: Date },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    kpis: [{ name: String, target: Number, actual: Number, unit: String, trend: { type: String, enum: ['improving', 'stable', 'declining'] }, weight: Number }],
    overallScore: { type: Number, min: 0, max: 100 },
    ranking: { current: Number, previous: Number, total: Number },
    peerComparison: [{ peerName: String, score: Number }],
    improvementPlan: [{ action: String, kpi: String, expectedImpact: Number, deadline: Date, status: { type: String, enum: ['planned', 'in_progress', 'completed'] } }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════════════════
   5. ENERGY & SUSTAINABILITY / ESG — الطاقة والاستدامة
   ═══════════════════════════════════════════════════════════════════════════ */

const EnergyReadingSchema = new Schema(
  {
    readingNumber: { type: String, required: true },
    facility: { type: String, required: true },
    zone: { type: String },
    energyType: { type: String, enum: ['electricity', 'natural_gas', 'diesel', 'solar', 'water', 'steam', 'chilled_water'], required: true },
    meterNumber: { type: String },
    readingDate: { type: Date, required: true },
    currentReading: { type: Number, required: true },
    previousReading: { type: Number },
    consumption: { type: Number },
    unit: { type: String, enum: ['kWh', 'MWh', 'm3', 'gallons', 'liters', 'BTU', 'therms'], default: 'kWh' },
    cost: { amount: Number, currency: { type: String, default: 'SAR' }, tariff: Number },
    benchmarkConsumption: { type: Number },
    anomaly: { detected: Boolean, type: String, severity: String },
    weather: { temperature: Number, humidity: Number },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const CarbonFootprintSchema = new Schema(
  {
    reportNumber: { type: String, required: true, unique: true },
    period: { from: Date, to: Date },
    facility: { type: String },
    status: { type: String, enum: ['draft', 'calculated', 'verified', 'published'], default: 'draft' },
    scope1: {
      total: Number,
      sources: [{ source: String, fuelType: String, quantity: Number, unit: String, emissionFactor: Number, emissions: Number }],
    },
    scope2: {
      total: Number,
      method: { type: String, enum: ['location_based', 'market_based'] },
      sources: [{ source: String, consumption: Number, unit: String, emissionFactor: Number, emissions: Number }],
    },
    scope3: {
      total: Number,
      categories: [{ category: String, description: String, emissions: Number, dataQuality: String }],
    },
    totalEmissions: { type: Number },
    target: { amount: Number, year: Number, baselineYear: Number, baselineAmount: Number },
    reductionPercentage: { type: Number },
    offsets: [{ project: String, type: String, credits: Number, cost: Number, verified: Boolean }],
    intensity: { perEmployee: Number, perRevenue: Number, perSquareMeter: Number },
    verifiedBy: { type: String },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const WasteRecordSchema = new Schema(
  {
    recordNumber: { type: String, required: true },
    facility: { type: String, required: true },
    wasteType: { type: String, enum: ['general', 'recyclable', 'organic', 'hazardous', 'electronic', 'medical', 'construction', 'paper', 'plastic', 'metal', 'glass'], required: true },
    category: { type: String, enum: ['municipal', 'industrial', 'commercial', 'special'] },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['kg', 'tons', 'liters', 'm3'], default: 'kg' },
    disposalMethod: { type: String, enum: ['landfill', 'recycling', 'composting', 'incineration', 'reuse', 'special_treatment', 'energy_recovery'] },
    recyclingRate: { type: Number, min: 0, max: 100 },
    collector: { company: String, licenseNumber: String },
    destination: { facility: String, location: String },
    cost: { type: Number, default: 0 },
    date: { type: Date, required: true },
    documentation: [{ name: String, fileUrl: String }],
    compliance: { regulatoryBody: String, compliant: Boolean, notes: String },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const ESGReportSchema = new Schema(
  {
    reportNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    framework: { type: String, enum: ['gri', 'sasb', 'tcfd', 'cdp', 'ungc', 'sdg', 'custom', 'saudi_vision_2030'], required: true },
    period: { from: Date, to: Date },
    status: { type: String, enum: ['draft', 'data_collection', 'review', 'approved', 'published'], default: 'draft' },
    environmental: {
      energyConsumption: Number,
      renewablePercentage: Number,
      carbonEmissions: Number,
      waterUsage: Number,
      wasteRecycled: Number,
      score: Number,
    },
    social: {
      employeeCount: Number,
      diversityRatio: Number,
      trainingHours: Number,
      safetyIncidents: Number,
      communityInvestment: Number,
      score: Number,
    },
    governance: {
      boardDiversity: Number,
      independentDirectors: Number,
      ethicsViolations: Number,
      transparencyScore: Number,
      score: Number,
    },
    overallScore: { type: Number },
    rating: { type: String, enum: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'] },
    disclosures: [{ indicator: String, description: String, value: Schema.Types.Mixed, unit: String }],
    materialTopics: [{ topic: String, importance: { type: String, enum: ['high', 'medium', 'low'] }, stakeholderConcern: Number }],
    preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const SustainabilityGoalSchema = new Schema(
  {
    goalNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    sdgAlignment: [{ sdgNumber: Number, sdgName: String }],
    vision2030Pillar: { type: String, enum: ['vibrant_society', 'thriving_economy', 'ambitious_nation'] },
    category: { type: String, enum: ['carbon_reduction', 'energy_efficiency', 'water_conservation', 'waste_reduction', 'biodiversity', 'social_impact', 'circular_economy', 'green_building', 'sustainable_procurement'], required: true },
    status: { type: String, enum: ['planned', 'in_progress', 'on_track', 'at_risk', 'achieved', 'missed'], default: 'planned' },
    baseline: { value: Number, year: Number, unit: String },
    target: { value: Number, year: Number, unit: String },
    current: { value: Number, date: Date },
    progressPercentage: { type: Number, default: 0 },
    milestones: [{ title: String, targetDate: Date, targetValue: Number, achieved: Boolean, achievedDate: Date }],
    initiatives: [{ name: String, budget: Number, spent: Number, impact: String, status: String }],
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    budget: { allocated: Number, spent: Number, currency: { type: String, default: 'SAR' } },
    impactAssessment: { type: String },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════════════════
   6. DIGITAL TRANSFORMATION & INNOVATION HUB — التحول الرقمي والابتكار
   ═══════════════════════════════════════════════════════════════════════════ */

const MaturityAssessmentSchema = new Schema(
  {
    assessmentNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    framework: { type: String, enum: ['cmmi', 'custom', 'gartner', 'mckinsey', 'mit_sloan', 'deloitte'], default: 'custom' },
    status: { type: String, enum: ['draft', 'in_progress', 'completed', 'archived'], default: 'draft' },
    assessmentDate: { type: Date },
    assessor: { type: Schema.Types.ObjectId, ref: 'User' },
    dimensions: [
      {
        name: String,
        nameAr: String,
        description: String,
        currentLevel: { type: Number, min: 1, max: 5 },
        targetLevel: { type: Number, min: 1, max: 5 },
        weight: { type: Number, default: 1 },
        subDimensions: [{ name: String, score: Number, evidence: String }],
        gaps: [String],
        recommendations: [String],
      },
    ],
    overallScore: { type: Number },
    overallLevel: { type: String, enum: ['initial', 'developing', 'defined', 'managed', 'optimizing'] },
    benchmarkComparison: { industry: String, industryAverage: Number, percentile: Number },
    roadmapItems: [{ initiative: String, priority: String, effort: String, timeline: String, expectedImpact: Number }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const InnovationIdeaSchema = new Schema(
  {
    ideaNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String },
    category: { type: String, enum: ['process_improvement', 'new_product', 'new_service', 'cost_reduction', 'customer_experience', 'technology', 'sustainability', 'workplace'], required: true },
    status: { type: String, enum: ['submitted', 'under_review', 'shortlisted', 'approved', 'in_development', 'piloting', 'implemented', 'rejected', 'parked'], default: 'submitted' },
    description: { type: String, required: true },
    problemStatement: { type: String },
    proposedSolution: { type: String },
    expectedBenefits: { type: String },
    estimatedCost: { type: Number },
    estimatedROI: { type: Number },
    implementationTimeline: { type: String },
    votes: { up: { type: Number, default: 0 }, down: { type: Number, default: 0 }, voters: [{ type: Schema.Types.ObjectId, ref: 'User' }] },
    priorityScore: { type: Number },
    evaluationCriteria: [{ criterion: String, score: Number, weight: Number, evaluator: { type: Schema.Types.ObjectId, ref: 'User' } }],
    comments: [{ text: String, author: { type: Schema.Types.ObjectId, ref: 'User' }, date: Date }],
    sponsor: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    attachments: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const InnovationProjectSchema = new Schema(
  {
    projectNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    idea: { type: Schema.Types.ObjectId, ref: 'InnovationIdea' },
    projectType: { type: String, enum: ['proof_of_concept', 'prototype', 'pilot', 'full_scale', 'research', 'hackathon', 'lab_experiment'], required: true },
    status: { type: String, enum: ['proposed', 'approved', 'in_progress', 'testing', 'pilot', 'scaling', 'completed', 'cancelled', 'on_hold'], default: 'proposed' },
    stage: { type: String, enum: ['ideation', 'validation', 'development', 'testing', 'launch', 'scale'], default: 'ideation' },
    projectLead: { type: Schema.Types.ObjectId, ref: 'User' },
    team: [{ member: { type: Schema.Types.ObjectId, ref: 'User' }, role: String }],
    budget: { allocated: Number, spent: Number, currency: { type: String, default: 'SAR' } },
    timeline: { startDate: Date, endDate: Date, milestones: [{ title: String, date: Date, completed: Boolean }] },
    technologies: [String],
    kpis: [{ name: String, target: Number, actual: Number, unit: String }],
    risks: [{ risk: String, probability: String, impact: String, mitigation: String }],
    outcomes: { roi: Number, costSaved: Number, revenueGenerated: Number, processImprovement: String, customerImpact: String },
    lessonsLearned: [String],
    documents: [{ name: String, fileUrl: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const TechRadarEntrySchema = new Schema(
  {
    technologyName: { type: String, required: true },
    category: { type: String, enum: ['languages_frameworks', 'platforms', 'tools', 'techniques', 'infrastructure', 'data_ai', 'security', 'iot'], required: true },
    quadrant: { type: String, enum: ['adopt', 'trial', 'assess', 'hold'], required: true },
    ring: { type: Number, min: 1, max: 4 },
    description: { type: String },
    rationale: { type: String },
    status: { type: String, enum: ['new', 'moved', 'no_change'], default: 'new' },
    previousQuadrant: { type: String, enum: ['adopt', 'trial', 'assess', 'hold'] },
    movedDate: { type: Date },
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    scorecard: { maturity: { type: Number, min: 1, max: 5 }, scalability: { type: Number, min: 1, max: 5 }, communitySupport: { type: Number, min: 1, max: 5 }, costEffectiveness: { type: Number, min: 1, max: 5 }, securityPosture: { type: Number, min: 1, max: 5 }, overallScore: Number },
    usedInProjects: [{ type: Schema.Types.ObjectId, ref: 'InnovationProject' }],
    tags: [String],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const TransformationKPISchema = new Schema(
  {
    kpiName: { type: String, required: true },
    kpiNameAr: { type: String },
    category: { type: String, enum: ['digitization', 'automation', 'customer_digital', 'employee_digital', 'data_driven', 'innovation', 'agility', 'cloud_adoption'], required: true },
    period: { from: Date, to: Date },
    target: { type: Number, required: true },
    actual: { type: Number, default: 0 },
    unit: { type: String, enum: ['percentage', 'count', 'hours', 'days', 'currency', 'ratio', 'score'], default: 'percentage' },
    trend: { type: String, enum: ['up', 'down', 'stable'] },
    status: { type: String, enum: ['on_track', 'at_risk', 'behind', 'achieved', 'exceeded'], default: 'on_track' },
    historicalData: [{ date: Date, value: Number }],
    benchmarks: { industryAverage: Number, bestInClass: Number },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    dataSource: { type: String },
    formula: { type: String },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════════════════
   MODEL EXPORTS
   ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  // 1. Legal
  LegalCase: mongoose.models.LegalCase || mongoose.model('LegalCase', LegalCaseSchema),
  CourtHearing: mongoose.models.CourtHearing || mongoose.model('CourtHearing', CourtHearingSchema),
  PowerOfAttorney: mongoose.models.PowerOfAttorney || mongoose.model('PowerOfAttorney', PowerOfAttorneySchema),
  LegalOpinion: mongoose.models.LegalOpinion || mongoose.model('LegalOpinion', LegalOpinionSchema),
  RegulatoryFiling: mongoose.models.RegulatoryFiling || mongoose.model('RegulatoryFiling', RegulatoryFilingSchema),

  // 2. Governance
  BoardMeeting: mongoose.models.BoardMeeting || mongoose.model('BoardMeeting', BoardMeetingSchema),
  BoardCommittee: mongoose.models.BoardCommittee || mongoose.model('BoardCommittee', BoardCommitteeSchema),
  BoardResolution: mongoose.models.BoardResolution || mongoose.model('BoardResolution', BoardResolutionSchema),
  GovernancePolicy: mongoose.models.GovernancePolicy || mongoose.model('GovernancePolicy', GovernancePolicySchema),
  GovernanceReport: mongoose.models.GovernanceReport || mongoose.model('GovernanceReport', GovernanceReportSchema),

  // 3. Business Continuity
  BCPPlan: mongoose.models.BCPPlan || mongoose.model('BCPPlan', BCPPlanSchema),
  BusinessImpactAnalysis: mongoose.models.BusinessImpactAnalysis || mongoose.model('BusinessImpactAnalysis', BusinessImpactAnalysisSchema),
  CrisisIncident: mongoose.models.CrisisIncident || mongoose.model('CrisisIncident', CrisisIncidentSchema),
  BCDrill: mongoose.models.BCDrill || mongoose.model('BCDrill', BCDrillSchema),
  DisasterRecoveryPlan: mongoose.models.DisasterRecoveryPlan || mongoose.model('DisasterRecoveryPlan', DisasterRecoveryPlanSchema),

  // 4. Customer Experience
  CXSurvey: mongoose.models.CXSurvey || mongoose.model('CXSurvey', CXSurveySchema),
  CXFeedback: mongoose.models.CXFeedback || mongoose.model('CXFeedback', CXFeedbackSchema),
  CXComplaint: mongoose.models.CXComplaint || mongoose.model('CXComplaint', CXComplaintSchema),
  CustomerJourney: mongoose.models.CustomerJourney || mongoose.model('CustomerJourney', CustomerJourneySchema),
  ServiceBenchmark: mongoose.models.ServiceBenchmark || mongoose.model('ServiceBenchmark', ServiceBenchmarkSchema),

  // 5. Sustainability
  EnergyReading: mongoose.models.EnergyReading || mongoose.model('EnergyReading', EnergyReadingSchema),
  CarbonFootprint: mongoose.models.CarbonFootprint || mongoose.model('CarbonFootprint', CarbonFootprintSchema),
  WasteRecord: mongoose.models.WasteRecord || mongoose.model('WasteRecord', WasteRecordSchema),
  ESGReport: mongoose.models.ESGReport || mongoose.model('ESGReport', ESGReportSchema),
  SustainabilityGoal: mongoose.models.SustainabilityGoal || mongoose.model('SustainabilityGoal', SustainabilityGoalSchema),

  // 6. Digital Transformation
  MaturityAssessment: mongoose.models.MaturityAssessment || mongoose.model('MaturityAssessment', MaturityAssessmentSchema),
  InnovationIdea: mongoose.models.InnovationIdea || mongoose.model('InnovationIdea', InnovationIdeaSchema),
  InnovationProject: mongoose.models.InnovationProject || mongoose.model('InnovationProject', InnovationProjectSchema),
  TechRadarEntry: mongoose.models.TechRadarEntry || mongoose.model('TechRadarEntry', TechRadarEntrySchema),
  TransformationKPI: mongoose.models.TransformationKPI || mongoose.model('TransformationKPI', TransformationKPISchema),
};
