/**
 * CRM Service — Al-Awael ERP
 * Port: 3310
 *
 * Lead management, enrollment pipeline, family lifecycle, communication
 * tracking, follow-ups, campaigns, referrals, satisfaction surveys.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});

const crmQueue = new Queue('crm-jobs', { connection: redis });

/* ───────── Schemas ───────── */

// Lead (Inquiry → Prospect → Applicant → Enrolled → Alumni)
const leadSchema = new mongoose.Schema(
  {
    leadNumber: { type: String, unique: true },
    status: {
      type: String,
      enum: ['inquiry', 'prospect', 'applicant', 'enrolled', 'waitlist', 'rejected', 'withdrawn', 'alumni', 'lost'],
      default: 'inquiry',
    },
    source: {
      type: String,
      enum: ['website', 'phone', 'walk-in', 'referral', 'social-media', 'advertisement', 'event', 'partner', 'other'],
      default: 'website',
    },
    // Parent/Guardian info
    parentName: { type: String, required: true },
    parentNameAr: String,
    parentPhone: { type: String, required: true },
    parentEmail: String,
    parentNationalId: String,
    relationship: { type: String, enum: ['father', 'mother', 'guardian', 'other'], default: 'father' },
    // Child info
    childName: { type: String, required: true },
    childNameAr: String,
    childDob: Date,
    childGender: { type: String, enum: ['male', 'female'] },
    requestedGrade: String,
    hasDisability: { type: Boolean, default: false },
    disabilityType: String,
    // Assignment
    assignedTo: String,
    branchId: String,
    // Pipeline
    pipelineStage: { type: String, default: 'new' },
    probability: { type: Number, min: 0, max: 100, default: 50 },
    expectedValue: Number,
    expectedEnrollDate: Date,
    // Scores
    leadScore: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
    // Tags & custom
    tags: [String],
    notes: String,
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
    lostReason: String,
    convertedAt: Date,
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  },
  { timestamps: true },
);

leadSchema.index({ status: 1, assignedTo: 1 });
leadSchema.index({ parentPhone: 1 });
leadSchema.index({ '$**': 'text' });

