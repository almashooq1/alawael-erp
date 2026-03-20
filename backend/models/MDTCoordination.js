/* eslint-disable no-unused-vars */
/**
 * Multidisciplinary Team Coordination Models
 * نماذج نظام التنسيق متعدد التخصصات
 *
 * يشمل:
 * 1. اجتماعات الفريق متعدد التخصصات (MDT Meetings)
 * 2. خطط التأهيل الموحدة (Unified Rehabilitation Plans)
 * 3. تذاكر الإحالة الداخلية (Internal Referral Tickets)
 * 4. محاضر الاجتماعات والقرارات (Meeting Minutes & Decisions)
 */
const mongoose = require('mongoose');

// ─── 1. MDT Meeting (اجتماع الفريق متعدد التخصصات) ─────────────────────────

const mdtActionItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: { type: String },
  department: { type: String },
  dueDate: { type: Date },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
  },
  completedAt: { type: Date },
  notes: { type: String },
});

const mdtDecisionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: [
      'TREATMENT_PLAN',
      'MEDICATION',
      'REFERRAL',
      'DISCHARGE',
      'ASSESSMENT',
      'GOAL_CHANGE',
      'EQUIPMENT',
      'FAMILY_MEETING',
      'OTHER',
    ],
    default: 'OTHER',
  },
  madeBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  relatedBeneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
  actionItems: [mdtActionItemSchema],
  status: {
    type: String,
    enum: ['PROPOSED', 'APPROVED', 'REJECTED', 'IMPLEMENTED'],
    default: 'PROPOSED',
  },
  implementedAt: { type: Date },
});

const mdtAttendeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String },
  specialty: {
    type: String,
    enum: [
      'PHYSIOTHERAPY',
      'OCCUPATIONAL_THERAPY',
      'SPEECH_THERAPY',
      'PSYCHOLOGY',
      'SOCIAL_WORK',
      'NURSING',
      'MEDICINE',
      'EDUCATION',
      'NUTRITION',
      'BEHAVIORAL_THERAPY',
      'CASE_MANAGEMENT',
      'ADMINISTRATION',
      'OTHER',
    ],
  },
  attendance: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'EXCUSED', 'PENDING'],
    default: 'PENDING',
  },
  contributionNotes: { type: String },
});

const mdtBeneficiaryCaseSchema = new mongoose.Schema({
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  beneficiaryName: { type: String },
  currentStatus: { type: String },
  presentedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  discussionSummary: { type: String },
  recommendations: [{ type: String }],
  decisions: [mdtDecisionSchema],
  nextReviewDate: { type: Date },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
});

