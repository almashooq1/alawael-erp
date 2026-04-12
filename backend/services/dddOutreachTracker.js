'use strict';
/**
 * OutreachTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddOutreachTracker.js
 */

const {
  DDDOutreachCampaign,
  DDDOutreachContact,
  DDDCampaignEvent,
  DDDOutreachReport,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES,
  CONTACT_TYPES,
  EVENT_TYPES,
  REPORT_TYPES,
  OUTREACH_CHANNELS,
  BUILTIN_CAMPAIGNS,
} = require('../models/DddOutreachTracker');

const BaseCrudService = require('./base/BaseCrudService');

class OutreachTracker extends BaseCrudService {
  constructor() {
    super('OutreachTracker', {
      description: 'Community outreach campaigns & impact tracking',
      version: '1.0.0',
    }, {
      outreachCampaigns: DDDOutreachCampaign,
      outreachContacts: DDDOutreachContact,
      campaignEvents: DDDCampaignEvent,
      outreachReports: DDDOutreachReport,
    })
  }

  async initialize() {
    await this._seedCampaigns();
    this.log('Outreach Tracker initialised ✓');
    return true;
  }

  async _seedCampaigns() {
    for (const c of BUILTIN_CAMPAIGNS) {
      const exists = await DDDOutreachCampaign.findOne({ code: c.code }).lean();
      if (!exists) await DDDOutreachCampaign.create(c);
    }
  }

  /* ── Campaigns ── */
  async listCampaigns(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDOutreachCampaign.find(q).sort({ startDate: -1 }).lean();
  }
  async getCampaign(id) { return this._getById(DDDOutreachCampaign, id); }
  async createCampaign(data) { return this._create(DDDOutreachCampaign, data); }
  async updateCampaign(id, data) { return this._update(DDDOutreachCampaign, id, data); }

  /* ── Contacts ── */
  async listContacts(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    return DDDOutreachContact.find(q).sort({ name: 1 }).lean();
  }
  async addContact(data) {
    if (!data.contactCode) data.contactCode = `OCON-${Date.now()}`;
    return DDDOutreachContact.create(data);
  }
  async updateContact(id, data) { return this._update(DDDOutreachContact, id, data); }

  /* ── Events ── */
  async listEvents(campaignId) {
    const q = campaignId ? { campaignId } : {};
    return DDDCampaignEvent.find(q).sort({ scheduledDate: 1 }).lean();
  }
  async createEvent(data) {
    if (!data.eventCode) data.eventCode = `OEVT-${Date.now()}`;
    return DDDCampaignEvent.create(data);
  }

  /* ── Reports ── */
  async listReports(campaignId) {
    const q = campaignId ? { campaignId } : {};
    return DDDOutreachReport.find(q).sort({ generatedAt: -1 }).lean();
  }
  async generateReport(data) {
    if (!data.reportCode) data.reportCode = `ORPT-${Date.now()}`;
    return DDDOutreachReport.create(data);
  }

  /* ── Analytics ── */
  async getOutreachAnalytics() {
    const [campaigns, contacts, events, reports] = await Promise.all([
      DDDOutreachCampaign.countDocuments(),
      DDDOutreachContact.countDocuments(),
      DDDCampaignEvent.countDocuments(),
      DDDOutreachReport.countDocuments(),
    ]);
    const activeCampaigns = await DDDOutreachCampaign.countDocuments({ status: 'active' });
    return { campaigns, contacts, events, reports, activeCampaigns };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new OutreachTracker();
