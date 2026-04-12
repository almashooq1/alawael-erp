'use strict';
/**
 * DonationManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddDonationManager.js
 */

const {
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
} = require('../models/DddDonationManager');

const BaseCrudService = require('./base/BaseCrudService');

class DonationManager extends BaseCrudService {
  constructor() {
    super('DonationManager', {
      description: 'Donation tracking, donor management & fundraising',
      version: '1.0.0',
    }, {
      donations: DDDDonation,
      donors: DDDDonor,
      fundraisers: DDDFundraiser,
      donationReceipts: DDDDonationReceipt,
    })
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
  async updateDonation(id, data) { return this._update(DDDDonation, id, data); }

  /* ── Donors ── */
  async listDonors(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    return DDDDonor.find(q).sort({ name: 1 }).lean();
  }
  async getDonor(id) { return this._getById(DDDDonor, id); }
  async registerDonor(data) {
    if (!data.donorCode) data.donorCode = `DONOR-${Date.now()}`;
    return DDDDonor.create(data);
  }
  async updateDonor(id, data) { return this._update(DDDDonor, id, data); }

  /* ── Fundraisers ── */
  async listFundraisers(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDFundraiser.find(q).sort({ startDate: -1 }).lean();
  }
  async createFundraiser(data) { return this._create(DDDFundraiser, data); }
  async updateFundraiser(id, data) { return this._update(DDDFundraiser, id, data); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new DonationManager();
