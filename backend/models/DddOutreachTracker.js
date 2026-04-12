'use strict';
/**
 * DddOutreachTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddOutreachTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const CAMPAIGN_TYPES = [
  'awareness',
  'fundraising',
  'recruitment',
  'education',
  'advocacy',
  'partnership',
  'screening',
  'health_fair',
  'media_campaign',
  'social_media',
  'school_outreach',
  'corporate_engagement',
];

const CAMPAIGN_STATUSES = [
  'draft',
  'planned',
  'approved',
  'active',
  'paused',
  'completed',
  'cancelled',
  'evaluation',
  'archived',
  'follow_up',
];

const CONTACT_TYPES = [
  'community_leader',
  'school_official',
  'corporate_contact',
  'government_official',
  'media_contact',
  'healthcare_provider',
  'ngo_representative',
  'religious_leader',
  'parent_advocate',
  'potential_donor',
  'volunteer_prospect',
  'partner_organization',
];

const EVENT_TYPES = [
  'public_talk',
  'workshop',
  'health_screening',
  'open_house',
  'conference',
  'webinar',
  'media_interview',
  'school_visit',
  'corporate_presentation',
  'community_fair',
  'awareness_walk',
  'gala',
];

const REPORT_TYPES = [
  'campaign_summary',
  'impact_assessment',
  'reach_report',
  'engagement_metrics',
  'roi_analysis',
  'media_coverage',
  'feedback_analysis',
  'demographic_report',
  'partnership_report',
  'quarterly_review',
];

const OUTREACH_CHANNELS = [
  'in_person',
  'phone',
  'email',
  'social_media',
  'print_media',
  'television',
  'radio',
  'website',
  'mobile_app',
  'community_board',
  'newsletter',
  'referral',
];

/* ── Built-in campaigns ─────────────────────────────────────────────────── */
const BUILTIN_CAMPAIGNS = [
  {
    code: 'CAMP-AWARE',
    name: 'Disability Awareness Month',
    nameAr: 'شهر التوعية بالإعاقة',
    type: 'awareness',
  },
  {
    code: 'CAMP-SCHOOL',
    name: 'School Inclusion Program',
    nameAr: 'برنامج الدمج المدرسي',
    type: 'school_outreach',
  },
  {
    code: 'CAMP-CORP',
    name: 'Corporate Partnership Drive',
    nameAr: 'حملة الشراكة مع الشركات',
    type: 'corporate_engagement',
  },
  {
    code: 'CAMP-HEALTH',
    name: 'Community Health Fair',
    nameAr: 'معرض الصحة المجتمعي',
    type: 'health_fair',
  },
  {
    code: 'CAMP-MEDIA',
    name: 'Social Media Awareness',
    nameAr: 'التوعية عبر وسائل التواصل',
    type: 'social_media',
  },
  {
    code: 'CAMP-RECRUIT',
    name: 'Volunteer Recruitment Drive',
    nameAr: 'حملة استقطاب المتطوعين',
    type: 'recruitment',
  },
  {
    code: 'CAMP-FUND',
    name: 'Annual Fundraiser',
    nameAr: 'حملة جمع التبرعات السنوية',
    type: 'fundraising',
  },
  {
    code: 'CAMP-ADV',
    name: 'Rights & Advocacy Campaign',
    nameAr: 'حملة الحقوق والمناصرة',
    type: 'advocacy',
  },
  {
    code: 'CAMP-EDU',
    name: 'Community Education Series',
    nameAr: 'سلسلة التثقيف المجتمعي',
    type: 'education',
  },
  {
    code: 'CAMP-SCREEN',
    name: 'Early Screening Initiative',
    nameAr: 'مبادرة الكشف المبكر',
    type: 'screening',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Outreach Campaign ─────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const outreachCampaignSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    type: { type: String, enum: CAMPAIGN_TYPES, required: true },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft' },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date },
    endDate: { type: Date },
    targetAudience: { type: String },
    targetReach: { type: Number },
    actualReach: { type: Number, default: 0 },
    budget: { type: Number },
    spentAmount: { type: Number, default: 0 },
    channels: [{ type: String, enum: OUTREACH_CHANNELS }],
    goals: [{ goal: String, metric: String, target: Number, achieved: Number }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

outreachCampaignSchema.index({ type: 1, status: 1 });

const DDDOutreachCampaign =
  mongoose.models.DDDOutreachCampaign ||
  mongoose.model('DDDOutreachCampaign', outreachCampaignSchema);

/* ── Outreach Contact ──────────────────────────────────────────────────── */
const outreachContactSchema = new Schema(
  {
    contactCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: CONTACT_TYPES, required: true },
    organization: { type: String },
    title: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    campaigns: [{ type: Schema.Types.ObjectId, ref: 'DDDOutreachCampaign' }],
    interactionHistory: [{ date: Date, type: String, notes: String, by: Schema.Types.ObjectId }],
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

outreachContactSchema.index({ type: 1 });

const DDDOutreachContact =
  mongoose.models.DDDOutreachContact || mongoose.model('DDDOutreachContact', outreachContactSchema);

/* ── Outreach Event ────────────────────────────────────────────────────── */
const outreachEventSchema = new Schema(
  {
    eventCode: { type: String, required: true, unique: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'DDDOutreachCampaign' },
    title: { type: String, required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    scheduledDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    location: { type: String },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    },
    expectedAttendees: { type: Number },
    actualAttendees: { type: Number, default: 0 },
    speakers: [{ name: String, topic: String }],
    materials: [{ name: String, url: String }],
    feedback: [{ attendee: String, rating: Number, comment: String }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

outreachEventSchema.index({ campaignId: 1, scheduledDate: 1 });

const DDDCampaignEvent =
  mongoose.models.DDDCampaignEvent || mongoose.model('DDDCampaignEvent', outreachEventSchema);

/* ── Outreach Report ───────────────────────────────────────────────────── */
const outreachReportSchema = new Schema(
  {
    reportCode: { type: String, required: true, unique: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'DDDOutreachCampaign' },
    type: { type: String, enum: REPORT_TYPES, required: true },
    title: { type: String, required: true },
    period: { from: Date, to: Date },
    metrics: { type: Map, of: Schema.Types.Mixed },
    totalReach: { type: Number },
    totalEngagements: { type: Number },
    mediaMentions: { type: Number },
    newContacts: { type: Number },
    volunteerHours: { type: Number },
    findings: [{ area: String, observation: String, recommendation: String }],
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, default: Date.now },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDOutreachReport =
  mongoose.models.DDDOutreachReport || mongoose.model('DDDOutreachReport', outreachReportSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES,
  CONTACT_TYPES,
  EVENT_TYPES,
  REPORT_TYPES,
  OUTREACH_CHANNELS,
  BUILTIN_CAMPAIGNS,
  DDDOutreachCampaign,
  DDDOutreachContact,
  DDDCampaignEvent,
  DDDOutreachReport,
};
