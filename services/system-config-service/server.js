/* ─────────────────────────────────────────────────────────
   Al-Awael ERP — System Configuration & Settings Service  (Port 3740)
   ───────────────────────────────────────────────────────── */
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const helmet = require('helmet');
const cors = require('cors');
const cron = require('node-cron');
const dayjs = require('dayjs');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3740;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_config';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/* ── Redis ───────────────────────────────────────────── */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
redis.on('error', e => console.error('Redis error', e.message));

/* ── BullMQ ──────────────────────────────────────────── */
const connection = { connection: redis };
const configQueue = new Queue('config-actions', connection);

/* ── Mongoose Schemas ────────────────────────────────── */

// ── Global Settings ──
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    category: {
      type: String,
      enum: [
        'general',
        'appearance',
        'security',
        'email',
        'sms',
        'notifications',
        'academic',
        'finance',
        'attendance',
        'system',
        'integrations',
      ],
      default: 'general',
    },
    label: String,
    labelAr: String,
    description: String,
    descriptionAr: String,
    type: { type: String, enum: ['string', 'number', 'boolean', 'json', 'array', 'color', 'select', 'image'], default: 'string' },
    options: [String],
    defaultValue: mongoose.Schema.Types.Mixed,
    isSecret: { type: Boolean, default: false },
    isEditable: { type: Boolean, default: true },
    validationRegex: String,
    updatedBy: { userId: String, name: String },
  },
  { timestamps: true },
);
const Setting = mongoose.model('Setting', settingSchema);

// ── Feature Flags ──
const featureFlagSchema = new mongoose.Schema(
  {
    flagId: { type: String, unique: true },
    name: { type: String, required: true, unique: true },
    description: String,
    descriptionAr: String,
    isEnabled: { type: Boolean, default: false },
    enabledFor: {
      roles: [String],
      users: [String],
      percentage: { type: Number, min: 0, max: 100, default: 0 },
    },
    category: { type: String, enum: ['ui', 'api', 'experiment', 'beta', 'deprecated', 'maintenance'], default: 'ui' },
    environment: { type: String, enum: ['all', 'development', 'staging', 'production'], default: 'all' },
    expiresAt: Date,
    updatedBy: { userId: String, name: String },
  },
  { timestamps: true },
);

