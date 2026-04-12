'use strict';
/**
 * DddDonorRelations — Mongoose Models & Constants
 * Auto-extracted from services/dddDonorRelations.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const DONOR_TYPES = [
  'individual',
  'corporate',
  'foundation',
  'government',
  'estate_bequest',
  'anonymous',
  'family_trust',
  'religious_organization',
  'civic_group',
  'alumni',
  'employee_match',
  'crowdfund',
];

const DONATION_TYPES = [
  'one_time',
  'recurring_monthly',
  'recurring_quarterly',
  'recurring_annual',
  'pledge',
  'in_kind',
  'stock',
  'real_estate',
  'planned_giving',
  'memorial',
];

const CAMPAIGN_STATUSES = [
  'draft',
  'planning',
  'pre_launch',
  'active',
  'midpoint',
  'final_push',
  'goal_reached',
  'extended',
  'completed',
  'archived',
];

const DONATION_CHANNELS = [
  'online',
  'check',
  'wire_transfer',
  'cash',
  'credit_card',
  'mobile_payment',
  'payroll_deduction',
  'cryptocurrency',
  'gift_card',
  'auction',
];

const STEWARDSHIP_ACTIONS = [
  'thank_you_letter',
  'phone_call',
  'personal_visit',
  'impact_report',
  'event_invitation',
  'naming_opportunity',
  'annual_report_mention',
  'social_media_shoutout',
  'certificate',
  'plaque',
];

const GIVING_LEVELS = [
  'supporter',
  'friend',
  'patron',
  'benefactor',
  'champion',
  'guardian',
  'visionary',
  'legacy',
  'platinum',
  'diamond',
];

const BUILTIN_CAMPAIGN_TEMPLATES = [
  { code: 'ANNUAL_FUND', label: 'Annual Fund Drive', goal: 100000, durationDays: 90 },
  { code: 'CAPITAL', label: 'Capital Campaign', goal: 500000, durationDays: 365 },
  { code: 'ENDOWMENT', label: 'Endowment Fund', goal: 1000000, durationDays: 730 },
  { code: 'EQUIP_FUND', label: 'Equipment Fund', goal: 50000, durationDays: 60 },
  { code: 'SCHOLAR', label: 'Scholarship Fund', goal: 25000, durationDays: 120 },
  { code: 'EMERGENCY', label: 'Emergency Relief Fund', goal: 20000, durationDays: 30 },
  { code: 'TECH_FUND', label: 'Technology Upgrade Fund', goal: 75000, durationDays: 90 },
  { code: 'RESEARCH_F', label: 'Research Fund', goal: 150000, durationDays: 180 },
  { code: 'COMMUNITY', label: 'Community Programs Fund', goal: 30000, durationDays: 60 },
  { code: 'PEER2PEER', label: 'Peer-to-Peer Fundraising', goal: 15000, durationDays: 45 },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const donorProfileSchema = new Schema(
  {
    donorType: { type: String, enum: DONOR_TYPES, required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { street: String, city: String, state: String, zip: String, country: String },
    givingLevel: { type: String, enum: GIVING_LEVELS, default: 'supporter' },
    lifetimeGiving: { type: Number, default: 0 },
    firstDonation: { type: Date },
    lastDonation: { type: Date },
    isAnonymous: { type: Boolean, default: false },
    communicationPref: { type: String, enum: ['email', 'mail', 'phone', 'none'], default: 'email' },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
donorProfileSchema.index({ donorType: 1, givingLevel: 1 });
donorProfileSchema.index({ name: 1 });

const donationRecordSchema = new Schema(
  {
    donorId: { type: Schema.Types.ObjectId, ref: 'DDDDonorProfile', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'DDDFundraisingCampaign' },
    donationType: { type: String, enum: DONATION_TYPES, required: true },
    channel: { type: String, enum: DONATION_CHANNELS },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    donatedAt: { type: Date, default: Date.now },
    receiptNumber: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurringFreq: { type: String },
    taxDeductible: { type: Boolean, default: true },
    designation: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
donationRecordSchema.index({ donorId: 1, donatedAt: -1 });
donationRecordSchema.index({ campaignId: 1 });

const fundraisingCampaignSchema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft' },
    goalAmount: { type: Number, required: true },
    raisedAmount: { type: Number, default: 0 },
    donorCount: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String },
    channels: [{ type: String, enum: DONATION_CHANNELS }],
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
fundraisingCampaignSchema.index({ status: 1, startDate: -1 });

const stewardshipLogSchema = new Schema(
  {
    donorId: { type: Schema.Types.ObjectId, ref: 'DDDDonorProfile', required: true },
    action: { type: String, enum: STEWARDSHIP_ACTIONS, required: true },
    performedAt: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    donationId: { type: Schema.Types.ObjectId, ref: 'DDDDonationRecord' },
    notes: { type: String },
    response: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
stewardshipLogSchema.index({ donorId: 1, performedAt: -1 });
stewardshipLogSchema.index({ action: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDDonorProfile =
  mongoose.models.DDDDonorProfile || mongoose.model('DDDDonorProfile', donorProfileSchema);
const DDDDonationRecord =
  mongoose.models.DDDDonationRecord || mongoose.model('DDDDonationRecord', donationRecordSchema);
const DDDFundraisingCampaign =
  mongoose.models.DDDFundraisingCampaign ||
  mongoose.model('DDDFundraisingCampaign', fundraisingCampaignSchema);
const DDDStewardshipLog =
  mongoose.models.DDDStewardshipLog || mongoose.model('DDDStewardshipLog', stewardshipLogSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  DONOR_TYPES,
  DONATION_TYPES,
  CAMPAIGN_STATUSES,
  DONATION_CHANNELS,
  STEWARDSHIP_ACTIONS,
  GIVING_LEVELS,
  BUILTIN_CAMPAIGN_TEMPLATES,
  DDDDonorProfile,
  DDDDonationRecord,
  DDDFundraisingCampaign,
  DDDStewardshipLog,
};
