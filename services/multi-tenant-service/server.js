/**
 * Multi-Tenant Service — Al-Awael ERP
 * Port: 3420
 *
 * Tenant provisioning & lifecycle, subscription/plan management,
 * feature flags, database isolation (per-tenant DB or shared with prefix),
 * tenant custom domains, usage metering, billing integration, white-labeling.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});

const tenantQueue = new Queue('tenant-jobs', { connection: redis });

/* ───────── Schemas ───────── */

// Plan / Subscription Tier
const planSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    nameAr: String,
    tier: { type: String, enum: ['free', 'starter', 'professional', 'enterprise', 'custom'], required: true },
    price: { monthly: Number, annual: Number, currency: { type: String, default: 'SAR' } },
    limits: {
      maxStudents: { type: Number, default: 50 },
      maxStaff: { type: Number, default: 10 },
      maxBranches: { type: Number, default: 1 },
      storageGB: { type: Number, default: 5 },
      apiCallsPerDay: { type: Number, default: 10000 },
      maxCourses: { type: Number, default: 10 },
    },
    features: [String], // feature flag codes
    description: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Plan = mongoose.model('Plan', planSchema);

// Tenant
const tenantSchema = new mongoose.Schema(
  {
    tenantId: { type: String, unique: true, default: () => uuidv4() },
    slug: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    nameAr: String,
    status: { type: String, enum: ['pending', 'active', 'suspended', 'cancelled', 'archived'], default: 'pending' },
    // Owner
    owner: {
      name: String,
      email: { type: String, required: true },
      phone: String,
      nationalId: String,
    },
    // Subscription
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planCode: String,
    subscription: {
      startDate: Date,
      endDate: Date,
      billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'annual' },
      autoRenew: { type: Boolean, default: true },
      trialEndsAt: Date,
      lastPayment: Date,
      nextPayment: Date,
    },
    // Database isolation
    databaseStrategy: { type: String, enum: ['shared', 'dedicated', 'schema-per-tenant'], default: 'shared' },
    databaseName: String,
    databaseUri: String,
    // Customization / white-labeling
    branding: {
      logo: String,
      favicon: String,
      primaryColor: { type: String, default: '#1976D2' },
      secondaryColor: String,
      companyNameAr: String,
      companyNameEn: String,
      customDomain: String,
      emailDomain: String,
    },
    // Regional settings
    settings: {
      timezone: { type: String, default: 'Asia/Riyadh' },
      locale: { type: String, default: 'ar-SA' },
      currency: { type: String, default: 'SAR' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      academicYearStart: { type: Number, default: 9 }, // September
      weekStartDay: { type: Number, default: 0 }, // Sunday
    },
    // Usage tracking
    usage: {
      currentStudents: { type: Number, default: 0 },
      currentStaff: { type: Number, default: 0 },
      currentBranches: { type: Number, default: 0 },
      storageUsedGB: { type: Number, default: 0 },
      apiCallsToday: { type: Number, default: 0 },
    },
    // Feature overrides (on top of plan features)
    featureOverrides: [
      {
        featureCode: String,
        enabled: Boolean,
        expiresAt: Date,
      },
    ],
    // Metadata
    tags: [String],
    notes: String,
    activatedAt: Date,
    suspendedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);

tenantSchema.index({ slug: 1 });
tenantSchema.index({ 'owner.email': 1 });
tenantSchema.index({ status: 1 });

const Tenant = mongoose.model('Tenant', tenantSchema);

// Feature Flag
const featureFlagSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    category: { type: String, enum: ['core', 'module', 'addon', 'beta', 'experimental'], default: 'module' },
    isGlobal: { type: Boolean, default: false }, // available to all tenants
    defaultEnabled: { type: Boolean, default: false },
    requiredPlan: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], default: 'starter' },
    // Rollout
    rolloutPercentage: { type: Number, default: 100 },
    allowedTenants: [String], // tenantIds for targeted rollout
    blockedTenants: [String],
    // Dependencies
    dependsOn: [String], // other feature codes
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema);