const mdtMeetingSchema = new mongoose.Schema(
  {
    meetingNumber: { type: String, unique: true, required: true, index: true },
    title: { type: String, required: true, minlength: 3, maxlength: 300 },
    description: { type: String, maxlength: 2000 },
    type: {
      type: String,
      enum: [
        'REGULAR',
        'EMERGENCY',
        'CASE_REVIEW',
        'CARE_PLANNING',
        'DISCHARGE_PLANNING',
        'PROGRESS_REVIEW',
        'INITIAL_ASSESSMENT',
      ],
      default: 'REGULAR',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'],
      default: 'SCHEDULED',
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    duration: { type: Number, default: 60 },
    location: { type: String },
    isVirtual: { type: Boolean, default: false },
    meetingLink: { type: String },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [mdtAttendeeSchema],
    cases: [mdtBeneficiaryCaseSchema],
    agenda: [
      {
        order: { type: Number },
        topic: { type: String, required: true },
        presenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        duration: { type: Number },
        notes: { type: String },
      },
    ],
    minutes: {
      content: { type: String },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recordedAt: { type: Date },
      approved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
    },
    generalDecisions: [mdtDecisionSchema],
    generalActionItems: [mdtActionItemSchema],
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    recurrence: {
      enabled: { type: Boolean, default: false },
      pattern: { type: String, enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'], default: 'WEEKLY' },
      dayOfWeek: { type: Number, min: 0, max: 6 },
      endDate: { type: Date },
    },
    department: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mdtMeetingSchema.index({ date: 1, status: 1 });
mdtMeetingSchema.index({ organizer: 1 });
mdtMeetingSchema.index({ 'cases.beneficiary': 1 });
mdtMeetingSchema.index({ department: 1, date: -1 });

// ─── 2. Unified Rehabilitation Plan (خطة التأهيل الموحدة) ───────────────────

const rehabilitationGoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  domain: {
    type: String,
    enum: [
      'PHYSICAL',
      'COGNITIVE',
      'COMMUNICATION',
      'SOCIAL',
      'BEHAVIORAL',
      'EDUCATIONAL',
      'VOCATIONAL',
      'DAILY_LIVING',
      'PSYCHOLOGICAL',
    ],
    required: true,
  },
  icfCode: { type: String },
  baseline: { type: String },
  target: { type: String },
  measurementCriteria: { type: String },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED', 'DISCONTINUED'],
    default: 'DRAFT',
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startDate: { type: Date },
  targetDate: { type: Date },
  achievedDate: { type: Date },
  responsibleTherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  responsibleDepartment: { type: String },
  progressNotes: [
    {
      date: { type: Date, default: Date.now },
      note: { type: String },
      progress: { type: Number },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  ],
});

const therapistContributionSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  therapistName: { type: String },
  specialty: {
    type: String,
    enum: [
      'PHYSIOTHERAPY',
      'OCCUPATIONAL_THERAPY',
      'SPEECH_THERAPY',
      'PSYCHOLOGY',
      'SOCIAL_WORK',
      'NURSING',
      'MEDICINE',
      'EDUCATION',
      'NUTRITION',
      'BEHAVIORAL_THERAPY',
    ],
    required: true,
  },
  role: {
    type: String,
    enum: ['LEAD', 'CONTRIBUTOR', 'CONSULTANT', 'OBSERVER'],
    default: 'CONTRIBUTOR',
  },
  assignedGoals: [{ type: mongoose.Schema.Types.ObjectId }],
  sessionFrequency: { type: String },
  notes: { type: String },
  lastUpdated: { type: Date, default: Date.now },
});

const unifiedRehabPlanSchema = new mongoose.Schema(
  {
    planNumber: { type: String, unique: true, required: true, index: true },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    beneficiaryName: { type: String },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
      default: 'DRAFT',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    reviewDate: { type: Date },
    reviewCycle: {
      type: String,
      enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'],
      default: 'MONTHLY',
    },
    leadTherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamMembers: [therapistContributionSchema],
    goals: [rehabilitationGoalSchema],
    initialAssessmentSummary: { type: String },
    diagnosisSummary: { type: String },
    precautions: [{ type: String }],
    familyInvolvement: {
      enabled: { type: Boolean, default: false },
      contactPerson: { type: String },
      contactPhone: { type: String },
      notes: { type: String },
    },
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    reviews: [
      {
        date: { type: Date, default: Date.now },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        summary: { type: String },
        overallProgress: { type: Number },
        recommendations: [{ type: String }],
        nextReviewDate: { type: Date },
      },
    ],
    approvals: [
      {
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: { type: Date, default: Date.now },
        role: { type: String },
        comment: { type: String },
      },
    ],
    linkedMeetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MDTMeeting' }],
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

unifiedRehabPlanSchema.index({ beneficiary: 1, status: 1 });
unifiedRehabPlanSchema.index({ leadTherapist: 1 });
unifiedRehabPlanSchema.index({ 'teamMembers.therapist': 1 });
unifiedRehabPlanSchema.index({ reviewDate: 1 });

// Auto-compute overall progress
unifiedRehabPlanSchema.pre('save', function (next) {
  if (this.goals && this.goals.length > 0) {
    const activeGoals = this.goals.filter(g => !['DISCONTINUED'].includes(g.status));
    if (activeGoals.length > 0) {
      this.overallProgress = Math.round(
        activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length
      );
    }
  }
  next();
});

// ─── 3. Internal Referral Ticket (تذكرة الإحالة الداخلية) ────────────────────

const referralTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true, required: true, index: true },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    beneficiaryName: { type: String },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referredByName: { type: String },
    fromDepartment: { type: String, required: true },
    toDepartment: { type: String, required: true },
    toSpecialist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toSpecialistName: { type: String },
    type: {
      type: String,
      enum: [
        'INITIAL_ASSESSMENT',
        'FOLLOW_UP',
        'CONSULTATION',
        'TREATMENT',
        'EVALUATION',
        'EMERGENCY',
        'SECOND_OPINION',
        'DISCHARGE_PLANNING',
      ],
      default: 'CONSULTATION',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'ACCEPTED',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
        'RETURNED',
      ],
      default: 'PENDING',
    },
    reason: { type: String, required: true },
    clinicalNotes: { type: String },
    currentDiagnosis: { type: String },
    requestedServices: [{ type: String }],
    urgencyJustification: { type: String },
    responseDeadline: { type: Date },
    response: {
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      respondedAt: { type: Date },
      acceptanceNote: { type: String },
      rejectionReason: { type: String },
      estimatedStartDate: { type: Date },
      recommendations: [{ type: String }],
    },
    outcome: {
      summary: { type: String },
      findings: { type: String },
      recommendations: [{ type: String }],
      followUpNeeded: { type: Boolean, default: false },
      followUpDate: { type: Date },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      completedAt: { type: Date },
    },
    linkedPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedRehabPlan' },
    linkedMeeting: { type: mongoose.Schema.Types.ObjectId, ref: 'MDTMeeting' },
    history: [
      {
        action: { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        fromStatus: { type: String },
        toStatus: { type: String },
        note: { type: String },
      },
    ],
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

referralTicketSchema.index({ beneficiary: 1, status: 1 });
referralTicketSchema.index({ referredBy: 1 });
referralTicketSchema.index({ toDepartment: 1, status: 1 });
referralTicketSchema.index({ priority: 1, status: 1 });
referralTicketSchema.index({ responseDeadline: 1 });

// ─── Export Models ───────────────────────────────────────────────────────────

const MDTMeeting = mongoose.models.MDTMeeting || mongoose.model('MDTMeeting', mdtMeetingSchema);

const UnifiedRehabPlan =
  mongoose.models.UnifiedRehabPlan || mongoose.model('UnifiedRehabPlan', unifiedRehabPlanSchema);

const ReferralTicket =
  mongoose.models.ReferralTicket || mongoose.model('ReferralTicket', referralTicketSchema);

module.exports = {
  MDTMeeting,
  UnifiedRehabPlan,
  ReferralTicket,
};