// Auto-generate lead number
leadSchema.pre('save', async function (next) {
  if (!this.leadNumber) {
    const count = await mongoose.model('Lead').countDocuments();
    this.leadNumber = `LD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Lead = mongoose.model('Lead', leadSchema);

// Family (post-enrollment CRM record)
const familySchema = new mongoose.Schema(
  {
    familyCode: { type: String, unique: true },
    status: { type: String, enum: ['active', 'inactive', 'alumni', 'suspended'], default: 'active' },
    guardians: [
      {
        name: String,
        nameAr: String,
        phone: String,
        email: String,
        nationalId: String,
        relationship: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    children: [
      {
        name: String,
        nameAr: String,
        studentId: String,
        grade: String,
        enrollmentDate: Date,
        status: { type: String, enum: ['active', 'graduated', 'withdrawn', 'transferred'] },
      },
    ],
    address: { city: String, district: String, street: String, zip: String },
    preferredLanguage: { type: String, default: 'ar' },
    preferredContact: { type: String, enum: ['phone', 'whatsapp', 'email', 'sms'], default: 'whatsapp' },
    loyaltyPoints: { type: Number, default: 0 },
    lifetimeValue: { type: Number, default: 0 },
    satisfactionScore: Number,
    referralCode: String,
    referredFamilies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }],
    tags: [String],
    notes: String,
  },
  { timestamps: true },
);

familySchema.pre('save', async function (next) {
  if (!this.familyCode) {
    const c = await mongoose.model('Family').countDocuments();
    this.familyCode = `FAM-${String(c + 1).padStart(5, '0')}`;
    this.referralCode = `REF-${this.familyCode}`;
  }
  next();
});

const Family = mongoose.model('Family', familySchema);

// Communication Log
const commLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ['lead', 'family'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    channel: { type: String, enum: ['phone', 'whatsapp', 'email', 'sms', 'meeting', 'portal', 'system'], required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], default: 'outbound' },
    subject: String,
    content: String,
    status: { type: String, enum: ['sent', 'delivered', 'read', 'replied', 'bounced', 'failed'], default: 'sent' },
    sentBy: String,
    scheduledAt: Date,
    sentAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

const CommLog = mongoose.model('CommLog', commLogSchema);

// Follow-up Task
const followUpSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ['lead', 'family'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['call', 'email', 'meeting', 'visit', 'document-request', 'assessment', 'other'], default: 'call' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['pending', 'completed', 'overdue', 'cancelled'], default: 'pending' },
    assignedTo: String,
    dueDate: { type: Date, required: true },
    completedAt: Date,
    notes: String,
    outcome: String,
  },
  { timestamps: true },
);

followUpSchema.index({ status: 1, dueDate: 1, assignedTo: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

// Campaign
const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    type: {
      type: String,
      enum: ['enrollment-drive', 'open-day', 'referral', 'retention', 'reactivation', 'seasonal', 'sms-blast', 'email-campaign'],
      required: true,
    },
    status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'cancelled'], default: 'draft' },
    startDate: Date,
    endDate: Date,
    targetAudience: {
      segments: [String],
      filters: mongoose.Schema.Types.Mixed,
    },
    budget: Number,
    actualCost: Number,
    metrics: {
      reach: { type: Number, default: 0 },
      responses: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
    content: { subject: String, body: String, templateId: String },
    createdBy: String,
  },
  { timestamps: true },
);

const Campaign = mongoose.model('Campaign', campaignSchema);

// Survey
const surveySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleAr: String,
    type: { type: String, enum: ['satisfaction', 'nps', 'feedback', 'enrollment-exit', 'event-feedback'], default: 'satisfaction' },
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
    questions: [
      {
        text: String,
        textAr: String,
        type: { type: String, enum: ['rating', 'text', 'multiple-choice', 'yes-no', 'nps'] },
        options: [String],
        required: { type: Boolean, default: true },
      },
    ],
    responses: [
      {
        familyId: String,
        answers: mongoose.Schema.Types.Mixed,
        npsScore: Number,
        submittedAt: { type: Date, default: Date.now },
      },
    ],
    averageScore: Number,
    npsScore: Number,
    responseCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Survey = mongoose.model('Survey', surveySchema);

/* ───────── BullMQ Worker ───────── */

new Worker(
  'crm-jobs',
  async job => {
    if (job.name === 'send-campaign') {
      const campaign = await Campaign.findById(job.data.campaignId);
      if (!campaign) return;
      // In production: integrate with communication-hub for actual delivery
      campaign.metrics.reach += job.data.recipientCount || 0;
      campaign.status = 'active';
      await campaign.save();
      console.log(`[CRM] Campaign ${campaign.name} sent to ${campaign.metrics.reach} recipients`);
    }

    if (job.name === 'score-leads') {
      const leads = await Lead.find({ status: { $in: ['inquiry', 'prospect'] } });
      for (const lead of leads) {
        let score = 0;
        // Scoring: recent activity, engagement, completion
        if (lead.parentEmail) score += 10;
        if (lead.childDob) score += 10;
        if (lead.expectedEnrollDate) score += 15;
        if (lead.parentNationalId) score += 10;
        // Communication engagement
        const comms = await CommLog.countDocuments({ entityId: lead._id });
        score += Math.min(comms * 5, 25);
        // Follow-ups completed
        const completed = await FollowUp.countDocuments({ entityId: lead._id, status: 'completed' });
        score += Math.min(completed * 10, 30);
        lead.leadScore = Math.min(score, 100);
        await lead.save();
      }
      console.log(`[CRM] Scored ${leads.length} leads`);
    }
  },
  { connection: redis },
);

/* ───────── Routes ───────── */
const r = express.Router();

// ── Leads ──
r.get('/leads', async (req, res) => {
  try {
    const { status, source, assignedTo, branchId, search, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (source) q.source = source;
    if (assignedTo) q.assignedTo = assignedTo;
    if (branchId) q.branchId = branchId;
    if (search) q.$text = { $search: search };
    const skip = (page - 1) * limit;
    const [leads, total] = await Promise.all([
      Lead.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Lead.countDocuments(q),
    ]);
    res.json({ success: true, data: leads, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/leads', async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    // Auto-create first follow-up
    await FollowUp.create({
      entityType: 'lead',
      entityId: lead._id,
      title: 'Initial Contact — اتصال أولي',
      type: 'call',
      priority: 'high',
      assignedTo: lead.assignedTo,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(201).json({ success: true, data: lead });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: lead });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Not found' });
    const [comms, followUps] = await Promise.all([
      CommLog.find({ entityId: lead._id }).sort({ createdAt: -1 }).limit(20),
      FollowUp.find({ entityId: lead._id }).sort({ dueDate: 1 }),
    ]);
    res.json({ success: true, data: { lead, communications: comms, followUps } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Convert lead → family
r.post('/leads/:id/convert', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    if (lead.status === 'enrolled') return res.status(400).json({ success: false, error: 'Already converted' });

    const family = await Family.create({
      guardians: [
        {
          name: lead.parentName,
          nameAr: lead.parentNameAr,
          phone: lead.parentPhone,
          email: lead.parentEmail,
          nationalId: lead.parentNationalId,
          relationship: lead.relationship,
          isPrimary: true,
        },
      ],
      children: [
        {
          name: lead.childName,
          nameAr: lead.childNameAr,
          grade: lead.requestedGrade,
          enrollmentDate: new Date(),
          status: 'active',
        },
      ],
    });

    lead.status = 'enrolled';
    lead.convertedAt = new Date();
    lead.familyId = family._id;
    await lead.save();

    res.json({ success: true, data: { lead, family } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Lead pipeline view
r.get('/leads/pipeline/summary', async (req, res) => {
  try {
    const pipeline = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$expectedValue' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data: pipeline });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Families ──
r.get('/families', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (search)
      q.$or = [
        { 'guardians.name': new RegExp(search, 'i') },
        { 'guardians.nameAr': new RegExp(search, 'i') },
        { 'guardians.phone': new RegExp(search, 'i') },
        { familyCode: new RegExp(search, 'i') },
      ];
    const skip = (page - 1) * limit;
    const [families, total] = await Promise.all([
      Family.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Family.countDocuments(q),
    ]);
    res.json({ success: true, data: families, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/families', async (req, res) => {
  try {
    const family = await Family.create(req.body);
    res.status(201).json({ success: true, data: family });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/families/:id', async (req, res) => {
  try {
    const f = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: f });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/families/:id', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ success: false, error: 'Not found' });
    const [comms, followUps, surveys] = await Promise.all([
      CommLog.find({ entityId: family._id }).sort({ createdAt: -1 }).limit(20),
      FollowUp.find({ entityId: family._id }).sort({ dueDate: 1 }),
      Survey.find({ 'responses.familyId': family._id.toString() }),
    ]);
    res.json({ success: true, data: { family, communications: comms, followUps, surveys: surveys.length } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Referral tracking
r.post('/families/:id/referral', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ success: false, error: 'Not found' });
    const lead = await Lead.create({ ...req.body, referredBy: family._id, source: 'referral' });
    family.referredFamilies.push(lead._id);
    family.loyaltyPoints += 100;
    await family.save();
    res.status(201).json({ success: true, data: { lead, loyaltyPoints: family.loyaltyPoints } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Communications ──
r.post('/communications', async (req, res) => {
  try {
    const comm = await CommLog.create({ ...req.body, sentAt: new Date() });
    res.status(201).json({ success: true, data: comm });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/communications', async (req, res) => {
  try {
    const { entityType, entityId, channel } = req.query;
    const q = {};
    if (entityType) q.entityType = entityType;
    if (entityId) q.entityId = entityId;
    if (channel) q.channel = channel;
    const comms = await CommLog.find(q).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: comms });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Follow-ups ──
r.get('/follow-ups', async (req, res) => {
  try {
    const { status, assignedTo, overdue } = req.query;
    const q = {};
    if (status) q.status = status;
    if (assignedTo) q.assignedTo = assignedTo;
    if (overdue === 'true') {
      q.status = 'pending';
      q.dueDate = { $lt: new Date() };
    }
    const tasks = await FollowUp.find(q).sort({ dueDate: 1 });
    res.json({ success: true, data: tasks });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/follow-ups', async (req, res) => {
  try {
    const f = await FollowUp.create(req.body);
    res.status(201).json({ success: true, data: f });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/follow-ups/:id', async (req, res) => {
  try {
    if (req.body.status === 'completed') req.body.completedAt = new Date();
    const f = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: f });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Campaigns ──
r.get('/campaigns', async (req, res) => {
  try {
    const camps = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, data: camps });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/campaigns', async (req, res) => {
  try {
    const c = await Campaign.create(req.body);
    res.status(201).json({ success: true, data: c });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/campaigns/:id/send', async (req, res) => {
  try {
    await crmQueue.add('send-campaign', { campaignId: req.params.id, recipientCount: req.body.recipientCount || 0 });
    res.json({ success: true, message: 'Campaign send queued' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Surveys ──
r.get('/surveys', async (req, res) => {
  try {
    const surveys = await Survey.find().sort({ createdAt: -1 });
    res.json({ success: true, data: surveys });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/surveys', async (req, res) => {
  try {
    const s = await Survey.create(req.body);
    res.status(201).json({ success: true, data: s });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/surveys/:id/respond', async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey || survey.status !== 'active') return res.status(400).json({ success: false, error: 'Survey not active' });
    survey.responses.push({ ...req.body, submittedAt: new Date() });
    survey.responseCount = survey.responses.length;
    // Calculate average NPS
    const npsResponses = survey.responses.filter(r => r.npsScore != null);
    if (npsResponses.length) {
      const promoters = npsResponses.filter(r => r.npsScore >= 9).length;
      const detractors = npsResponses.filter(r => r.npsScore <= 6).length;
      survey.npsScore = Math.round(((promoters - detractors) / npsResponses.length) * 100);
    }
    await survey.save();
    res.json({ success: true, data: { responseCount: survey.responseCount, nps: survey.npsScore } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Dashboard / stats ──
r.get('/dashboard', async (req, res) => {
  try {
    const cached = await redis.get('crm:dashboard');
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const [leadStats, familyCount, overdueFollowUps, activeCampaigns] = await Promise.all([
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Family.countDocuments({ status: 'active' }),
      FollowUp.countDocuments({ status: 'pending', dueDate: { $lt: new Date() } }),
      Campaign.countDocuments({ status: 'active' }),
    ]);

    const result = { leadStats, activeFamilies: familyCount, overdueFollowUps, activeCampaigns };
    await redis.setex('crm:dashboard', 180, JSON.stringify(result));
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Trigger lead scoring
r.post('/actions/score-leads', async (_req, res) => {
  try {
    await crmQueue.add('score-leads', {});
    res.json({ success: true, message: 'Lead scoring queued' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'healthy' : 'degraded', mongo: mongoOk, redis: redisOk, uptime: process.uptime() });
});

/* ── Crons ── */
// Mark overdue follow-ups every hour
cron.schedule('0 * * * *', async () => {
  const r = await FollowUp.updateMany({ status: 'pending', dueDate: { $lt: new Date() } }, { $set: { status: 'overdue' } });
  if (r.modifiedCount) console.log(`[CRM] Marked ${r.modifiedCount} follow-ups as overdue`);
});

// Score leads daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  await crmQueue.add('score-leads', {});
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3310;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_crm';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[CRM] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[CRM] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[CRM] Mongo error', err);
    process.exit(1);
  });
