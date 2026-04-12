'use strict';
/**
 * DddCommunityOutreach — Mongoose Models & Constants
 * Auto-extracted from services/dddCommunityOutreach.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const PROGRAM_TYPES = [
  'awareness_campaign',
  'screening_event',
  'workshop',
  'support_group',
  'educational_seminar',
  'health_fair',
  'community_walk',
  'open_house',
  'resource_fair',
  'sports_day',
  'art_exhibition',
  'technology_expo',
];

const PROGRAM_STATUSES = [
  'concept',
  'planning',
  'approved',
  'budgeted',
  'marketing',
  'registration_open',
  'in_progress',
  'completed',
  'post_evaluation',
  'archived',
];

const TARGET_AUDIENCES = [
  'general_public',
  'families',
  'caregivers',
  'educators',
  'employers',
  'healthcare_providers',
  'policymakers',
  'youth',
  'elderly',
  'disability_community',
  'corporate',
  'media',
];

const PARTNERSHIP_TYPES = [
  'hospital',
  'university',
  'ngo',
  'government',
  'corporate',
  'school',
  'community_center',
  'religious_organization',
  'media_outlet',
  'international',
];

const OUTREACH_CHANNELS = [
  'social_media',
  'email',
  'sms',
  'print_media',
  'radio',
  'television',
  'website',
  'flyers',
  'word_of_mouth',
  'community_board',
];

const IMPACT_METRICS = [
  'reach',
  'engagement',
  'awareness_increase',
  'referrals_generated',
  'screenings_completed',
  'services_connected',
  'satisfaction_score',
  'media_mentions',
  'partnerships_formed',
  'funds_raised',
];

const BUILTIN_OUTREACH_TEMPLATES = [
  {
    code: 'AWARE_CAMP',
    label: 'Disability Awareness Campaign',
    type: 'awareness_campaign',
    duration: 7,
    budget: 5000,
  },
  {
    code: 'SCREEN_EVT',
    label: 'Community Screening Event',
    type: 'screening_event',
    duration: 1,
    budget: 3000,
  },
  {
    code: 'PARENT_WS',
    label: 'Parent Workshop Series',
    type: 'workshop',
    duration: 30,
    budget: 2000,
  },
  {
    code: 'SUPPORT_GRP',
    label: 'Caregiver Support Group',
    type: 'support_group',
    duration: 90,
    budget: 500,
  },
  {
    code: 'HEALTH_FAIR',
    label: 'Community Health Fair',
    type: 'health_fair',
    duration: 2,
    budget: 8000,
  },
  { code: 'OPEN_HOUSE', label: 'Center Open House', type: 'open_house', duration: 1, budget: 2000 },
  {
    code: 'SPORTS_DAY',
    label: 'Inclusive Sports Day',
    type: 'sports_day',
    duration: 1,
    budget: 4000,
  },
  {
    code: 'TECH_EXPO',
    label: 'Assistive Technology Expo',
    type: 'technology_expo',
    duration: 2,
    budget: 6000,
  },
  {
    code: 'ART_SHOW',
    label: 'Abilities Art Exhibition',
    type: 'art_exhibition',
    duration: 3,
    budget: 3000,
  },
  {
    code: 'EDU_SEM',
    label: 'Educational Seminar',
    type: 'educational_seminar',
    duration: 1,
    budget: 1500,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const outreachProgramSchema = new Schema(
  {
    name: { type: String, required: true },
    programType: { type: String, enum: PROGRAM_TYPES, required: true },
    status: { type: String, enum: PROGRAM_STATUSES, default: 'concept' },
    targetAudience: [{ type: String, enum: TARGET_AUDIENCES }],
    channels: [{ type: String, enum: OUTREACH_CHANNELS }],
    startDate: { type: Date },
    endDate: { type: Date },
    budget: { type: Number },
    actualCost: { type: Number },
    location: { type: String },
    description: { type: String },
    goals: [{ type: String }],
    coordinatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
outreachProgramSchema.index({ programType: 1, status: 1 });
outreachProgramSchema.index({ startDate: 1 });

const communityPartnerSchema = new Schema(
  {
    organizationName: { type: String, required: true },
    partnerType: { type: String, enum: PARTNERSHIP_TYPES, required: true },
    contactPerson: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    status: {
      type: String,
      enum: ['prospective', 'active', 'inactive', 'former'],
      default: 'prospective',
    },
    agreementDate: { type: Date },
    agreementExpiry: { type: Date },
    contributions: [{ type: String }],
    programIds: [{ type: Schema.Types.ObjectId, ref: 'DDDOutreachProgram' }],
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
communityPartnerSchema.index({ partnerType: 1, status: 1 });
communityPartnerSchema.index({ organizationName: 1 });

const outreachEventSchema = new Schema(
  {
    programId: { type: Schema.Types.ObjectId, ref: 'DDDOutreachProgram', required: true },
    title: { type: String, required: true },
    eventDate: { type: Date, required: true },
    location: { type: String },
    expectedAttendees: { type: Number },
    actualAttendees: { type: Number },
    channels: [{ type: String, enum: OUTREACH_CHANNELS }],
    staffAssigned: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    volunteersNeeded: { type: Number },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    feedback: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
outreachEventSchema.index({ programId: 1, eventDate: -1 });
outreachEventSchema.index({ status: 1 });

const impactReportSchema = new Schema(
  {
    programId: { type: Schema.Types.ObjectId, ref: 'DDDOutreachProgram', required: true },
    reportDate: { type: Date, default: Date.now },
    metrics: [{ metric: { type: String, enum: IMPACT_METRICS }, value: Number, notes: String }],
    totalReach: { type: Number },
    referralsGenerated: { type: Number },
    satisfactionAvg: { type: Number },
    summary: { type: String },
    recommendations: [{ type: String }],
    preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
impactReportSchema.index({ programId: 1, reportDate: -1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDOutreachProgram =
  mongoose.models.DDDOutreachProgram || mongoose.model('DDDOutreachProgram', outreachProgramSchema);
const DDDCommunityPartner =
  mongoose.models.DDDCommunityPartner ||
  mongoose.model('DDDCommunityPartner', communityPartnerSchema);
const DDDOutreachEvent =
  mongoose.models.DDDOutreachEvent || mongoose.model('DDDOutreachEvent', outreachEventSchema);
const DDDImpactReport =
  mongoose.models.DDDImpactReport || mongoose.model('DDDImpactReport', impactReportSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  TARGET_AUDIENCES,
  PARTNERSHIP_TYPES,
  OUTREACH_CHANNELS,
  IMPACT_METRICS,
  BUILTIN_OUTREACH_TEMPLATES,
  DDDOutreachProgram,
  DDDCommunityPartner,
  DDDOutreachEvent,
  DDDImpactReport,
};
