'use strict';
/**
 * AdvocacyProgram Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddAdvocacyProgram.js
 */

const {
  DDDAdvocacyCampaign,
  DDDPolicyTracker,
  DDDSelfAdvocacyTraining,
  DDDStakeholderEngagement,
  ADVOCACY_AREAS,
  CAMPAIGN_TYPES,
  POLICY_STATUSES,
  STAKEHOLDER_TYPES,
  TRAINING_TOPICS,
  ENGAGEMENT_LEVELS,
  BUILTIN_ADVOCACY_CONFIGS,
} = require('../models/DddAdvocacyProgram');

const BaseCrudService = require('./base/BaseCrudService');

class AdvocacyProgram extends BaseCrudService {
  constructor() {
    super('AdvocacyProgram', {}, {
      advocacyCampaigns: DDDAdvocacyCampaign,
      policyTrackers: DDDPolicyTracker,
      selfAdvocacyTrainings: DDDSelfAdvocacyTraining,
      stakeholderEngagements: DDDStakeholderEngagement,
    });
  }

  async createCampaign(data) { return this._create(DDDAdvocacyCampaign, data); }
  async listCampaigns(filter = {}, page = 1, limit = 20) { return this._list(DDDAdvocacyCampaign, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateCampaign(id, data) { return this._update(DDDAdvocacyCampaign, id, data); }

  async createPolicy(data) { return this._create(DDDPolicyTracker, data); }
  async listPolicies(filter = {}, page = 1, limit = 20) { return this._list(DDDPolicyTracker, filter, { page: page, limit: limit, sort: { lastActionDate: -1 } }); }

  async scheduleTraining(data) { return this._create(DDDSelfAdvocacyTraining, data); }
  async listTraining(filter = {}, page = 1, limit = 20) { return this._list(DDDSelfAdvocacyTraining, filter, { page: page, limit: limit, sort: { scheduledDate: -1 } }); }

  async logEngagement(data) { return this._create(DDDStakeholderEngagement, data); }
  async listEngagements(filter = {}, page = 1, limit = 20) { return this._list(DDDStakeholderEngagement, filter, { page: page, limit: limit, sort: { engagementDate: -1 } }); }

  async getAdvocacyStats() {
    const [campaigns, activePolicies, trainings, engagements] = await Promise.all([
      DDDAdvocacyCampaign.countDocuments({ status: 'active' }),
      DDDPolicyTracker.countDocuments({ status: 'monitoring' }),
      DDDSelfAdvocacyTraining.countDocuments({ status: 'completed' }),
      DDDStakeholderEngagement.countDocuments(),
    ]);
    return {
      activeCampaigns: campaigns,
      monitoredPolicies: activePolicies,
      completedTrainings: trainings,
      totalEngagements: engagements,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new AdvocacyProgram();
