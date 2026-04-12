'use strict';
/**
 * DonorRelations Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddDonorRelations.js
 */

const {
  DDDDonorProfile,
  DDDDonationRecord,
  DDDFundraisingCampaign,
  DDDStewardshipLog,
  DONOR_TYPES,
  DONATION_TYPES,
  CAMPAIGN_STATUSES,
  DONATION_CHANNELS,
  STEWARDSHIP_ACTIONS,
  GIVING_LEVELS,
  BUILTIN_CAMPAIGN_TEMPLATES,
} = require('../models/DddDonorRelations');

const BaseCrudService = require('./base/BaseCrudService');

class DonorRelations extends BaseCrudService {
  constructor() {
    super('DonorRelations', {}, {
      donorProfiles: DDDDonorProfile,
      donationRecords: DDDDonationRecord,
      fundraisingCampaigns: DDDFundraisingCampaign,
      stewardshipLogs: DDDStewardshipLog,
    });
  }

  async createDonor(data) { return this._create(DDDDonorProfile, data); }
  async listDonors(filter = {}, page = 1, limit = 20) { return this._list(DDDDonorProfile, filter, { page: page, limit: limit, sort: { lifetimeGiving: -1 } }); }
  async updateDonor(id, data) { return this._update(DDDDonorProfile, id, data); }

  async recordDonation(data) { return this._create(DDDDonationRecord, data); }
  async listDonations(filter = {}, page = 1, limit = 20) { return this._list(DDDDonationRecord, filter, { page: page, limit: limit, sort: { donatedAt: -1 } }); }

  async createCampaign(data) { return this._create(DDDFundraisingCampaign, data); }
  async listCampaigns(filter = {}, page = 1, limit = 20) { return this._list(DDDFundraisingCampaign, filter, { page: page, limit: limit, sort: { startDate: -1 } }); }

  async logStewardship(data) { return this._create(DDDStewardshipLog, data); }
  async listStewardship(filter = {}, page = 1, limit = 20) { return this._list(DDDStewardshipLog, filter, { page: page, limit: limit, sort: { performedAt: -1 } }); }

  async getDonorStats() {
    const [donors, totalRaised, activeCampaigns, stewardship] = await Promise.all([
      DDDDonorProfile.countDocuments(),
      DDDDonationRecord.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      DDDFundraisingCampaign.countDocuments({ status: 'active' }),
      DDDStewardshipLog.countDocuments(),
    ]);
    return {
      totalDonors: donors,
      totalRaised: totalRaised[0]?.total || 0,
      activeCampaigns,
      stewardshipActions: stewardship,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new DonorRelations();
