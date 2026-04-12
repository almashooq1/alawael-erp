'use strict';
/**
 * DddDonationManager — Mongoose Models & Constants
 * Auto-extracted from services/dddDonationManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const DONATION_TYPES = [
  'one_time',
  'recurring',
  'pledge',
  'in_kind',
  'memorial',
  'honorary',
  'matching',
  'corporate',
  'grant',
  'endowment',
  'estate',
  'crowdfunding',
];

const DONATION_STATUSES = [
  'pending',
  'received',
  'processed',
  'acknowledged',
  'declined',
  'refunded',
  'pledged',
  'partially_paid',
  'cancelled',
  'cleared',
];

const PAYMENT_METHODS = [
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'wire_transfer',
  'paypal',
  'apple_pay',
  'google_pay',
  'cryptocurrency',
  'stock_transfer',
  'zakat',
];

const DONOR_CATEGORIES = [
  'individual',
  'corporate',
  'foundation',
  'government',
  'religious_organization',
  'ngo',
  'school',
  'alumni',
  'anonymous',
  'estate',
  'family_trust',
  'employee_group',
];

const FUNDRAISER_TYPES = [
  'annual_appeal',
  'capital_campaign',
  'event_fundraiser',
  'crowdfunding',
  'matching_drive',
  'sponsorship',
  'auction',
  'walkathon',
  'gala_dinner',
  'peer_to_peer',
];

const FUNDRAISER_STATUSES = [
  'planning',
  'approved',
  'active',
  'paused',
  'completed',
  'exceeded_goal',
  'below_target',
  'cancelled',
  'archived',
  'evaluation',
];

/* ── Built-in fundraisers ───────────────────────────────────────────────── */
const BUILTIN_FUNDRAISERS = [
  {
    code: 'FUND-ANNUAL',
    name: 'Annual Giving Campaign',
    nameAr: 'حملة العطاء السنوي',
    type: 'annual_appeal',
    goalAmount: 500000,
  },
  {
    code: 'FUND-EQUIP',
    name: 'Equipment Fund',
    nameAr: 'صندوق المعدات',
    type: 'capital_campaign',
    goalAmount: 200000,
  },
  {
    code: 'FUND-SCHOL',
    name: 'Patient Scholarship Fund',
    nameAr: 'صندوق منح المرضى',
    type: 'annual_appeal',
    goalAmount: 100000,
  },
  {
    code: 'FUND-GALA',
    name: 'Annual Gala Dinner',
    nameAr: 'حفل العشاء السنوي',
    type: 'gala_dinner',
    goalAmount: 300000,
  },
  {
    code: 'FUND-WALK',
    name: 'Ability Walk',
    nameAr: 'مسيرة القدرات',
    type: 'walkathon',
    goalAmount: 75000,
  },
  {
    code: 'FUND-CORP',
    name: 'Corporate Sponsorship',
    nameAr: 'رعاية الشركات',
    type: 'sponsorship',
    goalAmount: 250000,
  },
  {
    code: 'FUND-CROWD',
    name: 'Community Crowdfund',
    nameAr: 'تمويل جماعي',
    type: 'crowdfunding',
    goalAmount: 50000,
  },
  {
    code: 'FUND-MATCH',
    name: 'Matching Gift Drive',
    nameAr: 'حملة الهدايا المتطابقة',
    type: 'matching_drive',
    goalAmount: 150000,
  },
  {
    code: 'FUND-AUCTION',
    name: 'Charity Auction',
    nameAr: 'مزاد خيري',
    type: 'auction',
    goalAmount: 100000,
  },
  {
    code: 'FUND-P2P',
    name: 'Peer Fundraising',
    nameAr: 'جمع تبرعات أقران',
    type: 'peer_to_peer',
    goalAmount: 40000,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Donation ──────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const donationSchema = new Schema(
  {
    donationCode: { type: String, required: true, unique: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'DDDDonor' },
    fundraiserId: { type: Schema.Types.ObjectId, ref: 'DDDFundraiser' },
    type: { type: String, enum: DONATION_TYPES, required: true },
    status: { type: String, enum: DONATION_STATUSES, default: 'pending' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS },
    transactionId: { type: String },
    donatedAt: { type: Date, default: Date.now },
    isAnonymous: { type: Boolean, default: false },
    dedication: { type: String },
    notes: { type: String },
    taxDeductible: { type: Boolean, default: true },
    receiptIssued: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

donationSchema.index({ donorId: 1, donatedAt: -1 });
donationSchema.index({ fundraiserId: 1 });
donationSchema.index({ status: 1 });

const donorSchema = new Schema(
  {
    donorCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: DONOR_CATEGORIES, required: true },
    email: { type: String },
    phone: { type: String },
    organization: { type: String },
    address: { type: String },
    totalDonated: { type: Number, default: 0 },
    donationCount: { type: Number, default: 0 },
    firstDonationDate: { type: Date },
    lastDonationDate: { type: Date },
    preferredChannel: { type: String },
    communicationPreference: { type: String, enum: ['email', 'phone', 'mail', 'sms', 'none'] },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

donorSchema.index({ category: 1 });

const fundraiserSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: FUNDRAISER_TYPES, required: true },
    status: { type: String, enum: FUNDRAISER_STATUSES, default: 'planning' },
    goalAmount: { type: Number },
    raisedAmount: { type: Number, default: 0 },
    donorCount: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

fundraiserSchema.index({ type: 1, status: 1 });

const DDDFundraiser =
  mongoose.models.DDDFundraiser || mongoose.model('DDDFundraiser', fundraiserSchema);

/* ── Donation Receipt ──────────────────────────────────────────────────── */
const donationReceiptSchema = new Schema(
  {
    receiptCode: { type: String, required: true, unique: true },
    donationId: { type: Schema.Types.ObjectId, ref: 'DDDDonation', required: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'DDDDonor' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    issuedAt: { type: Date, default: Date.now },
    taxYear: { type: Number },
    receiptUrl: { type: String },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

donationReceiptSchema.index({ donationId: 1 });
donationReceiptSchema.index({ donorId: 1, taxYear: 1 });

const DDDDonationReceipt =
  mongoose.models.DDDDonationReceipt || mongoose.model('DDDDonationReceipt', donationReceiptSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDDonation = mongoose.models.DDDDonation || mongoose.model('DDDDonation', donationSchema);

/* ── Donor ─────────────────────────────────────────────────────────────── */
const DDDDonor = mongoose.models.DDDDonor || mongoose.model('DDDDonor', donorSchema);

/* ── Fundraiser ────────────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  DONATION_TYPES,
  DONATION_STATUSES,
  PAYMENT_METHODS,
  DONOR_CATEGORIES,
  FUNDRAISER_TYPES,
  FUNDRAISER_STATUSES,
  BUILTIN_FUNDRAISERS,
  DDDDonation,
  DDDDonor,
  DDDFundraiser,
  DDDDonationReceipt,
};