// Usage Log (daily aggregation)
const usageLogSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    date: { type: String, required: true }, // "2026-02-24"
    apiCalls: { type: Number, default: 0 },
    storageOps: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    events: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

usageLogSchema.index({ tenantId: 1, date: 1 }, { unique: true });

const UsageLog = mongoose.model('UsageLog', usageLogSchema);

/* ───────── BullMQ worker ───────── */

new Worker(
  'tenant-jobs',
  async job => {
    if (job.name === 'provision-tenant') {
      const tenant = await Tenant.findById(job.data.tenantId);
      if (!tenant) return;
      // Database provisioning based on strategy
      if (tenant.databaseStrategy === 'dedicated') {
        tenant.databaseName = `alawael_${tenant.slug}`;
        tenant.databaseUri = `mongodb://mongodb:27017/${tenant.databaseName}`;
      } else {
        tenant.databaseName = 'alawael_shared';
      }
      tenant.status = 'active';
      tenant.activatedAt = new Date();
      await tenant.save();
      // Cache tenant config
      await redis.set(`tenant:${tenant.tenantId}`, JSON.stringify(tenant.toObject()), 'EX', 3600);
      console.log(`[MultiTenant] Provisioned tenant: ${tenant.slug}`);
    }

    if (job.name === 'check-subscriptions') {
      const now = new Date();
      // Find expiring subscriptions (within 7 days)
      const expiring = await Tenant.find({
        status: 'active',
        'subscription.endDate': { $lte: new Date(now.getTime() + 7 * 86400000), $gte: now },
      });
      for (const t of expiring) {
        console.log(`[MultiTenant] Subscription expiring soon for ${t.slug}`);
        // In production: send notification via communication-hub
      }
      // Auto-suspend past-due
      const pastDue = await Tenant.find({
        status: 'active',
        'subscription.endDate': { $lt: now },
        'subscription.autoRenew': false,
      });
      for (const t of pastDue) {
        t.status = 'suspended';
        t.suspendedAt = now;
        await t.save();
        await redis.del(`tenant:${t.tenantId}`);
        console.log(`[MultiTenant] Suspended tenant: ${t.slug}`);
      }
    }
  },
  { connection: redis },
);

/* ───────── Helper: check feature for tenant ───────── */

