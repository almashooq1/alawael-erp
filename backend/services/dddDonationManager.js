/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Donation Manager — Phase 25 · Volunteer & Community Engagement
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Donation tracking, donor management, fundraiser campaigns,
 * receipt generation, and donation analytics.
 *
 * Aggregates
 *   DDDDonation          — individual donation record
 *   DDDDonor             — donor profile
 *   DDDFundraiser        — fundraising campaign
 *   DDDDonationReceipt   — tax receipt / acknowledgment
 *
 * Canonical links
 *   donorId      → DDDDonor
 *   fundraiserId → DDDFundraiser
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

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

const DDDDonation = mongoose.models.DDDDonation || mongoose.model('DDDDonation', donationSchema);

/* ── Donor ─────────────────────────────────────────────────────────────── */
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

const DDDDonor = mongoose.models.DDDDonor || mongoose.model('DDDDonor', donorSchema);

/* ── Fundraiser ────────────────────────────────────────────────────────── */
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

class DonationManager extends BaseDomainModule {
  constructor() {
    super('DonationManager', {
      description: 'Donation tracking, donor management & fundraising',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedFundraisers();
    this.log('Donation Manager initialised ✓');
    return true;
  }

  async _seedFundraisers() {
    for (const f of BUILTIN_FUNDRAISERS) {
      const exists = await DDDFundraiser.findOne({ code: f.code }).lean();
      if (!exists) await DDDFundraiser.create(f);
    }
  }

  /* ── Donations ── */
  async listDonations(filters = {}) {
    const q = {};
    if (filters.donorId) q.donorId = filters.donorId;
    if (filters.fundraiserId) q.fundraiserId = filters.fundraiserId;
    if (filters.status) q.status = filters.status;
    return DDDDonation.find(q).sort({ donatedAt: -1 }).limit(200).lean();
  }
  async recordDonation(data) {
    if (!data.donationCode) data.donationCode = `DON-${Date.now()}`;
    data.status = 'received';
    return DDDDonation.create(data);
  }
  async updateDonation(id, data) {
    return DDDDonation.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Donors ── */
  async listDonors(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    return DDDDonor.find(q).sort({ name: 1 }).lean();
  }
  async getDonor(id) {
    return DDDDonor.findById(id).lean();
  }
  async registerDonor(data) {
    if (!data.donorCode) data.donorCode = `DONOR-${Date.now()}`;
    return DDDDonor.create(data);
  }
  async updateDonor(id, data) {
    return DDDDonor.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Fundraisers ── */
  async listFundraisers(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDFundraiser.find(q).sort({ startDate: -1 }).lean();
  }
  async createFundraiser(data) {
    return DDDFundraiser.create(data);
  }
  async updateFundraiser(id, data) {
    return DDDFundraiser.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Receipts ── */
  async listReceipts(donorId) {
    const q = donorId ? { donorId } : {};
    return DDDDonationReceipt.find(q).sort({ issuedAt: -1 }).lean();
  }
  async issueReceipt(data) {
    if (!data.receiptCode) data.receiptCode = `RCPT-${Date.now()}`;
    data.taxYear = data.taxYear || new Date().getFullYear();
    return DDDDonationReceipt.create(data);
  }

  /* ── Analytics ── */
  async getDonationAnalytics() {
    const [donations, donors, fundraisers, receipts] = await Promise.all([
      DDDDonation.countDocuments(),
      DDDDonor.countDocuments(),
      DDDFundraiser.countDocuments(),
      DDDDonationReceipt.countDocuments(),
    ]);
    const pipeline = [
      { $match: { status: { $in: ['received', 'processed', 'acknowledged', 'cleared'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ];
    const [agg] = await DDDDonation.aggregate(pipeline);
    return { donations, donors, fundraisers, receipts, totalRaised: agg ? agg.total : 0 };
  }

  async healthCheck() {
    const [donors, activeFundraisers] = await Promise.all([
      DDDDonor.countDocuments({ isActive: true }),
      DDDFundraiser.countDocuments({ status: 'active' }),
    ]);
    return { status: 'healthy', activeDonors: donors, activeFundraisers };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createDonationManagerRouter() {
  const router = Router();
  const svc = new DonationManager();

  router.get('/donations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDonations(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/donations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordDonation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/donors', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDonors(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/donors/:id', async (req, res) => {
    try {
      const d = await svc.getDonor(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/donors', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerDonor(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/fundraisers', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFundraisers(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/fundraisers', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFundraiser(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/donations/receipts', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReceipts(req.query.donorId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/donations/receipts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.issueReceipt(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/donations/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getDonationAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/donations/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  DonationManager,
  DDDDonation,
  DDDDonor,
  DDDFundraiser,
  DDDDonationReceipt,
  DONATION_TYPES,
  DONATION_STATUSES,
  PAYMENT_METHODS,
  DONOR_CATEGORIES,
  FUNDRAISER_TYPES,
  FUNDRAISER_STATUSES,
  BUILTIN_FUNDRAISERS,
  createDonationManagerRouter,
};
