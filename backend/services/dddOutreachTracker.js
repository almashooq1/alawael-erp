/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Outreach Tracker — Phase 25 · Volunteer & Community Engagement
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Community outreach campaigns, contact management, event coordination,
 * and impact reporting for rehabilitation awareness.
 *
 * Aggregates
 *   DDDOutreachCampaign  — outreach campaign definition
 *   DDDOutreachContact   — community contact / stakeholder
 *   DDDOutreachEvent     — event within a campaign
 *   DDDOutreachReport    — campaign impact report
 *
 * Canonical links
 *   campaignId → DDDOutreachCampaign
 *   managerId  → User
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

const DDDOutreachEvent =
  mongoose.models.DDDOutreachEvent || mongoose.model('DDDOutreachEvent', outreachEventSchema);

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

class OutreachTracker extends BaseDomainModule {
  constructor() {
    super('OutreachTracker', {
      description: 'Community outreach campaigns & impact tracking',
      version: '1.0.0',
    });
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
  async getCampaign(id) {
    return DDDOutreachCampaign.findById(id).lean();
  }
  async createCampaign(data) {
    return DDDOutreachCampaign.create(data);
  }
  async updateCampaign(id, data) {
    return DDDOutreachCampaign.findByIdAndUpdate(id, data, { new: true });
  }

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
  async updateContact(id, data) {
    return DDDOutreachContact.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Events ── */
  async listEvents(campaignId) {
    const q = campaignId ? { campaignId } : {};
    return DDDOutreachEvent.find(q).sort({ scheduledDate: 1 }).lean();
  }
  async createEvent(data) {
    if (!data.eventCode) data.eventCode = `OEVT-${Date.now()}`;
    return DDDOutreachEvent.create(data);
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
      DDDOutreachEvent.countDocuments(),
      DDDOutreachReport.countDocuments(),
    ]);
    const activeCampaigns = await DDDOutreachCampaign.countDocuments({ status: 'active' });
    return { campaigns, contacts, events, reports, activeCampaigns };
  }

  async healthCheck() {
    const [total, active] = await Promise.all([
      DDDOutreachCampaign.countDocuments(),
      DDDOutreachCampaign.countDocuments({ status: 'active' }),
    ]);
    return { status: 'healthy', totalCampaigns: total, activeCampaigns: active };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createOutreachTrackerRouter() {
  const router = Router();
  const svc = new OutreachTracker();

  router.get('/outreach/campaigns', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCampaigns(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/outreach/campaigns/:id', async (req, res) => {
    try {
      const d = await svc.getCampaign(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/outreach/campaigns', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCampaign(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/outreach/contacts', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listContacts(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/outreach/contacts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addContact(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/outreach/events', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvents(req.query.campaignId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/outreach/events', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEvent(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/outreach/reports', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReports(req.query.campaignId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/outreach/reports', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateReport(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/outreach/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOutreachAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/outreach/health', async (_req, res) => {
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
  OutreachTracker,
  DDDOutreachCampaign,
  DDDOutreachContact,
  DDDOutreachEvent,
  DDDOutreachReport,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES,
  CONTACT_TYPES,
  EVENT_TYPES,
  REPORT_TYPES,
  OUTREACH_CHANNELS,
  BUILTIN_CAMPAIGNS,
  createOutreachTrackerRouter,
};