async function isFeatureEnabled(tenantId, featureCode) {
  // Check Redis cache first
  const cacheKey = `feature:${tenantId}:${featureCode}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached === '1';

  const flag = await FeatureFlag.findOne({ code: featureCode, isActive: true });
  if (!flag) {
    await redis.setex(cacheKey, 600, '0');
    return false;
  }

  // Global feature
  if (flag.isGlobal) {
    await redis.setex(cacheKey, 600, '1');
    return true;
  }

  // Blocked
  if (flag.blockedTenants.includes(tenantId)) {
    await redis.setex(cacheKey, 600, '0');
    return false;
  }

  // Tenant override
  const tenant = await Tenant.findOne({ tenantId });
  if (tenant) {
    const override = tenant.featureOverrides.find(o => o.featureCode === featureCode);
    if (override) {
      const valid = !override.expiresAt || override.expiresAt > new Date();
      const enabled = override.enabled && valid;
      await redis.setex(cacheKey, 600, enabled ? '1' : '0');
      return enabled;
    }
    // Check plan features
    const plan = await Plan.findById(tenant.planId);
    if (plan?.features.includes(featureCode)) {
      await redis.setex(cacheKey, 600, '1');
      return true;
    }
  }

  // Targeted rollout
  if (flag.allowedTenants.length && flag.allowedTenants.includes(tenantId)) {
    await redis.setex(cacheKey, 600, '1');
    return true;
  }

  await redis.setex(cacheKey, 600, '0');
  return false;
}

/* ───────── Routes ───────── */
const r = express.Router();

// ── Plans ──
r.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json({ success: true, data: plans });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/plans', async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/plans/:id', async (req, res) => {
  try {
    const p = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Seed default plans
r.post('/plans/seed', async (_req, res) => {
  try {
    const defaults = [
      {
        code: 'FREE',
        name: 'Free Trial',
        nameAr: 'تجربة مجانية',
        tier: 'free',
        price: { monthly: 0, annual: 0 },
        limits: { maxStudents: 20, maxStaff: 3, maxBranches: 1, storageGB: 1, apiCallsPerDay: 1000, maxCourses: 3 },
        features: ['CORE', 'ATTENDANCE', 'BASIC_REPORTS'],
        sortOrder: 1,
      },
      {
        code: 'STARTER',
        name: 'Starter',
        nameAr: 'البداية',
        tier: 'starter',
        price: { monthly: 500, annual: 5000 },
        limits: { maxStudents: 100, maxStaff: 15, maxBranches: 1, storageGB: 10, apiCallsPerDay: 50000, maxCourses: 20 },
        features: ['CORE', 'ATTENDANCE', 'BASIC_REPORTS', 'BILLING', 'PARENT_PORTAL', 'MESSAGING'],
        sortOrder: 2,
      },
      {
        code: 'PRO',
        name: 'Professional',
        nameAr: 'احترافي',
        tier: 'professional',
        price: { monthly: 1500, annual: 15000 },
        limits: { maxStudents: 500, maxStaff: 50, maxBranches: 3, storageGB: 50, apiCallsPerDay: 200000, maxCourses: 100 },
        features: [
          'CORE',
          'ATTENDANCE',
          'BILLING',
          'PARENT_PORTAL',
          'MESSAGING',
          'ELEARNING',
          'FLEET',
          'HR_PAYROLL',
          'ADVANCED_REPORTS',
          'WORKFLOWS',
          'DMS',
        ],
        sortOrder: 3,
      },
      {
        code: 'ENT',
        name: 'Enterprise',
        nameAr: 'المؤسسات',
        tier: 'enterprise',
        price: { monthly: 5000, annual: 50000 },
        limits: { maxStudents: 10000, maxStaff: 500, maxBranches: 50, storageGB: 500, apiCallsPerDay: 1000000, maxCourses: 1000 },
        features: [
          'CORE',
          'ATTENDANCE',
          'BILLING',
          'PARENT_PORTAL',
          'MESSAGING',
          'ELEARNING',
          'FLEET',
          'HR_PAYROLL',
          'ADVANCED_REPORTS',
          'WORKFLOWS',
          'DMS',
          'CRM',
          'ANALYTICS',
          'REHAB',
          'IOT',
          'CUSTOM_BRANDING',
          'API_ACCESS',
          'SSO',
        ],
        sortOrder: 4,
      },
    ];
    const created = [];
    for (const d of defaults) {
      const exists = await Plan.findOne({ code: d.code });
      if (!exists) created.push(await Plan.create(d));
    }
    res.json({ success: true, data: created, message: `Seeded ${created.length} plans` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Tenants ──
r.get('/tenants', async (req, res) => {
  try {
    const { status, planCode, search, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (planCode) q.planCode = planCode;
    if (search)
      q.$or = [
        { name: new RegExp(search, 'i') },
        { nameAr: new RegExp(search, 'i') },
        { slug: new RegExp(search, 'i') },
        { 'owner.email': new RegExp(search, 'i') },
      ];
    const skip = (page - 1) * limit;
    const [tenants, total] = await Promise.all([
      Tenant.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Tenant.countDocuments(q),
    ]);
    res.json({ success: true, data: tenants, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/tenants', async (req, res) => {
  try {
    const { planCode, ...tenantData } = req.body;
    const plan = await Plan.findOne({ code: planCode || 'FREE' });
    const tenant = await Tenant.create({
      ...tenantData,
      planId: plan?._id,
      planCode: plan?.code,
      subscription: {
        startDate: new Date(),
        endDate: new Date(Date.now() + (plan?.tier === 'free' ? 14 : 365) * 86400000),
        billingCycle: 'annual',
        trialEndsAt: plan?.tier === 'free' ? new Date(Date.now() + 14 * 86400000) : null,
      },
    });
    // Queue provisioning
    await tenantQueue.add('provision-tenant', { tenantId: tenant._id.toString() });
    res.status(201).json({ success: true, data: tenant });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/tenants/:id', async (req, res) => {
  try {
    const t = await Tenant.findOne({ $or: [{ _id: req.params.id }, { tenantId: req.params.id }, { slug: req.params.id }] }).populate(
      'planId',
    );
    if (!t) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: t });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.put('/tenants/:id', async (req, res) => {
  try {
    const t = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // Invalidate cache
    await redis.del(`tenant:${t.tenantId}`);
    res.json({ success: true, data: t });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Upgrade / downgrade plan
r.post('/tenants/:id/change-plan', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Not found' });
    const newPlan = await Plan.findOne({ code: req.body.planCode });
    if (!newPlan) return res.status(400).json({ success: false, error: 'Plan not found' });
    tenant.planId = newPlan._id;
    tenant.planCode = newPlan.code;
    tenant.subscription.startDate = new Date();
    tenant.subscription.endDate = new Date(Date.now() + 365 * 86400000);
    await tenant.save();
    // Invalidate all feature caches
    const keys = await redis.keys(`feature:${tenant.tenantId}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.del(`tenant:${tenant.tenantId}`);
    res.json({ success: true, data: tenant });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Suspend / reactivate
r.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const t = await Tenant.findByIdAndUpdate(req.params.id, { status: 'suspended', suspendedAt: new Date() }, { new: true });
    await redis.del(`tenant:${t.tenantId}`);
    res.json({ success: true, data: t });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/tenants/:id/reactivate', async (req, res) => {
  try {
    const t = await Tenant.findByIdAndUpdate(req.params.id, { status: 'active', suspendedAt: null }, { new: true });
    await redis.del(`tenant:${t.tenantId}`);
    res.json({ success: true, data: t });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Feature Flags ──
r.get('/features', async (req, res) => {
  try {
    const { category, active } = req.query;
    const q = {};
    if (category) q.category = category;
    if (active !== undefined) q.isActive = active === 'true';
    const flags = await FeatureFlag.find(q).sort({ category: 1, code: 1 });
    res.json({ success: true, data: flags });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/features', async (req, res) => {
  try {
    const flag = await FeatureFlag.create(req.body);
    res.status(201).json({ success: true, data: flag });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/features/:id', async (req, res) => {
  try {
    const f = await FeatureFlag.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // Invalidate all caches for this feature
    const keys = await redis.keys(`feature:*:${f.code}`);
    if (keys.length) await redis.del(...keys);
    res.json({ success: true, data: f });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Check feature for tenant
r.get('/features/check/:tenantId/:featureCode', async (req, res) => {
  try {
    const enabled = await isFeatureEnabled(req.params.tenantId, req.params.featureCode);
    res.json({ success: true, data: { tenantId: req.params.tenantId, feature: req.params.featureCode, enabled } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Bulk feature check
r.post('/features/check-bulk', async (req, res) => {
  try {
    const { tenantId, features } = req.body;
    const result = {};
    for (const f of features) {
      result[f] = await isFeatureEnabled(tenantId, f);
    }
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Seed default features
r.post('/features/seed', async (_req, res) => {
  try {
    const defaults = [
      { code: 'CORE', name: 'Core System', nameAr: 'النظام الأساسي', category: 'core', isGlobal: true, defaultEnabled: true },
      { code: 'ATTENDANCE', name: 'Attendance Module', nameAr: 'وحدة الحضور', category: 'module', requiredPlan: 'free' },
      { code: 'BASIC_REPORTS', name: 'Basic Reports', nameAr: 'التقارير الأساسية', category: 'module', requiredPlan: 'free' },
      { code: 'BILLING', name: 'Billing & Invoicing', nameAr: 'الفوترة', category: 'module', requiredPlan: 'starter' },
      { code: 'PARENT_PORTAL', name: 'Parent Portal', nameAr: 'بوابة أولياء الأمور', category: 'module', requiredPlan: 'starter' },
      { code: 'MESSAGING', name: 'Messaging', nameAr: 'المراسلات', category: 'module', requiredPlan: 'starter' },
      { code: 'ELEARNING', name: 'E-Learning', nameAr: 'التعلم الإلكتروني', category: 'module', requiredPlan: 'professional' },
      { code: 'FLEET', name: 'Fleet Management', nameAr: 'إدارة الأسطول', category: 'module', requiredPlan: 'professional' },
      { code: 'HR_PAYROLL', name: 'HR & Payroll', nameAr: 'الموارد البشرية والرواتب', category: 'module', requiredPlan: 'professional' },
      { code: 'WORKFLOWS', name: 'Workflow Engine', nameAr: 'محرك سير العمل', category: 'module', requiredPlan: 'professional' },
      { code: 'DMS', name: 'Document Management', nameAr: 'إدارة الوثائق', category: 'module', requiredPlan: 'professional' },
      { code: 'CRM', name: 'CRM', nameAr: 'إدارة العلاقات', category: 'module', requiredPlan: 'enterprise' },
      { code: 'ANALYTICS', name: 'Advanced Analytics', nameAr: 'التحليلات المتقدمة', category: 'module', requiredPlan: 'enterprise' },
      { code: 'REHAB', name: 'Rehabilitation Care', nameAr: 'رعاية التأهيل', category: 'module', requiredPlan: 'enterprise' },
      { code: 'IOT', name: 'IoT Gateway', nameAr: 'بوابة إنترنت الأشياء', category: 'addon', requiredPlan: 'enterprise' },
      { code: 'CUSTOM_BRANDING', name: 'Custom Branding', nameAr: 'علامة تجارية مخصصة', category: 'addon', requiredPlan: 'enterprise' },
      { code: 'API_ACCESS', name: 'API Access', nameAr: 'الوصول للواجهة البرمجية', category: 'addon', requiredPlan: 'enterprise' },
      { code: 'SSO', name: 'Single Sign-On', nameAr: 'تسجيل دخول موحد', category: 'addon', requiredPlan: 'enterprise' },
    ];
    const created = [];
    for (const d of defaults) {
      const exists = await FeatureFlag.findOne({ code: d.code });
      if (!exists) created.push(await FeatureFlag.create(d));
    }
    res.json({ success: true, data: created, message: `Seeded ${created.length} features` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Usage ──
r.post('/usage/record', async (req, res) => {
  try {
    const { tenantId, apiCalls, storageOps, activeUsers } = req.body;
    const date = new Date().toISOString().slice(0, 10);
    const log = await UsageLog.findOneAndUpdate(
      { tenantId, date },
      { $inc: { apiCalls: apiCalls || 0, storageOps: storageOps || 0, activeUsers: activeUsers || 0 } },
      { upsert: true, new: true },
    );
    // Also update tenant's daily counter
    await Tenant.findOneAndUpdate({ tenantId }, { $inc: { 'usage.apiCallsToday': apiCalls || 0 } });
    res.json({ success: true, data: log });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/usage/:tenantId', async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = { tenantId: req.params.tenantId };
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to) q.date.$lte = to;
    }
    const logs = await UsageLog.find(q).sort({ date: -1 });
    res.json({ success: true, data: logs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Dashboard ──
r.get('/dashboard', async (req, res) => {
  try {
    const [total, active, suspended, byPlan] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ status: 'suspended' }),
      Tenant.aggregate([{ $group: { _id: '$planCode', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { totalTenants: total, active, suspended, byPlan } });
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
// Reset daily API call counters at midnight
cron.schedule('0 0 * * *', async () => {
  await Tenant.updateMany({}, { $set: { 'usage.apiCallsToday': 0 } });
  console.log('[MultiTenant] Reset daily API call counters');
});

// Check subscriptions daily at 7 AM
cron.schedule('0 7 * * *', async () => {
  await tenantQueue.add('check-subscriptions', {});
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3420;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_multitenant';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[MultiTenant] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[MultiTenant] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[MultiTenant] Mongo error', err);
    process.exit(1);
  });
