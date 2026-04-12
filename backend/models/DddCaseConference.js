'use strict';
/**
 * DddCaseConference Model
 * Auto-extracted from services/dddCaseConference.js
 */
const mongoose = require('mongoose');

const dddCaseConferenceSchema = new mongoose.Schema(
  {
    conferenceId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: {
      type: String,
      enum: [
        'mdt-review',
        'case-discussion',
        'care-planning',
        'discharge-planning',
        'risk-review',
        'family-conference',
        'peer-review',
        'grand-rounds',
        'ethics-review',
        'quality-review',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare' },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 },
    location: { type: String },
    isVirtual: { type: Boolean, default: false },
    meetingLink: { type: String },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendees: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        specialty: { type: String },
        status: {
          type: String,
          enum: ['invited', 'accepted', 'declined', 'attended', 'absent'],
          default: 'invited',
        },
        notes: String,
      },
    ],
    agenda: [
      {
        order: Number,
        topic: String,
        topicAr: String,
        presenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        duration: Number,
        status: { type: String, enum: ['pending', 'discussed', 'deferred'], default: 'pending' },
      },
    ],
    decisions: [
      {
        decisionId: String,
        description: String,
        descriptionAr: String,
        category: {
          type: String,
          enum: [
            'treatment-change',
            'goal-modification',
            'referral',
            'discharge',
            'escalation',
            'continuation',
            'new-intervention',
            'assessment-order',
          ],
        },
        decidedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        votesFor: { type: Number, default: 0 },
        votesAgainst: { type: Number, default: 0 },
        consensus: { type: Boolean },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    actionItems: [
      {
        actionId: String,
        description: String,
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed', 'overdue'],
          default: 'pending',
        },
        completedAt: Date,
      },
    ],
    summary: { type: String },
    summaryAr: { type: String },
    nextReviewDate: { type: Date },
    attachments: [{ fileId: String, fileName: String, fileType: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dddCaseConferenceSchema.index({ beneficiaryId: 1, scheduledAt: -1 });
dddCaseConferenceSchema.index({ status: 1, scheduledAt: 1 });
dddCaseConferenceSchema.index({ 'attendees.userId': 1 });

const DDDCaseConference =
  mongoose.models.DDDCaseConference || mongoose.model('DDDCaseConference', dddCaseConferenceSchema);

const dddConferenceTemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, required: true },
    defaultDuration: { type: Number, default: 60 },
    agendaTemplate: [{ order: Number, topic: String, topicAr: String, duration: Number }],
    requiredRoles: [String],
    checklistItems: [{ item: String, itemAr: String, required: Boolean }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DDDConferenceTemplate =
  mongoose.models.DDDConferenceTemplate ||
  mongoose.model('DDDConferenceTemplate', dddConferenceTemplateSchema);

/* ═══════════════════════════════════════════════════════════════
   Conference Type Definitions
   ═══════════════════════════════════════════════════════════════ */

const CONFERENCE_TYPES = {
  'mdt-review': {
    label: 'MDT Review',
    labelAr: 'مراجعة الفريق متعدد التخصصات',
    icon: 'groups',
    minAttendees: 3,
  },
  'case-discussion': {
    label: 'Case Discussion',
    labelAr: 'مناقشة الحالة',
    icon: 'forum',
    minAttendees: 2,
  },
  'care-planning': {
    label: 'Care Planning',
    labelAr: 'تخطيط الرعاية',
    icon: 'assignment',
    minAttendees: 2,
  },
  'discharge-planning': {
    label: 'Discharge Planning',
    labelAr: 'تخطيط الخروج',
    icon: 'exit_to_app',
    minAttendees: 2,
  },
  'risk-review': {
    label: 'Risk Review',
    labelAr: 'مراجعة المخاطر',
    icon: 'warning',
    minAttendees: 3,
  },
  'family-conference': {
    label: 'Family Conference',
    labelAr: 'مؤتمر الأسرة',
    icon: 'family_restroom',
    minAttendees: 2,
  },
  'peer-review': {
    label: 'Peer Review',
    labelAr: 'مراجعة الأقران',
    icon: 'rate_review',
    minAttendees: 2,
  },
  'grand-rounds': {
    label: 'Grand Rounds',
    labelAr: 'الجولات الكبرى',
    icon: 'school',
    minAttendees: 5,
  },
  'ethics-review': {
    label: 'Ethics Review',
    labelAr: 'مراجعة أخلاقية',
    icon: 'gavel',
    minAttendees: 3,
  },
  'quality-review': {
    label: 'Quality Review',
    labelAr: 'مراجعة الجودة',
    icon: 'verified',
    minAttendees: 3,
  },
};

/* ═══════════════════════════════════════════════════════════════
   Builtin Templates (≥8)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_TEMPLATES = [
  {
    templateId: 'tpl-mdt-review',
    name: 'Standard MDT Review',
    nameAr: 'مراجعة الفريق القياسية',
    type: 'mdt-review',
    defaultDuration: 60,
    agendaTemplate: [
      { order: 1, topic: 'Case Summary', topicAr: 'ملخص الحالة', duration: 10 },
      { order: 2, topic: 'Assessment Updates', topicAr: 'تحديثات التقييم', duration: 15 },
      { order: 3, topic: 'Treatment Progress', topicAr: 'تقدم العلاج', duration: 15 },
      { order: 4, topic: 'Goal Review', topicAr: 'مراجعة الأهداف', duration: 10 },
      { order: 5, topic: 'Action Plan', topicAr: 'خطة العمل', duration: 10 },
    ],
    requiredRoles: ['physician', 'therapist', 'nurse'],
  },
  {
    templateId: 'tpl-discharge',
    name: 'Discharge Planning',
    nameAr: 'تخطيط الخروج',
    type: 'discharge-planning',
    defaultDuration: 45,
    agendaTemplate: [
      { order: 1, topic: 'Discharge Readiness', topicAr: 'جاهزية الخروج', duration: 10 },
      { order: 2, topic: 'Home Support Plan', topicAr: 'خطة الدعم المنزلي', duration: 15 },
      { order: 3, topic: 'Follow-up Schedule', topicAr: 'جدول المتابعة', duration: 10 },
      { order: 4, topic: 'Family Education', topicAr: 'تثقيف الأسرة', duration: 10 },
    ],
    requiredRoles: ['physician', 'social_worker'],
  },
  {
    templateId: 'tpl-risk-review',
    name: 'Risk Assessment Review',
    nameAr: 'مراجعة تقييم المخاطر',
    type: 'risk-review',
    defaultDuration: 45,
    agendaTemplate: [
      { order: 1, topic: 'Risk Score Review', topicAr: 'مراجعة درجة المخاطر', duration: 10 },
      { order: 2, topic: 'Contributing Factors', topicAr: 'العوامل المساهمة', duration: 15 },
      { order: 3, topic: 'Mitigation Plan', topicAr: 'خطة التخفيف', duration: 15 },
      { order: 4, topic: 'Monitoring Plan', topicAr: 'خطة المراقبة', duration: 5 },
    ],
    requiredRoles: ['physician', 'therapist', 'psychologist'],
  },
  {
    templateId: 'tpl-family-conf',
    name: 'Family Conference',
    nameAr: 'مؤتمر الأسرة',
    type: 'family-conference',
    defaultDuration: 60,
    agendaTemplate: [
      { order: 1, topic: 'Progress Update', topicAr: 'تحديث التقدم', duration: 15 },
      { order: 2, topic: 'Family Concerns', topicAr: 'مخاوف الأسرة', duration: 15 },
      { order: 3, topic: 'Home Program', topicAr: 'البرنامج المنزلي', duration: 15 },
      { order: 4, topic: 'Next Steps', topicAr: 'الخطوات التالية', duration: 15 },
    ],
    requiredRoles: ['therapist', 'social_worker'],
  },
  {
    templateId: 'tpl-care-planning',
    name: 'Care Plan Conference',
    nameAr: 'مؤتمر خطة الرعاية',
    type: 'care-planning',
    defaultDuration: 60,
    agendaTemplate: [
      { order: 1, topic: 'Current Status', topicAr: 'الحالة الحالية', duration: 10 },
      { order: 2, topic: 'Goal Setting', topicAr: 'تحديد الأهداف', duration: 20 },
      { order: 3, topic: 'Intervention Plan', topicAr: 'خطة التدخل', duration: 20 },
      { order: 4, topic: 'Timeline & Review', topicAr: 'الجدول الزمني والمراجعة', duration: 10 },
    ],
    requiredRoles: ['physician', 'therapist'],
  },
  {
    templateId: 'tpl-peer-review',
    name: 'Clinical Peer Review',
    nameAr: 'مراجعة الأقران السريرية',
    type: 'peer-review',
    defaultDuration: 30,
    agendaTemplate: [
      { order: 1, topic: 'Case Presentation', topicAr: 'عرض الحالة', duration: 10 },
      { order: 2, topic: 'Peer Feedback', topicAr: 'ملاحظات الأقران', duration: 15 },
      { order: 3, topic: 'Recommendations', topicAr: 'التوصيات', duration: 5 },
    ],
    requiredRoles: ['therapist'],
  },
  {
    templateId: 'tpl-grand-rounds',
    name: 'Grand Rounds',
    nameAr: 'الجولات الكبرى',
    type: 'grand-rounds',
    defaultDuration: 90,
    agendaTemplate: [
      { order: 1, topic: 'Case Presentation', topicAr: 'عرض الحالة', duration: 20 },
      { order: 2, topic: 'Literature Review', topicAr: 'مراجعة الأدبيات', duration: 20 },
      { order: 3, topic: 'Discussion', topicAr: 'المناقشة', duration: 30 },
      { order: 4, topic: 'Learning Points', topicAr: 'نقاط التعلم', duration: 20 },
    ],
    requiredRoles: ['physician'],
  },
  {
    templateId: 'tpl-ethics',
    name: 'Ethics Committee Review',
    nameAr: 'مراجعة لجنة الأخلاقيات',
    type: 'ethics-review',
    defaultDuration: 60,
    agendaTemplate: [
      { order: 1, topic: 'Case Facts', topicAr: 'حقائق الحالة', duration: 10 },
      { order: 2, topic: 'Ethical Issues', topicAr: 'القضايا الأخلاقية', duration: 15 },
      {
        order: 3,
        topic: 'Stakeholder Perspectives',
        topicAr: 'وجهات نظر أصحاب المصلحة',
        duration: 15,
      },
      { order: 4, topic: 'Committee Decision', topicAr: 'قرار اللجنة', duration: 20 },
    ],
    requiredRoles: ['physician', 'ethicist', 'social_worker'],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

async function scheduleConference(data) {
  const conferenceId = `conf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return DDDCaseConference.create({ ...data, conferenceId });
}

async function addDecision(conferenceId, decision) {
  const decisionId = `dec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return DDDCaseConference.findOneAndUpdate(
    { conferenceId },
    { $push: { decisions: { ...decision, decisionId, timestamp: new Date() } } },
    { new: true }
  );
}

async function addActionItem(conferenceId, actionItem) {
  const actionId = `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return DDDCaseConference.findOneAndUpdate(
    { conferenceId },
    { $push: { actionItems: { ...actionItem, actionId } } },
    { new: true }
  );
}

async function completeConference(conferenceId, summary, summaryAr) {
  return DDDCaseConference.findOneAndUpdate(
    { conferenceId },
    { $set: { status: 'completed', summary, summaryAr } },
    { new: true }
  );
}

async function getConferencesByBeneficiary(beneficiaryId, options = {}) {
  const query = { beneficiaryId };
  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;
  return DDDCaseConference.find(query)
    .sort({ scheduledAt: -1 })
    .limit(options.limit || 20)
    .lean();
}

async function getUpcomingConferences(userId, options = {}) {
  const query = {
    'attendees.userId': userId,
    scheduledAt: { $gte: new Date() },
    status: { $in: ['scheduled', 'in-progress'] },
  };
  return DDDCaseConference.find(query)
    .sort({ scheduledAt: 1 })
    .limit(options.limit || 10)
    .lean();
}

async function getOverdueActions(userId) {
  return DDDCaseConference.find({
    'actionItems.assignee': userId,
    'actionItems.status': 'pending',
    'actionItems.dueDate': { $lt: new Date() },
  }).lean();
}

async function seedTemplates() {
  let seeded = 0;
  for (const tpl of BUILTIN_TEMPLATES) {
    const exists = await DDDConferenceTemplate.findOne({ templateId: tpl.templateId }).lean();
    if (!exists) {
      await DDDConferenceTemplate.create(tpl);
      seeded++;
    }
  }
  return { seeded, total: BUILTIN_TEMPLATES.length };
}

async function getCaseConferenceDashboard() {
  const [conferenceCount, templateCount, upcomingCount, actionCount] = await Promise.all([
    DDDCaseConference.countDocuments(),
    DDDConferenceTemplate.countDocuments(),
    DDDCaseConference.countDocuments({ status: 'scheduled', scheduledAt: { $gte: new Date() } }),
    DDDCaseConference.aggregate([
      { $unwind: '$actionItems' },
      { $match: { 'actionItems.status': 'pending' } },
      { $count: 'total' },
    ]).then(r => r[0]?.total || 0),
  ]);

  return {
    service: 'CaseConference',
    conferences: { total: conferenceCount, upcoming: upcomingCount },
    templates: { total: templateCount, builtin: BUILTIN_TEMPLATES.length },
    pendingActions: actionCount,
    conferenceTypes: Object.keys(CONFERENCE_TYPES).length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDCaseConference,
  DDDConferenceTemplate,
};
