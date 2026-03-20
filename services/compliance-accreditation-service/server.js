'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════ */

const licenseSchema = new mongoose.Schema(
  {
    licenseNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: {
      type: String,
      enum: [
        'operating',
        'educational',
        'health',
        'fire-safety',
        'food',
        'transport',
        'building',
        'commercial-register',
        'municipality',
        'labor',
        'other',
      ],
      required: true,
    },
    issuingAuthority: { nameAr: String, nameEn: String, code: String },
    issueDate: Date,
    expiryDate: { type: Date, required: true },
    renewalDate: Date,
    cost: { amount: Number, currency: { type: String, default: 'SAR' } },
    documentRef: String,
    attachments: [String],
    conditions: [String],
    status: { type: String, enum: ['active', 'expired', 'pending-renewal', 'suspended', 'revoked', 'under-review'], default: 'active' },
    reminderDays: { type: Number, default: 30 },
    assignedTo: { userId: String, name: String },
    notes: String,
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

const accreditationSchema = new mongoose.Schema(
  {
    accreditationNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    body: { nameAr: String, nameEn: String, country: String },
    standard: String,
    scope: String,
    level: { type: String, enum: ['provisional', 'basic', 'standard', 'advanced', 'excellence'] },
    grantedDate: Date,
    expiryDate: Date,
    nextAuditDate: Date,
    requirements: [
      {
        code: String,
        titleAr: String,
        category: String,
        status: { type: String, enum: ['met', 'partially-met', 'not-met', 'not-applicable'] },
        evidence: [String],
        score: Number,
        maxScore: Number,
        notes: String,
      },
    ],
    overallScore: Number,
    maxScore: Number,
    percentage: Number,
    status: {
      type: String,
      enum: ['preparing', 'self-assessment', 'submitted', 'under-review', 'granted', 'conditional', 'denied', 'expired'],
      default: 'preparing',
    },
    attachments: [String],
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

accreditationSchema.pre('save', async function (next) {
  if (!this.accreditationNo) {
    const count = await this.constructor.countDocuments();
    this.accreditationNo = `ACC-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.requirements?.length) {
    this.overallScore = this.requirements.reduce((s, r) => s + (r.score || 0), 0);
    this.maxScore = this.requirements.reduce((s, r) => s + (r.maxScore || 0), 0);
    this.percentage = this.maxScore ? Math.round((this.overallScore / this.maxScore) * 100 * 10) / 10 : 0;
  }
  next();
});

const complianceCheckSchema = new mongoose.Schema(
  {
    checkNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    category: {
      type: String,
      enum: ['regulatory', 'safety', 'educational', 'health', 'data-protection', 'labor', 'financial', 'environmental'],
      required: true,
    },
    regulation: { name: String, article: String, authority: String },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual', 'on-demand'],
      default: 'monthly',
    },
    checklist: [
      {
        item: String,
        requirement: String,
        status: { type: String, enum: ['compliant', 'non-compliant', 'partial', 'not-checked'] },
        evidence: String,
        notes: String,
        dueDate: Date,
      },
    ],
    assignedTo: { userId: String, name: String },
    dueDate: Date,
    completedDate: Date,
    complianceRate: Number,
    findings: [
      {
        description: String,
        severity: { type: String, enum: ['minor', 'major', 'critical'] },
        corrective: String,
        dueDate: Date,
        status: String,
      },
    ],
    status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'overdue'], default: 'scheduled' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

complianceCheckSchema.pre('save', async function (next) {
  if (!this.checkNo) {
    const count = await this.constructor.countDocuments();
    this.checkNo = `CC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.checklist?.length) {
    const compliant = this.checklist.filter(c => c.status === 'compliant').length;
    this.complianceRate = Math.round((compliant / this.checklist.length) * 100 * 10) / 10;
  }
  next();
});

const policyDocumentSchema = new mongoose.Schema(
  {
    docNo: { type: String, unique: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    type: { type: String, enum: ['policy', 'procedure', 'guideline', 'manual', 'form', 'template', 'regulation'], default: 'policy' },
    category: String,
    version: { type: String, default: '1.0' },
    content: String,
    summary: String,
    effectiveDate: Date,
    reviewDate: Date,
    nextReviewDate: Date,
    owner: { userId: String, name: String, department: String },
    approvedBy: { userId: String, name: String, date: Date },
    attachments: [String],
    status: { type: String, enum: ['draft', 'review', 'approved', 'active', 'superseded', 'archived'], default: 'draft' },
    changeLog: [{ version: String, date: Date, changes: String, by: String }],
  },
  { timestamps: true },
);

policyDocumentSchema.pre('save', async function (next) {
  if (!this.docNo) {
    const count = await this.constructor.countDocuments();
    this.docNo = `POL-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const License = mongoose.model('License', licenseSchema);
const Accreditation = mongoose.model('Accreditation', accreditationSchema);
const ComplianceCheck = mongoose.model('ComplianceCheck', complianceCheckSchema);
const PolicyDocument = mongoose.model('PolicyDocument', policyDocumentSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_compliance';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3500;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const complianceQueue = new Queue('compliance-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'compliance-accreditation-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// Licenses
app.post('/api/licenses', async (req, res) => {
  try {
    res.status(201).json(await License.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/licenses', async (req, res) => {
  const { type, status, expiringSoon } = req.query;
  const q = {};
  if (type) q.type = type;
  if (status) q.status = status;
  if (expiringSoon === 'true') {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    q.expiryDate = { $lte: d, $gte: new Date() };
  }
  res.json(await License.find(q).sort({ expiryDate: 1 }));
});
app.put('/api/licenses/:id', async (req, res) => {
  res.json(await License.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Accreditations
app.post('/api/accreditations', async (req, res) => {
  try {
    res.status(201).json(await Accreditation.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/accreditations', async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  res.json(await Accreditation.find(q).sort({ createdAt: -1 }));
});
app.get('/api/accreditations/:id', async (req, res) => {
  const a = await Accreditation.findById(req.params.id);
  if (!a) return res.status(404).json({ error: 'الاعتماد غير موجود' });
  res.json(a);
});
app.put('/api/accreditations/:id', async (req, res) => {
  res.json(await Accreditation.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Compliance Checks
app.post('/api/compliance-checks', async (req, res) => {
  try {
    res.status(201).json(await ComplianceCheck.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/compliance-checks', async (req, res) => {
  const { category, status, from, to } = req.query;
  const q = {};
  if (category) q.category = category;
  if (status) q.status = status;
  if (from || to) {
    q.dueDate = {};
    if (from) q.dueDate.$gte = new Date(from);
    if (to) q.dueDate.$lte = new Date(to);
  }
  res.json(await ComplianceCheck.find(q).sort({ dueDate: 1 }));
});
app.put('/api/compliance-checks/:id', async (req, res) => {
  res.json(await ComplianceCheck.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Policy Documents
app.post('/api/policies', async (req, res) => {
  try {
    res.status(201).json(await PolicyDocument.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/policies', async (req, res) => {
  const { type, category, status, search } = req.query;
  const q = {};
  if (type) q.type = type;
  if (category) q.category = category;
  if (status) q.status = status;
  if (search) q.$or = [{ titleAr: new RegExp(search, 'i') }, { titleEn: new RegExp(search, 'i') }];
  res.json(await PolicyDocument.find(q).sort({ titleAr: 1 }));
});
app.put('/api/policies/:id', async (req, res) => {
  res.json(await PolicyDocument.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Dashboard
app.get('/api/compliance/dashboard', async (_req, res) => {
  const cacheKey = 'compliance:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const soon = new Date();
  soon.setDate(soon.getDate() + 60);
  const [activeLicenses, expiringLicenses, activeAccreditations, overdueChecks, activePolicies] = await Promise.all([
    License.countDocuments({ status: 'active' }),
    License.countDocuments({ expiryDate: { $lte: soon, $gte: new Date() } }),
    Accreditation.countDocuments({ status: { $in: ['granted', 'conditional'] } }),
    ComplianceCheck.countDocuments({ status: 'overdue' }),
    PolicyDocument.countDocuments({ status: 'active' }),
  ]);
  const result = { activeLicenses, expiringLicenses, activeAccreditations, overdueChecks, activePolicies };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

// Cron: License expiry check daily 6 AM
cron.schedule('0 6 * * *', async () => {
  try {
    const licenses = await License.find({ status: 'active' });
    const now = new Date();
    for (const lic of licenses) {
      const daysToExpiry = Math.ceil((lic.expiryDate - now) / (1000 * 60 * 60 * 24));
      if (daysToExpiry <= lic.reminderDays && daysToExpiry > 0) {
        await complianceQueue.add('license-expiry-reminder', { licenseId: lic._id.toString(), nameAr: lic.nameAr, daysToExpiry });
      } else if (daysToExpiry <= 0) {
        lic.status = 'expired';
        await lic.save();
      }
    }
    console.log('[CRON] License expiry check completed');
  } catch (e) {
    console.error('[CRON] License check error:', e.message);
  }
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — compliance-accreditation');
    app.listen(PORT, () => console.log(`✅ Compliance-Accreditation Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
