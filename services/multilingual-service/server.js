/**
 * ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Multilingual & Localization Service (التعدد اللغوي والتوطين)
 *  Port: 3680
 *  Phase 8E — Arabic/English/French, Translation management, RTL/LTR, Locale
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const dayjs = require('dayjs');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3680;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_i18n';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 50, 2000),
});

/* ─── Supported Languages ─────────────────────────────────────── */
const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'العربية', nameEn: 'Arabic', direction: 'rtl', isDefault: true },
  { code: 'en', name: 'English', nameEn: 'English', direction: 'ltr', isDefault: false },
  { code: 'fr', name: 'Français', nameEn: 'French', direction: 'ltr', isDefault: false },
  { code: 'ur', name: 'اردو', nameEn: 'Urdu', direction: 'rtl', isDefault: false },
  { code: 'tr', name: 'Türkçe', nameEn: 'Turkish', direction: 'ltr', isDefault: false },
];

/* ─── Schemas ─────────────────────────────────────────────────── */

// مفتاح الترجمة
const TranslationKeySchema = new mongoose.Schema({
  keyId: { type: String, unique: true },
  key: { type: String, required: true, index: true }, // e.g., "student.name", "menu.dashboard"
  namespace: { type: String, required: true, default: 'common', index: true }, // e.g., "common", "student", "finance"
  description: { type: String },
  context: { type: String }, // where this key is used
  tags: [{ type: String }],
  translations: {
    ar: { type: String },
    en: { type: String },
    fr: { type: String },
    ur: { type: String },
    tr: { type: String },
  },
  status: { type: String, enum: ['draft', 'translated', 'reviewed', 'approved'], default: 'draft' },
  completeness: { type: Number, default: 0 }, // percentage of languages translated
  updatedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
TranslationKeySchema.index({ key: 1, namespace: 1 }, { unique: true });
TranslationKeySchema.index({ status: 1 });
TranslationKeySchema.index({ tags: 1 });

TranslationKeySchema.pre('save', async function (next) {
  if (!this.keyId) {
    const c = await mongoose.model('TranslationKey').countDocuments();
    this.keyId = `TRN-${String(c + 1).padStart(5, '0')}`;
  }
  // Calculate completeness
  const langs = SUPPORTED_LANGUAGES.length;
  let done = 0;
  for (const l of SUPPORTED_LANGUAGES) {
    if (this.translations?.[l.code]?.trim()) done++;
  }
  this.completeness = Math.round((done / langs) * 100);
  this.updatedAt = new Date();
  next();
});

// إعدادات اللغة للمستخدم
const UserLocaleSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  language: { type: String, default: 'ar' },
  direction: { type: String, enum: ['rtl', 'ltr'], default: 'rtl' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
  timezone: { type: String, default: 'Asia/Riyadh' },
  numberFormat: { type: String, enum: ['arabic', 'western'], default: 'arabic' },
  calendarType: { type: String, enum: ['hijri', 'gregorian', 'both'], default: 'both' },
  currency: { type: String, default: 'SAR' },
  firstDayOfWeek: { type: Number, default: 0 }, // 0=Sunday
  updatedAt: { type: Date, default: Date.now },
});

// فضاء الأسماء (Namespace)
const NamespaceSchema = new mongoose.Schema({
  nsId: { type: String, unique: true },
  name: { type: String, unique: true, required: true },
  description: { type: String },
  descriptionAr: { type: String },
  service: { type: String }, // which service owns this namespace
  totalKeys: { type: Number, default: 0 },
  translatedKeys: { type: Number, default: 0 },
  completeness: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// سجل تاريخ التعديلات
const TranslationHistorySchema = new mongoose.Schema({
  keyId: { type: String },
  language: { type: String },
  oldValue: { type: String },
  newValue: { type: String },
  changedBy: { type: String },
  changedAt: { type: Date, default: Date.now, expires: 7776000 }, // 90 days
});

const TranslationKey = mongoose.model('TranslationKey', TranslationKeySchema);
const UserLocale = mongoose.model('UserLocale', UserLocaleSchema);
const Namespace = mongoose.model('Namespace', NamespaceSchema);
const TranslationHistory = mongoose.model('TranslationHistory', TranslationHistorySchema);

/* ─── BullMQ ──────────────────────────────────────────────────── */
const i18nQueue = new Queue('i18n-tasks', { connection: redis });

const worker = new Worker(
  'i18n-tasks',
  async job => {
    if (job.data.type === 'update-namespace-stats') {
      const namespaces = await Namespace.find({ isActive: true });
      for (const ns of namespaces) {
        const total = await TranslationKey.countDocuments({ namespace: ns.name });
        const translated = await TranslationKey.countDocuments({ namespace: ns.name, completeness: 100 });
        ns.totalKeys = total;
        ns.translatedKeys = translated;
        ns.completeness = total > 0 ? Math.round((translated / total) * 100) : 0;
        await ns.save();
      }
    }
  },
  { connection: redis, concurrency: 2 },
);

/* ─── Health ──────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  try {
    const db = mongoose.connection.readyState === 1;
    const rd = redis.status === 'ready';
    res.status(db && rd ? 200 : 503).json({
      status: db && rd ? 'healthy' : 'degraded',
      service: 'multilingual-service',
      port: PORT,
      mongodb: db ? 'connected' : 'disconnected',
      redis: rd ? 'connected' : 'disconnected',
      supportedLanguages: SUPPORTED_LANGUAGES.map(l => l.code),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

/* ─── Languages ───────────────────────────────────────────────── */
app.get('/api/i18n/languages', (_req, res) => {
  res.json(SUPPORTED_LANGUAGES);
});

/* ─── Namespaces ──────────────────────────────────────────────── */
app.post('/api/i18n/namespaces', async (req, res) => {
  try {
    const c = await Namespace.countDocuments();
    const ns = await Namespace.create({ ...req.body, nsId: `NS-${String(c + 1).padStart(3, '0')}` });
    res.status(201).json(ns);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/i18n/namespaces', async (req, res) => {
  try {
    res.json(await Namespace.find({ isActive: true }).sort('name'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Translation Keys — CRUD ─────────────────────────────────── */
app.post('/api/i18n/translations', async (req, res) => {
  try {
    const entry = await TranslationKey.create(req.body);
    // Invalidate namespace cache
    await redis.del(`i18n:bundle:${entry.namespace}:*`);
    res.status(201).json(entry);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/i18n/translations/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'العناصر مطلوبة' });
    let created = 0,
      updated = 0;
    for (const item of items) {
      const existing = await TranslationKey.findOne({ key: item.key, namespace: item.namespace || 'common' });
      if (existing) {
        Object.assign(existing.translations, item.translations);
        await existing.save();
        updated++;
      } else {
        await TranslationKey.create(item);
        created++;
      }
    }
    res.status(201).json({ created, updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/i18n/translations', async (req, res) => {
  try {
    const { namespace, status, tag, search, page = 1, limit = 50 } = req.query;
    const q = {};
    if (namespace) q.namespace = namespace;
    if (status) q.status = status;
    if (tag) q.tags = tag;
    if (search) q.key = { $regex: search, $options: 'i' };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      TranslationKey.find(q).sort('namespace key').skip(skip).limit(Number(limit)),
      TranslationKey.countDocuments(q),
    ]);
    res.json({ data: items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/i18n/translations/:id', async (req, res) => {
  try {
    const t = await TranslationKey.findOne({ keyId: req.params.id });
    if (!t) return res.status(404).json({ error: 'المفتاح غير موجود' });
    res.json(t);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/i18n/translations/:id', async (req, res) => {
  try {
    const old = await TranslationKey.findOne({ keyId: req.params.id });
    if (!old) return res.status(404).json({ error: 'المفتاح غير موجود' });

    // Track history for each changed language
    if (req.body.translations) {
      for (const lang of Object.keys(req.body.translations)) {
        if (old.translations[lang] !== req.body.translations[lang]) {
          await TranslationHistory.create({
            keyId: old.keyId,
            language: lang,
            oldValue: old.translations[lang] || '',
            newValue: req.body.translations[lang],
            changedBy: req.body.updatedBy,
          });
        }
      }
      Object.assign(old.translations, req.body.translations);
    }
    if (req.body.status) old.status = req.body.status;
    if (req.body.tags) old.tags = req.body.tags;
    if (req.body.updatedBy) old.updatedBy = req.body.updatedBy;

    await old.save();
    await redis.del(`i18n:bundle:${old.namespace}:*`);
    res.json(old);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/i18n/translations/:id', async (req, res) => {
  try {
    const t = await TranslationKey.findOneAndDelete({ keyId: req.params.id });
    if (!t) return res.status(404).json({ error: 'المفتاح غير موجود' });
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Get translation bundle for a language ───────────────────── */
app.get('/api/i18n/bundle/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const { namespace } = req.query;
    const cacheKey = `i18n:bundle:${namespace || 'all'}:${lang}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const q = {};
    if (namespace) q.namespace = namespace;
    const keys = await TranslationKey.find(q).select('key namespace translations');

    const bundle = {};
    for (const k of keys) {
      const ns = k.namespace;
      if (!bundle[ns]) bundle[ns] = {};
      bundle[ns][k.key] = k.translations[lang] || k.translations.ar || k.key;
    }

    await redis.setex(cacheKey, 300, JSON.stringify(bundle)); // 5 min cache
    res.json(bundle);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Flat bundle (key=value)
app.get('/api/i18n/bundle/:lang/flat', async (req, res) => {
  try {
    const { lang } = req.params;
    const { namespace } = req.query;
    const q = {};
    if (namespace) q.namespace = namespace;
    const keys = await TranslationKey.find(q).select('key translations');

    const flat = {};
    for (const k of keys) {
      flat[k.key] = k.translations[lang] || k.translations.ar || k.key;
    }
    res.json(flat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── User Locale Settings ────────────────────────────────────── */
app.get('/api/i18n/locale/:userId', async (req, res) => {
  try {
    let locale = await UserLocale.findOne({ userId: req.params.userId });
    if (!locale) {
      locale = await UserLocale.create({ userId: req.params.userId });
    }
    res.json(locale);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/i18n/locale/:userId', async (req, res) => {
  try {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === req.body.language);
    if (req.body.language && lang) {
      req.body.direction = lang.direction;
    }
    const locale = await UserLocale.findOneAndUpdate(
      { userId: req.params.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, upsert: true },
    );
    res.json(locale);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Translation History ─────────────────────────────────────── */
app.get('/api/i18n/history/:keyId', async (req, res) => {
  try {
    const history = await TranslationHistory.find({ keyId: req.params.keyId }).sort('-changedAt').limit(50);
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Missing Translations Report ─────────────────────────────── */
app.get('/api/i18n/missing/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const field = `translations.${lang}`;
    const missing = await TranslationKey.find({ $or: [{ [field]: '' }, { [field]: null }, { [field]: { $exists: false } }] })
      .select('keyId key namespace translations')
      .sort('namespace key');
    res.json({ language: lang, missingCount: missing.length, keys: missing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Export / Import ─────────────────────────────────────────── */
app.get('/api/i18n/export/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const { namespace } = req.query;
    const q = {};
    if (namespace) q.namespace = namespace;
    const keys = await TranslationKey.find(q).select('key namespace translations');
    const exported = keys.map(k => ({
      key: k.key,
      namespace: k.namespace,
      value: k.translations[lang] || '',
    }));
    res.json({ language: lang, count: exported.length, data: exported });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/i18n/import/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const { data } = req.body; // [{ key, namespace, value }]
    if (!data?.length) return res.status(400).json({ error: 'البيانات مطلوبة' });

    let updated = 0,
      notFound = 0;
    for (const item of data) {
      const key = await TranslationKey.findOne({ key: item.key, namespace: item.namespace || 'common' });
      if (key) {
        key.translations[lang] = item.value;
        await key.save();
        updated++;
      } else {
        notFound++;
      }
    }
    res.json({ updated, notFound });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Dashboard ───────────────────────────────────────────────── */
app.get('/api/i18n/dashboard', async (req, res) => {
  try {
    const cached = await redis.get('i18n:dashboard');
    if (cached) return res.json(JSON.parse(cached));

    const [totalKeys, namespaces, fullyTranslated, userLocales] = await Promise.all([
      TranslationKey.countDocuments(),
      Namespace.find({ isActive: true }),
      TranslationKey.countDocuments({ completeness: 100 }),
      UserLocale.aggregate([{ $group: { _id: '$language', count: { $sum: 1 } } }]),
    ]);

    // Per-language completion
    const langStats = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      const field = `translations.${lang.code}`;
      const translated = await TranslationKey.countDocuments({
        [field]: { $exists: true, $ne: '', $ne: null },
      });
      langStats[lang.code] = {
        name: lang.name,
        nameEn: lang.nameEn,
        direction: lang.direction,
        translated,
        total: totalKeys,
        completeness: totalKeys > 0 ? Math.round((translated / totalKeys) * 100) : 0,
      };
    }

    const data = {
      totalKeys,
      fullyTranslated,
      overallCompleteness: totalKeys > 0 ? Math.round((fullyTranslated / totalKeys) * 100) : 0,
      languages: langStats,
      namespaces: namespaces.map(n => ({
        name: n.name,
        totalKeys: n.totalKeys,
        translatedKeys: n.translatedKeys,
        completeness: n.completeness,
      })),
      userLanguageDistribution: userLocales.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      supportedLanguages: SUPPORTED_LANGUAGES.length,
      timestamp: new Date().toISOString(),
    };

    await redis.setex('i18n:dashboard', 30, JSON.stringify(data));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Cron — Update namespace stats ───────────────────────────── */
cron.schedule('*/30 * * * *', async () => {
  try {
    await i18nQueue.add('update-stats', { type: 'update-namespace-stats' });
    console.log('📊 Namespace stats update queued');
  } catch (e) {
    console.error('i18n cron error:', e.message);
  }
});

/* ─── Seed ────────────────────────────────────────────────────── */
async function seedTranslations() {
  const count = await TranslationKey.countDocuments();
  if (count > 0) return;

  // Seed namespaces
  const namespaces = [
    { nsId: 'NS-001', name: 'common', descriptionAr: 'ترجمات عامة', service: 'all' },
    { nsId: 'NS-002', name: 'student', descriptionAr: 'ترجمات الطلاب', service: 'student-service' },
    { nsId: 'NS-003', name: 'finance', descriptionAr: 'ترجمات المالية', service: 'finance-service' },
    { nsId: 'NS-004', name: 'staff', descriptionAr: 'ترجمات الموظفين', service: 'staff-service' },
    { nsId: 'NS-005', name: 'attendance', descriptionAr: 'ترجمات الحضور', service: 'attendance-service' },
    { nsId: 'NS-006', name: 'reports', descriptionAr: 'ترجمات التقارير', service: 'reports-service' },
    { nsId: 'NS-007', name: 'dashboard', descriptionAr: 'ترجمات لوحة التحكم', service: 'dashboard' },
    { nsId: 'NS-008', name: 'auth', descriptionAr: 'ترجمات المصادقة', service: 'auth-service' },
  ];
  await Namespace.insertMany(namespaces);

  // Seed core translations
  const keys = [
    {
      key: 'app.name',
      namespace: 'common',
      translations: { ar: 'نظام الأوائل', en: 'Al-Awael ERP', fr: 'Al-Awael ERP', ur: 'الاوائل ای آر پی', tr: 'Al-Awael ERP' },
      status: 'approved',
      tags: ['core'],
    },
    {
      key: 'app.welcome',
      namespace: 'common',
      translations: {
        ar: 'مرحباً بكم في نظام الأوائل',
        en: 'Welcome to Al-Awael ERP',
        fr: 'Bienvenue au Al-Awael ERP',
        ur: 'الاوائل ای آر پی میں خوش آمدید',
        tr: "Al-Awael ERP'ye Hoş Geldiniz",
      },
      status: 'approved',
      tags: ['core'],
    },
    {
      key: 'nav.dashboard',
      namespace: 'common',
      translations: { ar: 'لوحة التحكم', en: 'Dashboard', fr: 'Tableau de bord', ur: 'ڈیش بورڈ', tr: 'Kontrol Paneli' },
      status: 'approved',
      tags: ['navigation'],
    },
    {
      key: 'nav.students',
      namespace: 'common',
      translations: { ar: 'الطلاب', en: 'Students', fr: 'Étudiants', ur: 'طلباء', tr: 'Öğrenciler' },
      status: 'approved',
      tags: ['navigation'],
    },
    {
      key: 'nav.staff',
      namespace: 'common',
      translations: { ar: 'الموظفون', en: 'Staff', fr: 'Personnel', ur: 'عملہ', tr: 'Personel' },
      status: 'approved',
      tags: ['navigation'],
    },
    {
      key: 'nav.finance',
      namespace: 'common',
      translations: { ar: 'المالية', en: 'Finance', fr: 'Finance', ur: 'مالیات', tr: 'Finans' },
      status: 'approved',
      tags: ['navigation'],
    },
    {
      key: 'nav.attendance',
      namespace: 'common',
      translations: { ar: 'الحضور والانصراف', en: 'Attendance', fr: 'Présence', ur: 'حاضری', tr: 'Devamsızlık' },
      status: 'approved',
      tags: ['navigation'],
    },
    {
      key: 'nav.reports',
      namespace: 'common',
      translations: { ar: 'التقارير', en: 'Reports', fr: 'Rapports', ur: 'رپورٹس', tr: 'Raporlar' },
      status: 'approved',
      tags: ['navigation'],
    },
    {
      key: 'nav.settings',
      namespace: 'common',
      translations: { ar: 'الإعدادات', en: 'Settings', fr: 'Paramètres', ur: 'ترتیبات', tr: 'Ayarlar' },
      status: 'approved',
      tags: ['navigation'],
    },
    {
      key: 'action.save',
      namespace: 'common',
      translations: { ar: 'حفظ', en: 'Save', fr: 'Sauvegarder', ur: 'محفوظ کریں', tr: 'Kaydet' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.cancel',
      namespace: 'common',
      translations: { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler', ur: 'منسوخ', tr: 'İptal' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.delete',
      namespace: 'common',
      translations: { ar: 'حذف', en: 'Delete', fr: 'Supprimer', ur: 'حذف کریں', tr: 'Sil' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.edit',
      namespace: 'common',
      translations: { ar: 'تعديل', en: 'Edit', fr: 'Modifier', ur: 'ترمیم', tr: 'Düzenle' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.add',
      namespace: 'common',
      translations: { ar: 'إضافة', en: 'Add', fr: 'Ajouter', ur: 'شامل کریں', tr: 'Ekle' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.search',
      namespace: 'common',
      translations: { ar: 'بحث', en: 'Search', fr: 'Rechercher', ur: 'تلاش', tr: 'Ara' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.export',
      namespace: 'common',
      translations: { ar: 'تصدير', en: 'Export', fr: 'Exporter', ur: 'برآمد', tr: 'Dışa Aktar' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.import',
      namespace: 'common',
      translations: { ar: 'استيراد', en: 'Import', fr: 'Importer', ur: 'درآمد', tr: 'İçe Aktar' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'action.print',
      namespace: 'common',
      translations: { ar: 'طباعة', en: 'Print', fr: 'Imprimer', ur: 'پرنٹ', tr: 'Yazdır' },
      status: 'approved',
      tags: ['action'],
    },
    {
      key: 'status.active',
      namespace: 'common',
      translations: { ar: 'نشط', en: 'Active', fr: 'Actif', ur: 'فعال', tr: 'Aktif' },
      status: 'approved',
      tags: ['status'],
    },
    {
      key: 'status.inactive',
      namespace: 'common',
      translations: { ar: 'غير نشط', en: 'Inactive', fr: 'Inactif', ur: 'غیر فعال', tr: 'Pasif' },
      status: 'approved',
      tags: ['status'],
    },
    {
      key: 'student.name',
      namespace: 'student',
      translations: { ar: 'اسم الطالب', en: 'Student Name', fr: "Nom de l'étudiant", ur: 'طالب کا نام', tr: 'Öğrenci Adı' },
      status: 'approved',
      tags: ['student'],
    },
    {
      key: 'student.id',
      namespace: 'student',
      translations: { ar: 'رقم الطالب', en: 'Student ID', fr: 'ID Étudiant', ur: 'طالب نمبر', tr: 'Öğrenci No' },
      status: 'approved',
      tags: ['student'],
    },
    {
      key: 'student.grade',
      namespace: 'student',
      translations: { ar: 'الصف', en: 'Grade', fr: 'Classe', ur: 'جماعت', tr: 'Sınıf' },
      status: 'approved',
      tags: ['student'],
    },
    {
      key: 'finance.invoice',
      namespace: 'finance',
      translations: { ar: 'فاتورة', en: 'Invoice', fr: 'Facture', ur: 'انوائس', tr: 'Fatura' },
      status: 'approved',
      tags: ['finance'],
    },
    {
      key: 'finance.payment',
      namespace: 'finance',
      translations: { ar: 'دفعة', en: 'Payment', fr: 'Paiement', ur: 'ادائیگی', tr: 'Ödeme' },
      status: 'approved',
      tags: ['finance'],
    },
    {
      key: 'auth.login',
      namespace: 'auth',
      translations: { ar: 'تسجيل الدخول', en: 'Login', fr: 'Connexion', ur: 'لاگ ان', tr: 'Giriş' },
      status: 'approved',
      tags: ['auth'],
    },
    {
      key: 'auth.logout',
      namespace: 'auth',
      translations: { ar: 'تسجيل الخروج', en: 'Logout', fr: 'Déconnexion', ur: 'لاگ آؤٹ', tr: 'Çıkış' },
      status: 'approved',
      tags: ['auth'],
    },
    {
      key: 'auth.password',
      namespace: 'auth',
      translations: { ar: 'كلمة المرور', en: 'Password', fr: 'Mot de passe', ur: 'پاسورڈ', tr: 'Şifre' },
      status: 'approved',
      tags: ['auth'],
    },
  ];

  await TranslationKey.insertMany(keys);
  console.log(`🌱 Seeded ${keys.length} translation keys in ${namespaces.length} namespaces`);
}

/* ─── Start ───────────────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_i18n');
    await seedTranslations();
    app.listen(PORT, () => console.log(`🌐 Multilingual Service running → http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error('❌ MongoDB error:', e.message);
    process.exit(1);
  });