featureFlagSchema.pre('save', async function (next) {
  if (!this.flagId) {
    const count = await mongoose.model('FeatureFlag').countDocuments();
    this.flagId = `FLG-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema);

// ── Custom Roles ──
const roleSchema = new mongoose.Schema(
  {
    roleId: { type: String, unique: true },
    name: { type: String, required: true, unique: true },
    nameAr: String,
    description: String,
    permissions: [
      {
        resource: String,
        actions: [{ type: String, enum: ['create', 'read', 'update', 'delete', 'export', 'approve', 'admin'] }],
      },
    ],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    userCount: { type: Number, default: 0 },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

roleSchema.pre('save', async function (next) {
  if (!this.roleId) {
    const count = await mongoose.model('Role').countDocuments();
    this.roleId = `ROL-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});
const Role = mongoose.model('Role', roleSchema);

// ── Theme / Appearance ──
const themeSchema = new mongoose.Schema(
  {
    themeId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: String,
    isDefault: { type: Boolean, default: false },
    colors: {
      primary: { type: String, default: '#2563eb' },
      secondary: { type: String, default: '#7c3aed' },
      accent: { type: String, default: '#059669' },
      background: { type: String, default: '#ffffff' },
      surface: { type: String, default: '#f8fafc' },
      text: { type: String, default: '#1e293b' },
      error: { type: String, default: '#dc2626' },
      warning: { type: String, default: '#d97706' },
      success: { type: String, default: '#16a34a' },
      info: { type: String, default: '#2563eb' },
    },
    typography: {
      fontFamily: { type: String, default: 'Cairo, sans-serif' },
      headingFont: { type: String, default: 'Cairo, sans-serif' },
      baseFontSize: { type: Number, default: 14 },
      direction: { type: String, enum: ['rtl', 'ltr'], default: 'rtl' },
    },
    logo: { url: String, width: Number, height: Number },
    favicon: String,
    sidebarStyle: { type: String, enum: ['full', 'compact', 'minimal'], default: 'full' },
    darkMode: { type: Boolean, default: false },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

themeSchema.pre('save', async function (next) {
  if (!this.themeId) {
    const count = await mongoose.model('Theme').countDocuments();
    this.themeId = `THM-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});
const Theme = mongoose.model('Theme', themeSchema);

// ── Config Change Log ──
const changeLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entityType: { type: String, enum: ['setting', 'feature-flag', 'role', 'theme'] },
  entityId: String,
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  userId: String,
  userName: String,
  createdAt: { type: Date, default: Date.now, expires: 15552000 }, // 180 days TTL
});
const ChangeLog = mongoose.model('ChangeLog', changeLogSchema);

/* ── BullMQ Worker ───────────────────────────────────── */
new Worker(
  'config-actions',
  async job => {
    const { action, data } = job.data;
    if (action === 'invalidate-cache') {
      const keys = await redis.keys('config:*');
      if (keys.length) await redis.del(...keys);
      console.log(`[Config] Cache invalidated (${keys.length} keys)`);
    }
    if (action === 'broadcast-change') {
      await redis.publish('config:changes', JSON.stringify(data));
    }
  },
  connection,
);

/* ── Health ───────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  res.status(mongoOk && redisOk ? 200 : 503).json({
    status: mongoOk && redisOk ? 'healthy' : 'degraded',
    service: 'system-config-service',
    timestamp: new Date().toISOString(),
    mongo: mongoOk ? 'connected' : 'disconnected',
    redis: redisOk ? 'connected' : 'disconnected',
  });
});

/* ══════════════ SETTINGS ENDPOINTS ══════════════ */

app.get('/api/config/settings', async (req, res) => {
  try {
    const { category } = req.query;
    const cacheKey = `config:settings:${category || 'all'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const filter = {};
    if (category) filter.category = category;
    const settings = await Setting.find(filter).sort({ category: 1, key: 1 });
    // Mask secrets
    const masked = settings.map(s => {
      if (s.isSecret) return { ...s.toObject(), value: '********' };
      return s;
    });
    const result = { success: true, data: masked };
    await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min cache
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/config/settings/:key', async (req, res) => {
  try {
    const cacheKey = `config:setting:${req.params.key}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ success: false, error: 'Setting not found' });
    const data = setting.isSecret ? { ...setting.toObject(), value: '********' } : setting;
    const result = { success: true, data };
    await redis.setex(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/config/settings/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ success: false, error: 'Setting not found' });
    if (!setting.isEditable) return res.status(403).json({ success: false, error: 'Setting is not editable' });

    const previousValue = setting.value;
    setting.value = req.body.value;
    setting.updatedBy = req.body.updatedBy;
    await setting.save();

    await ChangeLog.create({
      action: 'update',
      entityType: 'setting',
      entityId: req.params.key,
      previousValue,
      newValue: req.body.value,
      userId: req.body.updatedBy?.userId,
      userName: req.body.updatedBy?.name,
    });

    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    await configQueue.add('broadcast', {
      action: 'broadcast-change',
      data: { type: 'setting', key: req.params.key, value: req.body.value },
    });

    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/settings', async (req, res) => {
  try {
    const setting = await new Setting(req.body).save();
    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    res.status(201).json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk update
app.put('/api/config/settings', async (req, res) => {
  try {
    const { settings, updatedBy } = req.body;
    const results = [];
    for (const { key, value } of settings) {
      const s = await Setting.findOneAndUpdate({ key, isEditable: true }, { value, updatedBy }, { new: true });
      if (s) results.push(s);
    }
    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    res.json({ success: true, data: results, updated: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ FEATURE FLAGS ══════════════ */

app.get('/api/config/flags', async (req, res) => {
  try {
    const { category, isEnabled } = req.query;
    const cacheKey = `config:flags:${category || 'all'}:${isEnabled || 'all'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const filter = {};
    if (category) filter.category = category;
    if (isEnabled !== undefined) filter.isEnabled = isEnabled === 'true';
    const flags = await FeatureFlag.find(filter).sort({ name: 1 });
    const result = { success: true, data: flags };
    await redis.setex(cacheKey, 60, JSON.stringify(result));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/config/flags/:name', async (req, res) => {
  try {
    const flag = await FeatureFlag.findOne({ name: req.params.name });
    if (!flag) return res.status(404).json({ success: false, error: 'Flag not found' });
    res.json({ success: true, data: flag });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check if flag is enabled for a user
app.get('/api/config/flags/:name/check', async (req, res) => {
  try {
    const { userId, role } = req.query;
    const flag = await FeatureFlag.findOne({ name: req.params.name });
    if (!flag) return res.json({ enabled: false });
    if (!flag.isEnabled) return res.json({ enabled: false });
    if (flag.expiresAt && new Date() > flag.expiresAt) return res.json({ enabled: false });

    let enabled = true;
    if (flag.enabledFor.roles?.length && role) {
      enabled = flag.enabledFor.roles.includes(role);
    }
    if (flag.enabledFor.users?.length && userId) {
      enabled = flag.enabledFor.users.includes(userId);
    }
    if (flag.enabledFor.percentage > 0 && flag.enabledFor.percentage < 100) {
      const hash = userId ? userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100 : Math.random() * 100;
      enabled = hash < flag.enabledFor.percentage;
    }
    res.json({ enabled, flag: flag.name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/flags', async (req, res) => {
  try {
    const flag = await new FeatureFlag(req.body).save();
    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    res.status(201).json({ success: true, data: flag });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/config/flags/:name', async (req, res) => {
  try {
    const prev = await FeatureFlag.findOne({ name: req.params.name });
    const flag = await FeatureFlag.findOneAndUpdate({ name: req.params.name }, req.body, { new: true });
    if (!flag) return res.status(404).json({ success: false, error: 'Not found' });

    await ChangeLog.create({
      action: 'update',
      entityType: 'feature-flag',
      entityId: req.params.name,
      previousValue: { isEnabled: prev?.isEnabled },
      newValue: { isEnabled: flag.isEnabled },
      userId: req.body.updatedBy?.userId,
      userName: req.body.updatedBy?.name,
    });
    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    res.json({ success: true, data: flag });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/config/flags/:name', async (req, res) => {
  try {
    await FeatureFlag.findOneAndDelete({ name: req.params.name });
    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    res.json({ success: true, message: 'Flag deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ ROLES ══════════════ */

app.get('/api/config/roles', async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).sort({ isSystem: -1, name: 1 });
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/config/roles/:id', async (req, res) => {
  try {
    const role = await Role.findOne({ roleId: req.params.id });
    if (!role) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/roles', async (req, res) => {
  try {
    const role = await new Role(req.body).save();
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/config/roles/:id', async (req, res) => {
  try {
    const role = await Role.findOne({ roleId: req.params.id });
    if (!role) return res.status(404).json({ success: false, error: 'Not found' });
    if (role.isSystem) return res.status(403).json({ success: false, error: 'Cannot edit system role' });
    Object.assign(role, req.body);
    await role.save();
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/config/roles/:id', async (req, res) => {
  try {
    const role = await Role.findOne({ roleId: req.params.id });
    if (!role) return res.status(404).json({ success: false, error: 'Not found' });
    if (role.isSystem) return res.status(403).json({ success: false, error: 'Cannot delete system role' });
    await Role.deleteOne({ _id: role._id });
    res.json({ success: true, message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ THEMES ══════════════ */

app.get('/api/config/themes', async (req, res) => {
  try {
    const themes = await Theme.find().sort({ isDefault: -1, name: 1 });
    res.json({ success: true, data: themes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/config/themes/active', async (req, res) => {
  try {
    const cacheKey = 'config:active-theme';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const theme = (await Theme.findOne({ isDefault: true })) || (await Theme.findOne());
    const result = { success: true, data: theme };
    await redis.setex(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/themes', async (req, res) => {
  try {
    const theme = await new Theme(req.body).save();
    res.status(201).json({ success: true, data: theme });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/config/themes/:id', async (req, res) => {
  try {
    const theme = await Theme.findOneAndUpdate({ themeId: req.params.id }, req.body, { new: true });
    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    res.json({ success: true, data: theme });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/config/themes/:id/activate', async (req, res) => {
  try {
    await Theme.updateMany({}, { isDefault: false });
    const theme = await Theme.findOneAndUpdate({ themeId: req.params.id }, { isDefault: true }, { new: true });
    await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    await configQueue.add('broadcast', { action: 'broadcast-change', data: { type: 'theme', themeId: req.params.id } });
    res.json({ success: true, data: theme });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ CHANGE LOG ══════════════ */

app.get('/api/config/changelog', async (req, res) => {
  try {
    const { entityType, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (entityType) filter.entityType = entityType;
    const logs = await ChangeLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await ChangeLog.countDocuments(filter);
    res.json({ success: true, data: logs, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ DASHBOARD ══════════════ */

app.get('/api/config/dashboard/overview', async (req, res) => {
  try {
    const cacheKey = 'system-config:dashboard';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [totalSettings, totalFlags, enabledFlags, totalRoles, systemRoles, customRoles, totalThemes, recentChanges] = await Promise.all([
      Setting.countDocuments(),
      FeatureFlag.countDocuments(),
      FeatureFlag.countDocuments({ isEnabled: true }),
      Role.countDocuments({ isActive: true }),
      Role.countDocuments({ isSystem: true }),
      Role.countDocuments({ isSystem: false, isActive: true }),
      Theme.countDocuments(),
      ChangeLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const settingsByCategory = await Setting.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);

    const dashboard = {
      settings: { total: totalSettings, byCategory: settingsByCategory.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}) },
      featureFlags: { total: totalFlags, enabled: enabledFlags, disabled: totalFlags - enabledFlags },
      roles: { total: totalRoles, system: systemRoles, custom: customRoles },
      themes: totalThemes,
      recentChanges,
      generatedAt: new Date().toISOString(),
    };
    await redis.setex(cacheKey, 30, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Cron Jobs ───────────────────────────────────────── */

// Expire old feature flags daily at 2AM
cron.schedule('0 2 * * *', async () => {
  try {
    const result = await FeatureFlag.updateMany({ expiresAt: { $lt: new Date() }, isEnabled: true }, { isEnabled: false });
    if (result.modifiedCount > 0) {
      console.log(`[Cron] Disabled ${result.modifiedCount} expired feature flags`);
      await configQueue.add('invalidate', { action: 'invalidate-cache', data: {} });
    }
  } catch (e) {
    console.error('[Cron] flag expiry failed', e.message);
  }
});

/* ── Seed Data ───────────────────────────────────────── */
async function seedDefaults() {
  // Settings
  if ((await Setting.countDocuments()) === 0) {
    const defaults = [
      { key: 'app.name', value: 'نظام الأوائل', category: 'general', label: 'Application Name', labelAr: 'اسم التطبيق', type: 'string' },
      {
        key: 'app.nameEn',
        value: 'Al-Awael ERP',
        category: 'general',
        label: 'Application Name (EN)',
        labelAr: 'اسم التطبيق (إنجليزي)',
        type: 'string',
      },
      {
        key: 'app.direction',
        value: 'rtl',
        category: 'appearance',
        label: 'Text Direction',
        labelAr: 'اتجاه النص',
        type: 'select',
        options: ['rtl', 'ltr'],
      },
      {
        key: 'app.language',
        value: 'ar',
        category: 'general',
        label: 'Default Language',
        labelAr: 'اللغة الافتراضية',
        type: 'select',
        options: ['ar', 'en', 'fr', 'ur', 'tr'],
      },
      { key: 'app.timezone', value: 'Asia/Riyadh', category: 'general', label: 'Timezone', labelAr: 'المنطقة الزمنية', type: 'string' },
      { key: 'app.currency', value: 'SAR', category: 'finance', label: 'Default Currency', labelAr: 'العملة الافتراضية', type: 'string' },
      { key: 'app.vatRate', value: 15, category: 'finance', label: 'VAT Rate (%)', labelAr: 'نسبة الضريبة', type: 'number' },
      {
        key: 'app.academicYear',
        value: '2025-2026',
        category: 'academic',
        label: 'Current Academic Year',
        labelAr: 'العام الدراسي الحالي',
        type: 'string',
      },
      {
        key: 'app.maxStudentsPerClass',
        value: 25,
        category: 'academic',
        label: 'Max Students per Class',
        labelAr: 'أقصى عدد طلاب بالفصل',
        type: 'number',
      },
      {
        key: 'app.workingDays',
        value: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        category: 'attendance',
        label: 'Working Days',
        labelAr: 'أيام العمل',
        type: 'array',
      },
      {
        key: 'security.sessionTimeout',
        value: 30,
        category: 'security',
        label: 'Session Timeout (min)',
        labelAr: 'مهلة الجلسة (دقيقة)',
        type: 'number',
      },
      {
        key: 'security.maxLoginAttempts',
        value: 5,
        category: 'security',
        label: 'Max Login Attempts',
        labelAr: 'أقصى محاولات دخول',
        type: 'number',
      },
      {
        key: 'security.passwordMinLength',
        value: 8,
        category: 'security',
        label: 'Min Password Length',
        labelAr: 'أقل طول كلمة مرور',
        type: 'number',
      },
      {
        key: 'security.twoFactorEnabled',
        value: false,
        category: 'security',
        label: '2FA Enabled',
        labelAr: 'تفعيل التحقق الثنائي',
        type: 'boolean',
      },
      { key: 'email.smtpHost', value: '', category: 'email', label: 'SMTP Host', labelAr: 'خادم البريد', type: 'string', isSecret: false },
      { key: 'email.smtpPort', value: 587, category: 'email', label: 'SMTP Port', labelAr: 'منفذ البريد', type: 'number' },
      {
        key: 'email.fromAddress',
        value: 'noreply@alawael.edu.sa',
        category: 'email',
        label: 'From Address',
        labelAr: 'عنوان المرسل',
        type: 'string',
      },
      {
        key: 'sms.provider',
        value: 'none',
        category: 'sms',
        label: 'SMS Provider',
        labelAr: 'مزود الرسائل',
        type: 'select',
        options: ['none', 'twilio', 'unifonic', 'yamamah'],
      },
      {
        key: 'notifications.enablePush',
        value: true,
        category: 'notifications',
        label: 'Push Notifications',
        labelAr: 'الإشعارات الدفعية',
        type: 'boolean',
      },
      {
        key: 'notifications.enableEmail',
        value: true,
        category: 'notifications',
        label: 'Email Notifications',
        labelAr: 'إشعارات البريد',
        type: 'boolean',
      },
    ];
    for (const s of defaults) await new Setting(s).save();
    console.log('[Seed] Default settings created');
  }

  // Feature Flags
  if ((await FeatureFlag.countDocuments()) === 0) {
    const flags = [
      { name: 'dark-mode', description: 'Enable dark mode UI', isEnabled: false, category: 'ui' },
      { name: 'ai-recommendations', description: 'AI-powered recommendations', isEnabled: true, category: 'experiment' },
      { name: 'whatsapp-integration', description: 'WhatsApp messaging', isEnabled: false, category: 'beta' },
      { name: 'advanced-analytics', description: 'Advanced analytics dashboard', isEnabled: true, category: 'ui' },
      { name: 'mobile-app-sync', description: 'Mobile app data sync', isEnabled: false, category: 'beta' },
      { name: 'parent-portal', description: 'Parent self-service portal', isEnabled: true, category: 'ui' },
      { name: 'smart-scheduling', description: 'AI-based class scheduling', isEnabled: false, category: 'experiment' },
      { name: 'biometric-attendance', description: 'Biometric attendance system', isEnabled: false, category: 'beta' },
    ];
    for (const f of flags) await new FeatureFlag(f).save();
    console.log('[Seed] Default feature flags created');
  }

  // Roles
  if ((await Role.countDocuments()) === 0) {
    const roles = [
      { name: 'super-admin', nameAr: 'مدير النظام', isSystem: true, permissions: [{ resource: '*', actions: ['admin'] }] },
      {
        name: 'admin',
        nameAr: 'مدير',
        isSystem: true,
        permissions: [{ resource: '*', actions: ['create', 'read', 'update', 'delete', 'export', 'approve'] }],
      },
      {
        name: 'principal',
        nameAr: 'مدير المدرسة',
        isSystem: true,
        permissions: [
          { resource: 'students', actions: ['read', 'update', 'approve'] },
          { resource: 'staff', actions: ['read', 'update', 'approve'] },
          { resource: 'finance', actions: ['read', 'approve'] },
          { resource: 'reports', actions: ['read', 'export'] },
        ],
      },
      {
        name: 'teacher',
        nameAr: 'معلم',
        isSystem: true,
        permissions: [
          { resource: 'students', actions: ['read'] },
          { resource: 'attendance', actions: ['create', 'read', 'update'] },
          { resource: 'grades', actions: ['create', 'read', 'update'] },
        ],
      },
      {
        name: 'accountant',
        nameAr: 'محاسب',
        isSystem: true,
        permissions: [
          { resource: 'finance', actions: ['create', 'read', 'update', 'export'] },
          { resource: 'invoices', actions: ['create', 'read', 'update'] },
        ],
      },
      {
        name: 'receptionist',
        nameAr: 'موظف استقبال',
        isSystem: true,
        permissions: [
          { resource: 'students', actions: ['read'] },
          { resource: 'attendance', actions: ['create', 'read'] },
          { resource: 'visitors', actions: ['create', 'read', 'update'] },
        ],
      },
      {
        name: 'parent',
        nameAr: 'ولي أمر',
        isSystem: true,
        permissions: [
          { resource: 'students', actions: ['read'] },
          { resource: 'attendance', actions: ['read'] },
          { resource: 'grades', actions: ['read'] },
          { resource: 'invoices', actions: ['read'] },
        ],
      },
    ];
    for (const r of roles) await new Role(r).save();
    console.log('[Seed] Default roles created');
  }

  // Theme
  if ((await Theme.countDocuments()) === 0) {
    await new Theme({
      name: 'Al-Awael Default',
      nameAr: 'الأوائل الافتراضي',
      isDefault: true,
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#059669',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        error: '#dc2626',
        warning: '#d97706',
        success: '#16a34a',
        info: '#2563eb',
      },
    }).save();
    await new Theme({
      name: 'Dark Mode',
      nameAr: 'الوضع الداكن',
      darkMode: true,
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#10b981',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
        info: '#3b82f6',
      },
    }).save();
    console.log('[Seed] Default themes created');
  }
}

/* ── Start ───────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_config');
    await seedDefaults();
    app.listen(PORT, () => console.log(`🚀 System Config Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
